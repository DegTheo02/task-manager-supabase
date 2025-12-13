import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Avatar from "./Avatar";

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

  // ----------------------------
  // FORM UPDATE
  // ----------------------------
  function updateField(field, value) {
    setForm({ ...form, [field]: value });
  }

  // ----------------------------
  // CREATE / UPDATE
  // ----------------------------
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

  // ----------------------------
  // EDIT
  // ----------------------------
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

  // ----------------------------
  // DELETE
  // ----------------------------
  async function deleteTask(id) {
    if (!window.confirm("Delete this task?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    loadTasks();
  }

  // ----------------------------
  // RENDER
  // ----------------------------
  return (
    <div style={{ padding: 20 }}>
      <h1>Tasks</h1>

      {/* FORM */}
      <div style={formStyle}>
        <input
          placeholder="Task title"
          value={form.title}
          onChange={e => updateField("title", e.target.value)}
        />

        <input
          type="date"
          value={form.assigned_date}
          onChange={e => updateField("assigned_date", e.target.value)}
        />

        <input
          type="date"
          value={form.initial_deadline}
          onChange={e => updateField("initial_deadline", e.target.value)}
        />

        <input
          type="date"
          value={form.new_deadline}
          onChange={e => updateField("new_deadline", e.target.value)}
        />

        <select
          value={form.owner}
          onChange={e => updateField("owner", e.target.value)}
        >
          <option value="">-- Select owner --</option>
          {OWNERS.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>

        <select
          value={form.status}
          onChange={e => updateField("status", e.target.value)}
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

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

      {/* TASK TABLE */}
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
              <td style={{ display: "flex", gap: 6, alignItems: "center" }}>
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

// ----------------------------
// STYLES
// ----------------------------
const formStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
  marginBottom: 20
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
