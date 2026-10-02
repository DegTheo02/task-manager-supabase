// src/components/tasks/TaskFilters.jsx
import React, { useMemo } from "react";

/* =============================================================================
   WHAT CHANGED AND WHY

   1. ALL option on every multi-select.
      An empty multi-select means "no restriction", but nothing on screen said
      so — an empty box and a box whose selection you cannot see look identical
      in a size={1} list. "All" is rendered first and shows as selected
      whenever the filter is empty, so the unfiltered state is now legible
      rather than inferred.

   2. Owners and Created By carry UUIDs, not labels.
      The owner dropdown was built from profiles.owner_label and matched
      against the denormalised tasks.owner text. Those agree only until someone
      is renamed; after that the filter returns zero rows for that person with
      no error. owner_id is the FK and the column every RLS policy on `tasks`
      already keys on.

   3. One MultiSelectFilter instead of five hand-rolled selects.
      The All-handling below has a non-obvious case in it (see the comment on
      handleChange). Writing it five times would mean getting it right five
      times.

   PROPS CHANGED
     owners          -> profiles   (the raw [{ id, owner_label }] list)
     creatorOptions  -> derived from profiles, no longer passed in
     total / loadedCount           (new, optional — result counter)
============================================================================= */

/* Sentinel for the All option. Deliberately not "" — an empty string is a
   legitimate value for a text column and would collide. */
const ALL_VALUE = "__ALL__";

