import React from "react";

const OWNERS = [
  "AURELLE","CHRISTIAN","SERGEA","FABRICE",
  "FLORIAN","JOSIAS","ESTHER","MARIUS","THEOPHANE"
];

const STATUSES = [
  "OPEN","ONGOING","OVERDUE","ON HOLD",
  "CLOSED ON TIME","CLOSED PAST DUE"
];

const TEAMS = ["BI", "CVM", "SM"];

const RECURRENCE_TYPES = [
  "Non-Recurring",
  "Recurring Weekly",
  "Recurring Monthly"
];

export default function Filters({ onChange }) {
  const updateMulti = (key, e) => {
    const values = [...e.target.selectedOptions].map(o => o.value);
    onChange(prev => ({ ...prev, [key]: values }));
  };

  const update = (key, value) => {
    onChange(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={filterContainer}>
      {/* MULTI-SELECT ROW */}
      <div style={filterRow}>
        <select multiple size={1} style={select} onChange={e => updateMulti("owners", e)}>
          <option disabled>Owners</option>
          {OWNERS.map(o => <option key={o}>{o}</option>)}
        </select>

        <select multiple size={1} style={select} onChange={e => updateMulti("teams", e)}>
          <option disabled>Teams</option>
          {TEAMS.map(t => <option key={t}>{t}</option>)}
        </select>

        <select multiple size={1} style={select} onChange={e => updateMulti("statuses", e)}>
          <option disabled>Status</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>

        <select
          multiple
          size={1}
          style={select}
          onChange={e => updateMulti("recurrence_types", e)}
        >
          <option disabled>Recurrence</option>
          {RECURRENCE_TYPES.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      {/* DATE RANGES — HORIZONTAL */}
      <div style={filterRow}>
        <div style={dateGroup}>
          <span style={label}>Assigned date</span>
          <input type="date" style={dateInput} onChange={e => update("assigned_from", e.target.value)} />
          <span>→</span>
          <input type="date" style={dateInput} onChange={e => update("assigned_to", e.target.value)} />
        </div>

        <div style={dateGroup}>
          <span style={label}>Deadline</span>
          <input type="date" style={dateInput} onChange={e => update("deadline_from", e.target.value)} />
          <span>→</span>
          <input type="date" style={dateInput} onChange={e => update("deadline_to", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */
const filterContainer = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginBottom: 16
};

const filterRow = {
  display: "flex",
  gap: 10,
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
  height: 32,
  minWidth: 140
};

const dateInput = {
  height: 32,
  width: 130
};
