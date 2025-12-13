import React from "react";

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

const TEAMS = ["BI", "CVM", "SM"];

const RECURRENCE_TYPES = [
  "Non-Recurring",
  "Recurring Weekly",
  "Recurring Monthly"
];

/* ----------------------------------
   FILTERS
---------------------------------- */
export default function Filters({ onChange }) {
  const update = (key, value) => {
    onChange(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={filterBar}>
      {/* OWNER */}
      <select
        style={select}
        onChange={e => update("owner", e.target.value)}
      >
        <option value="">Owner</option>
        {OWNERS.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>

      {/* TEAM */}
      <select
        style={select}
        onChange={e => update("team", e.target.value)}
      >
        <option value="">Team</option>
        {TEAMS.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      {/* STATUS */}
      <select
        style={select}
        onChange={e => update("status", e.target.value)}
      >
        <option value="">Status</option>
        {STATUSES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* RECURRENCE */}
      <select
        style={select}
        onChange={e => update("recurrence_type", e.target.value)}
      >
        <option value="">Recurrence</option>
        {RECURRENCE_TYPES.map(r => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      {/* ASSIGNED DATE */}
      <input
        type="date"
        style={dateInput}
        onChange={e => update("assigned_from", e.target.value)}
      />

      <input
        type="date"
        style={dateInput}
        onChange={e => update("assigned_to", e.target.value)}
      />

      {/* DEADLINE */}
      <input
        type="date"
        style={dateInput}
        onChange={e => update("deadline_from", e.target.value)}
      />

      <input
        type="date"
        style={dateInput}
        onChange={e => update("deadline_to", e.target.value)}
      />
    </div>
  );
}

/* ----------------------------------
   STYLES (COMPACT)
---------------------------------- */
const filterBar = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 16
};

const select = {
  height: 32,
  padding: "4px 6px",
  minWidth: 120
};

const dateInput = {
  height: 32,
  padding: "4px 6px",
  width: 130
};