/* -----------------------------------------------------------------------------
   MultiSelectFilter

   A native multi-select whose empty state reads as "All" rather than as blank.
----------------------------------------------------------------------------- */
function MultiSelectFilter({
  label,
  value = [],
  options = [],
  onChange,
  allLabel = "All",
  size = 1
}) {
  const selected = value.length ? value : [ALL_VALUE];

  const handleChange = event => {
    const picked = [...event.target.selectedOptions].map(o => o.value);
    const hasAll = picked.includes(ALL_VALUE);
    const others = picked.filter(v => v !== ALL_VALUE);

    /* The case worth spelling out: when the filter is already empty, All is
       rendered as selected. A ctrl-click on a real option then yields
       [ALL, thatOption] — the user is adding an option, not choosing All.
       So All only clears the filter when it was NOT already in effect;
       otherwise the real options win and All drops away on its own. */
    const wasAll = value.length === 0;

    if (hasAll && !wasAll) {
      onChange([]);
      return;
    }

    onChange(others);
  };

  return (
    <div style={filterItem}>
      <span>
        {label}
        {value.length > 0 && (
          <span style={activeCount}> ({value.length})</span>
        )}
      </span>

      <select multiple size={size} value={selected} onChange={handleChange}>
        <option value={ALL_VALUE}>{allLabel}</option>

        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* -----------------------------------------------------------------------------
   TaskFilters
----------------------------------------------------------------------------- */
export default function TaskFilters({
  filters,
  setFilters,
  profiles = [],
  TEAMS = [],
  REQUESTERS = [],
  STATUSES = [],
  resetTableFilters,
  filterKey,
  total = 0,
  loadedCount = 0,
  loading = false
}) {
  /* Owners and Created By share one source. Profiles is the right one for
     both: it is stable across pages, and RLS on `profiles` already decides
     who is visible. The old Created By list was derived from the rows
     currently loaded, which only worked while every row loaded at once —
     under pagination it would have listed page 1's creators and silently
     dropped everyone else. */
  const profileOptions = useMemo(
    () =>
      profiles
        .filter(p => p.id)
        .map(p => ({
          value: p.id,
          label: p.owner_label || "(no label)"
        })),
    [profiles]
  );

  const toOptions = list => list.map(v => ({ value: v, label: v }));

  const setFilter = (key, nextValue) =>
    setFilters(f => ({ ...f, [key]: nextValue }));

  return (
    <div style={filterBar} key={filterKey}>
      {/* Search */}
      <div style={filterItem}>
        <span>🔍 Search</span>
        <input
          type="text"
          placeholder="Search title…"
          value={filters.search || ""}
          onChange={e => setFilter("search", e.target.value)}
        />
      </div>

      {/* Owners — values are profiles.id, matched against tasks.owner_id */}
      <MultiSelectFilter
        label="👤 Owners"
        allLabel="All owners"
        value={filters.owner_ids || []}
        options={profileOptions}
        onChange={next => setFilter("owner_ids", next)}
      />

      {/* Teams */}
      <MultiSelectFilter
        label="🏷 Teams"
        allLabel="All teams"
        value={filters.teams || []}
        options={toOptions(TEAMS)}
        onChange={next => setFilter("teams", next)}
      />

      {/* Requesters */}
      <MultiSelectFilter
        label="📨 Requesters"
        allLabel="All requesters"
        value={filters.requesters || []}
        options={toOptions(REQUESTERS)}
        onChange={next => setFilter("requesters", next)}
      />

      {/* Created By — values are profiles.id, matched against tasks.created_by */}
      <MultiSelectFilter
        label="🖊 Created By"
        allLabel="All creators"
        value={filters.creator_ids || []}
        options={profileOptions}
        onChange={next => setFilter("creator_ids", next)}
      />

      {/* Status */}
      <MultiSelectFilter
        label="📌 Status"
        allLabel="All statuses"
        value={filters.statuses || []}
        options={toOptions(STATUSES)}
        onChange={next => setFilter("statuses", next)}
      />

      {/* Deadline From */}
      <div style={filterItem}>
        <span>⏳ Deadline Range</span>
        <input
          type="date"
          value={filters.deadline_from || ""}
          disabled={!!filters.today}
          title={
            filters.today
              ? "Turn off the Today filter to use a deadline range"
              : undefined
          }
          onChange={e => setFilter("deadline_from", e.target.value)}
        />
      </div>

      {/* Deadline To */}
      <div style={filterItem}>
        <span>&nbsp;</span>
        <input
          type="date"
          value={filters.deadline_to || ""}
          disabled={!!filters.today}
          title={
            filters.today
              ? "Turn off the Today filter to use a deadline range"
              : undefined
          }
          onChange={e => setFilter("deadline_to", e.target.value)}
        />
      </div>

      {/* Closing From */}
      <div style={filterItem}>
        <span>✅ Closing Range</span>
        <input
          type="date"
          value={filters.closing_from || ""}
          onChange={e => setFilter("closing_from", e.target.value)}
        />
      </div>

      {/* Closing To */}
      <div style={filterItem}>
        <span>&nbsp;</span>
        <input
          type="date"
          value={filters.closing_to || ""}
          onChange={e => setFilter("closing_to", e.target.value)}
        />
      </div>

      {/* Today — overrides the deadline range rather than intersecting with
          it, which is why the two date inputs above disable while it is on.
          The range inputs keep their values and come back when it is off. */}
      <div style={{ ...filterItem, justifyContent: "flex-end" }}>
        <span>Deadline</span>
        <button
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            border: "none",
            background: filters.today ? "#0F766E" : "#0EA5A8",
            color: "white",
            cursor: "pointer",
            fontWeight: 600
          }}
          onClick={() => setFilters(f => ({ ...f, today: !f.today }))}
        >
          {filters.today ? "Show All" : "Today"}
        </button>
      </div>

      <div style={{ ...filterItem, justifyContent: "flex-end" }}>
        <span>&nbsp;</span>
        <button
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            border: "none",
            background: "#DC2626",
            color: "white",
            cursor: "pointer",
            fontWeight: 600
          }}
          onClick={resetTableFilters}
        >
          🔄 Reset
        </button>
      </div>

      {/* RESULT COUNT
          Rows rendered vs rows matching the filters. This is the line that
          would have made the original bug announce itself: "2 of 2" is a
          correct Today result, "2 of 847" is a truncated one, and until now
          the UI showed neither. */}
      <div style={{ ...filterItem, justifyContent: "flex-end" }}>
        <span>&nbsp;</span>
        <div style={countBadge}>
          {loading
            ? "Loading…"
            : loadedCount === total
            ? `${total} task${total === 1 ? "" : "s"}`
            : `Showing ${loadedCount} of ${total}`}
        </div>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------------
   STYLES
----------------------------------------------------------------------------- */
const filterBar = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 20
};

const filterItem = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 13,
  fontWeight: 600
};

const activeCount = {
  color: "#0EA5A8",
  fontWeight: 700
};

const countBadge = {
  padding: "6px 10px",
  borderRadius: 6,
  background: "#F1F5F9",
  color: "#334155",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap"
};
