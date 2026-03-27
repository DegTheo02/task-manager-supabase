import React from "react";

export default function TaskFilters({
  filters,
  setFilters,
  owners,
  TEAMS,
  REQUESTERS,
  STATUSES,
  resetTableFilters,
  filterKey
}) {
  return (

<div style={filterBar} key={filterKey}>
         {/* FILTER BAR */}
         {/* Search */}
         <div style={filterItem}>
           <span>🔍 Search</span>
           <input
             type="text"
             placeholder="Search title…"
             value={filters.search}
             onChange={e =>
               setFilters(f => ({ ...f, search: e.target.value }))
             }
           />
         </div>

         
          {/* Owners */}
           <div style={filterItem}>
            <span>👤 Owners</span>
            <select
              multiple
              size={1}
              value={filters.owners}
              onChange={e =>
                setFilters(f => ({
                  ...f,
                  owners: [...e.target.selectedOptions].map(o => o.value)
                }))
              }
            >
              {owners.map(o => (
                <option key={o.id} value={o.owner_label}>
                  {o.owner_label}
                </option>
              ))}
            </select>
          </div>


         {/* Teams */}
         <div style={filterItem}>
        <span>🏷 Teams</span>
        <select
          multiple
          size={1}
          value={filters.teams}
          onChange={e =>
            setFilters(f => ({
              ...f,
              teams: [...e.target.selectedOptions].map(o => o.value)
            }))
          }
        >
          {TEAMS.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

        {/* Requesters */}
        <div style={filterItem}>
          <span>📨 Requesters</span>
          <select
            multiple
            size={1}
            value={filters.requesters}
            onChange={e =>
              setFilters(f => ({
                ...f,
                requesters: [...e.target.selectedOptions].map(o => o.value)
              }))
            }
          >
            {REQUESTERS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>


          {/* Status */}
          <div style={filterItem}>
            <span>📌 Status</span>
            <select
              multiple
              size={1}
              value={filters.statuses}
              onChange={e =>
                setFilters(f => ({
                  ...f,
                  statuses: [...e.target.selectedOptions].map(o => o.value)
                }))
              }
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Deadline From */}
          <div style={filterItem}>
            <span>⏳ Deadline Range</span>
            <input
              type="date"
              value={filters.deadline_from}
              onChange={e =>
                setFilters(f => ({ 
                  ...f, 
                  deadline_from: e.target.value 
              }))}
            />
          </div>

          {/* Deadline To */}
          <div style={filterItem}>
            <span>&nbsp;</span>
            <input
              type="date"
              value={filters.deadline_to}
              onChange={e =>
                setFilters(f => ({ 
                  ...f, 
                  deadline_to: e.target.value 
              }))}
            />
          </div>

          {/* Closing From */}
          <div style={filterItem}>
            <span>✅ Closing Range</span>
            <input
              type="date"
              value={filters.closing_from}
              onChange={e =>
                setFilters(f => ({ 
                  ...f, 
                  closing_from: e.target.value 
              }))}
            />
          </div>

          {/* Closing To */}
          <div style={filterItem}>
            <span>&nbsp;</span>
            <input
              type="date"
              value={filters.closing_to}
              onChange={e =>
                setFilters(f => ({ 
                  ...f, 
                  closing_to: e.target.value 
              }))}
            />
          </div>

          {/* Today Button */}
          <div style={{ ...filterItem, justifyContent: "flex-end" }}>
            <span>Deadline</span>
            <button
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                background: "#0EA5A8",
                color: "white",
                cursor: "pointer",
                fontWeight: 600
              }}
              onClick={() =>
                setFilters(f => ({ ...f, today: !f.today 
              }))}
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

        </div>
        );
}


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
