import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Filters from "./Filters";

// Weekday counter
function countWeekdays(startDate, endDate) {
  let count = 0;
  let current = new Date(startDate);

  while (current <= endDate) {
    const d = current.getDay();
    if (d !== 0 && d !== 6) count++; // Monday–Friday
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [filtered, setFiltered] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("tasks").select("*");
    setTasks(data || []);
    setFiltered(data || []); // initial view = all tasks
  }

  // --- FILTER LOGIC (same as Kanban) ---
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

  // ----------------------
  // KPI CALCULATIONS (use "filtered")
  // ----------------------

  const total = filtered.length;

  const open = filtered.filter(t => t.status === "OPEN").length;
  const ongoing = filtered.filter(t => t.status === "ONGOING").length;
  const overdue = filtered.filter(t => t.status === "OVERDUE").length;
  const onhold = filtered.filter(t => t.status === "ON HOLD").length;

  const closedOnTime = filtered.filter(t => t.status === "CLOSED ON TIME").length;
  const closedLate = filtered.filter(t => t.status === "CLOSED PAST DUE").length;
  const closedTotal = closedOnTime + closedLate;

  const percentOnTime = closedTotal > 0
    ? Math.round((closedOnTime / closedTotal) * 100)
    : 0;

  const durations = filtered
    .filter(t => t.duration_days)
    .map(t => t.duration_days);

  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a,b) => a + b, 0) / durations.length)
    : 0;

  // Tasks per owner
  const owners = [
    "AURELLE","CHRISTIAN","SERGEA","FABRICE","FLORIAN",
    "JOSIAS","ESTHER","MARIUS","THEOPHANE"
  ];

  const tasksPerOwner = owners.map(owner => ({
    owner,
    count: filtered.filter(t => t.owner === owner).length
  }));

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Dashboard</h1>

      {/* FILTER PANEL */}
      <Filters onChange={applyFilters} />

      {/* KPI GRID */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "20px",
        marginTop: "20px"
      }}>
        <KPI title="OPEN" value={open} color="#3B82F6" />
        <KPI title="ONGOING" value={ongoing} color="#0EA5A8" />
        <KPI title="OVERDUE" value={overdue} color="#DC2626" />
        <KPI title="ON HOLD" value={onhold} color="#6B7280" />

        <KPI title="Closed On Time" value={closedOnTime} color="#16A34A" />
        <KPI title="Closed Late" value={closedLate} color="#F97316" />

        <KPI title="% Completed On Time" value={`${percentOnTime}%`} color="#2563EB" />
        <KPI title="Average Duration (Weekdays)" value={avgDuration} color="#7C3AED" />
        <KPI title="Total Tasks" value={total} color="#000000" />
      </div>

      {/* OWNER TABLE */}
      <h2 style={{ marginTop: 40 }}>Tasks per Owner</h2>

      <table style={{ width: "50%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#E5E7EB" }}>
            <th style={{ padding: 10, border: "1px solid #ccc" }}>Owner</th>
            <th style={{ padding: 10, border: "1px solid #ccc" }}>Tasks</th>
          </tr>
        </thead>
        <tbody>
          {tasksPerOwner.map(row => (
            <tr key={row.owner}>
              <td style={{ padding: 8, border: "1px solid #ccc" }}>{row.owner}</td>
              <td style={{ padding: 8, border: "1px solid #ccc" }}>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}

// KPI CARD COMPONENT
function KPI({ title, value, color }) {
  return (
    <div style={{
      background: color,
      color: "white",
      borderRadius: "8px",
      padding: "20px",
      textAlign: "center"
    }}>
      <div style={{ fontSize: "16px", opacity: 0.8 }}>{title}</div>
      <div style={{ fontSize: "32px", fontWeight: "bold" }}>{value}</div>
    </div>
  );
}
