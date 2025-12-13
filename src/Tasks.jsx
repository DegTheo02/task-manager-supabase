import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

/* ----------------------------------
   CONSTANTS (KEEP CONSISTENT)
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

  const [filters, setFilters] = useState({
    owner: "",
    status: "",
    deadline_from: "",
    deadline_to: ""
  });

  /* LOAD TASKS */
  useEffect(() => {
    setLoading(true);
    supabase
      .from("tasks")
      .select("*")
      .then(({ data }) => {
        setTasks(data || []);
        setLoading(false);
      });
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
     RENDER
  ---------------------------------- */
  return (
    <div style={{ padding: 20 }}>
      <h1>Tasks</h1>

      {/* ================= FILTERS ================= */}
      <div style={filterBar}>
        {/* OWNER */}
        <select
          value={filters.owner}
          onChange={e =>
            setFilters(f => ({ ...f, owner: e.target.value }))
          }
        >
          <option value="">All Owners</option>
          {OWNERS.map(o => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>

        {/* STATUS */}
        <select
          value={filters.status}
          onChange={e =>
            setFilters(f => ({ ...f, status: e.target.value }))
          }
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* DEADLINE FROM */}
        <input
          type="date"
          value={filters.deadline_from}
          onChange={e =>
            setFilters(f => ({ ...f, deadline_from: e.target.value }))
          }
        />

        {/* DEADLINE TO */}
        <input
          type="date"
          value={filters.deadline_to}
          onChange={e =>
            setFilters(f => ({ ...f, deadline_to: e.target.value }))
          }
        />

        {/* RESET */}
        <button
          onClick={() =>
            setFilters({
              owner: "",
              status: "",
              deadline_from: "",
              deadline_to: ""
            })
          }
        >
          Reset
        </button>
      </div>

      {/* ================= TABLE ================= */}
      {loading ? (
        <p>Loading tasks...</p>
      ) : (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Title</th>
              <th style={th}>Owner</th>
              <th style={th}>Status</th>
              <th style={th}>Assigned Date</th>
              <th style={th}>Deadline</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={5} style={emptyRow}>
                  No tasks found
                </td>
              </tr>
            ) : (
              filteredTasks.map(task => (
                <tr key={task.id}>
                  <td style={td}>{task.title}</td>
                  <td style={td}>{task.owner}</td>
                  <td style={td}>{task.status}</td>
                  <td style={td}>{task.assigned_date}</td>
                  <td style={td}>
                    {task.new_deadline || task.initial_deadline}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ----------------------------------
   STYLES
---------------------------------- */
const filterBar = {
  display: "flex",
  gap: 12,
  marginBottom: 20,
  flexWrap: "wrap"
};

const table = {
  width: "100%",
  borderCollapse: "collapse"
};

const th = {
  border: "1px solid #D1D5DB",
  padding: 8,
  background: "#F3F4F6",
  textAlign: "left"
};

const td = {
  border: "1px solid #D1D5DB",
  padding: 8
};

const emptyRow = {
  textAlign: "center",
  padding: 20,
  color: "#6B7280"
};
