import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import Navbar from "./Navbar";
import { useSearchParams } from "react-router-dom";

import { useRecurrenceEngine } from "./hooks/useRecurrenceEngine";

import MonthlyRuleSelector from "./components/MonthlyRuleSelector";

import { useAuth } from "./context/AuthContext";






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
    setLoading(true);
    const { data } = await supabase.from("tasks").select("*").order("id");
    
setTasks(data || []);


    setLoading(false);
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
      return;
    }
  }
}
 else {
      // --------------------------------
      // SAVE TASK (single or recurring)
      // --------------------------------

      // 🚫 NON-RECURRING TASK — ALWAYS SINGLE INSERT
      if (!recurrence.enabled) {
      
        const { error } = await supabase
          .from("tasks")
          .insert(payload);
      
        if (error) {
          alert("Insert failed");
          return;
        }

        await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-task-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.access_token}`,
          },
          body: JSON.stringify({
            task: recurringPayload,
            creator_id: user.id,
          }),
        }
      );
      
        // ✅ CALL EDGE FUNCTION HERE
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-task-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.access_token}`,
            },
            body: JSON.stringify({
              task: payload,
              creator_id: user.id,
            }),
          }
        );
      
        loadTasks();
        setForm(emptyTask);
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
  setForm({
    ...normalizeTaskDates(task),
    comments: task.comments || ""
  });
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


      {/* NEW / EDIT TASK FORM */}
      <div style={{ ...formBox, ...dark }}>
        <h2>{isEditing ? "Edit Task" : "New Task"}</h2>

        {/* 1 ROW LAYOUT */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(9, 1fr)",
            gap: 20,
            width: "100%",
            alignItems: "end"
          }}
        >
          {/* ROW 1 */}
          <label style={formLabel}>
            Title *
            <input
              style={formInput}
              value={form.title}
              onChange={e =>
                setForm(f => ({ ...f, title: e.target.value }))
              }
            />
          </label>

          <label style={formLabel}>
            Assigned date *
            <input
              type="date"
              style={formInput}
              value={form.assigned_date}
              onChange={e =>
                setForm(f => ({ ...f, assigned_date: e.target.value }))
              }
            />
          </label>

          
            <label style={formLabel}>

              <select
                  style={{
                    ...formInput,
                    appearance: "none"
                  }}
                value={form.owner_id}
                onChange={e => {
                  const selectedOwnerId = e.target.value;
                
                  if (!permissions?.manage_users && selectedOwnerId !== user.id) {
                    alert("You can only assign tasks to yourself.");
                    return;
                  }
                
                  const selectedOwner = owners.find(
                    o => o.id === selectedOwnerId
                  );
                
                  if (!selectedOwner) return;
                
                  setForm(f => ({
                    ...f,
                    owner_id: selectedOwnerId,               // ✅ VERY IMPORTANT
                    owner: selectedOwner.owner_label,        // ✅ string, not object
                    team: role === "manager"
                      ? selectedOwner.team                  // ✅ correct team
                      : myTeam
                  }));
                }}

              >
                <option value="">Select owner</option>
                {owners.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.owner_label}
                  </option>
                ))}
              </select>   
            </label>


          <label style={formLabel}>
            Requester *
            <select
              style={formInput}
              value={form.requester}
              required
              onChange={e =>
                setForm(f => ({
                  ...f,
                  requester: e.target.value,
                  requester_other:
                    e.target.value === "OTHER" ? f.requester_other : ""
                }))
              }
            >
              <option value="">Select requester</option>
              {REQUESTERS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            </label>


          <label style={formLabel}>
            Initial deadline *
            <input
              type="date"
              style={formInput}
              value={form.initial_deadline}
              onChange={e =>
                setForm(f => ({
                  ...f,
                  initial_deadline: e.target.value
                }))
              }
            />
          </label>
      

          <label style={formLabel}>
            New deadline
            <input
              type="date"
              style={formInput}
              value={form.new_deadline}
              onChange={e =>
                setForm(f => ({ ...f, new_deadline: e.target.value }))
              }
            />
          </label>

              


          
          <label style={formLabel}>
          <input
            type="checkbox"
            checked={recurrence.enabled}
            onChange={e =>
              setRecurrence(r => ({
                ...r,
                enabled: e.target.checked
              }))
            }
          />  
          Recurring task
        </label>

             {/* RECURRENCE FREQUENCY */}
              {recurrence.enabled && (
                <label style={formLabel}>
                  Recurrence frequency
                  <select
                    style={formInput}
                    value={recurrence.frequency}
                      onChange={e =>
                        setRecurrence(r => ({
                          ...r,
                          frequency: e.target.value,
                          weekly: { weekdays: [] },
                          monthly:
                            e.target.value === "monthly"
                              ? {
                                  type: "day_of_month",
                                  day: new Date(form.initial_deadline).getDate()
                                }
                              : null
                        }))
                      }

                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </label>
              )}

          
          {/* ================= MONTHLY RECURRENCE BLOCK ================= */}
                {recurrence.enabled && recurrence.frequency === "monthly" && (
                  <div
                    style={{
                      gridColumn: "span 9",
                      padding: 12,
                      border: "1px dashed #999",
                      borderRadius: 6
                    }}
                  >
                    {/* Monthly rule selector (nth weekday / last weekday / day of month) */}
                      <MonthlyRuleSelector
                        value={recurrence.monthly}
                        baseDate={form.initial_deadline}
                        onChange={rule =>
                          setRecurrence(r => ({
                            ...r,
                            monthly: rule
                          }))
                        }
                      />

                
                    {/* Date range for monthly recurrence */}
                    <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                      <label>
                        From
                        <input
                          type="date"
                          value={recurrence.startDate}
                          onChange={e =>
                            setRecurrence(r => ({
                              ...r,
                              startDate: e.target.value
                            }))
                          }
                        />
                      </label>
                
                      <label>
                        To
                        <input
                          type="date"
                          value={recurrence.endDate}
                          onChange={e =>
                            setRecurrence(r => ({
                              ...r,
                              endDate: e.target.value
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                )}
  {/* ================= END MONTHLY RECURRENCE BLOCK ================= */}



          { /*  START WEEKLY/BIWEEKLY FREQUENCY SELECTOR BLOCK   */}
        {recurrence.enabled && (recurrence.frequency === "weekly" || recurrence.frequency === "biweekly") && (

          <div
            style={{
              gridColumn: "span 9",
              padding: 12,
              border: "1px dashed #999",
              borderRadius: 6
            }}
          >
            <div style={{ marginBottom: 10, fontWeight: 700 }}>             
                            
              Repeat on
            </div>
        
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              {WEEKDAYS.map(d => (
                <label key={d.value}>
                  <input
                    type="checkbox"
                    checked={recurrence.weekly.weekdays.includes(d.value)}

                    onChange={() =>
                      setRecurrence(r => ({
                        ...r,
                        weekly: {
                          ...r.weekly,
                          weekdays: r.weekly.weekdays.includes(d.value)
                            ? r.weekly.weekdays.filter(x => x !== d.value)
                            : [...r.weekly.weekdays, d.value]
                        }
                      }))
                    }

                    
                  />
                  {d.label}
                </label>
              ))}
            </div>
        
            <div style={{ display: "flex", gap: 12 }}>
              <label>
                From
                <input
                  type="date"
                    value={recurrence.startDate}
                    onChange={e =>
                      setRecurrence(r => ({
                        ...r,
                        startDate: e.target.value
                      }))
                    }

                />
              </label>
        
              <label>
                To
                <input
                  type="date"
                    value={recurrence.endDate}
                    onChange={e =>
                      setRecurrence(r => ({
                        ...r,
                        endDate: e.target.value
                      }))
                    }

                />
              </label>
            </div>
          </div>
        )}
        
        
                  
          
             <label style={formLabel}>
            Closing Date
            <input
              type="date"
              style={formInput}
              value={form.closing_date || ""}
              onChange={e =>
                setForm(f => ({ ...f, closing_date: e.target.value }))
              }
            />
          </label>
          <label style={formLabel}>
            Comments
           <textarea
             style={{
               ...formInput,
               minHeight: 30,
               resize: "vertical",
               resize: "horizontal"
             }}
             value={form.comments}
             onChange={e =>
               setForm(f => ({ ...f, comments: e.target.value }))
             }
             placeholder="Type your comment here…"
           />
         </label>

        </div>

        <button onClick={saveTask} style={{ marginTop: 10 }}>
          {isEditing ? "Update Task" : "Create Task"}
        </button>
      </div>

      {/* EXISTING TASKS */}
      <h2 style={{ marginTop: 100 }}>EXISTING TASKS</h2>

      {status && (
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
      📊 Filtered from chart
      </div>)}

      {/* FILTER BAR */}
      <div style={filterBar} key={filterKey}>

         {/* Search */}
         <div style={filterItem}>
           <span>🔍 Search</span>
           <input
             type="text"
             placeholder="Search title…"
             value={filters.search}
             onChange={e =>
               setFilters(f => ({ ...f, search: e.target.value }))
             }
           />
         </div>

         
          {/* Owners */}
           <div style={filterItem}>
            <span>👤 Owners</span>
            <select
              multiple
              size={1}
              value={filters.owners}
              onChange={e =>
                setFilters(f => ({
                  ...f,
                  owners: [...e.target.selectedOptions].map(o => o.value)
                }))
              }
            >
              {owners.map(o => (
                <option key={o.id} value={o.owner_label}>
                  {o.owner_label}
                </option>
              ))}
            </select>
          </div>


         {/* Teams */}
         <div style={filterItem}>
        <span>🏷 Teams</span>
        <select
          multiple
          size={1}
          value={filters.teams}
          onChange={e =>
            setFilters(f => ({
              ...f,
              teams: [...e.target.selectedOptions].map(o => o.value)
            }))
          }
        >
          {TEAMS.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

        {/* Requesters */}
        <div style={filterItem}>
          <span>📨 Requesters</span>
          <select
            multiple
            size={1}
            value={filters.requesters}
            onChange={e =>
              setFilters(f => ({
                ...f,
                requesters: [...e.target.selectedOptions].map(o => o.value)
              }))
            }
          >
            {REQUESTERS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>


          {/* Status */}
          <div style={filterItem}>
            <span>📌 Status</span>
            <select
              multiple
              size={1}
              value={filters.statuses}
              onChange={e =>
                setFilters(f => ({
                  ...f,
                  statuses: [...e.target.selectedOptions].map(o => o.value)
                }))
              }
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Deadline From */}
          <div style={filterItem}>
            <span>⏳ Deadline Range</span>
            <input
              type="date"
              value={filters.deadline_from}
              onChange={e =>
                setFilters(f => ({ 
                  ...f, 
                  deadline_from: e.target.value 
              }))}
            />
          </div>

          {/* Deadline To */}
          <div style={filterItem}>
            <span>&nbsp;</span>
            <input
              type="date"
              value={filters.deadline_to}
              onChange={e =>
                setFilters(f => ({ 
                  ...f, 
                  deadline_to: e.target.value 
              }))}
            />
          </div>

          {/* Closing From */}
          <div style={filterItem}>
            <span>✅ Closing Range</span>
            <input
              type="date"
              value={filters.closing_from}
              onChange={e =>
                setFilters(f => ({ 
                  ...f, 
                  closing_from: e.target.value 
              }))}
            />
          </div>

          {/* Closing To */}
          <div style={filterItem}>
            <span>&nbsp;</span>
            <input
              type="date"
              value={filters.closing_to}
              onChange={e =>
                setFilters(f => ({ 
                  ...f, 
                  closing_to: e.target.value 
              }))}
            />
          </div>

          {/* Today Button */}
          <div style={{ ...filterItem, justifyContent: "flex-end" }}>
            <span>Deadline</span>
            <button
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                background: "#0EA5A8",
                color: "white",
                cursor: "pointer",
                fontWeight: 600
              }}
              onClick={() =>
                setFilters(f => ({ ...f, today: !f.today 
              }))}
            >
              {filters.today ? "Show All" : "Today"}
            </button>
            </div>

            <div style={{ ...filterItem, justifyContent: "flex-end" }}>
            <span>&nbsp;</span>
            <button
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              background: "#DC2626",
              color: "white",
              cursor: "pointer",
              fontWeight: 600
            }}
            onClick={resetTableFilters}
          >
            🔄 Reset
          </button>

          </div>

        </div>


      {/* TASK TABLE */}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <table style={{ ...table(darkMode), ...dark }}>
          <thead>
            <tr>
              <th
                style={{ ...th(darkMode), textAlign: "left", width: "25%" }}
                onClick={() => requestSort("title")}
              >
                Title{arrow("title")}</th>


              <th
                style={{ ...th(darkMode), width: "9%" }}
                onClick={() => requestSort("owner")}
              >
                Owner{arrow("owner")}
              </th>


              <th
                style={{ ...th(darkMode), width: "5%" }}
                onClick={() => requestSort("team")}
              >
                Team{arrow("team")}
              </th>

              
              <th style={{ ...th(darkMode), width: "12%" }}>
                Requester
              </th>


              <th
                style={{ ...th(darkMode), width: "10%" }}
                onClick={() => requestSort("status")}
              >
                Status{arrow("status")}
              </th>


              <th
                style={{ ...th(darkMode), width: "8%" }}
                onClick={() => requestSort("assigned_date")}
              >
                Assigned{arrow("assigned_date")}
              </th>


              <th
                style={{ ...th(darkMode), width: "8%" }}
                onClick={() => requestSort("initial_deadline")}
              >
                Intial Deadline{arrow("initial_deadline")}
              </th>

              <th
                style={{ ...th(darkMode), width: "8%" }}
                onClick={() => requestSort("new_deadline")}
              >
                New Deadline{arrow("new_deadline")}
              </th>


              <th
                style={{ ...th(darkMode), width: "8%" }}
                onClick={() => requestSort("closing_date")}
              >
                Closing Date{arrow("closing_date")}
              </th>
              <th style={{ ...th(darkMode), width: "20%" }}>Comments</th>

              <th style={{ ...th(darkMode), width: "12%" }}>Actions</th>


            </tr>
          </thead>

          <tbody>
            {sortedTasks.map(t => (
              <tr key={t.id}>
                <td style={{ ...td(darkMode), textAlign: "left" ,fontSize: "14px"}}>{t.title}</td>
                <td style={td(darkMode)}>{t.owner}</td>
                <td style={td(darkMode)}>{t.team}</td>
                <td style={td(darkMode)}>{t.requester }</td>


                <td
                  style={{
                    ...td(darkMode),
                    color: STATUS_COLORS[t.status],
                    fontWeight: 700,
                    fontSize: "13px"
                  }}
                >
                  {t.status}
                </td>

                <td style={td(darkMode)}>{t.assigned_date}</td>
                <td style={td(darkMode)}>{t.initial_deadline}</td>
                <td style={td(darkMode)}>{t.new_deadline}</td>
                <td style={td(darkMode)}>{t.closing_date || "–"}</td>

                <td style={{ ...td(darkMode), fontSize: "12px" , textAlign: "left", whiteSpace: "pre-wrap"}}>{ t.comments }</td>

                <td style={{ ...td(darkMode), fontSize: "5px"}}>    
                <button
                  onClick={() => editTask(t, false)}
                  style={{ fontSize: "10px" }}
                >
                  Edit
                </button>
              
                {t.recurrence_group_id && (
                  <>
                    <button
                      onClick={() => editTask(t, true)}
                      style={{ fontSize: "10px", marginLeft: 4 }}
                    >
                      Edit Series
                    </button>
              
                    <button
                      onClick={() => deleteTask(t, true)}
                      style={{ fontSize: "10px", marginLeft: 4 }}
                    >
                      Delete Series
                    </button>
                  </>
                )}
              
                <button
                  onClick={() => deleteTask(t, false)}
                  style={{ fontSize: "10px", marginLeft: 4 }}
                >
                  Delete
                </button>
              </td>


              </tr>
            ))}
          </tbody>
        </table>
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
