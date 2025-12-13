import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Avatar from "./Avatar";

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
  "CLOSED ON TIME",
  "CLOSED PAST DUE",
  "OVERDUE",
  "ON HOLD"
];

/* ----------------------------------
   COMPONENT
---------------------------------- */
export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
    title: "",
    assigned_date: "",
    initial_deadline: "",
    new_deadline: "",
    owner: "",
    status: "OPEN"
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("assigned_date", { ascending: false });

    setTasks(data || []);
  }

  function updateField(field, value) {
    setForm({ ...form, [field]: value });
  }

  async function saveTask() {
    if (
      !form.title ||
      !form.owner ||
      !form.assigned_date ||
      !form.initial_deadline
    ) {
      alert("Please fill all required fields.");
      return;
    }

    if (editingId) {
      await supabase.from("tasks").update(form).eq("id", editingId);
    } else {
      await supabase.from("tasks").insert(form);
    }

    setForm(emptyForm);
    setEditingId(null);
    loadTasks();
  }

  function editTask(task) {
    setEditingId(task.id);
    setForm({
      title: task.title || "",
      assigned_date: task.assigned_date || "",
      initial_deadline: task.initial_deadline || "",
      new_deadline: task.new_deadline || "",
      owner: task.owner || "",
      status: task.status || "OPEN"
    });
  }

  async function deleteTask(id) {
    if (!window.confirm("Delete this task?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    loadTasks();
  }

  /* ----------------------------------
     RENDER
  ---------------------------------- */
  return (
    <div style={{ padding: 20 }}>
      <h1>Tasks</h1>

      {/* FORM */}
      <div style={formContainer}>
        <FormRow label="Title">
          <input
            style={inputStyle}
            value={form.title}
            onChange={e => updateField("title", e.target.value)}
            placeholder="Task title"
          />
        </FormRow>

        <FormRow label="Owner">
          <select
            style={inputStyle}
            value={form.owner}
            onChange={e => updateField("owner", e.target.value)}
          >
            <option value="">-- Select owner --</option>
            {OWNERS.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </FormRow>

        <FormRow label="Assigned Date">
          <input
            style={inputStyle}
            type="date"
            value={form.assigned_date}
            onChange={e => updateField("assigned_date", e.target.value)}
          />
        </FormRow>

        <FormRow label="Initial Deadline">
          <input
            style={inputStyle}
            type="date"
            value={form.initial_deadline}
            onChange={e => updateField("initial_deadline", e.target.value)}
          />
        </FormRow>

        <FormRow label="New Deadline">
          <input
            style={inputStyle}
            type="date"
            value={form.new_deadline}
            onChange={e => updateField("new_deadline", e.target.value)}
          />
        </FormRow>

        <FormRow label="Status">
          <select
            style={inputStyle}
            value={form.status}
            onChange={e => updateField("status", e.target.value)}
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </FormRow>

        {/* ACTIONS */}
        <div style={actionsRow}>
          <div />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={saveTask}>
              {editingId ? "Update Task" : "Create Task"}
            </button>

            {editingId && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <table style={tableStyle}>
        <thead>
          <tr>
            <th>Owner</th>
            <th>Title</th>
            <th>Assigned</th>
            <th>Initial Deadline</th>
            <th>New Deadline</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {tasks.map(t => (
            <tr key={t.id}>
              <td style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Avatar name={t.owner} />
                {t.owner}
              </td>
              <td>{t.title}</td>
              <td>{t.assigned_date}</td>
              <td>{t.initial_deadline}</td>
              <td>{t.new_deadline || "-"}</td>
              <td>
                <span style={statusStyle(t.status)}>{t.status}</span>
              </td>
              <td>
                <button onClick={() => editTask(t)}>✏️</button>
                <button onClick={() => deleteTask(t.id)}>🗑</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ----------------------------------
   HELPER COMPONENT
---------------------------------- */
function FormRow({ label, children }) {
  return (
    <div style={formRow}>
      <label style={rowLabel}>{label}</label>
      <div>{children}</div>
    </div>
  );
}

/* ----------------------------------
   STYLES
---------------------------------- */
const formContainer = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  maxWidth: 600,
  marginBottom: 30
};

const formRow = {
  display: "grid",
  gridTemplateColumns: "180px 1fr",
  alignItems: "center",
  gap: 12
};

const rowLabel = {
  fontWeight: 600,
  fontSize: 14
};

const inputStyle = {
  height: 36,
  padding: "6px 10px",
  fontSize: 14,
  width: "100%"
};

const actionsRow = {
  display: "grid",
  gridTemplateColumns: "180px 1fr",
  marginTop: 10
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse"
};

function statusStyle(status) {
  const colors = {
    OPEN: "#3B82F6",
    ONGOING: "#0EA5A8",
    "CLOSED ON TIME": "#16A34A",
    "CLOSED PAST DUE": "#F97316",
    OVERDUE: "#DC2626",
    "ON HOLD": "#6B7280"
  };

  return {
    background: colors[status],
    color: "white",
    padding: "4px 8px",
    borderRadius: 6,
    fontSize: 12
  };
}
