import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import Filters from "./Filters";
import Navbar from "./Navbar";


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

/* ===============================
   % LABEL PLUGIN (AUTO COLOR)
================================ */
const percentageLabelPlugin = {
  id: "percentageLabelPlugin",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;

    const getTextColor = (hex) => {
      const c = hex.replace("#", "");
      const r = parseInt(c.substring(0, 2), 16);
      const g = parseInt(c.substring(2, 4), 16);
      const b = parseInt(c.substring(4, 6), 16);
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      return luminance > 150 ? "#000" : "#fff";
    };

    chart.data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);
      if (!meta || meta.hidden) return;

      meta.data.forEach((bar, index) => {
        const value = dataset.data[index];
        if (!value || value < 5) return;

        ctx.save();
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = getTextColor(dataset.backgroundColor);
        ctx.fillText(`${value}%`, bar.x, bar.y + bar.height / 2);
        ctx.restore();
      });
    });
  }
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title,
  percentageLabelPlugin
);

/* ===============================
   CONSTANTS
================================ */
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

const TEAMS = ["BI","CVM","SM"];

const STATUSES = [
  "CLOSED ON TIME",
  "CLOSED PAST DUE",
  "ON TRACK",
  "OVERDUE",
  "ON HOLD"
];


const STATUS_COLORS = {
  "ON TRACK": "#3B82F6",
  OVERDUE: "#DC2626",
  "ON HOLD": "#6B7280",
  "CLOSED ON TIME": "#16A34A",
  "CLOSED PAST DUE": "#F97316"
};

const STATUS_ICONS = {

  "ON TRACK": "🔄",
  OVERDUE: "⛔",
  "ON HOLD": "⏸",
  "CLOSED ON TIME": "✅",
  "CLOSED PAST DUE": "⚠️"
};

/* ===============================
   DASHBOARD
================================ */
export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true"
  );

const [filters, setFilters] = useState(() => {
  const saved = sessionStorage.getItem("dashboardFilters");
  return saved ? JSON.parse(saved) : {
    owners: [],
    teams: [],
    statuses: [],
    recurrence_types: [],
    assigned_from: "",
    assigned_to: "",
    deadline_from: "",
    deadline_to: ""
  };
});

  useEffect(() => {
    sessionStorage.setItem("dashboardFilters", JSON.stringify(filters));
  }, [filters]);


  useEffect(() => {
    supabase.from("tasks").select("*").then(({ data }) => {
      setTasks(data || []);
    });
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filters.owners.length && !filters.owners.includes(t.owner)) return false;
      if (filters.teams.length && !filters.teams.includes(t.team)) return false;
      if (filters.statuses.length && !filters.statuses.includes(t.status)) return false;
      return true;
    });
  }, [tasks, filters]);

  // STEP 1: completed tasks only
  const completedTasks = useMemo(() => {
    return filteredTasks.filter(t => t.closing_date && t.assigned_date);
  }, [filteredTasks]);

  // STEP 2: compute durations in days
  const completionDurations = useMemo(() => {
    return completedTasks
      .map(t => {
        const assigned = new Date(t.assigned_date);
        const closed = new Date(t.closing_date);

        const diffMs = closed - assigned;
        if (diffMs < 0) return null;

        return diffMs / (1000 * 60 * 60 * 24);
      })
      .filter(d => d !== null);
  }, [completedTasks]);

    // STEP 3: average completion duration
  const averageCompletionDays = useMemo(() => {
    if (completionDurations.length === 0) return null;

    const sum = completionDurations.reduce((a, b) => a + b, 0);
    return Math.round((sum / completionDurations.length) * 10) / 10;
  }, [completionDurations]);



    const totalTasks = filteredTasks.length;

  const kpiStats = STATUSES.map(status => {
    const count = filteredTasks.filter(t => t.status === status).length;
    const percent = totalTasks
      ? Math.round((count / totalTasks) * 100)
      : 0;

    return {
      status,
      count,
      percent
    };
  });

  const kpiContainer = {
  display: "flex",
  gap: 16,
  flexWrap: "wrap",
  marginTop: 20,
  marginBottom: 100,
  marginRight: 400
};

const kpiCard = (status, darkMode) => ({
  minWidth: 100,
  flex: "1 1 100px",
  padding: 14,
  borderRadius: 10,
  background: darkMode ? "#111" : "white",
  borderTop: `8px solid ${STATUS_COLORS[status]}`,
  boxShadow: darkMode
    ? "0 4px 12px rgba(0,0,0,0.6)"
    : "0 4px 12px rgba(0,0,0,0.08)"
});

const kpiHeader = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontWeight: 700,
  marginBottom: 15
};

const kpiBody = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const kpiCount = {
  fontSize: 20,
  fontWeight: 800,
  opacity: 0.8
};

