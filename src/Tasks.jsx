import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

/* ----------------------------------
   CONSTANTS
---------------------------------- */
const OWNERS = [
  "AURELLE",
  "CHRISTIAN",
  "SERGEA",
  "FABRICE",
  "FLORIAN",
  "JOSIAS",
  "ESTHER",
  "MARIUS",
  "THEOPHANE"
];

const STATUSES = [
  "OPEN",
  "ONGOING",
  "OVERDUE",
  "ON HOLD",
  "CLOSED ON TIME",
  "CLOSED PAST DUE"
];

const STATUS_COLORS = {
  OPEN: "#3B82F6",
  ONGOING: "#0EA5A8",
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
  THEOPHANE: "SM"
};

/* ----------------------------------
   TASKS PAGE
---------------------------------- */
export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  /* FILTERS */
  const [filters, setFilters] = useState({
    owners: [],
    statuses: [],
    deadline_from: "",
    deadline_to: ""
  });

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
    new_deadline: ""
  };

  const [form, setForm] = useState(emptyTask);
  const [isEditing, setIsEditing] = useState(false);

  /* LOAD TASKS */
  const loadTasks = async () => {
    setLoading(true);
    const { data } = await supabase.from("tasks").select("*").order("id");
    setTasks(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  /* APPLY FILTERS */
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filters.owners.length && !filters.owners.includes(t.owner))
        return false;

      if (filters.statuses.length && !filters.statuses.includes(t.status))
        return false;

      const deadline = t.new_deadline || t.initial_deadline;

      if (filters.deadline_from && deadline < filters.deadline_from)
        return false;

      if (filters.deadline_to && deadline > filters.deadline_to)
        return false;

      return true;
    });
  }, [tasks, filters]);

  /* CREATE / UPDATE */
  const saveTask = async () => {
    if (
      !form.title ||
      !form.owner ||
      !form.status ||
      !form.assigned_date ||
      !form.initial_deadline
    ) {
      alert("Please fill all required fields");
      return;
    }

    const payload = {
      title: form.title,
      owner: form.owner,
      team: form.team,
      status: form.status,
      recurrence_type: form.recurrence_type,
      assigned_date: form.assigned_date,
      initial_deadline: form.initial_deadline,
      new_deadline: form.new_deadline || null
    };

    if (isEditing) {
      await supabase.from("tasks").update(payload).eq("id", form.id);
    } else {
      await supabase.from("tasks").insert(payload);
    }

    setForm(emptyTask);
    setIsEditing(false);
    loadTasks();
  };

  /* DELETE */
  const deleteTask = async id => {
    if (!window.confirm("Delete this task?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    loadTasks();
  };

  /* EDIT */
  const editTask = task => {
    setForm(task);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ----------------------------------
     RENDER
  ---------------------------------- */
  return (
    <div style={{ padding: 20 }}>
      <h1>Tasks</h1>

      {/* ================= NEW / EDIT TASK ================= */}
      <div style={formBox}>
        <h2>{isEditing ? "Edit Task" : "New Task"}</h2>

        <div style={formGrid}>
          {/* LEFT COLUMN */}
          <div style={formColumn}>
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
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </label>

            <label style={formLabel}>
              Team
              <input
                style={{ ...formInput, background: "#F3F4F6" }}
                value={form.team}
                disabled
              />
            </label>

            <label style={formLabel}>
              Status *
              <select
                style={formInput}
                value={form.status}
                onChange={e =>
                  setForm(f => ({ ...f, status: e.target.value }))
                }
              >
                <option value="">Select status</option>
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>

          {/* RIGHT COLUMN */}
          <div style={formColumn}>
            <label style={formLabel}>
              Assigned date *
              <input
                type="date"
                style={formInput}
                value={form.assigned_date}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    assigned_date: e.target.value
                  }))
                }
              />
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
                value={form.new_deadline || ""}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    new_deadline: e.target.value
                  }))
                }
              />
            </label>

            <label style={formLabel}>
              Recurrence Type
              <select
                style={formInput}
                value={form.recurrence_type}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    recurrence_type: e.target.value
                  }))
                }
              >
                {RECURRENCE_TYPES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <button onClick={saveTask} style={{ marginTop: 12 }}>
          {isEditing ? "Update Task" : "Create Task"}
        </button>
      </div>

      {/* ================= EXISTING TASKS ================= */}
      <h2 style={{ marginTop: 30 }}>EXISTING TASKS</h2>

      {/* ================= FILTERS ================= */}
      <div style={filterBar}>
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
          <option disabled>Owners</option>
          {OWNERS.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>

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
          <option disabled>Status</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <input
          type="date"
          value={filters.deadline_from}
          onChange={e =>
            setFilters(f => ({
              ...f,
              deadline_from: e.target.value
            }))
          }
        />

        <input
          type="date"
          value={filters.deadline_to}
          onChange={e =>
            setFilters(f => ({
              ...f,
              deadline_to: e.target.value
            }))
          }
        />
      </div>

      {/* ================= TABLE ================= */}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Title</th>
              <th style={th}>Owner</th>
              <th style={th}>Team</th>
              <th style={th}>Status</th>
              <th style={th}>Recurrence</th>
              <th style={th}>Assigned</th>
              <th style={th}>Deadline</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map(t => (
              <tr key={t.id}>
                <td style={td}>{t.title}</td>
                <td style={td}>{t.owner}</td>
                <td style={td}>{t.team}</td>
                <td
                  style={{
                    ...td,
                    color: STATUS_COLORS[t.status],
                    fontWeight: 700
                  }}
                >
                  {t.status}
                </td>
                <td style={td}>{t.recurrence_type}</td>
                <td style={td}>{t.assigned_date}</td>
                <td style={td}>{t.new_deadline || t.initial_deadline}</td>
                <td style={td}>
                  <button onClick={() => editTask(t)}>Edit</button>{" "}
                  <button onClick={() => deleteTask(t.id)}>Delete</button>
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
  maxWidth: 800,
  marginBottom: 30
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 24
};

const formColumn = {
  display: "flex",
  flexDirection: "column",
  gap: 10
};

const formLabel = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  fontWeight: 600
};

const formInput = {
  flex: 1,
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

const table = {
  width: "100%",
  borderCollapse: "collapse"
};

const th = {
  border: "1px solid #D1D5DB",
  padding: 8,
  background: "#F3F4F6"
};

const td = {
  border: "1px solid #D1D5DB",
  padding: 8
};
