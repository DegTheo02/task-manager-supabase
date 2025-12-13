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

/* ----------------------------------
   CHART REGISTRATION
---------------------------------- */
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

  /* ----------------------------------
     LOAD DATA
  ---------------------------------- */
  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    const { data } = await supabase.from("tasks").select("*");
    setTasks(data || []);
  }

  /* ----------------------------------
     APPLY FILTERS (SINGLE SOURCE)
  ---------------------------------- */
  useEffect(() => {
    let data = [...tasks];

    if (filters.search) {
      data = data.filter(t =>
        t.title?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.owner) {
      data = data.filter(t => t.owner === filters.owner);
    }

    if (filters.status) {
      data = data.filter(t => t.status === filters.status);
    }

    setFilteredTasks(data);
  }, [filters, tasks]);

  /* ----------------------------------
     KPI HELPERS
  ---------------------------------- */
  const countStatus = status =>
    filteredTasks.filter(t => t.status === status).length;

  const closedOnTime = countStatus("CLOSED ON TIME");
  const closedPastDue = countStatus("CLOSED PAST DUE");
  const totalClosed = closedOnTime + closedPastDue;

  const onTimeRate =
    totalClosed === 0 ? 0 : Math.round((closedOnTime / totalClosed) * 100);

  /* ----------------------------------
     OWNER STATS
  ---------------------------------- */
  const ownerStats = OWNERS.map(owner => {
    const list = filteredTasks.filter(t => t.owner === owner);

    const row = { owner, TOTAL: list.length };
    STATUSES.forEach(s => {
      row[s] = list.filter(t => t.status === s).length;
    });

    return row;
  });

  /* ----------------------------------
     TOTALS
  ---------------------------------- */
  const totals = { TOTAL: ownerStats.reduce((a, r) => a + r.TOTAL, 0) };
  STATUSES.forEach(s => {
    totals[s] = ownerStats.reduce((a, r) => a + r[s], 0);
  });

  /* ----------------------------------
     CHART DATA
  ---------------------------------- */
  const chartData = {
    labels: OWNERS,
    datasets: [
      { label: "OPEN", data: ownerStats.map(o => o.OPEN), backgroundColor: "#3B82F6" },
      { label: "ONGOING", data: ownerStats.map(o => o.ONGOING), backgroundColor: "#0EA5A8" },
      { label: "OVERDUE", data: ownerStats.map(o => o.OVERDUE), backgroundColor: "#DC2626" },
      { label: "ON HOLD", data: ownerStats.map(o => o["ON HOLD"]), backgroundColor: "#6B7280" },
      { label: "CLOSED ON TIME", data: ownerStats.map(o => o["CLOSED ON TIME"]), backgroundColor: "#16A34A" },
      { label: "CLOSED PAST DUE", data: ownerStats.map(o => o["CLOSED PAST DUE"]), backgroundColor: "#F97316" }
    ]
  };

  const chartOptions = {
    responsive: true,
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true }
    },
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Task Distribution per Owner (Stacked)" },
      datalabels: {
        color: "white",
        font: { weight: "bold" },
        formatter: v => (v > 0 ? v : "")
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
        <KPI title="Total Tasks" value={filteredTasks.length} />
        <KPI title="Open" value={countStatus("OPEN")} />
        <KPI title="Ongoing" value={countStatus("ONGOING")} />
        <KPI title="Overdue" value={countStatus("OVERDUE")} />
        <KPI title="On Hold" value={countStatus("ON HOLD")} />
        <KPI title="Closed On Time" value={closedOnTime} />
        <KPI title="Closed Past Due" value={closedPastDue} />
        <KPI title="% On-Time" value={`${onTimeRate}%`} />
      </div>

      {/* CHART */}
      <div style={{ marginTop: 40 }}>
        <Bar data={chartData} options={chartOptions} />
      </div>

      {/* TABLE 1 */}
      <h2 style={{ marginTop: 40 }}>Tasks per Owner</h2>
      <OwnerTable data={ownerStats} totals={totals} />

      {/* TABLE 2 */}
      <h2 style={{ marginTop: 40 }}>Task Distribution (%) per Owner</h2>
      <PercentageTable data={ownerStats} totals={totals} />
    </div>
  );
}

/* ----------------------------------
   SUB COMPONENTS
---------------------------------- */
function KPI({ title, value }) {
  return (
    <div style={kpiCard}>
      <div>{title}</div>
      <div style={{ fontSize: 26, fontWeight: "bold" }}>{value}</div>
    </div>
  );
}

function OwnerTable({ data, totals }) {
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

function PercentageTable({ data, totals }) {
  return (
    <table style={dashboardTable}>
      <thead>
        <tr>
          <th style={tableHeader}>Owner</th>
          {STATUSES.map(s => (
            <th key={s} style={tableHeader}>% {s}</th>
          ))}
          <th style={tableHeader}>% ON-TIME</th>
        </tr>
      </thead>
      <tbody>
        {data.map(r => {
          const total = r.TOTAL || 1;
          const closed = r["CLOSED ON TIME"] + r["CLOSED PAST DUE"];
          const onTime =
            closed === 0 ? 0 : Math.round((r["CLOSED ON TIME"] / closed) * 100);

          return (
            <tr key={r.owner}>
              <td style={ownerCell}>{r.owner}</td>
              {STATUSES.map(s => (
                <td key={s} style={tableCell}>
                  {Math.round((r[s] / total) * 100)}%
                </td>
              ))}
              <td style={tableCell}><b>{onTime}%</b></td>
            </tr>
          );
        })}

        <tr style={totalRow}>
          <td style={ownerCell}>TOTAL</td>
          {STATUSES.map(s => (
            <td key={s} style={tableCell}>
              {totals.TOTAL === 0
                ? "0%"
                : Math.round((totals[s] / totals.TOTAL) * 100) + "%"}
            </td>
          ))}
          <td style={tableCell}>100%</td>
        </tr>
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
  padding: 16,
  borderRadius: 8,
  textAlign: "center"
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
