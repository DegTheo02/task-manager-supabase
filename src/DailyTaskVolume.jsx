import React, { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "./supabaseClient";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";

import { Bar } from "react-chartjs-2";

/* ===============================
   CHART REGISTRATION
================================ */
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

/* ===============================
   CONSTANTS
================================ */
const STATUSES = [
  "CLOSED ON TIME",
  "CLOSED PAST DUE",
  "ON TRACK",
  "OVERDUE"
];

const STATUS_COLORS = {
  "CLOSED ON TIME": "#16A34A",
  "CLOSED PAST DUE": "#F97316",
  "ON TRACK": "#3B82F6",
  OVERDUE: "#DC2626"
};

const OWNERS = [
  "AURELLE","CHRISTIAN","SERGEA","FABRICE","FLORIAN",
  "JOSIAS","ESTHER","MARIUS","THEOPHANE","FLYTXT","IT","OTHER"
];

const TEAMS = ["BI","CVM","SM","FLYTXT","IT","OTHER"];

const formatDateLabel = (isoDate) => {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit"
  });
};


/* ===============================
   MULTI DROPDOWN
================================ */
function MultiDropdown({ label, items, values, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const toggle = value => {
    onChange(
      values.includes(value)
        ? values.filter(v => v !== value)
        : [...values, value]
    );
  };

  useEffect(() => {
    const close = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 160 }}>
      <label style={filterLabel}>{label}</label>
      <div style={dropdownBox} onClick={() => setOpen(o => !o)}>
        {values.length ? `${values.length} selected` : "Select…"}
      </div>

      {open && (
        <div style={dropdownMenu}>
          {items.map(item => (
            <label key={item} style={dropdownItem}>
              <input
                type="checkbox"
                checked={values.includes(item)}
                onChange={() => toggle(item)}
              />
              {item}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===============================
   PAGE
================================ */
export default function DailyTaskVolume() {
  const [rows, setRows] = useState([]);

  const [filters, setFilters] = useState(() => {
    const saved = sessionStorage.getItem("dailyVolumeFilters");
    return saved ? JSON.parse(saved) : {
      owners: [], teams: [], statuses: [], date_from: "", date_to: ""
    };
  });

  useEffect(() => {
    sessionStorage.setItem("dailyVolumeFilters", JSON.stringify(filters));
  }, [filters]);

  const resetFilters = () => {
    const empty = { owners: [], teams: [], statuses: [], date_from: "", date_to: "" };
    setFilters(empty);
    sessionStorage.removeItem("dailyVolumeFilters");
  };

  useEffect(() => {
    const load = async () => {
      let q = supabase
        .from("task_daily_status")
        .select("status_day,status,owner,team");

      if (filters.owners.length) q = q.in("owner", filters.owners);
      if (filters.teams.length) q = q.in("team", filters.teams);
      if (filters.statuses.length) q = q.in("status", filters.statuses);
      if (filters.date_from) q = q.gte("status_day", filters.date_from);
      if (filters.date_to) q = q.lte("status_day", filters.date_to);

      const { data } = await q;
      setRows(data || []);
    };
    load();
  }, [filters]);

  const chartData = useMemo(() => {
    const days = [...new Set(rows.map(r => r.status_day))]
      .sort((a,b) => new Date(a) - new Date(b));

    return {
     labels: days.map(formatDateLabel),
      datasets: STATUSES.map(s => ({
        label: s,
        data: days.map(d =>
          rows.filter(r => r.status_day === d && r.status === s).length
        ),
        backgroundColor: STATUS_COLORS[s]
      }))
    };
  }, [rows]);

  return (
    <div style={{ padding: 20 }}>
      <h1>📊 Daily Task Volume</h1>

      <div style={filterBar}>
        <MultiDropdown label="👤 Owner(s)" items={OWNERS}
          values={filters.owners}
          onChange={v => setFilters(f => ({ ...f, owners: v }))} />

        <MultiDropdown label="🧩 Team(s)" items={TEAMS}
          values={filters.teams}
          onChange={v => setFilters(f => ({ ...f, teams: v }))} />

        <MultiDropdown label="📌 Status(es)" items={STATUSES}
          values={filters.statuses}
          onChange={v => setFilters(f => ({ ...f, statuses: v }))} />

        <div>
          <label style={filterLabel}>📅 Date range</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input type="date" style={filterDate}
              value={filters.date_from}
              onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
            <input type="date" style={filterDate}
              value={filters.date_to}
              onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
          </div>
        </div>

<div>
  <label style={filterLabel}>Actions</label>
  <button onClick={resetFilters} style={resetButton}>
    🔄 Reset
  </button>
</div>


      </div>

      <div style={chartContainer}>
        <Bar
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { stacked: true },
              y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
            },
            plugins: {
              percentageLabelPlugin: {
    disabled: true
  },
              legend: { labels: { font: { size: 15, weight: "600" } } },
              tooltip: {
                callbacks: {
                  label: ctx => `${ctx.dataset.label}: ${ctx.raw}`
                }
              }
            }
          }}
        />
      </div>
    </div>
  );
}

/* ===============================
   STYLES
================================ */
const filterBar = { 
  display: "flex", 
  gap: 12, 
  flexWrap: "wrap", 
  alignItems: "flex-end",   // ✅ ADD THIS
  marginBottom: 20 
};

const filterLabel = { 
  fontSize: 13, 
  fontWeight: 600 
};

const filterDate = { 
  height: 32, 
  padding: "4px 6px" 
};

const resetButton = {
  height: 32,
  padding: "0 14px",
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 6,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6
};

const dropdownBox = { height: 32, padding: "6px 8px", border: "1px solid #ccc", borderRadius: 6 };
const dropdownMenu = { position: "absolute", top: "110%", width: "100%", background: "#fff", border: "1px solid #ccc", borderRadius: 6, padding: 8, zIndex: 100 };
const dropdownItem = { display: "flex", gap: 6, fontSize: 13 };
const chartContainer = { height: 380 };
