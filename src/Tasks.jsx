import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Filters from "./Filters";
import Avatar from "./Avatar";
//import * as XLSX from "xlsx";
//import jsPDF from "jspdf";

// Weekday counter for duration
function countWeekdays(startDate, endDate) {
  let count = 0;
  let current = new Date(startDate);

  while (current <= endDate) {
    const d = current.getDay();
    if (d !== 0 && d !== 6) count++; // only weekdays
    current.setDate(current.getDate() + 1);
  }
  return count;
}

const STATUS_OPTIONS = [
  "OPEN", "ONGOING", "OVERDUE", "ON HOLD",
  "CLOSED ON TIME", "CLOSED PAST DUE"
];

const OWNERS = [
  "AURELLE", "CHRISTIAN", "SERGEA", "FABRICE", "FLORIAN",
  "JOSIAS", "ESTHER", "MARIUS", "THEOPHANE"
];

const STATUS_COLORS = {
  OPEN: "#3B82F6",
  ONGOING: "#0EA5A8",
  OVERDUE: "#DC2626",
  "ON HOLD": "#6B7280",
  "CLOSED ON TIME": "#16A34A",
  "CLOSED PAST DUE": "#F97316"
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    initial_deadline: "",
    new_deadline: "",
    owner: "",
    status: "OPEN",
    closing_date: ""
  });

  // Load tasks from Supabase
  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    setTasks(data || []);
    setFiltered(data || []);
  }

  // ---------------------------
  // FILTERING LOGIC
  // ---------------------------
  function applyFilters(f) {
    let result = [...tasks];

    if (f.search)
      result = result.filter(t =>
        t.title.toLowerCase().includes(f.search.toLowerCase())
      );

    if (f.owner)
      result = result.filter(t => t.owner === f.owner);

    if (f.status)
      result = result.filter(t => t.status === f.status);

    if (f.assignedFrom)
      result = result.filter(t => t.assigned_date >= f.assignedFrom);

    if (f.assignedTo)
      result = result.filter(t => t.assigned_date <= f.assignedTo);

    if (f.deadlineFrom)
      result = result.filter(t => t.initial_deadline >= f.deadlineFrom);

    if (f.deadlineTo)
      result = result.filter(t => t.initial_deadline <= f.deadlineTo);

    setFiltered(result);
  }

  // ---------------------------
  // RESET FORM
  // ---------------------------
  function resetForm() {
    setEditingId(null);
    setForm({
      title: "",
      initial_deadline: "",
      new_deadline: "",
      owner: "",
      status: "OPEN",
      closing_date: ""
    });
  }

  // ---------------------------
  // CREATE OR UPDATE TASK
  // ---------------------------
  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.title.trim())
      return alert("Title is required.");

    if (!form.owner)
      return alert("Owner is required.");

    const today = new Date().toISOString().slice(0, 10);

    let payload = {
      title: form.title,
      initial_deadline: form.initial_deadline || null,
      new_deadline: form.new_deadline || null,
      owner: form.owner,
      status: form.status,
      closing_date: form.closing_date || null
    };

    // Closing date required if task is closed
    if (
      (form.status === "CLOSED ON TIME" || form.status === "CLOSED PAST DUE") &&
      !form.closing_date
    ) {
      return alert("Please enter a Closing Date.");
    }

    // Duration calculation
    if (
      form.closing_date &&
      (form.status === "CLOSED ON TIME" || form.status === "CLOSED PAST DUE")
    ) {
      let assignedDate = today;

      if (editingId) {
        const res = await supabase
          .from("tasks")
          .select("assigned_date")
          .eq("id", editingId)
          .maybeSingle();

        assignedDate = res?.data?.assigned_date || today;
      }

      payload.duration_days = countWeekdays(
        new Date(assignedDate),
        new Date(form.closing_date)
      );
    }

    if (editingId) {
      await supabase.from("tasks").update(payload).eq("id", editingId);
    } else {
      payload.assigned_date = today;
      await supabase.from("tasks").insert(payload);
    }

    resetForm();
    load();
  }

  // ---------------------------
  // EDIT TASK
  // ---------------------------
  function handleEdit(task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      initial_deadline: task.initial_deadline || "",
      new_deadline: task.new_deadline || "",
      owner: task.owner,
      status: task.status,
      closing_date: task.closing_date || ""
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------------------------
  // DELETE TASK
  // ---------------------------
  async function deleteTask(id) {
    const ok = window.confirm("Delete this task?");
    if (!ok) return;
    await supabase.from("tasks").delete().eq("id", id);
    load();
  }

  // ---------------------------
  // EXPORT TO EXCEL
  // ---------------------------
  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, "tasks.xlsx");
  }

  // ---------------------------
  // EXPORT TO PDF
  // ---------------------------
  function exportPDF() {
    const doc = new jsPDF();
    doc.text("Task List", 10, 10);

    let y = 20;
    filtered.forEach(t => {
      doc.text(`${t.title} — ${t.status} — ${t.owner}`, 10, y);
      y += 10;
    });

    doc.save("tasks.pdf");
  }

  // ---------------------------
  // RENDER
  // ---------------------------
  return (
    <div style={{ padding: 20 }}>
      <h1>Tasks</h1>

      {/* FILTERS */}
      <Filters onChange={applyFilters} />

      {/* EXPORT BUTTONS */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={exportExcel} style={{ marginRight: 10 }}>
          Export to Excel
        </button>
        <button onClick={exportPDF}>
          Export to PDF
        </button>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} style={{
        background: "#F9FAFB",
        padding: 20,
        borderRadius: 8,
        border: "1px solid #E5E7EB",
        marginBottom: 30
      }}>
        <h3>{editingId ? "Edit Task" : "Create Task"}</h3>

        <input
          placeholder="Title"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          style={{ width: 300, marginBottom: 10, display: "block" }}
        />

        <label>Initial Deadline</label>
        <input
          type="date"
          value={form.initial_deadline}
          onChange={e => setForm({ ...form, initial_deadline: e.target.value })}
          style={{ marginBottom: 10, display: "block" }}
        />

        <label>New Deadline</label>
        <input
          type="date"
          value={form.new_deadline}
          onChange={e => setForm({ ...form, new_deadline: e.target.value })}
          style={{ marginBottom: 10, display: "block" }}
        />

        <label>Owner</label>
        <select
          value={form.owner}
          onChange={e => setForm({ ...form, owner: e.target.value })}
          style={{ marginBottom: 10, display: "block" }}
        >
          <option value="">-- Select Owner --</option>
          {OWNERS.map(o => <option key={o}>{o}</option>)}
        </select>

        <label>Status</label>
        <select
          value={form.status}
          onChange={e => setForm({ ...form, status: e.target.value })}
          style={{ marginBottom: 10, display: "block" }}
        >
          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>

        {(form.status === "CLOSED ON TIME" || form.status === "CLOSED PAST DUE") && (
          <>
            <label>Closing Date</label>
            <input
              type="date"
              value={form.closing_date}
              onChange={e => setForm({ ...form, closing_date: e.target.value })}
              style={{ marginBottom: 10, display: "block" }}
            />
          </>
        )}

        <button type="submit">
          {editingId ? "Update Task" : "Create Task"}
        </button>

        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            style={{ marginLeft: 10 }}
          >
            Cancel
          </button>
        )}
      </form>

      {/* TASK LIST */}
      <h2>All Tasks</h2>

      {filtered.map(task => (
        <div key={task.id} style={{
          background: "#FFF",
          padding: 10,
          borderRadius: 6,
          marginBottom: 10,
          borderLeft: `6px solid ${STATUS_COLORS[task.status]}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <strong>{task.title}</strong>

          <span style={{
            background: STATUS_COLORS[task.status],
            color: "white",
            padding: "2px 6px",
            borderRadius: 5,
            marginLeft: 10,
            fontSize: 12
          }}>
            {task.status}
          </span>

          {/* Avatar Owner Block */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
            <Avatar name={task.owner} size={26} />
            <span>{task.owner}</span>
          </div>

          <br />Assigned: {task.assigned_date}
          <br />Initial Deadline: {task.initial_deadline || "—"}
          <br />New Deadline: {task.new_deadline || "—"}
          <br />Closing Date: {task.closing_date || "—"}
          <br />Duration: {task.duration_days || "—"} weekdays

          <br /><br />

          <button onClick={() => handleEdit(task)}>Edit</button>
          <button
            onClick={() => deleteTask(task.id)}
            style={{ marginLeft: 10, background: "red", color: "white" }}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
