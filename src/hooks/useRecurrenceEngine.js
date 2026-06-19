import { useMemo, useState, useEffect } from "react";

/* ================================
   DATE HELPERS (PRIVATE)
================================ */

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const addMonths = (date, months) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);

  // Handle month overflow (e.g. Jan 31 → Feb)
  if (d.getDate() < day) d.setDate(0);
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

/* Parse a "YYYY-MM-DD" string as a LOCAL date (local midnight).
   Using `new Date("YYYY-MM-DD")` parses as UTC midnight, which then
   mismatches locally-constructed dates and shifts the day for users
   east/west of UTC. Splitting the parts keeps everything local. */
const parseLocalDate = value => {
  if (!value || typeof value !== "string") return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d); // local midnight
};

/* Format a Date using LOCAL components.
   Previously used d.toISOString() (UTC), which rolled dates back one
   day for UTC+ timezones (e.g. July 15 was stored as July 14). */
const toISO = d => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/* A valid day-of-month is an integer 1–31. Anything else
   (null / NaN / out of range) is treated as "not set". */
const isValidDayOfMonth = day =>
  Number.isInteger(day) && day >= 1 && day <= 31;

/* ================================
   CORE ENGINE (PRIVATE)
================================ */

const generateOccurrences = recurrence => {
  if (!recurrence.enabled) return [];

  if (!recurrence.startDate || !recurrence.endDate) return [];

  const start = parseLocalDate(recurrence.startDate);
  const end = parseLocalDate(recurrence.endDate);

  if (!start || !end || start > end) return [];

  const results = [];

  /* WEEKLY / BIWEEKLY */
  if (
    recurrence.frequency === "weekly" ||
    recurrence.frequency === "biweekly"
  ) {
    let cursor = new Date(start);

    while (cursor <= end) {
      if (recurrence.weekly.weekdays.includes(cursor.getDay())) {
        results.push(toISO(cursor));
      }
      cursor = addDays(cursor, 1);
    }
  }

  /* MONTHLY */
  if (recurrence.frequency === "monthly") {
    const rule = recurrence.monthly;

    if (!rule || !rule.type) {
      return results; // fail safely, no crash
    }

    // iterate by month, not by date
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);

    while (cursor <= end) {
      let date = null;
      const year = cursor.getFullYear();
      const month = cursor.getMonth();

      if (rule.type === "day_of_month") {
        // ROBUST: if the UI captured a bad day (null/NaN — e.g. monthly
        // was selected before the deadline was filled in), fall back to
        // the start date's day. For "Same day each month" this is always
        // the intended value anyway.
        const anchorDay = isValidDayOfMonth(rule.day)
          ? rule.day
          : start.getDate();

        const lastDay = new Date(year, month + 1, 0).getDate();
        const day = Math.min(anchorDay, lastDay);
        date = new Date(year, month, day);
      }

      if (rule.type === "last_weekday") {
        if (Number.isInteger(rule.weekday)) {
          date = getLastWeekdayOfMonth(year, month, rule.weekday);
        }
      }

      if (rule.type === "nth_weekday") {
        if (Number.isInteger(rule.weekday) && Number.isInteger(rule.nth)) {
          date = getNthWeekdayOfMonth(year, month, rule.weekday, rule.nth);
        }
      }

      if (date && date >= start && date <= end) {
        results.push(toISO(date));
      }

      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  return results;
};

/* ================================
   PUBLIC HOOK
================================ */

export function useRecurrenceEngine({ startDate }) {
  const [recurrence, setRecurrence] = useState({
    enabled: false,
    frequency: "weekly",
    startDate,
    endDate: "",
    weekly: { weekdays: [] },
    monthly: { type: "day_of_month", day: null }
  });

  // Keep startDate in sync with form
  useEffect(() => {
    setRecurrence(r => ({ ...r, startDate }));
  }, [startDate]);

  const occurrences = useMemo(
    () => generateOccurrences(recurrence),
    [recurrence]
  );

  const isValid =
    !recurrence.enabled ||
    (
      recurrence.startDate &&
      recurrence.endDate &&
      (
        recurrence.frequency === "monthly"
          ? true
          : recurrence.weekly.weekdays.length > 0
      )
    );

  return {
    recurrence,
    setRecurrence,
    occurrences,
    isValid
  };
}
