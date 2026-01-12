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

  useEffect(() => {
  sessionStorage.setItem(
    "dailyVolumeFilters",
    JSON.stringify(filters)
  );
}, [filters]);



  /* ===============================
     LOAD DATA FROM SUPABASE
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
    if (!rows.length) {
      return { labels: [], datasets: [] };
    }

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

    return {
      labels: days,
      datasets
    };
  }, [rows]);

  /* ===============================
     RENDER
  ================================ */
  return (
    <div style={{ padding: 20 }}>
      <h1>📊 Daily Task Volume</h1>

  {/* FILTER BAR */}
<div
  style={{
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "flex-end",
    marginBottom: 20
  }}
>
  {/* Owners */}
  <div>
    <label style={filterLabel}>👤 Owner(s)</label>
    <select
      multiple
      style={filterSelect}
      value={filters.owners}
      onChange={e =>
        setFilters(f => ({
          ...f,
          owners: [...e.target.selectedOptions].map(o => o.value)
        }))
      }
    >
      {["AURELLE","CHRISTIAN","SERGEA","FABRICE","FLORIAN","JOSIAS","ESTHER","MARIUS","THEOPHANE","FLYTXT","IT","OTHER"]
        .map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
    </select>
  </div>

  {/* Teams */}
  <div>
    <label style={filterLabel}>🧩 Team(s)</label>
    <select
      multiple
      style={filterSelect}
      value={filters.teams}
      onChange={e =>
        setFilters(f => ({
          ...f,
          teams: [...e.target.selectedOptions].map(o => o.value)
        }))
      }
    >
      {["BI","CVM","SM","FLYTXT","IT","OTHER"]
        .map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
    </select>
  </div>

  {/* Status */}
  <div>
    <label style={filterLabel}>📌 Status(es)</label>
    <select
      multiple
      style={filterSelect}
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

  {/* Date range */}
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
</div>


      
      {/* CHART */}

      <div
  style={{
    height: 380,
    maxHeight: 380,
    width: "100%",
    overflow: "hidden"
         }}
      >

        <Bar
          data={chartData}
    options={{
      responsive: true,
      maintainAspectRatio: false,   // 🔴 important
      scales: {
        x: { stacked: true },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            precision: 0   // integers only
          }
        }
      }
    }}

        />
      </div>
    </div>
  );
}


const filterLabel = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 4
};

const filterSelect = {
  minWidth: 160,
  height: 32,
  padding: "4px 6px"
};

const filterDate = {
  height: 32,
  padding: "4px 6px"
};

