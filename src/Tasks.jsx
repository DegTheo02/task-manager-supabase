import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { useSearchParams } from "react-router-dom";

import { useRecurrenceEngine } from "./hooks/useRecurrenceEngine";
import { useAuth } from "./context/AuthContext";
import TaskForm from "./components/tasks/TaskForm";
import TaskFilters from "./components/tasks/TaskFilters";
import TaskTable from "./components/tasks/TaskTable";
import { useTasks } from "./hooks/useTasks";
import { fetchProfileOptions } from "./api/tasksApi";
import { localDateString } from "./services/taskService";

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
  TEAMS,
  STATUS_COLORS,
  OWNER_TEAM_MAP,
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
   added in a later release can never come back undefined for a returning user.

   `owners` became `owner_ids` and `creators` became `creator_ids`: both now
   carry profile UUIDs rather than display labels. The old keys matched
   tasks.owner / creator_name, which are denormalised text — they agree with
   the dropdown only until someone is renamed, and then the filter silently
   returns nothing for that person. See readSavedFilters() for the upgrade
   path that converts a returning user's saved labels. */
const DEFAULT_FILTERS = {
  owner_ids: [],
  creator_ids: [],
  teams: [],
  requesters: [],
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

const FILTER_KEYS = Object.keys(DEFAULT_FILTERS);

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

/* ----------------------------------
   SESSION / URL FILTER BOOTSTRAP
---------------------------------- */

/* Restore saved filters, keeping ONLY keys the current shape knows about.
   The old version spread the whole saved object over the defaults, so a
   renamed key lingered forever as dead weight on every query.

   Legacy `owners` / `creators` arrays are pulled out separately: they hold
   labels, and labels cannot be turned into ids until the profile list has
   loaded. They are handed back as `pendingLabels` for the resolver effect. */
function readSavedFilters() {
  const raw = sessionStorage.getItem("tasksFilters");
  const empty = { filters: { ...DEFAULT_FILTERS }, pendingLabels: null };

  if (!raw) return empty;

  try {
    const saved = JSON.parse(raw);
    const filters = { ...DEFAULT_FILTERS };

    FILTER_KEYS.forEach(key => {
      if (saved[key] !== undefined) filters[key] = saved[key];
    });

    const owners = Array.isArray(saved.owners) ? saved.owners : null;
    const creators = Array.isArray(saved.creators) ? saved.creators : null;
    const hasLegacy = !!(owners?.length || creators?.length);

    return {
      filters,
      pendingLabels: hasLegacy ? { owners, creators } : null
    };
  } catch {
    return empty;
  }
}

/* Map display labels to profile ids. Case- and whitespace-insensitive,
   because the labels arriving here come from three places that have never
   been required to agree: a saved session, a chart deep-link, and the
   profiles table itself.

   Labels that resolve to nothing are DROPPED, not passed through. A label
   with no matching profile is the drift this whole change exists to remove;
   silently sending it to the server would reproduce the original bug. */
function labelsToIds(labels, profiles) {
  const byLabel = new Map(
    profiles
      .filter(p => p.owner_label)
      .map(p => [String(p.owner_label).trim().toLowerCase(), p.id])
  );

  const resolved = [];
  const dropped = [];

  labels.forEach(label => {
    const id = byLabel.get(String(label).trim().toLowerCase());
    if (id) resolved.push(id);
    else dropped.push(label);
  });

  if (dropped.length) {
    console.warn(
      "Tasks: these owner labels matched no profile and were dropped from " +
        "the filter:",
      dropped
    );
  }

  return resolved;
}

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
  const { user, permissions, team: myTeam, role } = useAuth();

  /* Read session + legacy labels exactly once, before first paint. */
  const bootstrapRef = useRef(null);
  if (bootstrapRef.current === null) bootstrapRef.current = readSavedFilters();

  const [filters, setFilters] = useState(() => bootstrapRef.current.filters);
  const [pendingLabels, setPendingLabels] = useState(
    () => bootstrapRef.current.pendingLabels
  );

  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  /* Sorting and every filter now run in Postgres, so they travel together
     into the query rather than being re-applied to whatever rows happen to
     be in memory. */
  const {
    tasks,
    total,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    reload,
    error,
    loadedCount
  } = useTasks(filters, sortConfig);

  /* TWO PROFILE LISTS, DELIBERATELY

     `owners`        — who the CURRENT USER MAY ASSIGN TO. Role-scoped: a
                       `user` gets only themselves, a manager only their team.
                       Feeds TaskForm and the save guards.

     `filterProfiles` — who the current user MAY SEE. Scoped by RLS on
                       `profiles` alone. Feeds the filter dropdowns.

     These were one list before, which meant a `user` with view_team_tasks
     could read their teammates' tasks but could not filter by them — the
     dropdown only ever offered their own name. */
  const [owners, setOwners] = useState([]);
  const [filterProfiles, setFilterProfiles] = useState([]);

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

  /* FILTERS → SESSION */
  useEffect(() => {
    sessionStorage.setItem("tasksFilters", JSON.stringify(filters));
  }, [filters]);

  /* FILTERS ← URL
     buildTasksUrl() still emits ?owners=LABEL,LABEL from Dashboard and
     DailyTaskVolume, so every existing chart deep-link and bookmark keeps
     working. The labels are queued for resolution rather than written
     straight into owner_ids. */
  useEffect(() => {
    if (
      !(
        status ||
        statusesParam ||
        dateFrom ||
        dateTo ||
        ownersParam ||
        teamsParam ||
        requestersParam
      )
    ) {
      return;
    }

    setFilters(f => ({
      ...f,
      statuses: statusesParam
        ? statusesParam.split(",")
        : status
        ? [status]
        : f.statuses,
      deadline_from: dateFrom || f.deadline_from,
      deadline_to: dateTo || f.deadline_to,
      teams: teamsParam ? teamsParam.split(",") : f.teams,
      requesters: requestersParam
        ? requestersParam.split(",")
        : f.requesters
    }));

    if (ownersParam) {
      setPendingLabels(prev => ({
        ...(prev || {}),
        owners: ownersParam.split(",")
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

  /* LABEL → UUID RESOLUTION
     Runs once the profile list is available, for both a returning user's
     saved session and an incoming chart deep-link. */
  useEffect(() => {
    if (!pendingLabels) return;
    if (!filterProfiles.length) return;

    const ownerIds = pendingLabels.owners
      ? labelsToIds(pendingLabels.owners, filterProfiles)
      : null;

    const creatorIds = pendingLabels.creators
      ? labelsToIds(pendingLabels.creators, filterProfiles)
      : null;

    setFilters(f => ({
      ...f,
      ...(ownerIds ? { owner_ids: ownerIds } : {}),
      ...(creatorIds ? { creator_ids: creatorIds } : {})
    }));

    setPendingLabels(null);
  }, [pendingLabels, filterProfiles]);

  const resetTableFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setSortConfig({ key: null, direction: null });
    setPendingLabels(null);

    // force re-render of filter controls
    setFilterKey(k => k + 1);
  };

  /* FORM */
  const emptyTask = {
    id: null,
    title: "",
    owner_id: "",        // single-owner (used for editing existing rows)
    owner: "",           // single-owner label (used for editing)
    owner_ids: [],       // multi-owner selection (used on create)
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

  /* RECURRENCE ENGINE */
  const {
    recurrence,
    setRecurrence,
    occurrences,
    isValid
  } = useRecurrenceEngine({
    startDate: form.initial_deadline
  });

  /* LOAD PROFILES */
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      try {
        /* Filter list: unscoped by role. RLS on `profiles` already decides
           who is visible, and the filter dropdowns should offer exactly
           that — no more, no less. */
        const all = await fetchProfileOptions({});
        if (!cancelled) setFilterProfiles(all);
      } catch (err) {
        console.error("Failed to load profiles for filters", err);
      }

      try {
        /* Assignment list: role-scoped. */
        let team = myTeam;

        if (role === "manager" && !team) {
          const { data: myProfile } = await supabase
            .from("profiles")
            .select("team")
            .eq("id", user.id)
            .maybeSingle();

          team = myProfile?.team || null;
        }

        const scoped = await fetchProfileOptions({
          role,
          userId: user.id,
          team
        });

        if (!cancelled) setOwners(scoped);
      } catch (err) {
        console.error("Failed to load assignable owners", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, role, myTeam]);

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
        owner_ids: [user.id]
      }));
    }
  }, [user, permissions, owners, isEditing]);

  /* SORTING

     The comparator that used to live here sorted `filteredTasks` — the rows
     already in memory. Under pagination that sorts page 1 and leaves pages
     2..n to arrive wherever they land, which is a quietly wrong table.
     sortConfig now feeds the query; Postgres orders the whole result set.

     The tri-state cycle is unchanged: asc → desc → unsorted, where unsorted
     falls back to the default (effective_deadline, id). */
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

  /* INFINITE SCROLL
     Now that useTasks actually returns hasMore and loadMore, this works.
     loadMore self-guards against re-entry, so a burst of scroll events
     cannot stack requests. The explicit button below the table is the
     fallback for when the page is short enough that no scroll ever fires. */
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop + 200 >=
        document.documentElement.offsetHeight
      ) {
        if (!loading && !loadingMore && hasMore) {
          loadMore();
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, loadingMore, hasMore, loadMore]);

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
    // Local date, not toISOString() — at UTC+1 the UTC date is the previous
    // day between 00:00 and 01:00, which would let a stale pointer through.
    const today = localDateString();

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
      const minAllowedDate = new Date();
      minAllowedDate.setDate(minAllowedDate.getDate() - 100);

      // Local components, not toISOString() — see repointSeriesHead.
      const minDateStr = localDateString(minAllowedDate);

      if (form.closing_date < minDateStr) {
        alert(`Only admins can set a closing date earlier than ${minDateStr}`);
        return;
      }
    }

    if (recurrence.enabled && !isValid) {
      alert("Invalid recurrence settings");
      return;
    }

    /* ✅ Permission guard — delegated to utils/ownerAssignment.

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

           owner_id is the source of truth. The label and the team are both
           DERIVED from the profile it names, so the three columns cannot
           disagree.
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
          console.log(`✅ Created ${createdCount} tasks`);
        }
      }

      // =========================
      // ✅ SUCCESS CLEANUP
      // =========================
      setForm(emptyTask);
      setIsEditing(false);
      reload();
    } catch (err) {
      console.error("❌ saveTask error:", err);
      alert(friendlyDbError(err));
    } finally {
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
      // .select("id") so a silent RLS refusal shows up as zero rows rather
      // than as a success that changed nothing.
      const { data, error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", task.id)
        .select("id");

      if (error) {
        alert(friendlyDbError(error));
        return;
      }

      if (!data?.length) {
        alert(
          "Nothing was deleted. Your account can read this task but is not " +
          "allowed to delete it."
        );
        return;
      }
    }

    reload();
  };

  const editTask = (task, editSeriesFlag = false) => {
    const normalized = normalizeTaskDates(task);

    setForm({
      ...normalized,
      comments: task.comments || "",
      owner_ids: task.owner_id ? [task.owner_id] : []
    });

    // ✅ Restore recurrence state
    if (task.recurrence_type && task.recurrence_type !== "Non-Recurring") {
      /* The Supabase JS client parses jsonb columns on the way out, so
         recurrence_rule arrives here as an OBJECT. Calling JSON.parse on it
         threw on every edit of a recurring task and was swallowed by the
         catch, leaving parsedRule null — which silently emptied the weekday
         selection and the monthly rule. Accept both shapes instead. */
      let parsedRule = task.recurrence_rule;

      if (typeof parsedRule === "string") {
        try {
          parsedRule = JSON.parse(parsedRule);
        } catch (e) {
          console.error("Failed to parse recurrence_rule:", e);
          parsedRule = null;
        }
      }

      setRecurrence({
        enabled: true,
        frequency: task.recurrence_type,
        weekly: {
          weekdays: parsedRule?.weekdays || []
        },
        monthly: parsedRule?.frequency === "monthly" ? parsedRule : null,
        startDate: task.initial_deadline || "",
        // Leaf occurrences (generated by the cron) carry next_occurrence_date
        // NULL. Seeding endDate from it left the "To" box empty, which made
        // isValid false and blocked the save with "Invalid recurrence settings".
        // Falling back to this row's own deadline keeps the form valid.
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
    setEditSeries(editSeriesFlag);

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
        </div>
      )}

      {/* FILTER BAR */}
      <TaskFilters
        filterKey={filterKey}
        filters={filters}
        setFilters={setFilters}
        profiles={filterProfiles}
        TEAMS={TEAMS}
        REQUESTERS={REQUESTERS}
        STATUSES={STATUSES}
        resetTableFilters={resetTableFilters}
        total={total}
        loadedCount={loadedCount}
        loading={loading}
      />

      {/* QUERY ERROR
          The old hook swallowed these and left the previous rows on screen,
          so a failed query rendered as a plausible result set. */}
      {error && (
        <div style={errorBanner}>
          ⚠️ Could not load tasks: {error.message || String(error)}
          <button style={retryButton} onClick={reload}>
            Retry
          </button>
        </div>
      )}

      {/* TASK TABLE
          `tasks` is already filtered AND sorted by Postgres — there is no
          client-side pass left to apply. The prop keeps its old name so
          TaskTable.jsx needs no change. */}
      <TaskTable
        loading={loading}
        sortedTasks={tasks}
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

      {/* PAGINATION
          Infinite scroll covers the common case; this is the fallback for a
          viewport tall enough that no scroll event ever fires. */}
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        {loadingMore && <span style={{ opacity: 0.7 }}>Loading more…</span>}

        {!loading && !loadingMore && hasMore && (
          <button style={loadMoreButton} onClick={loadMore}>
            Load more ({total - loadedCount} remaining)
          </button>
        )}

        {!loading && !hasMore && total > 0 && (
          <span style={{ opacity: 0.6, fontSize: 12 }}>
            All {total} task{total === 1 ? "" : "s"} loaded
          </span>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------
   STYLES
---------------------------------- */
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

const errorBanner = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 14px",
  marginBottom: 16,
  borderRadius: 6,
  background: "#FEF2F2",
  border: "1px solid #FCA5A5",
  color: "#991B1B",
  fontSize: 13,
  fontWeight: 600
};

const retryButton = {
  padding: "4px 12px",
  borderRadius: 4,
  border: "none",
  background: "#991B1B",
  color: "white",
  cursor: "pointer",
  fontWeight: 600
};

const loadMoreButton = {
  padding: "8px 20px",
  borderRadius: 6,
  border: "none",
  background: "#0EA5A8",
  color: "white",
  cursor: "pointer",
  fontWeight: 600
};
