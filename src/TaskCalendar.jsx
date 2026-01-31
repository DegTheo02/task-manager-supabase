import React, { useMemo } from "react";

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const normalizeDay = d => d?.split("T")?.[0];

export default function TaskCalendar({
  rows,
  darkMode,
  onDayClick
}) {
  const today = new Date();

  /* 🔢 Group tasks by day */
  const tasksByDay = useMemo(() => {
    return rows.reduce((acc, r) => {
      const day = normalizeDay(r.status_day);
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});
  }, [rows]);

  /* 📅 Build current month grid */
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startOffset = (firstDay.getDay() + 6) % 7; // Monday start
  const daysInMonth = lastDay.getDate();

  const cells = [];

  // Empty cells before month starts
  for (let i = 0; i < startOffset; i++) cells.push(null);

  // Month days
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = new Date(year, month, d).toISOString().slice(0, 10);
    cells.push(iso);
  }

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
      <h2 style={{ marginBottom: 12 }}>📅 Task Calendar</h2>

      {/* Week header */}
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

      {/* Calendar grid */}
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

          return (
            <div
              key={day}
              onClick={e => onDayClick(day, e)}
              style={{
                height: 70,
                borderRadius: 8,
                cursor: count ? "pointer" : "default",
                background: count
                  ? `rgba(14,165,168,${Math.min(0.15 + count / 20, 0.6)})`
                  : darkMode
                  ? "#0b0b0b"
                  : "#fafafa",
                border: darkMode ? "1px solid #222" : "1px solid #ddd",
                padding: 6,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                {day.slice(-2)}
              </div>

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
      </div>
    </div>
  );
}
