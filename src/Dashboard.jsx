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

// Register Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, Title);

// Register datalabels from CDN
if (window.ChartDataLabels) {
  ChartJS.register(window.ChartDataLabels);
}

// CONSTANTS
const OWNERS = [
  "AURELLE", "CHRISTIAN", "SERGEA", "FABRICE", "FLORIAN",
  "JOSIAS", "ESTHER", "MARIUS", "THEOPHANE"
];

const STATUSES = [
  "OPEN",
  "ONGOING",
  "CLOSED ON TIME",
  "CLOSED PAST DUE",
  "OVERDUE",
  "ON HOLD"
];

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [filters, setFilters] = useState({});

  // ----------------------------------
  // LOAD DATA
  // ----------------------------------
  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    const { data } = await supabase.from("tasks").select("*");
    setTasks(data || []);
  }

  // ----------------------------------
  // APPLY FILTERS (SINGLE SOURCE)
  // ----------------------------------
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

    if (filters.assignedFrom) {
      data = data.filter(t => t.assigned_date >= filters.assignedFrom);
    }

    if (filters.assignedTo) {
      data = data.filter(t => t.assigned_date <= filters.assignedTo);
    }

    if (filters.deadlineFrom) {
      data = data.filter(t => t.initial_deadline >= filters.deadlineFrom);
    }

    if (filters.deadlineTo) {
      data = data.filter(t => t.initial_deadline <= filters.deadlineTo);
    }

    setFilteredTasks(data);
  }, [filters, tasks]);

  // ----------------------------------
  // KPIs (FROM filteredTasks ONLY)
  // ----------------------------------
  const totalTasks = filteredTasks.length;

  const kpi = status =>
    filteredTasks.filter(t => t.status === status).length;

  const closedOnTime = kpi("CLOSED ON TIME");
  const closedPastDue = kpi("CLOSED PAST DUE");
  const totalClosed = closedOnTime + closedPastDue;
  const onTimeRate =
    totalClosed === 0 ? 0 : Math.round((closedOnTime / totalClosed) * 100);

  // ----------------------------------
  // OWNER STATS (RAW COUNTS)
  // ----------------------------------
  const ownerStats = OWNERS.map(owner => {
    const list = filteredTasks.filter(t => t.owner === owner);

    const row = {
      owner,
      TOTAL: list.length
    };

    STATUSES.forEach(s => {
      row[s] = list.filter(t => t.status === s).length;
    });

    return row;
  });

  // ----------------------------------
  // TOTALS
  // ----------------------------------
  const totals = {
    TOTAL: ownerStats.reduce((a, r) => a + r.TOTAL, 0)
  };

  STATUSES.forEach(s => {
    totals[s] = ownerStats.reduce((a, r) => a + r[s], 0);
  });

  // ----------------------------------
  // STACKED CHART DATA
  // ----------------------------------
  const stackedData = {
    labels: OWNERS,
    datasets: [
      { label: "OPEN", data: ownerStats.map(o => o["OPEN"]), backgroundColor: "#3B82F6" },
      { label: "ONGOING", data: ownerStats.map(o => o["ONGOING"]), backgroundColor: "#0EA5A8" },
      { label: "OVERDUE", data: ownerStats.map(o => o["OVERDUE"]), backgroundColor: "#DC2626" },
      { label: "ON HOLD", data: ownerStats.map(o => o["ON HOLD"]), backgroundColor: "#6B7280" },
      { label: "CLOSED ON TIME", data: ownerStats.map(o => o["CLOSED ON TIME"]), backgroundColor: "#16A34A" },
      { label: "CLOSED PAST DUE", data: ownerStats.map(o => o["CLOSED PAST DUE"]), backgroundColor: "#F97316" }
    ]
  };

  const stackedOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Task Distribution per Owner (Stacked)" },
      datalabels: {
        color: "white",
        formatter: value => (value > 0 ? value : ""),
        font: { weight: "bold" }
      }
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true }
    }
  };

  // ----------------------------------
  // RENDER
  // ----------------------------------
  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard</h1>

      {/* FILTERS */}
      <Filters onChange={setFilters} />

      {/* KPI CARDS */}
      <div style={kpiGrid}>
        <KPI title="Total Tasks" value={totalTasks} />
        <KPI title="Open" value={kpi("OPEN")} />
        <KPI title="Ongoing" value={kpi("ONGOING")} />
        <KPI title="Overdue" value={kpi("OVERDUE")} />
        <KPI title="On Hold" value={kpi("ON HOLD")} />
        <KPI title="Closed On Time" value={closedOnTime} />
        <KPI title="Closed Past Due" value={closedPastDue} />
        <KPI title="% On Time" value={onTimeRate + "%"} />
      </div>

      {/* STACKED CHART */}
      <div style={{ marginTop: 40 }}>
        <Bar data={stackedData} options={stackedOptions} />
      </div>

      {/* RAW TABLE */}
      <h2 style={{ marginTop: 40 }}>Tasks per Owner</h2>
      <OwnerTable data={ownerStats} totals={totals} />

      {/* PERCENTAGE TABLE */}
      <h2 style={{ marginTop: 40 }}>Task Distribution (%) per Owner</h2>
      <PercentageTable data={ownerStats} totals={totals} />
    </div>
  );
}

