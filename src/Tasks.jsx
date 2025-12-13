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

/* ----------------------------------
   TASKS PAGE
---------------------------------- */
export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  /* FILTERS */
  const [filters, setFilters] = useState({
    owner: "",
    status: "",
    deadline_from: "",
    deadline_to: ""
  });

  /* NEW / EDIT FORM */
  const emptyTask = {
    id: null,
    title: "",
    owner: "",
    status: "",
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
      if (filters.owner && t.owner !== filters.owner) return false;
      if (filters.status && t.status !== filters.status) return false;

      const deadline = t.new_deadline || t.initial_deadline;
      if (filters.deadline_from && deadline < filters.deadline_from)
        return false;
      if (filters.deadline_to && deadline > filters.deadline_to)
        return false;

      return true;
    });
  }, [tasks, filters]);

  /* ----------------------------------
     CREATE / UPDATE
  ---------------------------------- */
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

    if (isEditing) {
      await supabase.from("tasks").update({
        title: form.title,
        owner: form.owner,
        status: form.status,
        assigned_date: form.assigned_date,
        initial_deadline: form.initial_deadline,
        new_deadline: form.new_deadline || null
      }).eq("id", form.id);
    } else {
      await supabase.from("tasks").insert({
        title: form.title,
        owner: form.owner,
        status: form.status,
        assigned_date: form.assigned_date,
        initial_deadline: form.initial_deadline,
        new_deadline: form.new_deadline || null
      });
    }

    setForm(emptyTask);
    setIsEditing(false);
    loadTasks();
  };

  /* ----------------------------------
     DELETE
  ---------------------------------- */
  const deleteTask = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    loadTasks();
  };

  /* ----------------------------------
     EDIT
  ---------------------------------- */
  const editTask = (task) => {
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

      {/* ================= CREATE / EDIT FORM ================= */}
      <div style={formBox}>
        <h2>{isEditing ? "Edit Task" : "New Task"}</h2>

        <input
          placeholder="Title *"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        />

        <select
          value={form.owner}
          onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
        >
          <option value="">Owner *</option>
          {OWNERS.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>

        <select
          value={form.status}
          onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
        >
          <option value="">Status *</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <input
          type="date"
          value={form.assigned_date}
          onChange={e =>
            setForm(f => ({ ...f, assigned_date: e.target.value }))
          }
        />

        <input
          type="date"
          value={form.initial_deadline}
          onChange={e =>
            setForm(f => ({ ...f, initial_deadline: e.target.value }))
          }
        />

        <input
          type="date"
          value={form.new_deadline || ""}
          onChange={e =>
            setForm(f => ({ ...f, new_deadline: e.target.value }))
          }
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={saveTask}>
            {isEditing ? "Update Task" : "Create Task"}
          </button>

          {isEditing && (
            <button
              onClick={() => {
                setForm(emptyTask);
                setIsEditing(false);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* ================= FILTERS ================= */}
      <div style={filterBar}>
        <select
          value={filters.owner}
          onChange={e => setFilters(f => ({ ...f, owner: e.target.value }))}
        >
          <option value="">All Owners</option>
          {OWNERS.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <input
          type="date"
          value={filters.deadline_from}
          onChange={e =>
            setFilters(f => ({ ...f, deadline_from: e.target.value }))
          }
        />

        <input
          type="date"
          value={filters.deadline_to}
          onChange={e =>
            setFilters(f => ({ ...f, deadline_to: e.target.value }))
          }
        />

        <button onClick={() => setFilters({
          owner: "",
          status: "",
          deadline_from: "",
          deadline_to: ""
        })}>
          Reset
        </button>
      </div>

      {/* ================= TABLE ================= */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Title</th>
              <th style={th}>Owner</th>
              <th style={th}>Status</th>
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
                <td style={td}>{t.status}</td>
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
  gap: 8,
  maxWidth: 500,
  marginBottom: 30
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
