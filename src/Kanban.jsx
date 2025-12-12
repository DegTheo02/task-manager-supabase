import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

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

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    setTasks(data || []);
  }

  async function updateStatus(task, newStatus) {
    await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", task.id);

    loadTasks();
  }

  return (
    <div style={{
      display: "flex",
      gap: "20px",
      padding: "20px",
      overflowX: "auto",
      minHeight: "80vh"
    }}>
      {STATUS_COLUMNS.map(col => (
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
            {col.label} ({tasks.filter(t => t.status === col.key).length})
          </h3>

          {tasks
            .filter(t => t.status === col.key)
            .map(task => (
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
                <strong>{task.title}</strong>
                <br />
                <span style={{ fontSize: "13px" }}>Owner: {task.owner}</span>
                <br />
                <span style={{ fontSize: "12px", opacity: 0.7 }}>
                  Assigned: {task.assigned_date}
                </span>

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
      ))}
    </div>
  );
}
