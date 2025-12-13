import React, { useMemo } from "react";
import {
  Bar,
  Chart as ChartJS
} from "react-chartjs-2";
import "chart.js/auto";

/* =========================================================
   STATUS CONFIG (KEEP CONSISTENT ACROSS DASHBOARD)
========================================================= */
const STATUSES = ["Open", "In Progress", "Blocked", "Done"];

const STATUS_COLORS = {
  Open: "rgba(54, 162, 235, ALPHA)",        // blue
  "In Progress": "rgba(255, 206, 86, ALPHA)", // yellow
  Blocked: "rgba(255, 99, 132, ALPHA)",     // red
  Done: "rgba(75, 192, 192, ALPHA)"         // green
};

/* =========================================================
   UTILS
========================================================= */
function getIntensityColor(baseColor, value, max) {
  if (max === 0) return baseColor.replace("ALPHA", "0.2");
  const alpha = Math.max(0.25, value / max);
  return baseColor.replace("ALPHA", alpha.toFixed(2));
}

/* =========================================================
   DASHBOARD
========================================================= */
export default function Dashboard({
  filteredTasks = [] // <-- must already be filtered by your Filters.jsx
}) {
  /* =======================================================
     OWNER PRODUCTIVITY HEATMAP – DATA AGGREGATION
  ======================================================= */
  const heatmapData = useMemo(() => {
    const map = {};

    filteredTasks.forEach((task) => {
      const owner = task.owner || "Unassigned";
      const status = task.status;

      if (!STATUSES.includes(status)) return;

      if (!map[owner]) {
        map[owner] = {};
        STATUSES.forEach((s) => (map[owner][s] = 0));
      }
      map[owner][status] += 1;
    });

    return map;
  }, [filteredTasks]);

  const owners = useMemo(() => Object.keys(heatmapData), [heatmapData]);

  const maxCellValue = useMemo(() => {
    let max = 0;
    Object.values(heatmapData).forEach((statusMap) => {
      Object.values(statusMap).forEach((v) => {
        if (v > max) max = v;
      });
    });
    return max;
  }, [heatmapData]);

  /* =======================================================
     HEATMAP CHART CONFIG
  ======================================================= */
  const heatmapChartData = useMemo(() => {
    return {
      labels: owners, // Y-axis
      datasets: STATUSES.map((status) => ({
        label: status,
        data: owners.map((owner) => heatmapData[owner]?.[status] || 0),
        backgroundColor: owners.map((owner) =>
          getIntensityColor(
            STATUS_COLORS[status],
            heatmapData[owner]?.[status] || 0,
            maxCellValue
          )
        ),
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)"
      }))
    };
  }, [owners, heatmapData, maxCellValue]);

  const heatmapOptions = {
    indexAxis: "y", // <-- OWNERS ON Y-AXIS
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top"
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            return `${ctx.dataset.label}: ${ctx.raw} tasks`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          precision: 0
        },
        title: {
          display: true,
          text: "Number of Tasks"
        }
      },
      y: {
        title: {
          display: true,
          text: "Owner"
        }
      }
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */
  return (
    <div className="dashboard-container">
      {/* ===================================================
          EXISTING DASHBOARD CONTENT ABOVE
          (KPIs, filters, stacked bars, etc.)
      =================================================== */}

      {/* ===================================================
          OWNER PRODUCTIVITY HEATMAP
      =================================================== */}
      <div className="dashboard-card" style={{ height: "420px", marginTop: 24 }}>
        <h3 style={{ textAlign: "center", marginBottom: 12 }}>
          Owner Productivity Heatmap
        </h3>

        {owners.length === 0 ? (
          <p style={{ textAlign: "center", marginTop: 40 }}>
            No data available for selected filters
          </p>
        ) : (
          <Bar data={heatmapChartData} options={heatmapOptions} />
        )}
      </div>

      {/* ===================================================
          EXISTING TABLES BELOW
      =================================================== */}
    </div>
  );
}
