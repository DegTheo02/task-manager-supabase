import React from "react";

export default function MonthlyRuleSelector({ value, onChange, baseDate }) {
  const rule = value || { type: "same_day" };
  const base = baseDate ? new Date(baseDate) : new Date();
  const weekday = base.getDay();

  return (
    <div>
      <strong>Monthly rule</strong>

      {/* SAME DAY */}
      <label>
        <input
          type="radio"
          name="monthlyRule"
          checked={rule.type === "same_day"}
          onChange={() =>
            onChange({
              type: "day_of_month",
              day: base.getDate()
            })

          }
        />
        Same day each month
      </label>

      {/* LAST WEEKDAY */}
      <label style={{ marginLeft: 12 }}>
        <input
          type="radio"
          name="monthlyRule"
          checked={rule.type === "last_weekday"}
          onChange={() =>
            onChange({
              type: "last_weekday",
              weekday
            })
          }
        />
        Last weekday of month
      </label>

      {/* NTH WEEKDAY */}
      <label style={{ marginLeft: 12 }}>
        <input
          type="radio"
          name="monthlyRule"
          checked={rule.type === "nth_weekday"}
          onChange={() =>
            onChange({
              type: "nth_weekday",
              weekday,
              nth: 1
            })
          }
        />
        Nth weekday of month
      </label>
    </div>
  );
}
