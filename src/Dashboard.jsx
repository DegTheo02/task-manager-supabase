import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import Filters from "./Filters";
import Navbar from "./Navbar";
import {
  OWNERS,
  TEAMS,
  STATUSES,
  STATUS_COLORS,
  STATUS_ICONS,
  REQUESTERS
} from "./constants/taskConstants";



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
  afterDatasetsDraw(chart, args, options) {

    // 🔴 EXIT if explicitly disabled
    if (options?.disabled) return;

    const { ctx } = chart;

    chart.data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);
      if (!meta || meta.hidden) return;

      meta.data.forEach((bar, index) => {
        const value = dataset.data[index];
        if (!value || value < 1) return;

        ctx.save();
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff";
        ctx.fillText(`${value}%`, bar.x, bar.y + bar.height / 2);
        ctx.restore();
      });
    });
  }
};

const valueLabelPlugin = {
  id: "valueLabelPlugin",
  afterDatasetsDraw(chart, args, options) {
    if (options?.disabled) return;

    const { ctx } = chart;

    chart.data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);
      if (!meta || meta.hidden) return;

      meta.data.forEach((bar, index) => {
        const value = dataset.data[index];
        if (!value || value < 1) return;

        ctx.save();
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff";
        ctx.fillText(`${value}`, bar.x, bar.y + bar.height / 2);
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
  percentageLabelPlugin,
  valueLabelPlugin
);


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
    requesters: [],
    statuses: [],
    recurrence_types: [],
    assigned_from: "",
    assigned_to: "",
    deadline_from: "",
    deadline_to: "",
    closing_from: "",  
    closing_to: "" 
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
    /* OWNERS */
    if (filters.owners.length && !filters.owners.includes(t.owner)) return false;

    /* TEAMS */
    if (filters.teams.length && !filters.teams.includes(t.team)) return false;

    /* REQUESTERS */
    if (filters.requesters.length && !filters.requesters.includes(t.requester))return false;

    /* STATUSES */
    if (filters.statuses.length && !filters.statuses.includes(t.status)) return false;

    /* ASSIGNED DATE RANGE */
    if (filters.assigned_from && (!t.assigned_date || t.assigned_date < filters.assigned_from))
      return false;

    if (filters.assigned_to && (!t.assigned_date || t.assigned_date > filters.assigned_to))
      return false;

    /* DEADLINE RANGE (new_deadline OR initial_deadline) */
    const deadline = t.new_deadline || t.initial_deadline;

    if (filters.deadline_from && (!deadline || deadline < filters.deadline_from))
      return false;

    if (filters.deadline_to && (!deadline || deadline > filters.deadline_to))
      return false;

    /* CLOSING DATE RANGE */
    if (filters.closing_from && (!t.closing_date || t.closing_date < filters.closing_from))
      return false;

    if (filters.closing_to && (!t.closing_date || t.closing_date > filters.closing_to))
      return false;

    return true;
  });
}, [tasks, filters]);

  // KPI: closed tasks (on time or past due)
const deadlineClosedTasks = useMemo(() => {
  return filteredTasks.filter(
    t =>
      t.closing_date &&
      t.initial_deadline &&
      (t.status === "CLOSED ON TIME" || t.status === "CLOSED PAST DUE")
  );
}, [filteredTasks]);

  
  const deadlineDurations = useMemo(() => {
  return deadlineClosedTasks
    .map(t => {
      const deadline = new Date(t.initial_deadline);
      const closed = new Date(t.closing_date);

      const diffMs = closed - deadline;
      if (isNaN(diffMs)) return null;

      return diffMs / (1000 * 60 * 60 * 24);
    })
    .filter(d => d !== null);
}, [deadlineClosedTasks]);


  const averageDeadlineDeviationDays = useMemo(() => {
  if (deadlineDurations.length === 0) return null;

  const sum = deadlineDurations.reduce((a, b) => a + b, 0);
  return Math.round((sum / deadlineDurations.length) * 10) / 10;
}, [deadlineDurations]);

  // STEP 6: color based on deadline deviation
const deadlineDeviationColor =
  averageDeadlineDeviationDays === null
    ? undefined
    : averageDeadlineDeviationDays > 0
    ? "#DC2626"   // 🔴 late on average
    : "#16A34A";  // 🟢 on time / early




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
  marginRight: 200
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
    "owner"  );

  const requesterStats = buildStats(
  REQUESTERS.filter(r => filteredTasks.some(t => t.requester === r)),
  "requester");


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
  setFilters(prev => {
    const isActive =
      prev.statuses.length === 1 && prev.statuses[0] === status;

    return {
      ...prev,
      statuses: isActive ? [] : [status]
      // 👇 requester is preserved automatically
    };
  });
};