// ----------------------------------
// COMPONENTS
// ----------------------------------
function KPI({ title, value }) {
  return (
    <div style={kpiCard}>
      <div>{title}</div>
      <div style={{ fontSize: 28, fontWeight: "bold" }}>{value}</div>
    </div>
  );
}

function OwnerTable({ data, totals }) {
  return (
    <table style={table}>
      <thead>
        <tr>
          <th>Owner</th>
          <th>OPEN</th>
          <th>ONGOING</th>
          <th>OVERDUE</th>
          <th>ON HOLD</th>
          <th>CLOSED ON TIME</th>
          <th>CLOSED PAST DUE</th>
          <th><b>TOTAL</b></th>
        </tr>
      </thead>
      <tbody>
        {data.map(r => (
          <tr key={r.owner}>
            <td>{r.owner}</td>
            <td>{r["OPEN"]}</td>
            <td>{r["ONGOING"]}</td>
            <td>{r["OVERDUE"]}</td>
            <td>{r["ON HOLD"]}</td>
            <td>{r["CLOSED ON TIME"]}</td>
            <td>{r["CLOSED PAST DUE"]}</td>
            <td><b>{r.TOTAL}</b></td>
          </tr>
        ))}
        <tr style={{ background: "#E5E7EB", fontWeight: "bold" }}>
          <td>TOTAL</td>
          <td>{totals["OPEN"]}</td>
          <td>{totals["ONGOING"]}</td>
          <td>{totals["OVERDUE"]}</td>
          <td>{totals["ON HOLD"]}</td>
          <td>{totals["CLOSED ON TIME"]}</td>
          <td>{totals["CLOSED PAST DUE"]}</td>
          <td>{totals.TOTAL}</td>
        </tr>
      </tbody>
    </table>
  );
}

function PercentageTable({ data, totals }) {
  return (
    <table style={table}>
      <thead>
        <tr>
          <th>Owner</th>
          <th>% OPEN</th>
          <th>% ONGOING</th>
          <th>% OVERDUE</th>
          <th>% ON HOLD</th>
          <th>% CLOSED ON TIME</th>
          <th>% CLOSED PAST DUE</th>
          <th><b>% ON-TIME RATE</b></th>
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
              <td>{r.owner}</td>
              {STATUSES.map(s => (
                <td key={s}>{Math.round((r[s] / total) * 100)}%</td>
              ))}
              <td><b>{onTime}%</b></td>
            </tr>
          );
        })}

        <tr style={{ background: "#E5E7EB", fontWeight: "bold" }}>
          <td>TOTAL</td>
          {STATUSES.map(s => (
            <td key={s}>
              {totals.TOTAL === 0
                ? "0%"
                : Math.round((totals[s] / totals.TOTAL) * 100) + "%"}
            </td>
          ))}
          <td>
            {totals["CLOSED ON TIME"] + totals["CLOSED PAST DUE"] === 0
              ? "0%"
              : Math.round(
                  (totals["CLOSED ON TIME"] /
                    (totals["CLOSED ON TIME"] + totals["CLOSED PAST DUE"])) *
                    100
                ) + "%"}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ----------------------------------
// STYLES
// ----------------------------------
const kpiGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 15,
  marginTop: 20
};

const kpiCard = {
  background: "#111827",
  color: "white",
  padding: 16,
  borderRadius: 8,
  textAlign: "center"
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 10
};
