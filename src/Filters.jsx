import React, { useState } from "react";

/* CONSTANTS */
import {
  OWNERS,
  TEAMS,
  STATUSES,
  RECURRENCE_TYPES,
  REQUESTERS
} from "./constants/taskConstants";



/* MULTI DROPDOWN */
function MultiDropdown({ label, icon, items, filterKey, values, onChange, darkMode }) {
  const [open, setOpen] = useState(false);

  const updateSelection = (value, checked) => {
    let updated;

    if (value === "ALL") {
      updated = checked ? items : [];
    } else {
      updated = checked
        ? [...values, value]
        : values.filter(v => v !== value);
    }

    onChange(prev => ({ ...prev, [filterKey]: updated }));
  };

  return (
    <div style={{ position: "relative", minWidth: 160 }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 16 }}>{icon}</span> {label}
      </div>

      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: "6px 8px",
          border: "1px solid #ccc",
          borderRadius: 6,
          cursor: "pointer",
          background: darkMode ? "#000" : "#fff",
          color: darkMode ? "#fff" : "#000"
        }}
      >
        {values.length === items.length
          ? "All Selected"
          : values.length === 0
          ? "Select…"
          : `${values.length} Selected`}
      </div>

      {open && (
        <div style={{
          position: "absolute",
          top: "110%",
          left: 0,
          width: "100%",
          background: darkMode ? "#111" : "#fff",
          border: "1px solid #ccc",
          padding: 8,
          borderRadius: 6,
          zIndex: 100,
          maxHeight: 180,
          overflowY: "auto",
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
        }}>
          <label style={optionRow}>
            <input
              type="checkbox"
              checked={values.length === items.length}
              onChange={e => updateSelection("ALL", e.target.checked)}
            />
            Select All
          </label>

          {items.map(v => (
            <label key={v} style={optionRow}>
              <input
                type="checkbox"
                checked={values.includes(v)}
                onChange={e => updateSelection(v, e.target.checked)}
              />
              {v}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

const optionRow = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 0",
  cursor: "pointer",
  fontSize: 13
};

/* MAIN FILTER COMPONENT */
export default function Filters({ onChange, values = {}, darkMode }) {

  const update = (key, value) => {
    onChange(prev => ({ ...prev, [key]: value }));
  };

  const darkStyle = darkMode ? { background: "#000", color: "#fff" } : {};

  return (
    <div style={container}>
      <MultiDropdown label="Owner(s)" icon="👤" items={OWNERS}
        filterKey="owners" values={values.owners || []}
        onChange={onChange} darkMode={darkMode} />

      <MultiDropdown label="Team(s)" icon="🧩" items={TEAMS}
        filterKey="teams" values={values.teams || []}
        onChange={onChange} darkMode={darkMode} />

      <MultiDropdown label="Requester(s)"  icon="📨"  items={REQUESTERS}
      filterKey="requesters"  values={values.requesters || []}
      onChange={onChange}  darkMode={darkMode} />

      <MultiDropdown label="Status(es)" icon="📌" items={STATUSES}
        filterKey="statuses" values={values.statuses || []}
        onChange={onChange} darkMode={darkMode} />

      <MultiDropdown label="Recurrence" icon="🔄" items={RECURRENCE_TYPES}
        filterKey="recurrence_types" values={values.recurrence_types || []}
        onChange={onChange} darkMode={darkMode} />

      <div style={{ minWidth: 160 }}>
        <label style={{ fontWeight: 600, fontSize: 13 }}>📅 Assigned</label>
        <div style={{ display: "flex", gap: 6 }}>
          <input 
            type="date" 
            value={values.assigned_from || ""}
            style={{ ...dateInput, ...darkStyle }}
            onChange={e => update("assigned_from", e.target.value)} />
          <input 
            type="date" 
            value={values.assigned_to || ""}
            style={{ ...dateInput, ...darkStyle }}
            onChange={e => update("assigned_to", e.target.value)} />
        </div>
      </div>

      <div style={{ minWidth: 160 }}>
        <label style={{ fontWeight: 600, fontSize: 13 }}>⏳ Deadline</label>
        <div style={{ display: "flex", gap: 6 }}>
          <input 
            type="date" 
            value={values.deadline_from || ""}
            style={{ ...dateInput, ...darkStyle }}
            onChange={e => update("deadline_from", e.target.value)} />
          <input 
            type="date" 
            value={values.deadline_to || ""}
            style={{ ...dateInput, ...darkStyle }}
            onChange={e => update("deadline_to", e.target.value)} />
        </div>
      </div>

            {/* Closing Date */}
      <div style={{ minWidth: 160 }}>
        <label style={{ fontWeight: 600, fontSize: 13 }}>✅ Closing Date</label>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="date"
            value={values.closing_from || ""}
            style={{ ...dateInput, ...darkStyle }}
            onChange={e => update("closing_from", e.target.value)}
          />
          <input
            type="date"
            value={values.closing_to || ""}
            style={{ ...dateInput, ...darkStyle }}
            onChange={e => update("closing_to", e.target.value)}
          />
        </div>
      </div>

    </div>
  );
}

const container = {
  display: "flex",
  gap: 25,
  flexWrap: "wrap",
  alignItems: "flex-start",
  marginBottom: 20
};

const dateInput = {
  height: 32,
  width: "100%",
  padding: "4px 6px",
  border: "1px solid #ccc",
  borderRadius: 4
};
