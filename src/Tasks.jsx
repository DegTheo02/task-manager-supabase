import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { useSearchParams } from "react-router-dom";

import { useRecurrenceEngine } from "./hooks/useRecurrenceEngine";
import { useAuth } from "./context/AuthContext";
import TaskForm from "./components/tasks/TaskForm";
import TaskFilters from "./components/tasks/TaskFilters";
import TaskTable from "./components/tasks/TaskTable";
import { useTasks } from "./hooks/useTasks";

/* Shared assignment policy — the SAME module TaskForm.jsx uses to gate the
   dropdowns. Importing it here is the whole point: the form and the write
   must answer "may this person own this task?" from one implementation. */
import {
  canAssignTo,
  teamForAssignment,
  assignmentDeniedMessage
} from "./utils/ownerAssignment";




import {
  STATUSES,
  OWNERS,
  TEAMS,
  STATUS_COLORS,
  OWNER_TEAM_MAP,
  RECURRENCE_TYPES,
  REQUESTERS
} from "./constants/taskConstants";


/* ----------------------------------
   CONSTANTS
---------------------------------- */


const toISODate = value => {
  if (!value) return "";
  return value.slice(0, 10); // works for ISO strings & timestamps
};

const normalizeTaskDates = task => ({
  ...task,
  assigned_date: toISODate(task.assigned_date),
  initial_deadline: toISODate(task.initial_deadline),
  new_deadline: toISODate(task.new_deadline),
  closing_date: toISODate(task.closing_date)
});

const WEEKDAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 }
];

/* Single source of truth for the filter shape.
   Anything restored from sessionStorage is merged OVER this, so a filter key
   added in a later release can never come back undefined for a returning user. */
const DEFAULT_FILTERS = {
  owners: [],
  teams: [],
  requesters: [],
  creators: [],
  statuses: [],
  recurrence_types: [],
  search: "",
  assigned_from: "",
  assigned_to: "",
  deadline_from: "",
  deadline_to: "",
  closing_from: "",
  closing_to: "",
  today: false
};

/* Columns holding ISO date strings (YYYY-MM-DD) — these sort correctly as
   plain text, so they skip localeCompare's numeric collation. */
const DATE_KEYS = [
  "assigned_date",
  "initial_deadline",
  "new_deadline",
  "closing_date"
];

/* Fields that belong to ONE occurrence, never to the whole series.
   Fanning these out across a recurrence_group_id collapses every occurrence
   onto the same date and trips the partial unique index
   (recurrence_group_id, initial_deadline) — see SERIES_UNIQ below. */
const OCCURRENCE_FIELDS = [
  "assigned_date",
  "initial_deadline",
  "new_deadline",
  "closing_date"
];

/* Name of the partial unique index guarding one-occurrence-per-date:
   CREATE UNIQUE INDEX tasks_series_occurrence_uniq
     ON tasks (recurrence_group_id, initial_deadline)
     WHERE recurrence_group_id IS NOT NULL;                                */
const SERIES_UNIQ = "tasks_series_occurrence_uniq";

/* Turn a raw Postgres error into something a user can act on.
   RLS can hide a conflicting sibling row from a non-admin, so the client-side
   pre-check isn't always able to catch the clash first — this is the backstop. */
const friendlyDbError = err => {
  const msg = String(err?.message || "");

  if (msg.includes(SERIES_UNIQ) || err?.code === "23505") {
    return (
      "Another occurrence of this recurring series already uses that initial " +
      "deadline. Two occurrences of the same series can't share a date — " +
      "pick a different date, or edit that occurrence directly."
    );
  }

  /* 42501 = new row violates row-level security policy.
     The UPDATE policy on tasks has no WITH CHECK clause, so Postgres reuses
     the USING expression against the NEW row. Reassigning a task to someone
     the caller can't reach therefore fails here rather than silently. */
  if (err?.code === "42501" || msg.includes("row-level security")) {
    return (
      "The database refused this change. You can only hand a task to someone " +
      "whose team you are allowed to write to — reassigning it outside that " +
      "scope would make the task invisible to you."
    );
  }

  return msg || "Something went wrong";
};

