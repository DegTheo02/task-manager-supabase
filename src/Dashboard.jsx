import React, { useEffect, useMemo, useState } from "react";
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

/* ----------------------------------
   REGISTER CHART.JS CORE
---------------------------------- */
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title
);

/* ----------------------------------
   SAFE DATALABELS HANDLING (CDN)
---------------------------------- */
const ChartDataLabels = window.ChartDataLabels || null;
if (ChartDataLabels) {
  ChartJS.register(ChartDataLabels);
}
const chartPlugins = ChartDataLabels ? [ChartDataLabels] : [];

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

const STATUS_COLORS = {
  OPEN: "#3B82F6",
  ONGOING: "#0EA5A8",
  OVERDUE: "#DC2626",
  "ON HOLD": "#6B7280",
  "CLOSED ON TIME": "#16A34A",
  "CLOSED PAST DUE": "#F97316"
};

/* ----------------------------------
   DASHBOARD
---------------------------------- */
export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({});

  /* LOAD TASKS */
  useEffect(() => {
    supabase
      .from("tasks")
      .select("*")
      .then(({ data }) => setTasks(data || []));
  }, []);

  /* APPLY FILTERS */
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filters.owner && t.owner !== filters.owner) return false;
      if (filters.status && t.status !== filters.status) return false;

      if (filters.assigned_from && t.assigned_date < filters.assigned_from)
        return false;
      if (filters.assigned_to && t.assigned_date > filters.assigned_to)
        return false;

      const deadline = t.new_deadline || t.initial_deadline;
      if (filters.deadline_from && deadline < filters.deadline_from)
        return false;
      if (filters.deadline_to && deadline > filters.deadline_to)
        return false;

      return true;
    });
  }, [tasks, filters]);

  const totalTasks = filteredTasks.length || 1;

  /* KPI DATA */
  const kpis = STATUSES.map(status => {
    const count = filteredTasks.filter(t => t.status === status).length;
    return {
      status,
      count,
      percent: Math.round((count / totalTasks) * 100)
    };
  });

  /* OWNER STATS */
  const ownerStats = OWNERS.map(owner => {
    const list = filteredTasks.filter(t => t.owner === owner);
    const row = { owner, TOTAL: list.length };
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

  /* ----------------------------------
     CHART DATA (100% STACKED)
  ---------------------------------- */
  const chartData = {
    labels: OWNERS,
    datasets: STATUSES.map(status => ({
      label: status,
      data: ownerStats.map(o =>
        o.TOTAL === 0 ? 0 : Math.round((o[status] / o.TOTAL) * 100)
      ),
      backgroundColor: STATUS_COLORS[status]
    }))
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { stacked: true },
      y: {
        stacked: true,
        min: 0,
        max: 100,
        ticks: { callback: v => `${v}%` }
      }
    },
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: "Task Distribution per Owner (100%)"
      },
      datalabels: {
        display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
        anchor: "center",
        align: "center",
        clamp: false,
        clip: false,
        color: "#ffffff",
        font: {
          weight: "bold",
          size: 11
        },
        formatter: value => `${value}%`
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
        <KpiCard title="TOTAL" value={filteredTasks.length} percent={100} />
        {kpis.map(k => (
          <KpiCard
            key={k.status}
            title={k.status}
            value={k.count}
            percent={k.percent}
          />
        ))}
      </div>

      {/* CHART */}
      <div style={{ marginTop: 40, height: 360 }}>
        <Bar
          data={chartData}
          options={chartOptions}
          plugins={chartPlugins}
        />
      </div>

      {/* TABLES */}
      <h2 style={{ marginTop: 40 }}>Tasks per Owner (Count)</h2>
      <OwnerCountTable data={ownerStats} totals={totals} />

      <h2 style={{ marginTop: 40 }}>Task Distribution (%) per Owner</h2>
      <OwnerPercentageTable data={ownerStats} />
    </div>
  );
}

/* ----------------------------------
   KPI CARD
---------------------------------- */
function KpiCard({ title, value, percent }) {
  return (
    <div style={kpiCard}>
      <div style={kpiTitle}>{title}</div>
      <div style={kpiValueRow}>
        <span>{value}</span>
        <span>{percent}%</span>
      </div>
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
          <th style={th}>Owner</th>
          {STATUSES.map(s => (
            <th key={s} style={th}>{s}</th>
          ))}
          <th style={th}>TOTAL</th>
        </tr>
      </thead>
      <tbody>
        {data.map(r => (
          <tr key={r.owner}>
            <td style={ownerTd}>{r.owner}</td>
            {STATUSES.map(s => (
              <td key={s} style={td}>{r[s]}</td>
            ))}
            <td style={td}><b>{r.TOTAL}</b></td>
          </tr>
        ))}
        <tr style={totalRow}>
          <td style={ownerTd}>TOTAL</td>
          {STATUSES.map(s => (
            <td key={s} style={td}>{totals[s]}</td>
          ))}
          <td style={td}>{totals.TOTAL}</td>
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
          <th style={th}>Owner</th>
          {STATUSES.map(s => (
            <th key={s} style={th}>% {s}</th>
          ))}
          <th style={th}>TOTAL</th>
        </tr>
      </thead>
      <tbody>
        {data.map(r => (
          <tr key={r.owner}>
            <td style={ownerTd}>{r.owner}</td>
            {STATUSES.map(s => (
              <td key={s} style={td}>
                {r.TOTAL ? Math.round((r[s] / r.TOTAL) * 100) : 0}%
              </td>
            ))}
            <td style={td}><b>100%</b></td>
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
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 12,
  marginTop: 20
};

const kpiCard = {
  background: "#111827",
  color: "white",
  padding: "10px 12px",
  borderRadius: 8,
  textAlign: "center"
};

const kpiTitle = {
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 6
};

const kpiValueRow = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 20,
  fontWeight: "bold"
};

const dashboardTable = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 10
};

const th = {
  border: "1px solid #D1D5DB",
  padding: 8,
  background: "#F3F4F6",
  textAlign: "center"
};

const td = {
  border: "1px solid #D1D5DB",
  padding: 8,
  textAlign: "center"
};

const ownerTd = {
  ...td,
  textAlign: "left",
  fontWeight: 600
};

const totalRow = {
  background: "#E5E7EB",
  fontWeight: 700
};
