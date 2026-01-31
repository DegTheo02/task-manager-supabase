import React, { useMemo, useState } from "react";

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const normalizeDay = d => d?.split("T")?.[0];

const isToday = iso => {
  const today = new Date().toISOString().slice(0, 10);
  return iso === today;
};

const getWeekday = iso => {
  return new Date(iso).getDay(); // 0=Sun ... 6=Sat
};


export default function TaskCalendar({
  rows,
  darkMode,
  onDayClick
}) {
  /* ===============================
     MONTH STATE
  ================================ */
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const startOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  );

  const endOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  );

  const isFutureMonth = () => {
    const now = new Date();
    return (
      currentMonth.getFullYear() > now.getFullYear() ||
      (currentMonth.getFullYear() === now.getFullYear() &&
        currentMonth.getMonth() > now.getMonth())
    );
  };

  /* ===============================
     GROUP TASKS BY DAY (MONTH ONLY)
  ================================ */
  const tasksByDay = useMemo(() => {
    return rows.reduce((acc, r) => {
      const day = normalizeDay(r.status_day);
      if (!day) return acc;

      const d = new Date(day);
      if (d < startOfMonth || d > endOfMonth) return acc;

      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});
  }, [rows, startOfMonth, endOfMonth]);

  const maxCount = Math.max(0, ...Object.values(tasksByDay));

  /* ===============================
     BUILD CALENDAR GRID
  ================================ */
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startOffset = firstDay.getDay() === 0
  ? 6   // Sunday → last column
  : firstDay.getDay() - 1;

  const daysInMonth = lastDay.getDate();

  const cells = [];

  for (let i = 0; i < startOffset; i++) cells.push(null);

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = new Date(year, month, d).toISOString().slice(0, 10);
    cells.push(iso);
  }

  /* ===============================
     HEATMAP COLOR
  ================================ */
  const getHeatColor = count => {
    if (!count) return darkMode ? "#0b0b0b" : "#fafafa";
    const intensity = maxCount === 0 ? 0 : count / maxCount;
    return `rgba(14,165,168,${0.2 + intensity * 0.6})`;
  };

  /* ===============================
     RENDER
  ================================ */
  return (
    <div
      style={{
        marginTop: 30,
        padding: 16,
        borderRadius: 10,
        background: darkMode ? "#111" : "#fff",
        border: darkMode ? "1px solid #333" : "1px solid #ddd"
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12
        }}
      >
        <button
          onClick={() =>
            setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
          }
        >
          ⬅️
        </button>

        <h2 style={{ margin: 0 }}>
          📅{" "}
          {currentMonth.toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric"
          })}
        </h2>

        <button
          disabled={isFutureMonth()}
          onClick={() =>
            setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
          }
        >
          ➡️
        </button>
      </div>

      {/* WEEK HEADER */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {daysOfWeek.map(d => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontWeight: 700,
              paddingBottom: 6,
              opacity: 0.7
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* CALENDAR GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 6
        }}
      >


        {cells.map((day, i) => {
                if (!day) return <div key={i} />;
              
                const count = tasksByDay[day] || 0;
              
                const weekday = getWeekday(day); // 0=Sun ... 6=Sat
                const isSunday = weekday === 0;
                const isSaturday = weekday === 6;
                const todayFlag = isToday(day);
              
                return (
                  <div
                    key={day}
                    onClick={e => count && onDayClick(day, e)}
                    style={{
                      height: 70,
                      borderRadius: 8,
                      cursor: count ? "pointer" : "default",
                      background: todayFlag
                        ? darkMode
                          ? "#2563eb"     // today dark
                          : "#dbeafe"     // today light
                        : isSunday || isSaturday
                        ? darkMode
                          ? "rgba(245,158,11,0.15)" // weekend dark
                          : "rgba(245,158,11,0.12)" // weekend light
                        : getHeatColor(count),
                      border: todayFlag
                        ? "2px solid #2563eb"
                        : darkMode
                        ? "1px solid #222"
                        : "1px solid #ddd",
                      padding: 6,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}
                  >
                    {/* Day number + TODAY badge */}
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.6,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <span>{day.slice(-2)}</span>
              
                      {todayFlag && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: darkMode ? "#bbf7d0" : "#166534"
                          }}
                        >
                          TODAY
                        </span>
                      )}
                    </div>
              
                    {/* Count */}
                    {count > 0 && (
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          textAlign: "right"
                        }}
                      >
                        {count}
                      </div>
                    )}
                  </div>
                );
              })}

