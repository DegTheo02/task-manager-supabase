import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { getTasks, createTask, updateTask, deleteTask } from "./services/taskService";
import { fetchTasks,  createNewTask,  updateExistingTask,  removeTask} from "./api/tasksApi";
import Navbar from "./Navbar";
import { useSearchParams } from "react-router-dom";

import { useRecurrenceEngine } from "./hooks/useRecurrenceEngine";

import MonthlyRuleSelector from "./components/MonthlyRuleSelector";

import { useAuth } from "./context/AuthContext";
import TaskForm from "./components/tasks/TaskForm";
import TaskFilters from "./components/tasks/TaskFilters";






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



/* ----------------------------------
   TASKS PAGE
---------------------------------- */
export default function Tasks() {

  
  const { user, fullName, permissions,team: myTeam, ownerLabel, role } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
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
const [filters, setFilters] = useState(() => {
  const saved = sessionStorage.getItem("tasksFilters");
  return saved ? JSON.parse(saved) : {
  owners: [],
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
});

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
  setFilters({
    owners: [],
    teams: [],
    requesters: [],
    statuses: [],
    deadline_from: "",
    deadline_to: "",
    closing_from: "",
    closing_to: "",
    today: false
  });

  // force re-render of filter controls
  setFilterKey(k => k + 1);
};


  /* FORM */
const emptyTask = {
  id: null,
  title: "",
  owner_id: "",
  owner: "",
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
const loadTasks = async () => {
  try {
    setLoading(true);

const { tasks } = await fetchTasks(filters, 0, 5000);
setTasks(tasks);
    
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  
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
      loadTasks();
    }, []);
    
    useEffect(() => {
      loadOwners();
    }, [user, role]);



  useEffect(() => {
  if (user && !permissions?.manage_users) {
    const currentOwner = owners.find(o => o.id === user.id);

    setForm(f => ({
      ...f,
      owner_id: user.id,
      owner: currentOwner?.owner_label || ""
    }));
  }
}, [user, permissions, owners]);

  
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

  /* SORTING LOGIC */
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: null
  });

  const sortedTasks = useMemo(() => {
    if (!sortConfig.key) return filteredTasks;

    return [...filteredTasks].sort((a, b) => {
      const aV =
  sortConfig.key === "status"
    ? a.status
    : a[sortConfig.key] || "";

const bV =
  sortConfig.key === "status"
    ? b.status
    : b[sortConfig.key] || "";

      if (sortConfig.direction === "asc") return aV > bV ? 1 : -1;
      return aV < bV ? 1 : -1;
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

  const arrow = key =>
    sortConfig.key === key ? (sortConfig.direction === "asc" ? " ↑" : " ↓") : "";


  
  /* SAVE TASK */
  const saveTask = async () => {
  if (isSubmitting) return; // 🚫 Prevent double click

  setIsSubmitting(true);
    
    if (!user) {
    alert("Authentication error. Please login again.");
    return;
            }

    if (
      !form.title ||
      !form.owner ||
      !form.requester ||
      !form.assigned_date ||
      !form.initial_deadline
      
    ) {
      alert("Please fill all required fields");
      return;
    }

    // 🚫 Restrict old closing dates for non-admins
      if (form.closing_date && role !== "admin") {
        const today = new Date();
        const minAllowedDate = new Date();
        minAllowedDate.setDate(today.getDate() - 100);
      
        const minDateStr = minAllowedDate.toISOString().slice(0, 10);
      
        if (form.closing_date < minDateStr) {
          alert(
            `Only admins can set a closing date earlier than ${minDateStr}`
          );
          setIsSubmitting(false);
          return;
        }
      }

      /* ADDED VALIDATION: Check if recurrence data is valid */
  if (recurrence.enabled && !isValid) {
    alert("The recurrence rule is invalid. Please check the dates and frequency settings.");
    return;
  }

    const normalizedClosingDate =
    form.closing_date === "" ? null : form.closing_date;

    const formForStatus = {
  ...form,
  closing_date: normalizedClosingDate
};


    const buildRecurrenceRule = (recurrence) => {
      if (!recurrence.enabled) return null;
    
      if (recurrence.frequency === "weekly") {
        return {
          frequency: "weekly",
          weekdays: recurrence.weekly.weekdays
        };
      }
    
      if (recurrence.frequency === "monthly") {
        return {
          frequency: "monthly",
          ...recurrence.monthly
        };
      }
    
      return null;
    };

      // 🚫 Double protection: backend-level guard
      if (!permissions?.manage_users && form.owner_id !== user.id) {
        alert("You are not allowed to assign tasks to this user.");
        return;
      }

    if (!permissions?.manage_users) {
          form.team = myTeam;
        }

        const payload = {
          title: form.title,
          owner: form.owner,
          owner_id: form.owner_id, // for security
          created_by: user.id,   // 

          team: form.team,
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

    

if (isEditing) {
  
  // 🔐 Never allow owner_id to change on update
  const updatePayload = { ...payload };
  delete updatePayload.owner_id;
  
  if (editSeries && form.recurrence_group_id) {
    // 🔁 UPDATE ALL IN SERIES
    const { error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("recurrence_group_id", form.recurrence_group_id);

    if (error) {
      alert("Failed to update series");
      return;
    }
  } else {
    // ✏️ UPDATE SINGLE TASK
    const { error } = await supabase
      .from("tasks")
      .update(payload)
      .eq("id", form.id);

    if (error) {
      alert("Update failed");
      setIsSubmitting(false);   // ✅ add this
      return;
    }
      setForm(emptyTask);
      setIsEditing(false);
      await loadTasks();
      setIsSubmitting(false);     // ✅ VERY IMPORTANT
      return;                     // ✅ stop execution
  }
}
 else {
      // --------------------------------
      // SAVE TASK (single or recurring)
      // --------------------------------

        // 🚫 NON-RECURRING TASK — ALWAYS SINGLE INSERT

          if (!recurrence.enabled) {
            if (isSubmitting) return;
            setIsSubmitting(true);
          
            const { error } = await supabase
              .from("tasks")
              .insert(payload);
          
            if (error) {
              console.error("Insert failed:", error);
              alert(`Insert failed:\n\n${error.message}`);
              setIsSubmitting(false);
              return;
            }
          
            // ✅ Call Edge Function properly
            try {
              const { data, error } = await supabase.functions.invoke(
                "send-task-email",
                {
                  body: {
                    task: payload,
                    creator_id: user.id,
                  },
                }
              );
          
              if (error) {
                console.error("Email function error:", error);
              }
            } catch (err) {
              console.error("Email failed but task was created:", err);
            }
          
            setForm(emptyTask);
            await loadTasks();
            setIsSubmitting(false);
            return;
          }


                       
          // 🔁 RECURRING TASK — DATE-BASED
          if (recurrence.enabled) {
            if (!isValid) {
              alert("Please complete recurrence settings");
              return;
            }
          
            if (!recurrence.startDate || !recurrence.endDate) {
              alert("Please select a recurrence date range (From / To)");
              return;
            }

            
            if (occurrences.length === 0) {
              alert("No occurrences generated");
              return;
            }
          
            const firstDate = occurrences[0];
            const nextDate = occurrences.length > 1 ? occurrences[1] : null;
          
            const recurringPayload = {
              ...payload,
              initial_deadline: firstDate,
              next_occurrence_date: nextDate,
              recurrence_group_id: crypto.randomUUID()
            };
          
            // ✅ CORRECT PLACE FOR LOG
            console.log("🚀 INSERT PAYLOAD (Recurring)", recurringPayload);
          
            const { error } = await supabase
              .from("tasks")
              .insert(recurringPayload);
          
            if (error) {
              console.group("🚨 Supabase Insert Error (Recurring)");
              console.error("Message:", error.message);
              console.error("Details:", error.details);
              console.error("Hint:", error.hint);
              console.error("Code:", error.code);
              console.groupEnd();
              alert("Failed to create recurring task. Check console for details.");
              return;
            }
          
            loadTasks();
            setForm(emptyTask);
            return;
          }




     
 else {
        const { error } = await supabase
          .from("tasks")
          .insert(payload);
      
        if (error) {
          console.error(error);
          alert("Insert failed");
          return;
        }
      }
}


    setForm(emptyTask);
    setIsEditing(false);
    loadTasks();

/*
     if (!isEditing) {
  resetTableFilters(); // only clear filters on Create
}

     
     setFilters({
  owners: [],
  teams: [],
  statuses: [],
  recurrence_types: [],
  assigned_from: "",
  assigned_to: "",
  deadline_from: "",
  deadline_to: "",
  closing_from: "",
  closing_to: "",
  today: false
});
*/
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
    
      loadTasks();
    };



  const editTask = (task, editSeries = false) => {

  const normalized = normalizeTaskDates(task);

  setForm({
    ...normalized,
    comments: task.comments || ""
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
      endDate: task.next_occurrence_date || ""
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
      )}
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
