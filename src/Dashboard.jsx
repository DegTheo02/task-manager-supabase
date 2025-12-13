import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Filters from "./Filters";

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from "chart.js";

import ChartDataLabels from "chartjs-plugin-datalabels";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  ChartDataLabels
);

// -------------------------------
// OWNER LIST
// -------------------------------
const owners = [
  "AURELLE", "CHRISTIAN", "SERGEA", "FABRICE", "FLORIAN",
  "JOSIAS", "ESTHER", "MARIUS", "THEOPHANE"
];

// -------------------------------
// RAW STATS PER OWNER
// -------------------------------
function computeOwnerStats(tasks, owners) {
  return owners.map(owner => {
    const ownerTasks = tasks.filter(t => t.owner === owner);

    return {
      owner,
      OPEN: ownerTasks.filter(t => t.status === "OPEN").length,
      ONGOING: ownerTasks.filter(t => t.status === "ONGOING").length,
      OVERDUE: ownerTasks.filter(t => t.status === "OVERDUE").length,
      ON_HOLD: ownerTasks.filter(t => t.status === "ON HOLD").length,
      CLOSED_ON_TIME: ownerTasks.filter(t => t.status === "CLOSED ON TIME").length,
      CLOSED_PAST_DUE: ownerTasks.filter(t => t.status === "CLOSED PAST DUE").length,
      TOTAL: ownerTasks.length
    };
  });
}

// -------------------------------
// PERCENTAGES PER OWNER
// -------------------------------
function computeOwnerPercentages(stats) {
  return stats.map(row => {
    const total = row.TOTAL || 1;

    return {
      owner: row.owner,
      pctOpen: Math.round((row.OPEN / total) * 100),
      pctOngoing: Math.round((row.ONGOING / total) * 100),
      pctOverdue: Math.round((row.OVERDUE / total) * 100),
      pctOnHold: Math.round((row.ON_HOLD / total) * 100),
      pctClosedOnTime: Math.round((row.CLOSED_ON_TIME / total) * 100),
      pctClosedLate: Math.round((row.CLOSED_PAST_DUE / total) * 100),
      pctOnTimeRate: Math.round(
        (row.CLOSED_ON_TIME / ((row.CLOSED_ON_TIME + row.CLOSED_PAST_DUE) || 1)) * 100
      )
    };
  });
}

