import { useState, useEffect } from "react";

/* ----------------------------------
   CONSTANTS
---------------------------------- */
const OWNERS = [
  "",
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
  "",
  "OPEN",
  "ONGOING",
  "OVERDUE",
  "ON HOLD",
  "CLOSED ON TIME",
  "CLOSED PAST DUE"
];

/* ----------------------------------
   COMPONENT
---------------------------------- */
export default function Filters({ onChange }) {
  const [filters, setFilters] = useState({
    owner: "",
    status: "",
    assigned_from: "",
    assigned_to: "",
    deadline_from: "",
    deadline_to: ""
  });

  useEffect(() => {
    onChange(filters);
  }, [filters, onChange]);

  function update(field, value) {
    setFilters(prev => ({ ...prev, [field]: value }));
  }

  function reset() {
    setFilters({
      owner: "",
      status: "",
      assigned_from: "",
      assigned_to: "",
      deadline_from: "",
      deadline_to: ""
    });
  }

  return (
    <div style={container}>
      {/* OWNER */}
      <FilterField label="Owner">
        <select
          value={filters.owner}
          onChange={e => update("owner", e.target.value)}
        >
          {OWNERS.map(o => (
            <option key={o} value={o}>
              {o || "All"}
            </option>
          ))}
        </select>
      </FilterField>

      {/* STATUS */}
      <FilterField label="Status">
        <select
          value={filters.status}
          onChange={e => update("status", e.target.value)}
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>
              {s || "All"}
            </option>
          ))}
        </select>
      </FilterField>

      {/* ASSIGNED DATE RANGE */}
      <FilterField label="Assigned From">
        <input
          type="date"
          value={filters.assigned_from}
          onChange={e => update("assigned_from", e.target.value)}
        />
      </FilterField>

      <FilterField label="Assigned To">
        <input
          type="date"
          value={filters.assigned_to}
          onChange={e => update("assigned_to", e.target.value)}
        />
      </FilterField>

      {/* DEADLINE RANGE */}
      <FilterField label="Deadline From">
        <input
          type="date"
          value={filters.deadline_from}
          onChange={e => update("deadline_from", e.target.value)}
        />
      </FilterField>

      <FilterField label="Deadline To">
        <input
          type="date"
          value={filters.deadline_to}
          onChange={e => update("deadline_to", e.target.value)}
        />
      </FilterField>

      {/* RESET */}
      <div style={{ alignSelf: "flex-end" }}>
        <button onClick={reset}>Reset</button>
      </div>
    </div>
  );
}

/* ----------------------------------
   HELPER COMPONENT
---------------------------------- */
function FilterField({ label, children }) {
  return (
    <div style={field}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

/* ----------------------------------
   STYLES
---------------------------------- */
const container = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
  marginBottom: 20,
  alignItems: "end"
};

const field = {
  display: "flex",
  flexDirection: "column"
};

const labelStyle = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 4
};

/* Apply uniform styling */
const inputStyle = {
  height: 34,
  padding: "6px 8px",
  fontSize: 14
};

/* Inject styles automatically */
const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
  input, select {
    height: 34px;
    padding: 6px 8px;
    font-size: 14px;
  }
`;
document.head.appendChild(styleSheet);