const kpiPercent = {
  fontSize: 26,
  fontWeight: 700,
  opacity: 1.5
};


  const buildStats = (values, key) =>
    values.map(v => {
      const list = filteredTasks.filter(t => t[key] === v);
      const row = { label: v, TOTAL: list.length };
      STATUSES.forEach(s => {
        row[s] = list.filter(t => t.status === s).length;
      });
      return row;
    });

  const teamStats = buildStats(TEAMS, "team");
  const ownerStats = buildStats(
    OWNERS.filter(o => filteredTasks.some(t => t.owner === o)),
    "owner"
  );

  const columnPercentageTotals = (rows) => {
  const totals = columnTotals(rows); // uses counts
  const result = {};

  STATUSES.forEach(s => {
    result[s] = totals.TOTAL
      ? Math.round((totals[s] / totals.TOTAL) * 100)
      : 0;
  });

  return result;
};


  const columnTotals = rows => {
    const total = { TOTAL: 0 };
    STATUSES.forEach(s => (total[s] = 0));
    rows.forEach(r => {
      total.TOTAL += r.TOTAL;
      STATUSES.forEach(s => (total[s] += r[s]));
    });
    return total;
  };
  

  const toggleStatusFilter = (status) => {
  setFilters(prev => ({
    ...prev,
    statuses:
      prev.statuses.length === 1 && prev.statuses[0] === status
        ? []            // toggle OFF
        : [status]      // toggle ON
  }));
};


  const resetFilters = () => setFilters({
    owners: [],
    teams: [],
    statuses: [],
    recurrence_types: [],
    assigned_from: "",
    assigned_to: "",
    deadline_from: "",
    deadline_to: ""
  });

  const pageStyle = {
    padding: 20,
    background: darkMode ? "#0f0f0f" : "#f5f5f5",
    color: darkMode ? "#fff" : "#000",
    minHeight: "100vh"
  };

  const stickyBar = {
    position: "sticky",
    top: 68,
    zIndex: 1000,
    background: darkMode ? "#0f0f0f" : "#f5f5f5",
    paddingBottom: 40,
    marginBottom: 20
  };

  /* ===============================
     TABLE COMPONENT
  ================================ */
  const Table = ({ title, rows, percentage }) => {
    const totals = columnTotals(rows);


    return (
      <>
        <h2>{title}</h2>

        {/* WIDTH CONSTRAINER */}
        <div style={{ maxWidth: 1200, marginLeft: 20 }}>
          <table width="100%" border="3" style={{ textAlign: "center" }}>
            <thead>
              <tr>
                <th>{title.includes("Team") ? "🏷 Team" : "👤 Owner"}</th>
                {STATUSES.map(s => (
                  <th key={s}>
                    {STATUS_ICONS[s]} {s}
                  </th>
                ))}
                <th>Σ TOTAL</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(r => (
                <tr key={r.label}>
                  <td><b>{r.label}</b></td>

                  {STATUSES.map(s => (
                    <td key={s} style={{ color: STATUS_COLORS[s] }}>
                      {percentage
                        ? `${r.TOTAL ? Math.round((r[s] / r.TOTAL) * 100) : 0}%`
                        : r[s]}
                    </td>
                  ))}

                  <td><b>{percentage ? "100%" : r.TOTAL}</b></td>
                </tr>
              ))}

              {/* COLUMN TOTALS */}
            <tr>
  <td><b>Σ TOTAL</b></td>

  {STATUSES.map(s => (
    <td key={s} style={{ color: STATUS_COLORS[s] }}>
      <b>
        {percentage
          ? `${columnPercentageTotals(rows)[s]}%`
          : totals[s]}
      </b>
    </td>
  ))}

  <td>
    <b>{percentage ? "100%" : totals.TOTAL}</b>
  </td>
</tr>

            </tbody>
          </table>
        </div>
      </>
    );
  };

  const smallButton = (darkMode) => ({
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 6,
  border: "1px solid #555",
  background: darkMode ? "#1a1a1a" : "#fff",
  color: darkMode ? "#fff" : "#000",
  cursor: "pointer",
  lineHeight: "1.2"
});


  const compactToolbarButton = (darkMode) => ({
    height: 32,
    padding: "0 10px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    border: darkMode ? "1px solid #444" : "1px solid #ccc",
    background: darkMode ? "#111" : "#fff",
    color: darkMode ? "#fff" : "#000",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    lineHeight: "1"
  });


  return (
    <div style={pageStyle}>
      <h1>Dashboard</h1>

                        {/* STICKY BAR */}
      <div style={stickyBar}>

        {/* NAVBAR */}
        

        {/* FILTER CONTROLS */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            paddingTop: 10,
            alignItems: "center"
          }}
                  >
          <button
            style={compactToolbarButton(darkMode)}
            onClick={() => {
              const next = !darkMode;
              setDarkMode(next);
              localStorage.setItem("darkMode", next);
            }}
          >
            🌙 Light
          </button>

          <button
            style={compactToolbarButton(darkMode)}
            onClick={resetFilters}
          >
            🔄 Reset
          </button>



          <Filters
            values={filters}
            onChange={setFilters}
            darkMode={darkMode}
          />
        </div>
      </div>

      
  {/* KPI CARDS */}
