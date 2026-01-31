import React from "react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MonthlyRuleSelector({
  rule,
  weekday,
  nth,
  onChange
}) {
  return (
    <div
      style={{
        padding: 12,
        border: "1px dashed #999",
        borderRadius: 6
      }}
    >
      <strong>Monthly rule</strong>

      <label>
        <input
          type="radio"
          checked={rule === "DAY_OF_MONTH"}
          onChange={() => onChange({ rule: "DAY_OF_MONTH" })}
        />
        Same day each month
      </label>

      <label>
        <input
          type="radio"
          checked={rule === "LAST_WEEKDAY"}
          onChange={() =>
            onChange({
              rule: "LAST_WEEKDAY",
              weekday
            })
          }
        />
        Last weekday of month
      </label>

      <label>
        <input
          type="radio"
          checked={rule === "NTH_WEEKDAY"}
          onChange={() =>
            onChange({
              rule: "NTH_WEEKDAY",
              weekday,
              nth
            })
          }
        />
        Nth weekday of month
      </label>

      {(rule === "LAST_WEEKDAY" || rule === "NTH_WEEKDAY") && (
        <div style={{ marginTop: 8 }}>
          <select
            value={weekday}
            onChange={e =>
              onChange({ rule, weekday: Number(e.target.value), nth })
            }
          >
            {WEEKDAYS.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>

          {rule === "NTH_WEEKDAY" && (
            <select
              value={nth}
              onChange={e =>
                onChange({ rule, weekday, nth: Number(e.target.value) })
              }
            >
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