/* Supabase does NOT error when RLS simply matches no rows: the update reports
   success with zero rows touched. Every update below therefore asks for the
   ids back and treats an empty result as a failure. */
const assertRowsTouched = (rows, what) => {
  if (!rows || rows.length === 0) {
    throw new Error(
      `${what} did not change any rows. This is almost always a permissions ` +
      `problem: your account can read the task but is not allowed to write ` +
      `it. Nothing was saved.`
    );
  }
};

/* Stable, comparable fingerprint of a recurrence rule.
   Supabase returns jsonb columns ALREADY PARSED, while the form builds the
   rule as a JSON string — so both shapes have to be accepted here. */
const ruleSignature = rule => {
  let obj = rule;

  if (typeof rule === "string") {
    try {
      obj = JSON.parse(rule);
    } catch {
      return "";
    }
  }

  if (!obj || typeof obj !== "object") return "";

  return Object.keys(obj)
    .sort()
    .map(k => {
      const v = obj[k];
      return `${k}=${Array.isArray(v) ? [...v].sort().join("|") : v}`;
    })
    .join(";");
};



/* ----------------------------------
   TASKS PAGE
---------------------------------- */
export default function Tasks() {

  
  const { user, fullName, permissions,team: myTeam, ownerLabel, role } = useAuth();
  const [filters, setFilters] = useState(() => {
    const saved = sessionStorage.getItem("tasksFilters");
    if (!saved) return { ...DEFAULT_FILTERS };

    try {
      // Merge over defaults — a session saved before `creators` existed would
      // otherwise leave filters.creators undefined and throw on first render.
      return { ...DEFAULT_FILTERS, ...JSON.parse(saved) };
    } catch {
      return { ...DEFAULT_FILTERS };
    }
  });
  const { tasks, loading, hasMore, loadMore, reload } = useTasks(filters);
  const [owners, setOwners] = useState([]);
  const [filterKey, setFilterKey] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editSeries, setEditSeries] = useState(false);
  
  const [searchParams] = useSearchParams();

  const statusesParam = searchParams.get("statuses");
  const status = searchParams.get("status");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const ownersParam = searchParams.get("owners");
  const teamsParam = searchParams.get("teams");
  const requestersParam = searchParams.get("requesters");




  /* DARK MODE */
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("tasksDarkMode") === "true"
  );

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("tasksDarkMode", next);
  };

  const dark = darkMode
    ? { background: "#000", color: "white" }
    : { background: "white", color: "black" };

  /* FILTERS */
console.log("Current role:", role);
  useEffect(() => {
    sessionStorage.setItem("tasksFilters", JSON.stringify(filters));
  }, [filters]);

useEffect(() => {
  // Only apply URL filters if at least one param exists
  if (
    status ||
    statusesParam ||
    dateFrom ||
    dateTo ||
    ownersParam ||
    teamsParam ||
    requestersParam
  ) {
    setFilters(f => ({
      ...f,
      statuses: statusesParam
        ? statusesParam.split(",")
        : status
        ? [status]
        : f.statuses,
      deadline_from: dateFrom || f.deadline_from,
      deadline_to: dateTo || f.deadline_to,
      owners: ownersParam ? ownersParam.split(",") : f.owners,
      teams: teamsParam ? teamsParam.split(",") : f.teams,
      requesters: requestersParam
        ? requestersParam.split(",")
        : f.requesters
    }));
  }
}, [
  status,
  statusesParam,
  dateFrom,
  dateTo,
  ownersParam,
  teamsParam,
  requestersParam
]);




  
  
  const resetTableFilters = () => {
    // Reset every key. The old version omitted search / recurrence_types /
    // assigned_*, which left them undefined and flipped the search box to an
    // uncontrolled input after each Reset.
    setFilters({ ...DEFAULT_FILTERS });

    // force re-render of filter controls
    setFilterKey(k => k + 1);
  };


  /* FORM */
