// src/hooks/useRecurrenceEngine.js
import { useMemo, useState, useEffect } from "react";


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

const toISO = d => d.toISOString().slice(0, 10);


const generateOccurrences = recurrence => {
  if (!recurrence.enabled) return [];

  const start = new Date(recurrence.startDate);
  const end = new Date(recurrence.endDate);
  const results = [];


//WEEKLY SECTION
         if (recurrence.frequency === "weekly" || recurrence.frequency === "biweekly") {
           let cursor = new Date(start);
         
           while (cursor <= end) {
             if (recurrence.weekly.weekdays.includes(cursor.getDay())) {
               results.push(toISO(cursor));
             }
             cursor = addDays(cursor, 1);
           }
         }




      //MONTHLY SECTION
         if (recurrence.frequency === "monthly") {
           let cursor = new Date(start);
         
           while (cursor <= end) {
             let date = null;
             const rule = recurrence.monthly;
         
             if (!rule) {
               cursor = addMonths(cursor, 1);
               continue;
             }
         
               if (rule.type === "same_day") {
                 date = new Date(
                   cursor.getFullYear(),
                   cursor.getMonth(),
                   start.getDate()
                 );
               }
               
               if (rule.type === "last_weekday") {
                 date = getLastWeekdayOfMonth(
                   cursor.getFullYear(),
                   cursor.getMonth(),
                   rule.weekday
                 );
               }
               
               if (rule.type === "nth_weekday") {
                 date = getNthWeekdayOfMonth(
                   cursor.getFullYear(),
                   cursor.getMonth(),
                   rule.weekday,
                   rule.nth
                 );
               }

         
             if (date && date >= start && date <= end) {
               results.push(toISO(date));
             }
         
             cursor = addMonths(cursor, 1);
           }
         }

   

  return results;
};


export function useRecurrenceEngine({ startDate }) {
  const [recurrence, setRecurrence] = useState({
    enabled: false,
    frequency: "weekly", // weekly | biweekly | monthly
    startDate,
    endDate: "",
    weekly: {
      weekdays: []
    },
    monthly: { type: "same_day" }
  });

  // keep startDate in sync with form
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
      (recurrence.frequency === "weekly" ||
       recurrence.frequency === "biweekly")
        ? recurrence.weekly.weekdays.length > 0
        : recurrence.frequency === "monthly"
          ? true
          : true
    )
  );



  return {
    recurrence,
    setRecurrence,
    occurrences,
    isValid
  };
}


