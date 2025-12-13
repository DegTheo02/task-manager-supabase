import React, { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";

/* ======================================================
   CONSTANTS
====================================================== */
const STATUSES = ["Open", "In Progress", "Blocked", "Done"];

const STATUS_COLORS = {
  Open: "rgba(54, 162, 235, 0.8)",
  "In Progress": "rgba(255, 206, 86, 0.8)",
  Blocked: "rgba(255, 99, 132, 0.8)",
  Done: "rgba(75, 192, 192, 0.8)",
};

/* ======================================================
   DASHBOARD
====================================================== */
export default function Dashboard({ filteredTasks = [] }) {
  /* ======================================================
     KPI CALCULATIONS
  ====================================================== */
  const totalTasks = filteredTasks.length;

  const doneTasks = filteredTasks.filter(
    (t) => t.status?.toLowerCase().includes("done")
  ).length;

  const openTasks = totalTasks - doneTasks;

  /* ======================================================
     STACKED BAR DATA (TASK DISTRIBUTION PER OWNER)
  ====================================================== */
  const stackedBarData = useMemo(() => {
    const ownerMap = {};

    filteredTasks.forEach((task) => {
      const owner = task.owner || "Unassigned";
      const status = task.status;

      if (!STATUSES.includes(status)) return;

      if (!ownerMap[owner]) {
        ownerMap[owner] = {};
        STATUSES.forEach((s) => (ownerMap[owner][s] = 0));
      }
      ownerMap[owner][status] += 1;
    });

    const owners = Object.keys(ownerMap);

    const datasets = STATUSES.map((status) => ({
      label: status,
      data: owners.map((o) => ownerMap[o][status]),
      backgroundColor: STATUS_COLORS[status],
    }));

    // Convert counts to percentages
    datasets.forEach((dataset, idx) => {
      dataset.data = dataset.data.map((value, i) => {
        const total = STATUSES.reduce(
          (sum, s, k) => sum + datasets[k].data[i],
          0
        );
        return total === 0 ? 0 : Math.round((value / total) * 100);
      });
    });

    return { owners, datasets };
  }, [filteredTasks]);

  /* ======================================================
     STACKED BAR OPTIONS (VERTICAL)
  ====================================================== */
  const stackedBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: "Owner",
        },
      },
      y: {
        stacked: true,
        max: 100,
        ticks: {
          callback: (value) => `${value}%`,
        },
        title: {
          display: true,
          text: "Task Distribution (%)",
        },
      },
    },
  };

  /* ======================================================
     RENDER
  ====================================================== */
  return (
    <div className="dashboard-container">
      {/* ================= KPIs ================= */}
      <div className="kpi-row">
        <div className="kpi-card">
          <h4>Total Tasks</h4>
          <p>{totalTasks}</p>
        </div>
        <div className="kpi-card">
          <h4>Open Tasks</h4>
          <p>{openTasks}</p>
        </div>
        <div className="kpi-card">
          <h4>Completed Tasks</h4>
          <p>{doneTasks}</p>
        </div>
      </div>

      {/* ================= STACKED BAR ================= */}
      <div className="dashboard-card" style={{ height: 420, marginTop: 24 }}>
        <h3 style={{ textAlign: "center", marginBottom: 12 }}>
          Task Distribution per Owner
        </h3>

        {stackedBarData.owners.length === 0 ? (
          <p style={{ textAlign: "center", marginTop: 40 }}>
            No data available for selected filters
          </p>
        ) : (
          <Bar
            data={{
              labels: stackedBarData.owners,
              datasets: stackedBarData.datasets,
            }}
            options={stackedBarOptions}
          />
        )}
      </div>

      {/* ================= TABLES (EXISTING) ================= */}
      {/* Your existing tables stay unchanged below */}
    </div>
  );
}