const emptyTask = {
  id: null,
  title: "",
  owner_id: "",        // single-owner (used for editing existing rows)
  owner: "",           // single-owner label (used for editing)
  owner_ids: [],       // ✅ NEW — multi-owner selection (used on create)
  team: "",
  requester: "",
  status: "",
  recurrence_type: "Non-Recurring",
  assigned_date: "",
  initial_deadline: "",
  new_deadline: "",
  closing_date: "",
  comments: ""
};


  const [form, setForm] = useState(emptyTask);
  const [isEditing, setIsEditing] = useState(false);

    /*RECURRENCE ENGINE*/
      const {
      recurrence,
      setRecurrence,
      occurrences,
      isValid
    } = useRecurrenceEngine({
      startDate: form.initial_deadline
    });

  /* LOAD DATA */

  
    const loadOwners = async () => {
      if (!user) return;
    
      let q = supabase
        .from("profiles")
        .select("id, owner_label, team")
        .order("owner_label");
    
      // 👤 USER → only themselves
      if (role === "user") {
        q = q.eq("id", user.id);
      }
    
      // 👔 MANAGER → only their team
      if (role === "manager") {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("team")
          .eq("id", user.id)
          .maybeSingle();
    
        if (myProfile?.team) {
          q = q.eq("team", myProfile.team);
        }
      }
    
      const { data, error } = await q;
    
      if (!error) {
        setOwners(data || []);
      }
    };

    
    useEffect(() => {
      loadOwners();
    }, [user, role]);

  /* -------- ASSIGNMENT CONTEXT --------
     Same shape TaskForm.jsx builds for its dropdowns. Constructed here too
     so the guard in saveTask() and the guard on the <select> cannot drift. */
  const assignCtx = useMemo(
    () => ({ owners, permissions, role, user, myTeam }),
    [owners, permissions, role, user, myTeam]
  );



  /* Seed the CREATE form with the current user as owner.

     `!isEditing` is load-bearing. Without it this effect fires whenever
     `owners` resolves and stamps the actor's own id over whatever task is
     open in the edit form — which silently reverted a manager's
     reassignment back to themselves before the save even ran. It is a
     default for a blank form, never an override of an open one. */
  useEffect(() => {
  if (isEditing) return;

  if (user && !permissions?.manage_users) {
    const currentOwner = owners.find(o => o.id === user.id);

    setForm(f => ({
      ...f,
      owner_id: user.id,
      owner: currentOwner?.owner_label || "",
      owner_ids: [user.id]                          // ✅ NEW — seed multi-select
    }));
  }
}, [user, permissions, owners, isEditing]);

  
  /* FILTER + TODAY LOGIC */
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {

       if (filters.search &&
        !t.title.toLowerCase().includes(filters.search.toLowerCase()))
        return false;

      if (filters.owners.length && !filters.owners.includes(t.owner))
        return false;
       
      if (filters.teams.length && !filters.teams.includes(t.team))
        return false;

      if (  filters.requesters.length &&  !filters.requesters.includes(t.requester)) 
        return false;

      /* CREATED BY — matches on creator_name from the tasks_with_creator view */
      const selectedCreators = filters.creators || [];
      if (selectedCreators.length && !selectedCreators.includes(t.creator_name))
        return false;

      if (filters.statuses.length && !filters.statuses.includes(t.status))
        return false;


      const deadline = t.new_deadline || t.initial_deadline;

      if (filters.deadline_from && deadline < filters.deadline_from)
        return false;

      if (filters.deadline_to && deadline > filters.deadline_to)
        return false;

      const closing = t.closing_date;

      if (filters.closing_from && (!closing || closing < filters.closing_from))
        return false;

      if (filters.closing_to && (!closing || closing > filters.closing_to))
        return false;


      if (filters.today) {
        const today = new Date().toISOString().slice(0, 10);
        if (deadline !== today) return false;
      }

      return true;
    });
  }, [tasks, filters]);

  /* CREATED-BY OPTIONS
     Derived from the rows actually loaded, so the list automatically respects
     RLS — you only ever see creators whose tasks you're allowed to read.
     Currently-selected values are folded back in so a selection can never
     disappear from the list when another filter narrows the result set. */
  const creatorOptions = useMemo(() => {
    const names = new Set();

    tasks.forEach(t => {
      if (t.creator_name) names.add(t.creator_name);
    });

    (filters.creators || []).forEach(c => names.add(c));

    return [...names].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [tasks, filters.creators]);

  /* SORTING LOGIC */
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: null
  });

  const sortedTasks = useMemo(() => {
    const { key, direction } = sortConfig;
    if (!key || !direction) return filteredTasks;

    const dir = direction === "asc" ? 1 : -1;

    const valueOf = t => {
      const v = t?.[key];
      return v === undefined || v === null ? "" : v;
    };

    return [...filteredTasks].sort((a, b) => {
      const aV = valueOf(a);
      const bV = valueOf(b);

      // Blanks sink to the bottom in BOTH directions, so flipping the arrow
      // never buries the populated rows under a wall of empty cells.
      const aBlank = aV === "";
      const bBlank = bV === "";
      if (aBlank && bBlank) return 0;
      if (aBlank) return 1;
      if (bBlank) return -1;

      let cmp;

      if (DATE_KEYS.includes(key)) {
        cmp = aV < bV ? -1 : aV > bV ? 1 : 0;
      } else if (typeof aV === "number" && typeof bV === "number") {
        cmp = aV - bV;
      } else {
        // Case- and accent-insensitive, and — unlike `>` — returns 0 on a tie.
        cmp = String(aV).localeCompare(String(bV), undefined, {
          sensitivity: "base",
          numeric: true
        });
      }

      if (cmp !== 0) return cmp * dir;

      // Deterministic tie-break so equal values hold a stable order instead of
      // being reshuffled on every re-render.
      return String(a.id).localeCompare(String(b.id));
    });
  }, [filteredTasks, sortConfig]);

  const requestSort = key => {
    setSortConfig(prev =>
      prev.key === key
        ? prev.direction === "asc"
          ? { key, direction: "desc" }
          : prev.direction === "desc"
          ? { key: null, direction: null }
          : { key, direction: "asc" }
        : { key, direction: "asc" }
    );
  };

  const arrow = key => {
    if (sortConfig.key !== key || !sortConfig.direction) return "";
    return sortConfig.direction === "asc" ? " ↑" : " ↓";
  };

  // 🔥 INFINITE SCROLL