const resetFilters = () => setFilters({
  owners: [],
  teams: [],
  requesters: [],
  statuses: [],
  recurrence_types: [],
  assigned_from: "",
  assigned_to: "",
  deadline_from: "",
  deadline_to: "",
  closing_from: "",
  closing_to: ""
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

  const getGradientColor = (pct) => {
  if (pct <= 20) return "#2563EB"; // blue
  if (pct <= 40) return "#16A34A"; // green
  if (pct <= 60) return "#FACC15"; // yellow
  if (pct <= 80) return "#F97316"; // orange
  return "#DC2626";               // red
  };

  
        const PercentageCell = ({ value, color, tooltip }) => {
        const pct = Math.max(0, Math.min(value, 100));
        const barColor = color || getGradientColor(pct);
      
        return (
          <div
            title={tooltip}
            style={{
              position: "relative",
              height: 22,
              borderRadius: 6,
              background: "#1f2937",
              overflow: "hidden"
            }}
          >
            {/* BAR */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${pct}%`,
                background: `linear-gradient(
                  to right,
                  ${barColor},
                  rgba(255,255,255,0.25)
                )`,
                opacity: 0.85,
      
                /* ✅ SAFE ANIMATION */
                transition: "width 450ms cubic-bezier(0.4, 0, 0.2, 1), background-color 450ms ease"
              }}
            />
      
            {/* TEXT */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                fontWeight: 700,
                fontSize: 12,
                color: "white",
                textAlign: "center",
                lineHeight: "22px"
              }}
            >
              {pct}%
            </div>
          </div>
        );
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
            <colgroup>
              <col style={{ width: "180px" }} />   {/* Label column */}
              {STATUSES.map(() => (
                <col style={{ width: "120px" }} />
              ))}
              <col style={{ width: "220px" }} />   {/* ✅ Σ TOTAL (wider) */}
            </colgroup>
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
                    <td key={s}>
                      {percentage ? (
                        <PercentageCell
                          value={r.TOTAL ? Math.round((r[s] / r.TOTAL) * 100) : 0}
                          color={STATUS_COLORS[s]}
                          tooltip={`${r[s]} / ${r.TOTAL} tasks (${r.TOTAL ? Math.round((r[s] / r.TOTAL) * 100) : 0}%)`}
                        />

                      ) : (
                        r[s]
                      )}
                    </td>

                  ))}
                    
                    <td>
                      {percentage ? (
                        <PercentageCell
                          value={totals.TOTAL ? Math.round((r.TOTAL / totals.TOTAL) * 100) : 0}
                          color= "#6366F1"
                          tooltip={`${r.TOTAL} / ${totals.TOTAL} total tasks`}
                        />

                      ) : (
                        <b>{r.TOTAL}</b>
                      )}
                    </td>


                </tr>
              ))}

              {/* COLUMN TOTALS */}
               <tr>
                <td><b>Σ TOTAL</b></td>
              
                {STATUSES.map(s => (
                  <td key={s}>
                    {percentage ? (
                      <PercentageCell
                        value={columnPercentageTotals(rows)[s]}
                        color={STATUS_COLORS[s]}
                      />
                    ) : (
                      <b>{totals[s]}</b>
                    )}
                  </td>
                ))}
              
                <td>
                  {percentage ? (
                    <PercentageCell value={100} color="#3B82F6" />
                  ) : (
                    <b>{totals.TOTAL}</b>
                  )}
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


  {/* AVG DEADLINE DEVIATION KPI */}
<div
  style={{
    ...kpiCard("CLOSED ON TIME", darkMode),
    cursor: "default",
    borderTop: "5px solid #0ea5a8" // teal
  }}
>
  <div style={kpiHeader}>
    <span>📅</span>
    <span>Avg Deadline Deviation</span>
  </div>

  <div style={kpiBody}>
    <div style={kpiCount}>Days</div>
    <div style={{ ...kpiPercent, color: deadlineDeviationColor }}>
      {averageDeadlineDeviationDays !== null
        ? `${averageDeadlineDeviationDays} D`
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
      <div style={{ height: 400 }}>
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
                      valueLabelPlugin: {
                       disabled: true    // ❌ DISABLE absolute
                                       },
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
      <div style={{ height: 400, marginTop: 150, marginBottom: 100, marginRight: 0 }}>
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
                      valueLabelPlugin: {
                       disabled: true    // ❌ DISABLE absolute
                                        },
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


      {/* REQUESTER CHART */}
      <div style={{ height: 400, marginTop: 150, marginBottom: 100, marginRight: 0 }}>
        <Bar
          data={{
            labels: requesterStats.map(r => r.label),
            datasets: STATUSES.map(s => ({
              label: s,
              data: requesterStats.map(r =>
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
                      valueLabelPlugin: {
                       disabled: true    // ❌ DISABLE absolute
                                        },
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
      <div style={{ marginBottom: 150 }}>
      <Table title="Tasks per Team (Count)" rows={teamStats} />
      <Table title="Task Distribution (%) per Team" rows={teamStats} percentage />
      </div>
      
      <div style={{ marginBottom: 150 }}>
      <Table title="Tasks per Owner (Count)" rows={ownerStats} />
      <Table title="Task Distribution (%) per Owner" rows={ownerStats} percentage />
      </div>

      <div style={{ marginBottom: 10 }}>
      <Table title="Tasks per Requester (Count)" rows={requesterStats} />
      <Table title="Task Distribution (%) per Requester" rows={requesterStats} percentage />
      </div>

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
