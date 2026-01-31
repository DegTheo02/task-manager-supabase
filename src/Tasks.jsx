import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { useSearchParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { addDays, addMonths } from "date-fns";

import {
  STATUSES,
  OWNERS,
  TEAMS,
  STATUS_COLORS,
  OWNER_TEAM_MAP,
  RECURRENCE_TYPES,
  REQUESTERS
} from "./constants/taskConstants";

/* ----------------------------------
   HELPERS
---------------------------------- */
const nextDate = (date, type) => {
  switch (type) {
    case "Weekly":
      return addDays(date, 7);
    case "Bi-Weekly":
      return addDays(date, 14);
    case "Monthly":
      return addMonths(date, 1);
    default:
      return null;
  }
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

const toISODate = v => (v ? v.slice(0, 10) : "");

const normalizeTaskDates = task => ({
  ...task,
  assigned_date: toISODate(task.assigned_date),
  initial_deadline: toISODate(task.initial_deadline),
  new_deadline: toISODate(task.new_deadline),
  closing_date: toISODate(task.closing_date)
});

/* ----------------------------------
   COMPONENT
---------------------------------- */
export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editSeries, setEditSeries] = useState(false);

  const [searchParams] = useSearchParams();

  const statusesParam = searchParams.get("statuses");
  const statusParam = searchParams.get("status");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const ownersParam = searchParams.get("owners");
  const teamsParam = searchParams.get("teams");
  const requestersParam = searchParams.get("requesters");

  /* ---------------- FILTER STATE ---------------- */
  const [filters, setFilters] = useState({
    owners: [],
    teams: [],
    requesters: [],
    statuses: [],
    deadline_from: "",
    deadline_to: "",
    today: false
  });

  useEffect(() => {
    setFilters(f => ({
      ...f,
      statuses: statusesParam
        ? statusesParam.split(",")
        : statusParam
        ? [statusParam]
        : [],
      deadline_from: dateFrom || "",
      deadline_to: dateTo || "",
      owners: ownersParam ? ownersParam.split(",") : [],
      teams: teamsParam ? teamsParam.split(",") : [],
      requesters: requestersParam ? requestersParam.split(",") : []
    }));
  }, [
    statusesParam,
    statusParam,
    dateFrom,
    dateTo,
    ownersParam,
    teamsParam,
    requestersParam
  ]);

  /* ---------------- FORM ---------------- */
  const emptyTask = {
    id: null,
    title: "",
    owner: "",
    team: "",
    requester: "",
    status: "",
    recurrence_type: "Non-Recurring",
    recurrence_rule: "DAY_OF_MONTH",
    recurrence_weekday: null,
    recurrence_nth: null,
    assigned_date: "",
    initial_deadline: "",
    comments: ""
  };

  const [form, setForm] = useState(emptyTask);
  const [isEditing, setIsEditing] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [repeatTo, setRepeatTo] = useState("");

  /* ---------------- LOAD ---------------- */
  const loadTasks = async () => {
    setLoading(true);
    const { data } = await supabase.from("tasks").select("*").order("id");
    setTasks(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  /* ---------------- SAVE ---------------- */
  const saveTask = async () => {
    if (!form.title || !form.owner || !form.requester || !form.initial_deadline) {
      alert("Missing required fields");
      return;
    }

    const basePayload = {
      title: form.title,
      owner: form.owner,
      team: form.team,
      requester: form.requester,
      status: form.status,
      recurrence_type: form.recurrence_type,
      recurrence_rule: form.recurrence_rule,
      recurrence_weekday: form.recurrence_weekday,
      recurrence_nth: form.recurrence_nth,
      assigned_date: form.assigned_date,
      comments: form.comments || null
    };

    if (isEditing) {
      if (editSeries && form.recurrence_group_id) {
        await supabase
          .from("tasks")
          .update(basePayload)
          .eq("recurrence_group_id", form.recurrence_group_id);
      } else {
        await supabase.from("tasks").update(basePayload).eq("id", form.id);
      }
    } else {
      if (isRecurring && repeatTo && form.recurrence_type !== "Non-Recurring") {
        const groupId = uuidv4();
        let cursor = new Date(form.initial_deadline);
        const end = new Date(repeatTo);
        const rows = [];

        while (cursor <= end) {
          let occurrence = null;

          if (form.recurrence_type === "Monthly") {
            if (form.recurrence_rule === "DAY_OF_MONTH") {
              occurrence = cursor;
            }
            if (form.recurrence_rule === "LAST_WEEKDAY") {
              occurrence = getLastWeekdayOfMonth(
                cursor.getFullYear(),
                cursor.getMonth(),
                form.recurrence_weekday
              );
            }
            if (form.recurrence_rule === "NTH_WEEKDAY") {
              occurrence = getNthWeekdayOfMonth(
                cursor.getFullYear(),
                cursor.getMonth(),
                form.recurrence_weekday,
                form.recurrence_nth
              );
            }
          } else {
            occurrence = cursor;
          }

          if (occurrence && occurrence <= end) {
            rows.push({
              ...basePayload,
              recurrence_group_id: groupId,
              initial_deadline: occurrence.toISOString().slice(0, 10)
            });
          }

          const next = nextDate(cursor, form.recurrence_type);
          if (!next) break;
          cursor = next;
        }

        await supabase.from("tasks").insert(rows);
      } else {
        await supabase.from("tasks").insert({
          ...basePayload,
          initial_deadline: form.initial_deadline
        });
      }
    }

    setForm(emptyTask);
    setIsEditing(false);
    setIsRecurring(false);
    setRepeatTo("");
    loadTasks();
  };

  /* ---------------- DELETE ---------------- */
  const deleteTask = async (task, deleteFuture) => {
    if (!window.confirm("Confirm delete?")) return;

    if (deleteFuture && task.recurrence_group_id) {
      const cutoff = task.initial_deadline;
      await supabase
        .from("tasks")
        .delete()
        .eq("recurrence_group_id", task.recurrence_group_id)
        .gte("initial_deadline", cutoff);
    } else {
      await supabase.from("tasks").delete().eq("id", task.id);
    }

    loadTasks();
  };

  const editTask = (task, series) => {
    setForm(normalizeTaskDates(task));
    setIsEditing(true);
    setEditSeries(series);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------------- FILTERED ---------------- */
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const deadline = t.initial_deadline;

      if (filters.statuses.length && !filters.statuses.includes(t.status))
        return false;
      if (filters.deadline_from && deadline < filters.deadline_from)
        return false;
      if (filters.deadline_to && deadline > filters.deadline_to)
        return false;

      return true;
    });
  }, [tasks, filters]);

  /* ---------------- RENDER ---------------- */
  return (
    <div style={{ padding: 20 }}>
      <h1>Tasks</h1>

      <h2>{isEditing ? "Edit Task" : "New Task"}</h2>

      <input
        placeholder="Title"
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
      />

      <select
        value={form.recurrence_type}
        onChange={e =>
          setForm(f => ({ ...f, recurrence_type: e.target.value }))
        }
      >
        {RECURRENCE_TYPES.map(r => (
          <option key={r}>{r}</option>
        ))}
      </select>

      {form.recurrence_type === "Monthly" && (
        <>
          <label>
            <input
              type="radio"
              checked={form.recurrence_rule === "DAY_OF_MONTH"}
              onChange={() =>
                setForm(f => ({ ...f, recurrence_rule: "DAY_OF_MONTH" }))
              }
            />
            Same day of month
          </label>

          <label>
            <input
              type="radio"
              checked={form.recurrence_rule === "LAST_WEEKDAY"}
              onChange={() =>
                setForm(f => ({
                  ...f,
                  recurrence_rule: "LAST_WEEKDAY",
                  recurrence_weekday: new Date(
                    form.initial_deadline
                  ).getDay()
                }))
              }
            />
            Last weekday of month
          </label>

          <label>
            <input
              type="radio"
              checked={form.recurrence_rule === "NTH_WEEKDAY"}
              onChange={() =>
                setForm(f => ({
                  ...f,
                  recurrence_rule: "NTH_WEEKDAY",
                  recurrence_weekday: new Date(
                    form.initial_deadline
                  ).getDay(),
                  recurrence_nth: Math.ceil(
                    new Date(form.initial_deadline).getDate() / 7
                  )
                }))
              }
            />
            Nth weekday of month
          </label>
        </>
      )}

      <label>
        <input
          type="checkbox"
          checked={isRecurring}
          onChange={e => setIsRecurring(e.target.checked)}
        />
        Recurring
      </label>

      {isRecurring && (
        <input
          type="date"
          value={repeatTo}
          onChange={e => setRepeatTo(e.target.value)}
        />
      )}

      <button onClick={saveTask}>
        {isEditing ? "Update Task" : "Create Task"}
      </button>

      <hr />

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table>
          <tbody>
            {filteredTasks.map(t => (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td>{t.status}</td>
                <td>
                  {t.recurrence_type}
                  {t.recurrence_rule === "LAST_WEEKDAY" && " (Last)"}
                  {t.recurrence_rule === "NTH_WEEKDAY" &&
                    ` (${t.recurrence_nth}th)`}
                </td>
                <td>
                  <button
                    onClick={() =>
                      t.recurrence_group_id
                        ? editTask(
                            t,
                            window.confirm("Edit entire series?")
                          )
                        : editTask(t, false)
                    }
                  >
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      t.recurrence_group_id
                        ? deleteTask(
                            t,
                            window.confirm("Delete future?")
                          )
                        : deleteTask(t, false)
                    }
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
