import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import Filters from "./Filters";

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

  const [filters, setFilters] = useState({
    owners: [],
    teams: [],
    statuses: [],
    date_from: "",
    date_to: ""
  });

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
  }, [filters]);

  /* ===============================
     BUILD CHART DATA
  ================================ */
  const chartData = useMemo(() => {
    if (!rows.length) {
      return { labels: [], datasets: [] };
    }

    const days = [...new Set(rows.map(r => r.status_day))].sort();

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

      {/* FILTERS */}
      <div style={{ marginBottom: 20 }}>

      </div>

  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>

  {/* Owners */}
  <select
    multiple
    value={filters.owners}
    onChange={e =>
      setFilters(f => ({
        ...f,
        owners: [...e.target.selectedOptions].map(o => o.value)
      }))
    }
  >
    <option value="AURELLE">AURELLE</option>
    <option value="CHRISTIAN">CHRISTIAN</option>
    <option value="SERGEA">SERGEA</option>
    <option value="FABRICE">FABRICE</option>
    <option value="FLORIAN">FLORIAN</option>
    <option value="JOSIAS">JOSIAS</option>
    <option value="ESTHER">ESTHER</option>
    <option value="MARIUS">MARIUS</option>
    <option value="THEOPHANE">THEOPHANE</option>
  </select>

  {/* Teams */}
  <select
    multiple
    value={filters.teams}
    onChange={e =>
      setFilters(f => ({
        ...f,
        teams: [...e.target.selectedOptions].map(o => o.value)
      }))
    }
  >
    <option value="BI">BI</option>
    <option value="CVM">CVM</option>
    <option value="SM">SM</option>
    <option value="FLYTXT">FLYTXT</option>
  </select>

  {/* Status */}
  <select
    multiple
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

  {/* Date Range */}
  <input
    type="date"
    value={filters.date_from}
    onChange={e =>
      setFilters(f => ({ ...f, date_from: e.target.value }))
    }
  />

  <input
    type="date"
    value={filters.date_to}
    onChange={e =>
      setFilters(f => ({ ...f, date_to: e.target.value }))
    }
  />

</div>

      
      {/* CHART */}
      <div style={{ height: 500 }}>
        <Bar
          data={chartData}
          options={{
            responsive: true,
            scales: {
              x: { stacked: true },
              y: {
                stacked: true,
                beginAtZero: true,
                ticks: { precision: 0 }
              }
            },
            plugins: {
              legend: {
                labels: {
                  font: { size: 14, weight: "600" }
                }
              }
            }
          }}
        />
      </div>
    </div>
  );
}