useEffect(() => {
  const handleScroll = () => {
    if (
      window.innerHeight + document.documentElement.scrollTop + 200 >=
      document.documentElement.offsetHeight
    ) {
      if (!loading && hasMore) {
        loadMore();
      }
    }
  };

  window.addEventListener("scroll", handleScroll);
  return () => window.removeEventListener("scroll", handleScroll);
}, [loading, hasMore, loadMore]);

  
  /* ----------------------------------
     RE-POINT A SERIES AFTER A CADENCE CHANGE

     Exactly one row per series is the "head": the one carrying a non-null
     next_occurrence_date. The cron reads that pointer, materialises the
     occurrence, then advances it. Change the frequency and the rule updates
     everywhere, but the pointer still sits on the old schedule.

     `occurrences` comes from useRecurrenceEngine and already reflects the
     frequency / weekdays / monthly rule currently shown in the form, across
     the From→To window in the "Repeat on" box — so no recurrence maths is
     duplicated here.
  ---------------------------------- */
  const repointSeriesHead = async groupId => {
    const today = new Date().toISOString().slice(0, 10);

    const nextDate = (occurrences || []).find(d => d > today) || null;

    if (!nextDate) {
      alert(
        "The new frequency was saved, but the schedule has no dates left in " +
        "the future.\n\nExtend the 'To' date in the Repeat on box past today " +
        "and save again — otherwise no new occurrences will be generated."
      );
      return;
    }

    const { data: head, error: headErr } = await supabase
      .from("tasks")
      .select("id, next_occurrence_date")
      .eq("recurrence_group_id", groupId)
      .not("next_occurrence_date", "is", null)
      .limit(1);

    if (headErr) {
      console.warn("Could not locate series head:", headErr);
      return;
    }

    // No head means the series has already run its course — nothing to move.
    if (!head?.length) return;

    if (head[0].next_occurrence_date === nextDate) return;

    const { error: ptrErr } = await supabase
      .from("tasks")
      .update({ next_occurrence_date: nextDate })
      .eq("id", head[0].id);

    if (ptrErr) {
      console.warn("Could not re-point series head:", ptrErr);
    }
  };


  /* SAVE TASK */
  const saveTask = async () => {
  if (isSubmitting) return;

  // =========================
  // ✅ VALIDATION (OUTSIDE TRY)
  // =========================
  if (!user) {
    alert("Authentication error. Please login again.");
    return;
  }

  // Common required fields (owner is checked separately below)
  if (
    !form.title ||
    !form.requester ||
    !form.assigned_date ||
    !form.initial_deadline
  ) {
    alert("Please fill all required fields");
    return;
  }

  // ✅ Owner validation differs between CREATE and EDIT
  if (isEditing) {
    if (!form.owner || !form.owner_id) {
      alert("Please select an owner");
      return;
    }
  } else {
    if (!form.owner_ids || form.owner_ids.length === 0) {
      alert("Please select at least one owner");
      return;
    }
  }

  if (form.closing_date && role !== "admin") {
    const today = new Date();
    const minAllowedDate = new Date();
    minAllowedDate.setDate(today.getDate() - 100);

    const minDateStr = minAllowedDate.toISOString().slice(0, 10);

    if (form.closing_date < minDateStr) {
      alert(
        `Only admins can set a closing date earlier than ${minDateStr}`
      );
      return;
    }
  }

  if (recurrence.enabled && !isValid) {
    alert("Invalid recurrence settings");
    return;
  }

  /* ✅ Permission guard — now delegated to utils/ownerAssignment.

     The old version hard-coded `form.owner_id !== user.id` for every
     non-admin. That did two wrong things at once: it blocked a manager from
     reassigning inside their own team (which the INSERT policy has always
     allowed), and it blocked a manager from making ANY edit — a typo fix on
     the title included — to a task owned by a teammate.

     canAssignTo() encodes the real rule: admins anyone, managers their own
     team, everyone else only themselves. */
  if (isEditing) {
    if (!canAssignTo(form.owner_id, assignCtx)) {
      alert(assignmentDeniedMessage(assignCtx));
      return;
    }
  } else {
    const disallowed = (form.owner_ids || []).filter(
      id => !canAssignTo(id, assignCtx)
    );
    if (disallowed.length) {
      alert(assignmentDeniedMessage(assignCtx));
      return;
    }
  }

  const normalizedClosingDate =
    form.closing_date === "" ? null : form.closing_date;

  // =========================
  // 🚀 START LOADING
  // =========================
  setIsSubmitting(true);

  try {
    // =========================
    // 📦 BASE PAYLOAD (owner/team set per-row below on create,
    //                  or from form on edit)
    // =========================
    const basePayload = {
      title: form.title,
      created_by: user.id,
      requester: form.requester,
      recurrence_type: recurrence.enabled
        ? recurrence.frequency
        : "Non-Recurring",
      recurrence_rule: recurrence.enabled
        ? JSON.stringify({
            frequency: recurrence.frequency,
            ...(recurrence.frequency === "weekly" ||
            recurrence.frequency === "biweekly"
              ? { weekdays: recurrence.weekly.weekdays }
              : recurrence.monthly)
          })
        : null,
      assigned_date: form.assigned_date,
      initial_deadline: form.initial_deadline,
      new_deadline: form.new_deadline || null,
      closing_date: normalizedClosingDate,
      comments: form.comments || null
    };

    // =========================
    // ✏️ UPDATE (single-owner edit)
    // =========================
    if (isEditing) {
      /* ---------------------------------------------------------------
         🔑 THE OWNER FIX

         owner_id used to be left out of this payload, on the assumption
         that an edit could never reassign a task. The form has allowed
         reassignment for a while now, so the label moved and the foreign
         key did not: `owner` said one person, `owner_id` still pointed at
         the previous one. Everything keyed on owner_id then addressed the
         wrong human — RLS visibility, own-task filters, and the overdue
         reminder emails most visibly of all.

         owner_id is now the source of truth. The label and the team are
         both DERIVED from the profile it names, so the three columns
         cannot disagree.
      --------------------------------------------------------------- */
      const ownerProfile = owners.find(o => o.id === form.owner_id);

      if (!ownerProfile) {
        throw new Error(
          "That owner is not in the list of people you can assign to, so the " +
          "task was not saved. Reopen the task and pick the owner again."
        );
      }

      const updatePayload = {
        ...basePayload,
        owner_id: ownerProfile.id,
        owner: ownerProfile.owner_label,
        team: teamForAssignment(ownerProfile, assignCtx, form.team)
      };

      // An edit must never re-stamp the creator. basePayload sets created_by
      // for the CREATE path; leaving it in here rewrote "Created By" to
      // whoever last touched the task (and, on a series edit, across every
      // occurrence at once).
      delete updatePayload.created_by;

      // ---------------------------------------------------------------
      // 🛡️ COLLISION PRE-CHECK
      // Catch a date clash with a sibling occurrence BEFORE Postgres does,
      // so the user gets a sentence instead of a constraint name.
      // ---------------------------------------------------------------
      if (form.recurrence_group_id && form.initial_deadline) {
        const { data: clash, error: clashErr } = await supabase
          .from("tasks")
          .select("id")
          .eq("recurrence_group_id", form.recurrence_group_id)
          .eq("initial_deadline", form.initial_deadline)
          .neq("id", form.id)
          .limit(1);

        // A failed check is not a failed save — fall through and let the
        // database have the final word (friendlyDbError handles it).
        if (!clashErr && clash?.length) {
          throw new Error(
            `Another occurrence of this recurring series already falls on ` +
            `${form.initial_deadline}. Two occurrences of the same series ` +
            `can't share an initial deadline — pick a different date, or ` +
            `edit that occurrence directly.`
          );
        }
      }

      if (editSeries && form.recurrence_group_id) {
        // -------------------------------------------------------------
        // SERIES-WIDE FIELDS
        // Everything that is genuinely shared by every occurrence.
        // The date fields are stripped: writing one date onto N rows
        // violates tasks_series_occurrence_uniq the moment N > 1.
        // -------------------------------------------------------------
        const seriesPayload = { ...updatePayload };
        OCCURRENCE_FIELDS.forEach(k => delete seriesPayload[k]);

        const { data: seriesRows, error: seriesErr } = await supabase
          .from("tasks")
          .update(seriesPayload)
          .eq("recurrence_group_id", form.recurrence_group_id)
          .select("id");

        if (seriesErr) throw seriesErr;
        assertRowsTouched(seriesRows, "The series update");

        // -------------------------------------------------------------
        // PER-OCCURRENCE FIELDS
        // The dates on screen belong to the row the user actually opened.
        // -------------------------------------------------------------
        const occurrencePayload = {};
        OCCURRENCE_FIELDS.forEach(k => {
          occurrencePayload[k] = updatePayload[k];
        });

        const { data: rowRows, error: rowErr } = await supabase
          .from("tasks")
          .update(occurrencePayload)
          .eq("id", form.id)
          .select("id");

        if (rowErr) throw rowErr;
        assertRowsTouched(rowRows, "The occurrence update");

        // -------------------------------------------------------------
        // CADENCE CHANGE → move the series pointer
        // The rule now says "biweekly" on every row, but the head row's
        // next_occurrence_date still points at the old rhythm, so the cron
        // would keep firing weekly. Only re-point when the rule really
        // changed — re-pointing on an unrelated edit could skip an
        // occurrence the cron hasn't generated yet.
        // -------------------------------------------------------------
        const cadenceChanged =
          form.recurrence_type !== updatePayload.recurrence_type ||
          ruleSignature(form.recurrence_rule) !==
            ruleSignature(updatePayload.recurrence_rule);

        if (cadenceChanged) {
          await repointSeriesHead(form.recurrence_group_id);
        }

      } else {
        const { data: updatedRows, error } = await supabase
          .from("tasks")
          .update(updatePayload)
          .eq("id", form.id)
          .select("id");

        if (error) throw error;
        assertRowsTouched(updatedRows, "The task update");
      }
    }

    // =========================
    // ➕ CREATE — fan out one task row per selected owner
    // =========================
    else {
      let createdCount = 0;

      for (const ownerId of form.owner_ids) {
        const ownerProfile = owners.find(o => o.id === ownerId);
        if (!ownerProfile) continue;

        // Determine team for THIS owner (admin uses owner's real team,
        // non-admin is locked to their own team)
        const ownerTeam = permissions?.manage_users
          ? (OWNER_TEAM_MAP[ownerProfile.owner_label] ||
             ownerProfile.team ||
             "")
          : myTeam;

        const ownerPayload = {
          ...basePayload,
          owner: ownerProfile.owner_label,
          owner_id: ownerId,
          team: ownerTeam
        };

        if (!recurrence.enabled) {
          // SINGLE TASK (per owner)
          const { error } = await supabase
            .from("tasks")
            .insert(ownerPayload);

          if (error) throw error;

          // 📧 EMAIL (non-blocking, per owner)
          try {
            await supabase.functions.invoke("send-task-email", {
              body: {
                task: ownerPayload,
                creator_id: user.id
              }
            });
          } catch (emailErr) {
            console.warn("Email failed (non-blocking):", emailErr);
          }
        } else {
          // 🔁 RECURRING TASK (per owner — independent series)
          if (!recurrence.startDate || !recurrence.endDate) {
            throw new Error("Missing recurrence date range");
          }
          if (!occurrences.length) {
            throw new Error("No occurrences generated");
          }

          const firstDate = occurrences[0];
          const nextDate = occurrences[1] || null;

          const recurringPayload = {
            ...ownerPayload,
            initial_deadline: firstDate,
            next_occurrence_date: nextDate,
            recurrence_group_id: crypto.randomUUID()  // own series per owner
          };

          const { error } = await supabase
            .from("tasks")
            .insert(recurringPayload);

          if (error) throw error;
        }

        createdCount++;
      }

      if (createdCount === 0) {
        throw new Error("No tasks were created. Please check your selection.");
      }

      if (createdCount > 1) {
        // Friendly heads-up only when fan-out actually happened
        console.log(`✅ Created ${createdCount} tasks`);
      }
    }

    // =========================
    // ✅ SUCCESS CLEANUP
    // =========================
    setForm(emptyTask);
    setIsEditing(false);
    await reload();

  } catch (err) {
    console.error("❌ saveTask error:", err);
    alert(friendlyDbError(err));

  } finally {
    // =========================
    // 🔁 ALWAYS RESET
    // =========================
    setIsSubmitting(false);
  }
};

  /* DELETE TASK */
    const deleteTask = async (task, deleteFuture = false) => {
      if (!window.confirm("Confirm delete?")) return;
    
      if (deleteFuture && task.recurrence_group_id) {
        const cutoff = task.new_deadline || task.initial_deadline;
    
        const { error } = await supabase
          .from("tasks")
          .delete()
          .eq("recurrence_group_id", task.recurrence_group_id)
          .gte("initial_deadline", cutoff);
    
        if (error) {
          alert("Failed to delete future occurrences");
          return;
        }
      } else {
        await supabase.from("tasks").delete().eq("id", task.id);
      }
    
      await reload();
    };



  const editTask = (task, editSeries = false) => {

  const normalized = normalizeTaskDates(task);

  setForm({
    ...normalized,
    comments: task.comments || "",
    owner_ids: task.owner_id ? [task.owner_id] : []   // ✅ NEW — single-owner on edit
  });

  // ✅ Restore recurrence state
  if (task.recurrence_type && task.recurrence_type !== "Non-Recurring") {

    let parsedRule = null;

    try {
      parsedRule = task.recurrence_rule
        ? JSON.parse(task.recurrence_rule)
        : null;
    } catch (e) {
      console.error("Failed to parse recurrence_rule:", e);
    }

    setRecurrence({
      enabled: true,
      frequency: task.recurrence_type,
      weekly: {
        weekdays: parsedRule?.weekdays || []
      },
      monthly: parsedRule?.frequency === "monthly"
        ? parsedRule
        : null,
      startDate: task.initial_deadline || "",
      // Leaf occurrences (generated by the cron) carry next_occurrence_date
      // NULL. Seeding endDate from it left the "To" box empty, which made
      // isValid false and blocked the save with "Invalid recurrence settings".
      // Falling back to this row's own deadline keeps the form valid; the user
      // extends it only when they actually want to reshape the schedule.
      endDate: task.next_occurrence_date || task.initial_deadline || ""
    });

  } else {
    // Non-recurring
    setRecurrence({
      enabled: false,
      frequency: "weekly",
      weekly: { weekdays: [] },
      monthly: null,
      startDate: "",
      endDate: ""
    });
  }

  setIsEditing(true);
  setEditSeries(editSeries);

  window.scrollTo({ top: 0, behavior: "smooth" });
};


  /* ----------------------------------
     RENDER
  ---------------------------------- */
