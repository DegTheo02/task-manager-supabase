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
        <Filters
          values={{
            owners: filters.owners,
            teams: filters.teams,
            statuses: filters.statuses,
            assigned_from: filters.date_from,
            assigned_to: filters.date_to
          }}
          onChange={prev =>
            setFilters(f => ({
              ...f,
              owners: prev.owners,
              teams: prev.teams,
              statuses: prev.statuses,
              date_from: prev.assigned_from,
              date_to: prev.assigned_to
            }))
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
