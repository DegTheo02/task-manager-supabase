import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import Navbar from "./Navbar";
import { useSearchParams } from "react-router-dom";




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

  const nextDate = (date, type) => {
    switch (type) {
      case "Weekly":
        return addDays(date, 7);
      case "Bi-Weekly":
        return addDays(date, 14);
      case "Monthly":
        return addMonths(date, 1);
      default:
        return null;
    }
  };

    const getLastWeekdayOfMonth = (year, month, weekday) => {
      const d = new Date(year, month + 1, 0); // last day
      while (d.getDay() !== weekday) {
        d.setDate(d.getDate() - 1);
      }
      return d;
    };
    
    const getNthWeekdayOfMonth = (year, month, weekday, nth) => {
      const d = new Date(year, month, 1);
      let count = 0;
    
      while (d.getMonth() === month) {
        if (d.getDay() === weekday) {
          count++;
          if (count === nth) return new Date(d);
        }
        d.setDate(d.getDate() + 1);
      }
      return null;
    };

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const addMonths = (date, months) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);

  // handle month overflow (e.g. Jan 31 → Feb)
  if (d.getDate() < day) {
    d.setDate(0);
  }
  return d;
};


/* ----------------------------------
   TASKS PAGE
---------------------------------- */
export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterKey, setFilterKey] = useState(0);

  // 🔁 RECURRENCE STATE
  const [isRecurring, setIsRecurring] = useState(false);
  const [repeatDays, setRepeatDays] = useState([]); // 0=Sun ... 6=Sat
  const [repeatFrom, setRepeatFrom] = useState("");
  const [repeatTo, setRepeatTo] = useState("");
  
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
  setFilters(f => ({
    ...f,
    statuses: statusesParam
      ? statusesParam.split(",")
      : status
      ? [status]
      : [],
    deadline_from: dateFrom || "",
    deadline_to: dateTo || "",
    owners: ownersParam ? ownersParam.split(",") : [],
    teams: teamsParam ? teamsParam.split(",") : [],
    requesters: requestersParam ? requestersParam.split(",") : []
  }));
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
    owner: "",
    team: "",
    requester: "",
    status: "",
    recurrence_type: "Non-Recurring",
    assigned_date: "",
    initial_deadline: "",
    new_deadline: "",
    closing_date: "" ,
    comments: "" 
  };

  const [form, setForm] = useState(emptyTask);
  const [isEditing, setIsEditing] = useState(false);

  /* LOAD DATA */
  const loadTasks = async () => {
    setLoading(true);
    const { data } = await supabase.from("tasks").select("*").order("id");
    
setTasks(data || []);


    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, []);

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

  function generateRecurringDates(from, to, weekdays) {
  const dates = [];
  const start = new Date(from);
  const end = new Date(to);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (weekdays.includes(d.getDay())) {
      dates.push(d.toISOString().slice(0, 10));
    }
  }
  return dates;
}

  
  /* SAVE TASK */
  const saveTask = async () => {
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

    const normalizedClosingDate =
    form.closing_date === "" ? null : form.closing_date;

    const formForStatus = {
  ...form,
  closing_date: normalizedClosingDate
};



const payload = {
  title: form.title,
  owner: form.owner,
  team: form.team,
  requester: form.requester,
  recurrence_type: form.recurrence_type,
  assigned_date: form.assigned_date,
  initial_deadline: form.initial_deadline,
  new_deadline: form.new_deadline || null,
  closing_date: normalizedClosingDate,
  comments: form.comments || null
};


    if (form.recurrence_type === "Monthly") {
  let cursor = new Date(form.initial_deadline);
  const end = new Date(repeatTo);

  while (cursor <= end) {
    let occurrenceDate;

    if (form.recurrence_rule === "DAY_OF_MONTH") {
      occurrenceDate = cursor;
    }

    if (form.recurrence_rule === "LAST_WEEKDAY") {
      occurrenceDate = getLastWeekdayOfMonth(
        cursor.getFullYear(),
        cursor.getMonth(),
        form.recurrence_weekday
      );
    }

    if (form.recurrence_rule === "NTH_WEEKDAY") {
      occurrenceDate = getNthWeekdayOfMonth(
        cursor.getFullYear(),
        cursor.getMonth(),
        form.recurrence_weekday,
        form.recurrence_nth
      );
    }

    if (occurrenceDate && occurrenceDate <= end) {
      rows.push({
        ...basePayload,
        recurrence_group_id: groupId,
        recurrence_rule: form.recurrence_rule,
        recurrence_weekday: form.recurrence_weekday,
        recurrence_nth: form.recurrence_nth,
        initial_deadline: occurrenceDate.toISOString().slice(0, 10)
      });
    }

    cursor = addMonths(cursor, 1);
  }
}


if (isEditing) {
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
        if (isRecurring) {
                  if (!repeatTo) {
          alert("Please select a recurrence end date");
          return;
                }

          const groupId = crypto.randomUUID();
        
          let cursor = new Date(form.initial_deadline);
          const end = new Date(repeatTo);
        
          const tasksToInsert = [];
        
          while (cursor <= end) {
            tasksToInsert.push({
              title: form.title,
              owner: form.owner,
              team: form.team,
              requester: form.requester,
              status: form.status,
              recurrence_type: form.recurrence_type, // Weekly / Bi-Weekly / Monthly
              recurrence_group_id: groupId,
              assigned_date: form.assigned_date,
              initial_deadline: cursor.toISOString().slice(0, 10),
              new_deadline: null,
              closing_date: null,
              comments: form.comments || null
            });
        
            const next = nextDate(cursor, form.recurrence_type);
            if (!next) break;
        
            cursor = next;
          }
        
          const { error } = await supabase
            .from("tasks")
            .insert(tasksToInsert);
        
          if (error) {
            alert("Failed to create recurring tasks");
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

  if (error) {
    console.error("Insert failed:", error);
    alert("Insert failed. Check console.");
    return;
  }
}


    setForm(emptyTask);
    setIsEditing(false);
    setIsRecurring(false);
    setRepeatDays([]);
    setRepeatFrom("");
    setRepeatTo("");
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
            width: "100%"
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
            Owner *
            <select
              style={formInput}
              value={form.owner}
              onChange={e => {
                const owner = e.target.value;
                setForm(f => ({
                  ...f,
                  owner,
                  team: OWNER_TEAM_MAP[owner] || ""
                }));
              }}
            >
              <option value="">Select owner</option>
              {OWNERS.map(o => (
                <option key={o} value={o}>
                  {o}
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
            Recurrence Type
            <select
              style={formInput}
              value={form.recurrence_type}
              onChange={e =>
                setForm(f => ({ ...f, recurrence_type: e.target.value }))
              }
            >
              {RECURRENCE_TYPES.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>


          {isRecurring && form.recurrence_type === "Monthly" && (
                <div
                  style={{
                    gridColumn: "span 9",
                    padding: 12,
                    border: "1px dashed #999",
                    borderRadius: 6
                  }}
                >
                  <strong>Monthly rule</strong>
              
                  <label>
                    <input
                      type="radio"
                      checked={form.recurrence_rule === "DAY_OF_MONTH"}
                      onChange={() =>
                        setForm(f => ({ ...f, recurrence_rule: "DAY_OF_MONTH" }))
                      }
                    />
                    Same day each month
                  </label>
              
                  <label>
                    <input
                      type="radio"
                      checked={form.recurrence_rule === "LAST_WEEKDAY"}
                      onChange={() =>
                        setForm(f => ({
                          ...f,
                          recurrence_rule: "LAST_WEEKDAY",
                          recurrence_weekday: new Date(
                            form.initial_deadline
                          ).getDay()
                        }))
                      }
                    />
                    Last weekday of month
                  </label>
              
                  <label>
                    <input
                      type="radio"
                      checked={form.recurrence_rule === "NTH_WEEKDAY"}
                      onChange={() =>
                        setForm(f => ({
                          ...f,
                          recurrence_rule: "NTH_WEEKDAY",
                          recurrence_weekday: new Date(
                            form.initial_deadline
                          ).getDay(),
                          recurrence_nth: Math.ceil(
                            new Date(form.initial_deadline).getDate() / 7
                          )
                        }))
                      }
                    />
                    Nth weekday of month
                  </label>
                </div>
              )}
              


          
          <label style={formLabel}>
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={e => setIsRecurring(e.target.checked)}
          />
          Recurring task
        </label>
        
        {isRecurring && (
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
                    checked={repeatDays.includes(d.value)}
                    onChange={() =>
                      setRepeatDays(prev =>
                        prev.includes(d.value)
                          ? prev.filter(x => x !== d.value)
                          : [...prev, d.value]
                      )
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
                  value={repeatFrom}
                  onChange={e => setRepeatFrom(e.target.value)}
                />
              </label>
        
              <label>
                To
                <input
                  type="date"
                  value={repeatTo}
                  onChange={e => setRepeatTo(e.target.value)}
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
              {OWNERS.map(o => (
                <option key={o} value={o}>{o}</option>
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
                style={{ ...th(darkMode), width: "10%" }}
                onClick={() => requestSort("recurrence_type")}
              >
                Recurrence{arrow("recurrence_type")}
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

              <th style={{ ...th(darkMode), width: "8%" }}>Actions</th>


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

                <td style={{ ...td(darkMode),fontSize: "12px"}}>{t.recurrence_type}</td>
                <td style={td(darkMode)}>{t.assigned_date}</td>
                <td style={td(darkMode)}>{t.initial_deadline}</td>
                <td style={td(darkMode)}>{t.new_deadline}</td>
                <td style={td(darkMode)}>{t.closing_date || "–"}</td>

                <td style={{ ...td(darkMode), fontSize: "12px" , textAlign: "left", whiteSpace: "pre-wrap"}}>{ t.comments }</td>

                <td style={{ ...td(darkMode), fontSize: "5px"}}>
                  <button 
                    style={{ fontSize: "10px", padding: "4px 4px" }} 
                   
                      onClick={() => {
                        if (t.recurrence_group_id) {
                          const applyToSeries = window.confirm(
                            "This is a recurring task.\n\nOK = Edit entire series\nCancel = Edit only this task"
                          );
                    
                          editTask(t, applyToSeries);
                        } else {
                          editTask(t, false);
                        }
                      }}
                    >
                      Edit
                  </button>{" "}
                  
                  <button 
                    style={{ fontSize: "10px", padding: "4px 4px" }} 
                      onClick={() => {
                        if (t.recurrence_group_id) {
                          const choice = window.confirm(
                            "OK = Delete this and all future occurrences\nCancel = Delete only this task"
                          );
                    
                          deleteTask(t, choice);
                        } else {
                          deleteTask(t, false);
                        }
                      }}
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
  borderRadius: 4
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
  zIndex: 1000,
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