return (
  <div style={{ padding: 20, ...dark }}>

    {/* STICKY BAR */}
    <div style={stickyBar(darkMode)}>
     

      <div style={{ paddingTop: 10 }}>
        <button
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "none",
            background: "#444",
            color: "white",
            cursor: "pointer"
          }}
          onClick={toggleDarkMode}
        >
          {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </div>
    </div>

    <h1>Tasks</h1>

    
    <TaskForm
      form={form}
      setForm={setForm}
      owners={owners}
      permissions={permissions}
      user={user}
      role={role}
      myTeam={myTeam}
      recurrence={recurrence}
      setRecurrence={setRecurrence}
      isEditing={isEditing}
      isSubmitting={isSubmitting}
      saveTask={saveTask}
      WEEKDAYS={WEEKDAYS}
      dark={dark}
    />


      {/* EXISTING TASKS */}
      <h2 style={{ marginTop: 100 }}>EXISTING TASKS</h2>

      {status && (
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
      📊 Filtered from chart
      </div>)}

    {/* FILTER BAR */}
    <TaskFilters
      filterKey={filterKey}
      filters={filters}
      setFilters={setFilters}
      owners={owners}
      creatorOptions={creatorOptions}
      TEAMS={TEAMS}
      REQUESTERS={REQUESTERS}
      STATUSES={STATUSES}
      resetTableFilters={resetTableFilters}
      />

      {/* TASK TABLE */}
     <TaskTable
      loading={loading}
      sortedTasks={sortedTasks}
      requestSort={requestSort}
      arrow={arrow}
      editTask={editTask}
      deleteTask={deleteTask}
      darkMode={darkMode}
      dark={dark}
      STATUS_COLORS={STATUS_COLORS}
      table={table}
      th={th}
      td={td}
    />
    </div>
  );
}

