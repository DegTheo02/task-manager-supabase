import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Filters from "./Filters";
import Avatar from "./Avatar";

const STATUS_COLUMNS = [
  { key: "OPEN", label: "Open" },
  { key: "ONGOING", label: "Ongoing" },
  { key: "OVERDUE", label: "Overdue" },
  { key: "ON HOLD", label: "On Hold" },
  { key: "CLOSED ON TIME", label: "Closed On Time" },
  { key: "CLOSED PAST DUE", label: "Closed Past Due" }
];

const STATUS_COLORS = {
  "OPEN": "#3B82F6",
  "ONGOING": "#0EA5A8",
  "CLOSED ON TIME": "#16A34A",
  "CLOSED PAST DUE": "#F97316",
  "OVERDUE": "#DC2626",
  "ON HOLD": "#6B7280"
};

export default function Kanban() {

  const [tasks, setTasks] = useState([]);
  const [filtered, setFiltered] = useState([]);

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    setTasks(data || []);
    setFiltered(data || []); // default filtered = all
  }

  // --- APPLY FILTERS ---
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

  async function updateStatus(task, newStatus) {
    await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", task.id);

    loadTasks();
  }

  return (
    <div style={{ padding: 20 }}>

      {/* FILTER PANEL */}
      <Filters onChange={applyFilters} />

      {/* KANBAN BOARD */}
      <div style={{
        display: "flex",
        gap: "20px",
        padding: "20px 0",
        overflowX: "auto",
        minHeight: "80vh"
      }}>
        {STATUS_COLUMNS.map(col => {
          const tasksInCol = filtered.filter(t => t.status === col.key);

          return (
            <div
              key={col.key}
              style={{
                width: "270px",
                background: "#F3F4F6",
                padding: "10px",
                borderRadius: "8px",
                boxShadow: "0 2px 5px rgba(0,0,0,0.08)"
              }}
            >
              <h3 style={{
                background: STATUS_COLORS[col.key],
                padding: "8px",
                color: "white",
                borderRadius: "6px",
                textAlign: "center"
              }}>
                {col.label} ({tasksInCol.length})
              </h3>

              {tasksInCol.map(task => (
                <div key={task.id}
                  style={{
                    background: "white",
                    marginTop: "10px",
                    padding: "10px",
                    borderRadius: "6px",
                    borderLeft: `4px solid ${STATUS_COLORS[col.key]}`,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.12)"
                  }}
                >
                  <strong>{task.title}</strong><br />
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Avatar name={task.owner} size={26} />
                    <small>{task.owner}</small>
                  </div>

                  <small>Assigned: {task.assigned_date}</small>

                  <br /><br />

                  <label style={{ fontSize: "12px" }}>Move to:</label>
                  <select
                    style={{ marginLeft: "5px" }}
                    value={task.status}
                    onChange={e => updateStatus(task, e.target.value)}
                  >
                    {STATUS_COLUMNS.map(s => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

            </div>
          );
        })}
      </div>
    </div>
  );
}
