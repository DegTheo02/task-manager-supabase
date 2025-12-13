import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Filters from "./Filters";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, Title);

if (window.ChartDataLabels) {
  ChartJS.register(window.ChartDataLabels);
}

/* ----------------------------------
   CONSTANTS
---------------------------------- */
const OWNERS = [
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
export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [filters, setFilters] = useState({});

  /* LOAD DATA */
  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    const { data } = await supabase.from("tasks").select("*");
    setTasks(data || []);
  }

  /* APPLY FILTERS */
  useEffect(() => {
    let data = [...tasks];

    if (filters.owner) {
      data = data.filter(t => t.owner === filters.owner);
    }

    if (filters.status) {
      data = data.filter(t => t.status === filters.status);
    }

    if (filters.assigned_from) {
      data = data.filter(t => t.assigned_date >= filters.assigned_from);
    }

    if (filters.assigned_to) {
      data = data.filter(t => t.assigned_date <= filters.assigned_to);
    }

    if (filters.deadline_from) {
      data = data.filter(t =>
        (t.new_deadline || t.initial_deadline) >= filters.deadline_from
      );
    }

    if (filters.deadline_to) {
      data = data.filter(t =>
        (t.new_deadline || t.initial_deadline) <= filters.deadline_to
      );
    }

    setFilteredTasks(data);
  }, [filters, tasks]);

  const totalTasks = filteredTasks.length || 1;

  /* KPI DATA */
  const kpis = STATUSES.map(s => {
    const count = filteredTasks.filter(t => t.status === s).length;
    return {
      status: s,
      count,
      percent: Math.round((count / totalTasks) * 100)
    };
  });

  /* OWNER STATS (COUNTS + %) */
  const ownerStats = OWNERS.map(owner => {
    const list = filteredTasks.filter(t => t.owner === owner);
    const total = list.length || 0;

    const row = { owner, TOTAL: total };
    STATUSES.forEach(s => {
      row[s] = list.filter(t => t.status === s).length;
    });

    return row;
  });

  /* TOTALS */
  const totals = { TOTAL: ownerStats.reduce((a, r) => a + r.TOTAL, 0) };
  STATUSES.forEach(s => {
    totals[s] = ownerStats.reduce((a, r) => a + r[s], 0);
  });

  /* CHART DATA (100% STACKED) */
  const chartData = {
    labels: OWNERS,
    datasets: STATUSES.map(s => ({
      label: s,
      data: ownerStats.map(o =>
        o.TOTAL === 0 ? 0 : Math.round((o[s] / o.TOTAL) * 100)
      ),
      backgroundColor: statusColors[s]
    }))
  };

  const chartOptions = {
    responsive: true,
    scales: {
      x: { stacked: true },
      y: {
        stacked: true,
        beginAtZero: true,
        max: 100,
        ticks: { callback: v => v + "%" }
      }
    },
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: "Task Distribution per Owner (100%)"
      },
      datalabels: {
        color: "white",
        formatter: v => (v > 0 ? v + "%" : "")
      }
    }
  };

  /* ----------------------------------
     RENDER
  ---------------------------------- */
  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard</h1>

      <Filters onChange={setFilters} />

      {/* KPI CARDS */}
      <div style={kpiGrid}>
        {kpis.map(k => (
          <div key={k.status} style={kpiCard}>
            <div>{k.status}</div>
            <div style={kpiValue}>
              <span>{k.count}</span>
              <span>{k.percent}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* CHART */}
      <div style={{ marginTop: 40 }}>
        <Bar data={chartData} options={chartOptions} />
      </div>

      {/* TABLE 1: COUNTS */}
      <h2 style={{ marginTop: 40 }}>Tasks per Owner (Count)</h2>
      <OwnerCountTable data={ownerStats} totals={totals} />

      {/* TABLE 2: PERCENTAGES */}
      <h2 style={{ marginTop: 40 }}>Task Distribution (%) per Owner</h2>
      <OwnerPercentageTable data={ownerStats} />
    </div>
  );
}

/* ----------------------------------
   TABLES
---------------------------------- */
function OwnerCountTable({ data, totals }) {
  return (
    <table style={dashboardTable}>
      <thead>
        <tr>
          <th style={tableHeader}>Owner</th>
          {STATUSES.map(s => (
            <th key={s} style={tableHeader}>{s}</th>
          ))}
          <th style={tableHeader}>TOTAL</th>
        </tr>
      </thead>
      <tbody>
        {data.map(r => (
          <tr key={r.owner}>
            <td style={ownerCell}>{r.owner}</td>
            {STATUSES.map(s => (
              <td key={s} style={tableCell}>{r[s]}</td>
            ))}
            <td style={tableCell}><b>{r.TOTAL}</b></td>
          </tr>
        ))}
        <tr style={totalRow}>
          <td style={ownerCell}>TOTAL</td>
          {STATUSES.map(s => (
            <td key={s} style={tableCell}>{totals[s]}</td>
          ))}
          <td style={tableCell}>{totals.TOTAL}</td>
        </tr>
      </tbody>
    </table>
  );
}

function OwnerPercentageTable({ data }) {
  return (
    <table style={dashboardTable}>
      <thead>
        <tr>
          <th style={tableHeader}>Owner</th>
          {STATUSES.map(s => (
            <th key={s} style={tableHeader}>% {s}</th>
          ))}
          <th style={tableHeader}>TOTAL</th>
        </tr>
      </thead>
      <tbody>
        {data.map(r => (
          <tr key={r.owner}>
            <td style={ownerCell}>{r.owner}</td>
            {STATUSES.map(s => (
              <td key={s} style={tableCell}>
                {r.TOTAL === 0 ? "0%" : Math.round((r[s] / r.TOTAL) * 100) + "%"}
              </td>
            ))}
            <td style={tableCell}><b>100%</b></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ----------------------------------
   STYLES
---------------------------------- */
const kpiGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 14,
  marginTop: 20
};

const kpiCard = {
  background: "#111827",
  color: "white",
  padding: 14,
  borderRadius: 8
};

const kpiValue = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 22,
  fontWeight: "bold"
};

const dashboardTable = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 10,
  fontSize: 14
};

const tableHeader = {
  border: "1px solid #D1D5DB",
  backgroundColor: "#F3F4F6",
  padding: "8px",
  textAlign: "center",
  fontWeight: 700
};

const tableCell = {
  border: "1px solid #D1D5DB",
  padding: "8px",
  textAlign: "center"
};

const ownerCell = {
  border: "1px solid #D1D5DB",
  padding: "8px",
  textAlign: "left",
  fontWeight: 600
};

const totalRow = {
  backgroundColor: "#E5E7EB",
  fontWeight: 700
};

const statusColors = {
  OPEN: "#3B82F6",
  ONGOING: "#0EA5A8",
  OVERDUE: "#DC2626",
  "ON HOLD": "#6B7280",
  "CLOSED ON TIME": "#16A34A",
  "CLOSED PAST DUE": "#F97316"
};