// -------------------------------
// TOTAL helpers
// -------------------------------
function totalTasks(stats) {
  return stats.reduce((a, r) => a + r.TOTAL, 0);
}

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [filtered, setFiltered] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("tasks").select("*");
    setTasks(data || []);
    setFiltered(data || []);
  }

  // FILTER LOGIC
  function applyFilters(f) {
    let result = [...tasks];

    if (f.search)
      result = result.filter(t =>
        t.title.toLowerCase().includes(f.search.toLowerCase())
      );

    if (f.owner)
      result = result.filter(t => t.owner === f.owner);

    if (f.status)
      result = result.filter(t => t.status === f.status);

    if (f.assignedFrom)
      result = result.filter(t => t.assigned_date >= f.assignedFrom);

    if (f.assignedTo)
      result = result.filter(t => t.assigned_date <= f.assignedTo);

    if (f.deadlineFrom)
      result = result.filter(t => t.initial_deadline >= f.deadlineFrom);

    if (f.deadlineTo)
      result = result.filter(t => t.initial_deadline <= f.deadlineTo);

    setFiltered(result);
  }

  // -------------------------------
  // KPI CALCULATIONS
  // -------------------------------
  const total = filtered.length;

  const open = filtered.filter(t => t.status === "OPEN").length;
  const ongoing = filtered.filter(t => t.status === "ONGOING").length;
  const overdue = filtered.filter(t => t.status === "OVERDUE").length;
  const onhold = filtered.filter(t => t.status === "ON HOLD").length;
  const closedOnTime = filtered.filter(t => t.status === "CLOSED ON TIME").length;
  const closedLate = filtered.filter(t => t.status === "CLOSED PAST DUE").length;

  const closedTotal = closedOnTime + closedLate;
  const percentOnTime = closedTotal > 0
    ? Math.round((closedOnTime / closedTotal) * 100)
    : 0;

  // OWNER TABLES
  const ownerStats = computeOwnerStats(filtered, owners);
  const ownerPercentages = computeOwnerPercentages(ownerStats);

  // -------------------------------
  // STACKED CHART DATA + LABELS
  // -------------------------------
  const stackedPercentageData = ownerStats.map(o => {
    const total = o.TOTAL || 1;
    return {
      OPEN: Math.round((o.OPEN / total) * 100),
      ONGOING: Math.round((o.ONGOING / total) * 100),
      OVERDUE: Math.round((o.OVERDUE / total) * 100),
      ON_HOLD: Math.round((o.ON_HOLD / total) * 100),
      CLOSED_ON_TIME: Math.round((o.CLOSED_ON_TIME / total) * 100),
      CLOSED_PAST_DUE: Math.round((o.CLOSED_PAST_DUE / total) * 100)
    };
  });

  const stackedData = {
    labels: owners,
    datasets: [
      {
        label: "Open",
        data: ownerStats.map(o => o.OPEN),
        percentages: stackedPercentageData.map(p => p.OPEN),
        backgroundColor: "#3B82F6"
      },
      {
        label: "Ongoing",
        data: ownerStats.map(o => o.ONGOING),
        percentages: stackedPercentageData.map(p => p.ONGOING),
        backgroundColor: "#0EA5A8"
      },
      {
        label: "Overdue",
        data: ownerStats.map(o => o.OVERDUE),
        percentages: stackedPercentageData.map(p => p.OVERDUE),
        backgroundColor: "#DC2626"
      },
      {
        label: "On Hold",
        data: ownerStats.map(o => o.ON_HOLD),
        percentages: stackedPercentageData.map(p => p.ON_HOLD),
        backgroundColor: "#6B7280"
      },
      {
        label: "Closed On Time",
        data: ownerStats.map(o => o.CLOSED_ON_TIME),
        percentages: stackedPercentageData.map(p => p.CLOSED_ON_TIME),
        backgroundColor: "#16A34A"
      },
      {
        label: "Closed Past Due",
        data: ownerStats.map(o => o.CLOSED_PAST_DUE),
        percentages: stackedPercentageData.map(p => p.CLOSED_PAST_DUE),
        backgroundColor: "#F97316"
      }
    ]
  };

  const stackedOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      datalabels: {
        color: "white",
        anchor: "center",
        align: "center",
        formatter: (value, ctx) => {
          const pct = ctx.dataset.percentages[ctx.dataIndex];
          return pct > 0 ? pct + "%" : "";
        },
        font: { size: 12, weight: "bold" }
      }
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true }
    }
  };

  // -------------------------------
  // RENDER
  // -------------------------------
  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard</h1>

      {/* FILTER BAR */}
      <Filters onChange={applyFilters} />

      {/* KPI CARDS */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 20,
        marginTop: 20
      }}>
        <KPI title="Open" value={open} color="#3B82F6" />
        <KPI title="Ongoing" value={ongoing} color="#0EA5A8" />
        <KPI title="Overdue" value={overdue} color="#DC2626" />
        <KPI title="On Hold" value={onhold} color="#6B7280" />
        <KPI title="Closed On Time" value={closedOnTime} color="#16A34A" />
        <KPI title="Closed Late" value={closedLate} color="#F97316" />
        <KPI title="% On Time" value={percentOnTime + "%"} color="#2563EB" />
        <KPI title="Total Tasks" value={total} color="#000000" />
      </div>

      {/* STACKED COLUMN CHART */}
      <h3 style={{ marginTop: 40 }}>Task Distribution per Owner (Stacked)</h3>
      <Bar data={stackedData} options={stackedOptions} />

      {/* RAW TABLE */}
      <h2 style={{ marginTop: 40 }}>Tasks per Owner</h2>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
        <thead>
          <tr style={{ background: "#ECEFF1" }}>
            <th style={th}>Owner</th>
            <th style={th}>Open</th>
            <th style={th}>Ongoing</th>
            <th style={th}>Overdue</th>
            <th style={th}>On Hold</th>
            <th style={th}>Closed On Time</th>
            <th style={th}>Closed Past Due</th>
            <th style={th}><strong>Total</strong></th>
          </tr>
        </thead>

        <tbody>
          {ownerStats.map(row => (
            <tr key={row.owner}>
              <td style={td}>{row.owner}</td>
              <td style={td}>{row.OPEN}</td>
              <td style={td}>{row.ONGOING}</td>
              <td style={td}>{row.OVERDUE}</td>
              <td style={td}>{row.ON_HOLD}</td>
              <td style={td}>{row.CLOSED_ON_TIME}</td>
              <td style={td}>{row.CLOSED_PAST_DUE}</td>
              <td style={{ ...td, fontWeight: "bold" }}>{row.TOTAL}</td>
            </tr>
          ))}

          {/* TOTAL ROW */}
          <tr style={{ background: "#E0E0E0", fontWeight: "bold" }}>
            <td style={td}>TOTAL</td>
            <td style={td}>{ownerStats.reduce((a, r) => a + r.OPEN, 0)}</td>
            <td style={td}>{ownerStats.reduce((a, r) => a + r.ONGOING, 0)}</td>
            <td style={td}>{ownerStats.reduce((a, r) => a + r.OVERDUE, 0)}</td>
            <td style={td}>{ownerStats.reduce((a, r) => a + r.ON_HOLD, 0)}</td>
            <td style={td}>{ownerStats.reduce((a, r) => a + r.CLOSED_ON_TIME, 0)}</td>
            <td style={td}>{ownerStats.reduce((a, r) => a + r.CLOSED_PAST_DUE, 0)}</td>
            <td style={td}>
              {ownerStats.reduce((a, r) => a + r.TOTAL, 0)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* PERCENTAGE TABLE */}
      <h2 style={{ marginTop: 40 }}>Task Distribution (%) per Owner</h2>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
        <thead>
          <tr style={{ background: "#ECEFF1" }}>
            <th style={th}>Owner</th>
            <th style={th}>% Open</th>
            <th style={th}>% Ongoing</th>
            <th style={th}>% Overdue</th>
            <th style={th}>% On Hold</th>
            <th style={th}>% Closed On Time</th>
            <th style={th}>% Closed Past Due</th>
            <th style={th}><strong>% On-Time Rate</strong></th>
          </tr>
        </thead>

        <tbody>
          {ownerPercentages.map(row => (
            <tr key={row.owner}>
              <td style={td}>{row.owner}</td>
              <td style={td}>{row.pctOpen}%</td>
              <td style={td}>{row.pctOngoing}%</td>
              <td style={td}>{row.pctOverdue}%</td>
              <td style={td}>{row.pctOnHold}%</td>
              <td style={td}>{row.pctClosedOnTime}%</td>
              <td style={td}>{row.pctClosedLate}%</td>
              <td style={{ ...td, fontWeight: "bold" }}>{row.pctOnTimeRate}%</td>
            </tr>
          ))}

          {/* TOTAL PERCENT ROW */}
          <tr style={{ background: "#E0E0E0", fontWeight: "bold" }}>
            <td style={td}>TOTAL</td>

            <td style={td}>
              {Math.round(
                (ownerStats.reduce((a, r) => a + r.OPEN, 0) /
                  totalTasks(ownerStats)) * 100
              )}%
            </td>

            <td style={td}>
              {Math.round(
                (ownerStats.reduce((a, r) => a + r.ONGOING, 0) /
                  totalTasks(ownerStats)) * 100
              )}%
            </td>

            <td style={td}>
              {Math.round(
                (ownerStats.reduce((a, r) => a + r.OVERDUE, 0) /
                  totalTasks(ownerStats)) * 100
              )}%
            </td>

            <td style={td}>
              {Math.round(
                (ownerStats.reduce((a, r) => a + r.ON_HOLD, 0) /
                  totalTasks(ownerStats)) * 100
              )}%
            </td>

            <td style={td}>
              {Math.round(
                (ownerStats.reduce((a, r) => a + r.CLOSED_ON_TIME, 0) /
                  totalTasks(ownerStats)) * 100
              )}%
            </td>

            <td style={td}>
              {Math.round(
                (ownerStats.reduce((a, r) => a + r.CLOSED_PAST_DUE, 0) /
                  totalTasks(ownerStats)) * 100
              )}%
            </td>

            {/* GLOBAL ON-TIME RATE */}
            <td style={td}>
              {(() => {
                const onTime = ownerStats.reduce((a, r) => a + r.CLOSED_ON_TIME, 0);
                const late = ownerStats.reduce((a, r) => a + r.CLOSED_PAST_DUE, 0);
                const tot = onTime + late;
                return tot === 0 ? "0%" : Math.round((onTime / tot) * 100) + "%";
              })()}
            </td>
          </tr>
        </tbody>
      </table>

    </div>
  );
}

/* Table Cell Styles */
const th = {
  padding: 8,
  border: "1px solid #ccc",
  textAlign: "center"
};

const td = {
  padding: 8,
  border: "1px solid #ccc",
  textAlign: "center"
};

/* KPI COMPONENT */
function KPI({ title, value, color }) {
  return (
    <div style={{
      background: color,
      color: "white",
      padding: 20,
      borderRadius: 8,
      textAlign: "center"
    }}>
      <div>{title}</div>
      <div style={{ fontSize: 32, fontWeight: "bold" }}>{value}</div>
    </div>
  );
}
