import React, { useState } from "react";

const OWNER_LIST = [
  "AURELLE","CHRISTIAN","SERGEA","FABRICE","FLORIAN",
  "JOSIAS","ESTHER","MARIUS","THEOPHANE"
];

const STATUS_LIST = [
  "OPEN","ONGOING","OVERDUE","ON HOLD",
  "CLOSED ON TIME","CLOSED PAST DUE"
];

export default function Filters({ onChange }) {

  const [filters, setFilters] = useState({
    owner: "",
    status: "",
    search: "",
    assignedFrom: "",
    assignedTo: "",
    deadlineFrom: "",
    deadlineTo: ""
  });

  function updateField(field, value) {
    const updated = { ...filters, [field]: value };
    setFilters(updated);
    onChange(updated);   // send filters to parent
  }

  function reset() {
    const cleared = {
      owner: "",
      status: "",
      search: "",
      assignedFrom: "",
      assignedTo: "",
      deadlineFrom: "",
      deadlineTo: ""
    };
    setFilters(cleared);
    onChange(cleared);
  }

  return (
    <div style={{
      padding: 15,
      background: "#F9FAFB",
      borderRadius: "8px",
      marginBottom: 20,
      border: "1px solid #E5E7EB"
    }}>
      <h3>Filters</h3>

      {/* SEARCH */}
      <input
        placeholder="Search by title..."
        value={filters.search}
        onChange={e => updateField("search", e.target.value)}
        style={{ width: "200px", marginRight: "10px" }}
      />

      {/* OWNER */}
      <select
        value={filters.owner}
        onChange={e => updateField("owner", e.target.value)}
        style={{ marginRight: "10px" }}
      >
        <option value="">All Owners</option>
        {OWNER_LIST.map(o => <option key={o}>{o}</option>)}
      </select>

      {/* STATUS */}
      <select
        value={filters.status}
        onChange={e => updateField("status", e.target.value)}
        style={{ marginRight: "10px" }}
      >
        <option value="">All Statuses</option>
        {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
      </select>

      {/* ASSIGNED DATE RANGE */}
      <label style={{ marginLeft: "10px" }}>Assigned:</label>
      <input
        type="date"
        value={filters.assignedFrom}
        onChange={e => updateField("assignedFrom", e.target.value)}
      />
      <span> - </span>
      <input
        type="date"
        value={filters.assignedTo}
        onChange={e => updateField("assignedTo", e.target.value)}
      />

      {/* DEADLINE RANGE */}
      <label style={{ marginLeft: "15px" }}>Deadline:</label>
      <input
        type="date"
        value={filters.deadlineFrom}
        onChange={e => updateField("deadlineFrom", e.target.value)}
      />
      <span> - </span>
      <input
        type="date"
        value={filters.deadlineTo}
        onChange={e => updateField("deadlineTo", e.target.value)}
      />

      {/* RESET BUTTON */}
      <button
        onClick={reset}
        style={{
          marginLeft: "15px",
          background: "#DC2626",
          color: "white",
          border: "none",
          padding: "5px 10px",
          borderRadius: "6px"
        }}
      >
        Reset
      </button>
    </div>
  );
}