/* ----------------------------------
   STYLES
---------------------------------- */
const formBox = {
  display: "grid",
  gap: 10,
  maxWidth: 900,
  marginBottom: 30,
  padding: 12,
  borderRadius: 6
};

const formLabel = {
  display: "flex",
  flexDirection: "column",
  fontWeight: 600,
  fontSize: 14,
  gap: 6
};

const formInput = {
  padding: "6px 8px",
  border: "1px solid #D1D5DB",
  borderRadius: 4,
  height: 36,
  boxSizing: "border-box"
};


const filterBar = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 20
};

const table = dark => ({
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  background: dark ? "#111" : "white"
});


const th = dark => ({
  border: dark ? "1px solid #333" : "1px solid #D1D5DB",
  padding: 8,
  background: dark ? "#111" : "#F3F4F6",
  textAlign: "center",
  cursor: "pointer",
  fontWeight: 700,
  userSelect: "none"
});

const td = dark => ({
  border: dark ? "1px solid #333" : "1px solid #D1D5DB",
  padding: 8,
  textAlign: "center",
  whiteSpace: "normal",
  wordBreak: "break-word",
  verticalAlign: "top"
});


const stickyBar = dark => ({
  position: "sticky",
  top: 70,
  zIndex: 10,
  background: dark ? "#000" : "#fff",
  paddingBottom: 10,
  marginBottom: 20
});

const filterItem = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 13,
  fontWeight: 600
};
