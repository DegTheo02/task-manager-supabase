import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import Navbar from "./Navbar";


/* ----------------------------------
   CONSTANTS
---------------------------------- */
const TEAMS = ["BI", "CVM", "SM", "FLYTXT", "IT", "OTHER"];

const OWNERS = [
  "AURELLE",
  "CHRISTIAN",
  "SERGEA",
  "FABRICE",
  "FLORIAN",
  "JOSIAS",
  "ESTHER",
  "MARIUS",
  "THEOPHANE",
  "FLYTXT",
  "IT",
  "OTHER"
  
];

const STATUSES = [
  "CLOSED ON TIME",
  "CLOSED PAST DUE",
  "ON TRACK",
  "OVERDUE",
  "ON HOLD"
];


const STATUS_COLORS = {
  "ON TRACK": "#3B82F6",
  OVERDUE: "#DC2626",
  "ON HOLD": "#6B7280",
  "CLOSED ON TIME": "#16A34A",
  "CLOSED PAST DUE": "#F97316"
};

const RECURRENCE_TYPES = [
  "Non-Recurring",
  "Recurring Weekly",
  "Recurring Monthly"
];

const OWNER_TEAM_MAP = {
  AURELLE: "BI",
  SERGEA: "BI",
  CHRISTIAN: "BI",
  FABRICE: "BI",
  FLORIAN: "CVM",
  ESTHER: "CVM",
  JOSIAS: "CVM",
  MARIUS: "CVM",
  THEOPHANE: "SM",
  FLYTXT: "FLYTXT",
  IT: "IT",
  OTHER: "OTHER"
};

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


const computeStatus = task => {
  const today = new Date().toISOString().slice(0, 10);
  const deadline = task.new_deadline || task.initial_deadline;

  // ON HOLD
  if (deadline >= "2026-12-31") return "ON HOLD";

  // NOT CLOSED
  if (!task.closing_date) {
    return deadline >= today ? "ON TRACK" : "OVERDUE";
  }

  // CLOSED
  if (task.closing_date > task.initial_deadline)
    return "CLOSED PAST DUE";

  return "CLOSED ON TIME";
};



/* ----------------------------------
   TASKS PAGE
---------------------------------- */
export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterKey, setFilterKey] = useState(0);

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
    statuses: [],
    recurrence_types: [],
    search: "",
    assigned_from: "",
    assigned_to: "",
    deadline_from: "",
    deadline_to: ""
  };
});

  useEffect(() => {
    sessionStorage.setItem("tasksFilters", JSON.stringify(filters));
  }, [filters]);

  
  const resetTableFilters = () => {
  setFilters({
    owners: [],
    teams: [],
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
    ? b._computedStatus
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
    if (
      !form.title ||
      !form.owner ||
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
  recurrence_type: form.recurrence_type,
  assigned_date: form.assigned_date,
  initial_deadline: form.initial_deadline,
  new_deadline: form.new_deadline || null,
  closing_date: normalizedClosingDate,
  comments: form.comments || null
};


if (isEditing) {
  const { error } = await supabase
    .from("tasks")
    .update(payload)
    .eq("id", form.id);

  if (error) {
    console.error("Update failed:", error);
    alert("Update failed. Check console.");
    return;
  }
} else {
  const { error } = await supabase
    .from("tasks")
    .insert(payload);

  if (error) {
    console.error("Insert failed:", error);
    alert("Insert failed. Check console.");
    return;
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
  const deleteTask = async id => {
    if (!window.confirm("Delete this task?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    loadTasks();
  };

const editTask = task => {
  setForm({
    ...normalizeTaskDates(task),
    comments: task.comments || ""
  });
  setIsEditing(true);
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
            gridTemplateColumns: "repeat(8, 1fr)",
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
                setFilters(f => ({ ...f, deadline_from: e.target.value }))
              }
            />
          </div>

          {/* Deadline To */}
          <div style={filterItem}>
            <span>&nbsp;</span>
            <input
              type="date"
              value={filters.deadline_to}
              onChange={e =>
                setFilters(f => ({ ...f, deadline_to: e.target.value }))
              }
            />
          </div>

          {/* Closing From */}
          <div style={filterItem}>
            <span>✅ Closing Range</span>
            <input
              type="date"
              value={filters.closing_from}
              onChange={e =>
                setFilters(f => ({ ...f, closing_from: e.target.value }))
              }
            />
          </div>

          {/* Closing To */}
          <div style={filterItem}>
            <span>&nbsp;</span>
            <input
              type="date"
              value={filters.closing_to}
              onChange={e =>
                setFilters(f => ({ ...f, closing_to: e.target.value }))
              }
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
                setFilters(f => ({ ...f, today: !f.today }))
              }
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
                  <button style={{ fontSize: "10px", padding: "4px 4px" }} onClick={() => editTask(t)}>Edit</button>{" "}
                  <button style={{ fontSize: "10px", padding: "4px 4px" }} onClick={() => deleteTask(t.id)}>Delete</button>
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






