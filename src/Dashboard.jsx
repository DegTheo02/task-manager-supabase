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
  Title,
} from "chart.js";

import { Bar } from "react-chartjs-2";

// Register core chart components
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, Title);

// Register DataLabels from CDN
if (window.ChartDataLabels) {
  ChartJS.register(window.ChartDataLabels);
}

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);

  const owners = [
    "AURELLE",
    "CHRISTIAN",
    "SERGEA",
    "FABRICE",
    "FLORIAN",
    "JOSIAS",
    "ESTHER",
    "MARIUS",
    "THEOPHANE",
  ];

  const statuses = [
    "OPEN",
    "ONGOING",
    "CLOSED ON TIME",
    "CLOSED PAST DUE",
    "OVERDUE",
    "ON HOLD",
  ];

  /** 📌 Fetch tasks */
  const fetchTasks = async () => {
    const { data, error } = await supabase.from("tasks").select("*");
    if (!error) setTasks(data);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    setFilteredTasks(tasks);
  }, [tasks]);

  /** 📌 Apply filters */
  const handleFilter = (filtered) => {
    setFilteredTasks(filtered);
  };

  /** 📌 Count tasks per owner */
  const countTasksByOwner = owners.map((owner) => {
    const list = filteredTasks.filter((t) => t.owner === owner);

    return {
      owner,
      total: list.length,
      OPEN: list.filter((t) => t.status === "OPEN").length,
      ONGOING: list.filter((t) => t.status === "ONGOING").length,
      CLOSED_ON_TIME: list.filter((t) => t.status === "CLOSED ON TIME").length,
      CLOSED_PAST_DUE: list.filter((t) => t.status === "CLOSED PAST DUE").length,
      OVERDUE: list.filter((t) => t.status === "OVERDUE").length,
      ON_HOLD: list.filter((t) => t.status === "ON HOLD").length,
    };
  });

  /** 📌 Totals */
  const totals = {
    OPEN: countTasksByOwner.reduce((a, r) => a + r.OPEN, 0),
    ONGOING: countTasksByOwner.reduce((a, r) => a + r.ONGOING, 0),
    CLOSED_ON_TIME: countTasksByOwner.reduce((a, r) => a + r.CLOSED_ON_TIME, 0),
    CLOSED_PAST_DUE: countTasksByOwner.reduce(
      (a, r) => a + r.CLOSED_PAST_DUE,
      0
    ),
    OVERDUE: countTasksByOwner.reduce((a, r) => a + r.OVERDUE, 0),
    ON_HOLD: countTasksByOwner.reduce((a, r) => a + r.ON_HOLD, 0),
    total: countTasksByOwner.reduce((a, r) => a + r.total, 0),
  };

  /** 📌 Stacked bar chart data */
  const stackedData = {
    labels: owners,
    datasets: [
      {
        label: "OPEN",
        data: countTasksByOwner.map((r) => r.OPEN),
        backgroundColor: "#0ea5e9",
      },
      {
        label: "ONGOING",
        data: countTasksByOwner.map((r) => r.ONGOING),
        backgroundColor: "#6366f1",
      },
      {
        label: "CLOSED ON TIME",
        data: countTasksByOwner.map((r) => r.CLOSED_ON_TIME),
        backgroundColor: "#22c55e",
      },
      {
        label: "CLOSED PAST DUE",
        data: countTasksByOwner.map((r) => r.CLOSED_PAST_DUE),
        backgroundColor: "#f97316",
      },
      {
        label: "OVERDUE",
        data: countTasksByOwner.map((r) => r.OVERDUE),
        backgroundColor: "#ef4444",
      },
      {
        label: "ON HOLD",
        data: countTasksByOwner.map((r) => r.ON_HOLD),
        backgroundColor: "#a855f7",
      },
    ],
  };

  /** 📌 Chart options */
  const stackedOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Task Distribution per Owner (Stacked)" },
      datalabels: {
        anchor: "center",
        color: "#fff",
        formatter: (value) => (value > 0 ? value : ""),
      },
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true },
    },
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard</h1>

      {/* Filters */}
      <Filters onFilter={handleFilter} tasks={tasks} />

      {/* Stacked Chart */}
      <div style={{ marginTop: 30 }}>
        <Bar data={stackedData} options={stackedOptions} />
      </div>

      {/* Tasks per Owner Table */}
      <h2 style={{ marginTop: 40 }}>Tasks per Owner</h2>
      <table border="1" cellPadding="6" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: "#f4f4f4" }}>
          <tr>
            <th>Owner</th>
            <th>Total</th>
            <th>OPEN</th>
            <th>ONGOING</th>
            <th>CLOSED ON TIME</th>
            <th>CLOSED PAST DUE</th>
            <th>OVERDUE</th>
            <th>ON HOLD</th>
          </tr>
        </thead>
        <tbody>
          {countTasksByOwner.map((row) => (
            <tr key={row.owner}>
              <td>{row.owner}</td>
              <td>{row.total}</td>
              <td>{row.OPEN}</td>
              <td>{row.ONGOING}</td>
              <td>{row.CLOSED_ON_TIME}</td>
              <td>{row.CLOSED_PAST_DUE}</td>
              <td>{row.OVERDUE}</td>
              <td>{row.ON_HOLD}</td>
            </tr>
          ))}

          {/* TOTAL ROW */}
          <tr style={{ background: "#e5e7eb", fontWeight: "bold" }}>
            <td>Total</td>
            <td>{totals.total}</td>
            <td>{totals.OPEN}</td>
            <td>{totals.ONGOING}</td>
            <td>{totals.CLOSED_ON_TIME}</td>
            <td>{totals.CLOSED_PAST_DUE}</td>
            <td>{totals.OVERDUE}</td>
            <td>{totals.ON_HOLD}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
