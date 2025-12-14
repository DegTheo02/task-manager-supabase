import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

/* ----------------------------------
   CONSTANTS
---------------------------------- */
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

/* ----------------------------------
   KANBAN
---------------------------------- */
export default function Kanban() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.from("tasks").select("*");
    setTasks(data || []);
  }

  const isOverdue = task => {
    const d = task.new_deadline || task.initial_deadline;
    return d && d < new Date().toISOString().slice(0, 10);
  };

  return (
    <div style={board}>
      {STATUSES.map(status => {
        const list = tasks.filter(t => t.status === status);

        return (
          <div key={status} style={column}>
            {/* COLUMN HEADER */}
            <div style={header}>
              <span style={{ fontWeight: 700, color: STATUS_COLORS[status] }}>
                {status}
              </span>

              <span
                style={{
                  background: STATUS_COLORS[status],
                  color: "white",
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontSize: 12,
                  fontWeight: 700
                }}
              >
                {list.length}
              </span>
            </div>

            {/* TASKS */}
            {list.length === 0 ? (
              <div style={empty}>No tasks</div>
            ) : (
              list.map(task => (
                <div
                  key={task.id}
                  style={{
                    ...card,
                    borderLeft: `5px solid ${STATUS_COLORS[status]}`
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 18px rgba(0,0,0,0.2)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow =
                      "0 2px 8px rgba(0,0,0,0.1)";
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {task.title}
                  </div>

                  <div style={meta}>👤 {task.owner}</div>

                  <div style={footer}>
                    <span>📅 {task.new_deadline || task.initial_deadline}</span>
                    <span>{task.team}</span>
                  </div>

                  {isOverdue(task) && (
                    <div style={overdue}>⛔ Overdue</div>
                  )}
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------
   STYLES
---------------------------------- */
const board = {
  display: "flex",
  gap: 20,
  padding: 20,
  overflowX: "auto"
};

const column = {
  minWidth: 280,
  maxWidth: 320,
  background: "#F9FAFB",
  borderRadius: 12,
  padding: 12,
  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  gap: 10
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 6
};

const card = {
  background: "white",
  borderRadius: 10,
  padding: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  cursor: "pointer",
  transition: "transform 0.2s ease, box-shadow 0.2s ease"
};

const meta = {
  fontSize: 12,
  opacity: 0.8
};

const footer = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 12,
  marginTop: 6
};

const overdue = {
  marginTop: 6,
  color: "#DC2626",
  fontWeight: 700,
  fontSize: 12
};

const empty = {
  opacity: 0.5,
  fontSize: 13,
  textAlign: "center",
  padding: 20
};