<div style={kpiContainer}>

  {/* AVERAGE COMPLETION KPI */}
<div
  style={{
    ...kpiCard("ON TRACK", darkMode), // reuse existing style
    cursor: "default",
    borderTop: "5px solid #757375ff" // distinct color (indigo)
  }}
>
  <div style={kpiHeader}>
    <span>⏱</span>
    <span>Avg Completion</span>
  </div>

  <div style={kpiBody}>
    <div style={kpiCount}>Tasks</div>
    <div style={kpiPercent}>
      {averageCompletionDays !== null
        ? `${averageCompletionDays} D`
        : "–"}
    </div>
  </div>
</div>


  {kpiStats.map(kpi => {
    const active =
      filters.statuses.length === 1 &&
      filters.statuses[0] === kpi.status;

    return (
      <div
        key={kpi.status}
        onClick={() => toggleStatusFilter(kpi.status)}
        style={{
          ...kpiCard(kpi.status, darkMode),
          cursor: "pointer",
          opacity: active ? 1.5 : 2.75,
          outline: active
            ? `5px solid ${STATUS_COLORS[kpi.status]}`
            : "none"
        }}
      >
        <div style={kpiHeader}>
          <span>{STATUS_ICONS[kpi.status]}</span>
          <span>{kpi.status}</span>
        </div>

        <div style={kpiBody}>
          <div style={kpiCount}>{kpi.count}</div>
          <div style={kpiPercent}>{kpi.percent}%</div>
        </div>
      </div>
    );
  })}
</div>




      {/* TEAM CHART */}
      <div style={{ height: 500 }}>
        <Bar
          data={{
            labels: TEAMS,
            datasets: STATUSES.map(s => ({
              label: s,
              data: TEAMS.map(team => {
                const list = filteredTasks.filter(t => t.team === team);
                const count = list.filter(t => t.status === s).length;
                return list.length ? Math.round((count / list.length) * 100) : 0;
              }),
              backgroundColor: STATUS_COLORS[s]
            }))
          }}
              options={{
                responsive: true,
                scales: {
                  x: {
                    stacked: true,
                    ticks: {
                      font: {
                        size: 14,        // ⬅ X-axis label size
                        weight: "600"
                      }
                    }
                  },
                  y: {
                    stacked: true,
                    min: 0,
                    max: 100,
                    ticks: {
                      font: {
                        size: 14         // ⬅ Y-axis label size
                      },
                      callback: value => `${value}%`
                    }
                  }
                },
                plugins: {
                  legend: {
                    labels: {
                      font: {
                        size: 14,        // ⬅ legend font size
                        weight: "600"
                      }
                    }
                  }
                }
              }}

        />
      </div>

      {/* OWNER CHART */}
      <div style={{ height: 500, marginTop: 150, marginBottom: 100, marginRight: 0 }}>
        <Bar
          data={{
            labels: ownerStats.map(o => o.label),
            datasets: STATUSES.map(s => ({
              label: s,
              data: ownerStats.map(r =>
                r.TOTAL ? Math.round((r[s] / r.TOTAL) * 100) : 0
              ),
              backgroundColor: STATUS_COLORS[s]
            }))
          }}
              options={{
                responsive: true,
                scales: {
                  x: {
                    stacked: true,
                    ticks: {
                      font: {
                        size: 14,        // ⬅ X-axis label size
                        weight: "600"
                      }
                    }
                  },
                  y: {
                    stacked: true,
                    min: 0,
                    max: 100,
                    ticks: {
                      font: {
                        size: 14         // ⬅ Y-axis label size
                      },
                      callback: value => `${value}%`
                    }
                  }
                },
                plugins: {
                  legend: {
                    labels: {
                      font: {
                        size: 14,        // ⬅ legend font size
                        weight: "600"
                      }
                    }
                  }
                }
              }}

        />
      </div>

      {/* TABLES */}
      <Table title="Tasks per Team (Count)" rows={teamStats} />
      <Table title="Task Distribution (%) per Team" rows={teamStats} percentage />

      <Table title="Tasks per Owner (Count)" rows={ownerStats} />
      <Table title="Task Distribution (%) per Owner" rows={ownerStats} percentage />
    </div>
  );

  const closedTasks = filteredTasks.filter(
  t => t.closing_date && t.assigned_date
);

const avgCompletionDays = closedTasks.length
  ? (
      closedTasks.reduce((sum, t) => {
        const start = new Date(t.assigned_date);
        const end = new Date(t.closing_date);
        return sum + (end - start) / (1000 * 60 * 60 * 24);
      }, 0) / closedTasks.length
    ).toFixed(1)
  : "–";

}
