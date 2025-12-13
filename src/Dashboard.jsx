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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title
);

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

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({
    owners: [],
    teams: [],
    statuses: [],
    recurrence_types: [],
    assigned_from: "",
    assigned_to: "",
    deadline_from: "",
    deadline_to: ""
  });

  useEffect(() => {
    supabase
      .from("tasks")
      .select("*")
      .then(({ data }) => setTasks(data || []));
  }, []);

  /* MULTI-SELECT FILTERING */
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filters.owners.length && !filters.owners.includes(t.owner))
        return false;

      if (filters.teams.length && !filters.teams.includes(t.team))
        return false;

      if (filters.statuses.length && !filters.statuses.includes(t.status))
        return false;

      if (
        filters.recurrence_types.length &&
        !filters.recurrence_types.includes(t.recurrence_type)
      )
        return false;

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

  const kpis = STATUSES.map(status => {
    const count = filteredTasks.filter(t => t.status === status).length;
    return {
      status,
      count,
      percent: Math.round((count / totalTasks) * 100)
    };
  });

  const ownerStats = OWNERS.map(owner => {
    const list = filteredTasks.filter(t => t.owner === owner);
    const row = { owner, TOTAL: list.length };
    STATUSES.forEach(s => {
      row[s] = list.filter(t => t.status === s).length;
    });
    return row;
  });

  const chartData = {
    labels: OWNERS,
    datasets: STATUSES.map(status => ({
      label: status,
      data: ownerStats.map(o =>
        o.TOTAL ? Math.round((o[status] / o.TOTAL) * 100) : 0
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
      }
    }
  };

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
        <Bar data={chartData} options={chartOptions} />
      </div>

      {/* TABLES */}
      <h2 style={{ marginTop: 40 }}>Tasks per Owner (Count)</h2>
      <OwnerCountTable data={ownerStats} />

      <h2 style={{ marginTop: 40 }}>Task Distribution (%) per Owner</h2>
      <OwnerPercentageTable data={ownerStats} />
    </div>
  );
}

/* ---------- Components & Styles unchanged ---------- */
