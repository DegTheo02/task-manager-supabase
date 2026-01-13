import React, { useEffect, useMemo, useState } from "react";
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
  "AURELLE",
  "CHRISTIAN",
  "SERGEA",
  "FABRICE",
  "FLORIAN",
  "JOSIAS",
  "ESTHER",
  "MARIUS",
  "THEOPHANE",
  "FLYTXT",
  "IT",
  "OTHER"
];

const TEAMS = ["BI", "CVM", "SM", "FLYTXT", "IT", "OTHER"];

/* ===============================
   DROPDOWN COMPONENT
================================ */
import { useEffect, useRef, useState } from "react";

function MultiDropdown({ label, items, values, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const toggle = value => {
    if (values.includes(value)) {
      onChange(values.filter(v => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  // ✅ CLOSE ON CLICK OUTSIDE
  useEffect(() => {
    const handleClickOutside = event => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 160 }}>
      <label style={filterLabel}>{label}</label>

      <div
        style={dropdownBox}
        onClick={() => setOpen(o => !o)}
      >
        {values.length === 0 ? "Select…" : `${values.length} selected`}
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
   PAGE COMPONENT
================================ */
export default function DailyTaskVolume() {
  const [rows, setRows] = useState([]);

  const [filters, setFilters] = useState(() => {
    const saved = sessionStorage.getItem("dailyVolumeFilters");
    return saved
      ? JSON.parse(saved)
      : {
          owners: [],
          teams: [],
          statuses: [],
          date_from: "",
          date_to: ""
        };
  });

  /* ===============================
     PERSIST FILTERS
  ================================ */
  useEffect(() => {
    sessionStorage.setItem(
      "dailyVolumeFilters",
      JSON.stringify(filters)
    );
  }, [filters]);

  /* ===============================
     RESET FILTERS
  ================================ */
  const resetFilters = () => {
    const empty = {
      owners: [],
      teams: [],
      statuses: [],
      date_from: "",
      date_to: ""
    };

    setFilters(empty);
    sessionStorage.removeItem("dailyVolumeFilters");
  };

  /* ===============================
     LOAD DATA
  ================================ */
  const loadData = async () => {
    let query = supabase
      .from("task_daily_status")
      .select("status_day, status, owner, team");

    if (filters.owners.length)
      query = query.in("owner", filters.owners);

    if (filters.teams.length)
      query = query.in("team", filters.teams);

    if (filters.statuses.length)
      query = query.in("status", filters.statuses);

    if (filters.date_from)
      query = query.gte("status_day", filters.date_from);

    if (filters.date_to)
      query = query.lte("status_day", filters.date_to);

    const { data, error } = await query;

    if (error) {
      console.error("DailyTaskVolume load error:", error);
    } else {
      setRows(data || []);
    }
  };

  useEffect(() => {
    loadData();
  }, [
    filters.owners,
    filters.teams,
    filters.statuses,
    filters.date_from,
    filters.date_to
  ]);

  /* ===============================
     BUILD CHART DATA
  ================================ */
  const chartData = useMemo(() => {
    if (!rows.length) return { labels: [], datasets: [] };

    const days = [...new Set(rows.map(r => r.status_day))]
      .sort((a, b) => new Date(a) - new Date(b));

    const datasets = STATUSES.map(status => ({
      label: status,
      data: days.map(day =>
        rows.filter(
          r => r.status_day === day && r.status === status
        ).length
      ),
      backgroundColor: STATUS_COLORS[status]
    }));

    return { labels: days, datasets };
  }, [rows]);

  /* ===============================
     RENDER
  ================================ */
  return (
    <div style={{ padding: 20 }}>
      <h1>📊 Daily Task Volume</h1>

      {/* FILTER BAR */}
      <div style={filterBar}>
        <MultiDropdown
          label="👤 Owner(s)"
          items={OWNERS}
          values={filters.owners}
          onChange={vals => setFilters(f => ({ ...f, owners: vals }))}
        />

        <MultiDropdown
          label="🧩 Team(s)"
          items={TEAMS}
          values={filters.teams}
          onChange={vals => setFilters(f => ({ ...f, teams: vals }))}
        />

        <MultiDropdown
          label="📌 Status(es)"
          items={STATUSES}
          values={filters.statuses}
          onChange={vals => setFilters(f => ({ ...f, statuses: vals }))}
        />

        <div>
          <label style={filterLabel}>📅 Date range</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="date"
              style={filterDate}
              value={filters.date_from}
              onChange={e =>
                setFilters(f => ({ ...f, date_from: e.target.value }))
              }
            />
            <input
              type="date"
              style={filterDate}
              value={filters.date_to}
              onChange={e =>
                setFilters(f => ({ ...f, date_to: e.target.value }))
              }
            />
          </div>
        </div>

        <button onClick={resetFilters} style={resetButton}>
          🔄 Reset
        </button>
      </div>

      {/* CHART */}
      <div style={chartContainer}>
<Bar
  data={chartData}
  options={{
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      percentageLabelPlugin: {
        disabled: true   // ✅ THIS STOPS %
      },
      valueLabelPlugin: {
    disabled: false
      },
      legend: {
        labels: {
          font: { size: 13, weight: "600" }
        }
      },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${ctx.raw}`
        }
      },
      datalabels: false   // 🔴 disables percentage labels
    },
    scales: {
      x: { stacked: true },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          precision: 0
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
  alignItems: "flex-end",
  marginBottom: 20
};

const filterLabel = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 4
};

const filterDate = {
  height: 32,
  padding: "4px 6px"
};

const resetButton = {
  height: 32,
  padding: "0 12px",
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 6,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer"
};

const dropdownBox = {
  height: 32,
  padding: "6px 8px",
  border: "1px solid #ccc",
  borderRadius: 6,
  cursor: "pointer",
  background: "#fff"
};

const dropdownMenu = {
  position: "absolute",
  top: "110%",
  left: 0,
  width: "100%",
  background: "#fff",
  border: "1px solid #ccc",
  borderRadius: 6,
  padding: 8,
  zIndex: 100,
  maxHeight: 180,
  overflowY: "auto",
  boxShadow: "0 4px 10px rgba(0,0,0,0.15)"
};

const dropdownItem = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 0",
  fontSize: 13,
  cursor: "pointer"
};

const chartContainer = {
  height: 380,
  maxHeight: 380,
  width: "100%",
  overflow: "hidden"
};
