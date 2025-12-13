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

export default function Filters({ onChange }) {
  const update = (key, value) => {
    onChange(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={filterContainer}>
      {/* ROW 1 */}
      <div style={filterRow}>
        <select style={select} onChange={e => update("owner", e.target.value)}>
          <option value="">Owner</option>
          {OWNERS.map(o => <option key={o}>{o}</option>)}
        </select>

        <select style={select} onChange={e => update("team", e.target.value)}>
          <option value="">Team</option>
          {TEAMS.map(t => <option key={t}>{t}</option>)}
        </select>

        <select style={select} onChange={e => update("status", e.target.value)}>
          <option value="">Status</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>

        <select
          style={select}
          onChange={e => update("recurrence_type", e.target.value)}
        >
          <option value="">Recurrence</option>
          {RECURRENCE_TYPES.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      {/* ROW 2 */}
      <div style={filterRow}>
        <div style={dateGroup}>
          <span style={label}>Assigned date</span>
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
        </div>

        <div style={dateGroup}>
          <span style={label}>Deadline</span>
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
      </div>
    </div>
  );
}

/* ----------------------------------
   STYLES
---------------------------------- */
const filterContainer = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginBottom: 16
};

const filterRow = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap"
};

const dateGroup = {
  display: "flex",
  alignItems: "center",
  gap: 6
};

const label = {
  fontWeight: 600,
  fontSize: 12
};

const select = {
  height: 15,
  padding: "4px 6px",
  minWidth: 120
};

const dateInput = {
  height: 32,
  padding: "4px 6px",
  width: 130
};
