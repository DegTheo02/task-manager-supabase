import React, { useMemo, useState } from "react";

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const normalizeDay = d => d?.split("T")?.[0];

const isToday = iso => {
  const today = new Date().toISOString().slice(0, 10);
  return iso === today;
};

export default function TaskCalendar({ rows, darkMode, onDayClick }) {
  /* ===============================
     MONTH STATE
  ================================ */
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  const isFutureMonth = () => {
    const now = new Date();
    return (
      year > now.getFullYear() ||
      (year === now.getFullYear() && month > now.getMonth())
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
     BUILD FULL CALENDAR GRID (REAL DATES)
  ================================ */
  const first = new Date(startOfMonth);
  const firstWeekday = first.getDay() === 0 ? 6 : first.getDay() - 1;
  first.setDate(first.getDate() - firstWeekday);

  const last = new Date(endOfMonth);
  const lastWeekday = last.getDay() === 0 ? 6 : last.getDay() - 1;
  last.setDate(last.getDate() + (6 - lastWeekday));

  const cells = [];
  const cursor = new Date(first);
  while (cursor <= last) {
    cells.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
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
        {cells.map(date => {
          const iso = date.toISOString().slice(0, 10);
          const isOutsideMonth = date.getMonth() !== month;
          const count = tasksByDay[iso] || 0;

          const weekday = date.getDay(); // 0=Sun … 6=Sat
          const isSunday = weekday === 0;
          const isSaturday = weekday === 6;
          const todayFlag = isToday(iso);

          return (
            <div
              key={iso}
              onClick={e => !isOutsideMonth && count && onDayClick(iso, e)}
              style={{
                height: 70,
                borderRadius: 8,
                cursor:
                  !isOutsideMonth && count ? "pointer" : "default",
                opacity: isOutsideMonth ? 0.35 : 1,
                background: todayFlag
                  ? darkMode
                    ? "#2563eb"
                    : "#dbeafe"
                  : isSunday || isSaturday
                  ? darkMode
                    ? "rgba(245,158,11,0.15)"
                    : "rgba(245,158,11,0.12)"
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
                <span>{iso.slice(-2)}</span>

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
              {count > 0 && !isOutsideMonth && (
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
      </div>
    </div>
  );
}
