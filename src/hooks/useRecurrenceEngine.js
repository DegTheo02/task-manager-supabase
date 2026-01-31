// src/hooks/useRecurrenceEngine.js

/* -------------------------------
   DATE HELPERS (NO DEPENDENCIES)
-------------------------------- */

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const addMonths = (date, months) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);

  // handle month overflow (Jan 31 → Feb)
  if (d.getDate() < day) {
    d.setDate(0);
  }
  return d;
};

const getLastWeekdayOfMonth = (year, month, weekday) => {
  const d = new Date(year, month + 1, 0);
  while (d.getDay() !== weekday) {
    d.setDate(d.getDate() - 1);
  }
  return d;
};

const getNthWeekdayOfMonth = (year, month, weekday, nth) => {
  const d = new Date(year, month, 1);
  let count = 0;

  while (d.getMonth() === month) {
    if (d.getDay() === weekday) {
      count++;
      if (count === nth) return new Date(d);
    }
    d.setDate(d.getDate() + 1);
  }
  return null;
};

/* -------------------------------
   MAIN ENGINE
-------------------------------- */

export function generateRecurringDates({
  type,               // Weekly | Bi-Weekly | Monthly
  startDate,
  endDate,
  weekdays = [],      // for weekly
  monthlyRule,        // DAY_OF_MONTH | LAST_WEEKDAY | NTH_WEEKDAY
  monthlyWeekday,
  monthlyNth
}) {
  const dates = [];
  let cursor = new Date(startDate);
  const end = new Date(endDate);

  while (cursor <= end) {
    let occurrence = null;

    if (type === "Weekly" || type === "Bi-Weekly") {
      if (weekdays.includes(cursor.getDay())) {
        occurrence = new Date(cursor);
      }
    }

    if (type === "Monthly") {
      if (monthlyRule === "DAY_OF_MONTH") {
        occurrence = new Date(cursor);
      }

      if (monthlyRule === "LAST_WEEKDAY") {
        occurrence = getLastWeekdayOfMonth(
          cursor.getFullYear(),
          cursor.getMonth(),
          monthlyWeekday
        );
      }

      if (monthlyRule === "NTH_WEEKDAY") {
        occurrence = getNthWeekdayOfMonth(
          cursor.getFullYear(),
          cursor.getMonth(),
          monthlyWeekday,
          monthlyNth
        );
      }
    }

    if (occurrence && occurrence <= end) {
      dates.push(occurrence.toISOString().slice(0, 10));
    }

    if (type === "Weekly") cursor = addDays(cursor, 7);
    else if (type === "Bi-Weekly") cursor = addDays(cursor, 14);
    else if (type === "Monthly") cursor = addMonths(cursor, 1);
    else break;
  }

  return dates;
}
