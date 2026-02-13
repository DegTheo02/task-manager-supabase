import React, { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import TaskCalendar from "./TaskCalendar";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";

import { Bar } from "react-chartjs-2";

import {
  STATUSES,
  STATUS_COLORS,
  OWNERS,
  TEAMS,
  REQUESTERS
} from "./constants/taskConstants";

/* ===============================
   CHART REGISTRATION
================================ */
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

const formatDateLabel = isoDate => {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit"
  });
};

/* ===============================
   MULTI DROPDOWN
================================ */
function MultiDropdown({ label, items = [], values, onChange, darkMode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const allSelected = values.length === items.length && items.length > 0;

  const toggleItem = value => {
    onChange(
      values.includes(value)
        ? values.filter(v => v !== value)
        : [...values, value]
    );
  };

  const toggleAll = () => {
    onChange(allSelected ? [] : [...items]);
  };

  useEffect(() => {
    const close = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 160 }}>
      <label style={filterLabel}>{label}</label>

      <div style={dropdownBox} onClick={() => setOpen(o => !o)}>
        {values.length === 0 && "Select…"}
        {values.length > 0 &&
          values.length < items.length &&
          `${values.length} selected`}
        {allSelected && "All selected"}
      </div>

      {open && (
        <div
          style={{
            ...dropdownMenu,
            background: darkMode ? "#111" : "#fff",
            color: darkMode ? "#fff" : "#000",
            border: darkMode ? "1px solid #444" : "1px solid #ccc"
          }}
        >
          <label style={{ ...dropdownItem, fontWeight: 700 }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
            />
            Select All
          </label>

          <hr style={{ margin: "6px 0" }} />

          {items.map(item => (
            <label key={item} style={dropdownItem}>
              <input
                type="checkbox"
                checked={values.includes(item)}
                onChange={() => toggleItem(item)}
              />
              {item}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===============================
   PAGE
================================ */
export default function DailyTaskVolume() {
  const [rows, setRows] = useState([]);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true"
  );

  const navigate = useNavigate();

  const [filters, setFilters] = useState(() => {
    const saved = sessionStorage.getItem("dailyVolumeFilters");
    return saved
      ? JSON.parse(saved)
      : {
          owners: [],
          teams: [],
          requesters: [],
          statuses: [],
          ...getLast30DaysRange()
        };
  });

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    sessionStorage.setItem(
      "dailyVolumeFilters",
      JSON.stringify(filters)
    );
  }, [filters]);

  const resetFilters = () => {
    const empty = {
      owners: [],
      teams: [],
      requesters: [],
      statuses: [],
      ...getLast30DaysRange()
    };
    setFilters(empty);
  };

  /* ===============================
     DATA LOAD
  ================================ */
  useEffect(() => {
    const load = async () => {
      let q = supabase
        .from("task_daily_status")
        .select("status_day,status,owner,team,requester");

      if (filters.owners.length) q = q.in("owner", filters.owners);
      if (filters.teams.length) q = q.in("team", filters.teams);
      if (filters.requesters.length)
        q = q.in("requester", filters.requesters);
      if (filters.statuses.length)
        q = q.in("status", filters.statuses);
      if (filters.date_from)
        q = q.gte("status_day", filters.date_from);
      if (filters.date_to)
        q = q.lte("status_day", filters.date_to);

      const { data } = await q;
      setRows(data || []);
    };
    load();
  }, [filters]);

  /* ===============================
     CHART DATA
  ================================ */
  const chartData = useMemo(() => {
    if (!rows.length) return { labels: [], datasets: [] };

    const days = [
      ...new Set(rows.map(r => r.status_day.split("T")[0]))
    ].sort((a, b) => new Date(a) - new Date(b));

    return {
      labels: days.map(formatDateLabel),
      days,
      datasets: STATUSES.map(s => ({
        label: s,
        data: days.map(
          d =>
            rows.filter(
              r =>
                r.status_day.startsWith(d) &&
                r.status === s
            ).length
        ),
        backgroundColor: STATUS_COLORS[s]
      }))
    };
  }, [rows]);

  /* ===============================
     RENDER
  ================================ */
  return (
    <div
      style={{
        padding: 20,
        minHeight: "100vh",
        background: darkMode ? "#0f0f0f" : "#f5f5f5",
        color: darkMode ? "#fff" : "#000"
      }}
    >
      <h1>📊 Daily Task Volume</h1>

      {/* STICKY FILTER BAR */}
      <div
        style={{
          position: "sticky",
          top: 40,
          zIndex: 100,
          background: darkMode ? "#0f0f0f" : "#f5f5f5",
          paddingBottom: 12,
          marginBottom: 20,
          borderBottom: darkMode
            ? "1px solid #222"
            : "1px solid #ddd"
        }}
      >
        <div
          style={{
            ...filterBar,
            background: darkMode ? "#111" : "#fff",
            border: darkMode ? "1px solid #444" : "1px solid #ccc",
            borderRadius: 10,
            padding: 12,
            boxShadow: "0 2px 6px rgba(0,0,0,0.12)"
          }}
        >
          <MultiDropdown
            label="👤 Owner(s)"
            items={OWNERS}
            values={filters.owners}
            onChange={v =>
              setFilters(f => ({ ...f, owners: v }))
            }
            darkMode={darkMode}
          />

          <MultiDropdown
            label="🧩 Team(s)"
            items={TEAMS}
            values={filters.teams}
            onChange={v =>
              setFilters(f => ({ ...f, teams: v }))
            }
            darkMode={darkMode}
          />

          <MultiDropdown
            label="📄 Requester(s)"
            items={REQUESTERS}
            values={filters.requesters}
            onChange={v =>
              setFilters(f => ({ ...f, requesters: v }))
            }
            darkMode={darkMode}
          />

          <MultiDropdown
            label="📌 Status(es)"
            items={STATUSES}
            values={filters.statuses}
            onChange={v =>
              setFilters(f => ({ ...f, statuses: v }))
            }
            darkMode={darkMode}
          />

          <div>
            <label style={filterLabel}>📅 Date range</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="date"
                style={filterDate}
                value={filters.date_from}
                onChange={e =>
                  setFilters(f => ({
                    ...f,
                    date_from: e.target.value
                  }))
                }
              />
              <input
                type="date"
                style={filterDate}
                value={filters.date_to}
                onChange={e =>
                  setFilters(f => ({
                    ...f,
                    date_to: e.target.value
                  }))
                }
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setDarkMode(d => !d)}
              style={actionButton}
            >
              {darkMode ? "🌙 Dark" : "☀️ Light"}
            </button>

            <button onClick={resetFilters} style={actionButton}>
              🔄 Reset
            </button>
          </div>
        </div>
      </div>

       {/* CALENDAR */}
          <TaskCalendar
            rows={rows}
            darkMode={darkMode}
            statuses={filters.statuses}
            onDayClick={(day, evt) => {
              const params = new URLSearchParams({
                date_from: day,
                date_to: day,
                owners: filters.owners.join(","),
                teams: filters.teams.join(","),
                requesters: filters.requesters.join(","),
                statuses: filters.statuses.join(",")
              });
    
              const url = `/tasks?${params.toString()}`;
    
              evt.ctrlKey || evt.metaKey
                ? window.open(url, "_blank")
                : navigate(url);
            }}
          />



      {/* CHART */}
      <div
        style={{
          ...chartContainer,
          background: darkMode ? "#111" : "#fff",
          borderRadius: 10,
          padding: 12,
          marginBottom: 40,
          marginTop: 100
        }}
      >

        <Bar
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
      
          onClick: (evt, elements) => {
            if (!elements.length) return;
      
            const el = elements[0];
            const day = chartData.days[el.index];
            const status =
              chartData.datasets[el.datasetIndex].label;
      
            const params = new URLSearchParams({
              status,
              date_from: day,
              date_to: day,
              owners: filters.owners.join(","),
              teams: filters.teams.join(","),
              requesters: filters.requesters.join(",")
            });
      
            const url = `/tasks?${params.toString()}`;
      
            evt.native.ctrlKey || evt.native.metaKey
              ? window.open(url, "_blank")
              : navigate(url);
          },
      
          scales: {
            x: { stacked: true },
            y: { stacked: true, beginAtZero: true }
          },
      
          plugins: {
                      valueLabelPlugin: {
                       disabled: true    // ❌ DISABLE absolute
                                       },
            datalabels: {
              display: context =>
                context.dataset.data[context.dataIndex] > 0,
              color: "#fff",
              font: { weight: "bold" },
              formatter: value => value // 🔥 only absolute values
            },
            tooltip: {
              callbacks: {
                label: context =>
                  `${context.dataset.label}: ${context.raw}`
              }
            },
            legend: {
              labels: {
                color: darkMode ? "#fff" : "#000"
              }
            }
          }
        }}
      />

        
      </div>
        </div>
      );
    }
     

/* ===============================
   STYLES
================================ */
const filterBar = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "flex-end"
};

const filterLabel = { fontSize: 13, fontWeight: 600 };
const filterDate = { height: 32, padding: "4px 6px" };

const dropdownBox = {
  height: 32,
  padding: "6px 8px",
  border: "1px solid #ccc",
  borderRadius: 6
};

const dropdownMenu = {
  position: "absolute",
  top: "110%",
  width: "100%",
  borderRadius: 6,
  padding: 8,
  zIndex: 100
};

const dropdownItem = { display: "flex", gap: 6, fontSize: 13 };

const chartContainer = { height: 380 };

const actionButton = {
  height: 32,
  padding: "0 14px",
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 6,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer"
};

const getLast30DaysRange = () => {
  const now = new Date();
  const from = new Date(now);
  const to = new Date(now);
  from.setDate(now.getDate() - 7);
  to.setDate(now.getDate() + 15);

  const fmt = d => d.toISOString().slice(0, 10);
  return { date_from: fmt(from), date_to: fmt(to) };
};
