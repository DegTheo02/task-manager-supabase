// src/services/taskService.js
import { supabase } from "../supabaseClient";

/* =============================================================================
   PAGE SIZING

   Supabase enforces a hard ceiling on rows per request (Settings -> API ->
   Max rows, commonly 1000). Asking for more does not error — it silently
   truncates. The previous version asked for 5000 and filtered "Today" in the
   browser over whatever came back, which is how a full-table question ended
   up being answered from a partial, arbitrarily-ordered page.

   Keep DEFAULT_PAGE_SIZE comfortably under that ceiling and let pagination
   do the work instead.
============================================================================= */
export const DEFAULT_PAGE_SIZE = 200;
export const MAX_PAGE_SIZE = 500;

/* Columns the table header is allowed to sort on. Anything not in this set is
   ignored rather than passed through to PostgREST, so a stale sortConfig in
   sessionStorage can never produce a 400 on load. */
export const SORTABLE_COLUMNS = new Set([
  "title",
  "owner",
  "team",
  "requester",
  "status",
  "assigned_date",
  "initial_deadline",
  "new_deadline",
  "closing_date",
  "effective_deadline",
  "creator_name",
  "created_at"
]);

/* =============================================================================
   LOCAL DATE

   `new Date().toISOString().slice(0, 10)` is a UTC date. You are UTC+1, so
   between 00:00 and 01:00 WAT it returns YESTERDAY, and the Today filter
   quietly shows the wrong day's work. Build the string from local components
   instead — same rule as the rest of the codebase's date handling.

   Exported so Tasks.jsx and this module can never disagree about what "today"
   means.
============================================================================= */
export function localDateString(date = new Date()) {
  const pad = n => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-` +
    `${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}`
  );
}

/* LIKE metacharacters in user input would otherwise act as wildcards.
   Backslash is Postgres's default LIKE escape character. */
const escapeLikePattern = value =>
  String(value).replace(/[\\%_]/g, match => `\\${match}`);

/* =============================================================================
   SAFE QUERY WRAPPER
============================================================================= */
async function safeQuery(promise, label) {
  try {
    const { data, error, count } = await promise;

    if (error) {
      console.error(`❌ Supabase error (${label})`, error);
      return { data: null, error, count: null };
    }

    return { data, error: null, count };
  } catch (err) {
    console.error(`🔥 Unexpected error (${label})`, err);
    return { data: null, error: err, count: null };
  }
}

/* =============================================================================
   GET TASKS

   SIGNATURE CHANGED. Was getTasks(filters, page, limit); now takes an options
   object so sort can travel with page/pageSize. tasksApi.fetchTasks is updated
   to match — it is the only caller.

   Every filter below runs in Postgres. Nothing is left for the browser to
   re-apply, which is the entire point: a filter that only exists client-side
   can only ever see the page it was handed.

   FILTER SHAPE
     owner_ids        uuid[]    (was `owners`, matched on the denormalised
                                 `owner` text — see note below)
     creator_ids      uuid[]    (was `creators`, matched on creator_name)
     teams            text[]
     requesters       text[]
     statuses         text[]
     recurrence_types text[]
     search           text      (title, case-insensitive substring)
     today            boolean
     assigned_from / assigned_to   date
     deadline_from / deadline_to   date  (against effective_deadline)
     closing_from  / closing_to    date

   WHY owner_id AND NOT owner
   --------------------------
   `tasks.owner` is a denormalised label; `tasks.owner_id` is the FK. The
   dropdown is built from profiles.owner_label, so the two only match while
   nobody has ever been renamed. Rename a profile and .in("owner", [label])
   silently returns zero rows for that person — which is exactly the symptom
   that started this.

   Every RLS SELECT policy on `tasks` already keys on owner_id. Filtering on
   the same column puts the UI and the database on one axis.
============================================================================= */
export async function getTasks(filters = {}, options = {}) {
  const page = Math.max(0, options.page ?? 0);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE)
  );
  const sort = options.sort || null;

  let query = supabase
    .from("tasks_with_creator")
    .select("*", { count: "exact" });

  /* ---- Identity filters ------------------------------------------------- */

  if (filters.owner_ids?.length)
    query = query.in("owner_id", filters.owner_ids);

  if (filters.creator_ids?.length)
    query = query.in("created_by", filters.creator_ids);

  if (filters.teams?.length)
    query = query.in("team", filters.teams);

  if (filters.requesters?.length)
    query = query.in("requester", filters.requesters);

  if (filters.statuses?.length)
    query = query.in("status", filters.statuses);

  if (filters.recurrence_types?.length)
    query = query.in("recurrence_type", filters.recurrence_types);

  /* ---- Search ----------------------------------------------------------- */

  if (filters.search?.trim()) {
    query = query.ilike("title", `%${escapeLikePattern(filters.search.trim())}%`);
  }

  /* ---- Dates ------------------------------------------------------------ */

  if (filters.assigned_from)
    query = query.gte("assigned_date", filters.assigned_from);

  if (filters.assigned_to)
    query = query.lte("assigned_date", filters.assigned_to);

  /* DEADLINE
     effective_deadline is COALESCE(new_deadline, initial_deadline), stored
     and indexed on `tasks` by migration 001. It replaces the pair of
     PostgREST .or() strings this function used to build:

       or=(new_deadline.gte.X,and(new_deadline.is.null,initial_deadline.gte.X))

     Two .or() groups on one query is fragile, the expression could not use
     an index, and the same logic was duplicated in Dashboard.jsx. One column
     retires all three problems. */
  if (filters.today) {
    query = query.eq("effective_deadline", localDateString());
  } else {
    if (filters.deadline_from)
      query = query.gte("effective_deadline", filters.deadline_from);

    if (filters.deadline_to)
      query = query.lte("effective_deadline", filters.deadline_to);
  }

  if (filters.closing_from)
    query = query.gte("closing_date", filters.closing_from);

  if (filters.closing_to)
    query = query.lte("closing_date", filters.closing_to);

  /* ---- Ordering ---------------------------------------------------------
     LOAD-BEARING. The old version had no .order() at all, so LIMIT/OFFSET
     sliced an unordered set — Postgres was free to return any rows it liked,
     and did. Pagination without a total order returns overlapping pages and
     drops rows.

     `id` is always appended as a tiebreaker so the order is total, never just
     partial on a column full of duplicates or nulls.
  --------------------------------------------------------------------------- */
  if (sort?.key && SORTABLE_COLUMNS.has(sort.key)) {
    query = query.order(sort.key, {
      ascending: sort.direction !== "desc",
      nullsFirst: false
    });
  } else {
    query = query.order("effective_deadline", {
      ascending: true,
      nullsFirst: false
    });
  }

  query = query.order("id", { ascending: true });

  /* ---- Page ------------------------------------------------------------- */

  const from = page * pageSize;
  query = query.range(from, from + pageSize - 1);

  const result = await safeQuery(query, "getTasks");

  if (result.error) {
    return { ...result, hasMore: false, page, pageSize };
  }

  const rows = result.data || [];
  const total = result.count ?? rows.length;
  const hasMore = from + rows.length < total;

  /* Canary for the failure mode this whole change exists to kill. If the
     server returns fewer rows than asked for while the count says more
     remain, the Max rows ceiling is below our page size and pagination will
     stall silently. Lower DEFAULT_PAGE_SIZE, or raise Max rows. */
  if (rows.length < pageSize && hasMore) {
    console.warn(
      `⚠️ getTasks: asked for ${pageSize} rows, got ${rows.length}, ` +
        `but ${total - from - rows.length} remain. The Supabase "Max rows" ` +
        `setting is below the page size — pagination cannot advance.`
    );
  }

  return { ...result, count: total, hasMore, page, pageSize };
}

/* =============================================================================
   FILTER OPTION SOURCES

   The Created By dropdown used to be derived from the rows currently loaded.
   That worked only because every row was loaded at once; under pagination it
   would list whoever happened to be on page 1 and silently drop the rest.

   Profiles is the right source: it is the same list the Owners dropdown
   already uses, it respects RLS on its own, and it does not change as the
   user pages through the table.
============================================================================= */
export async function getProfileOptions({ role, userId, team } = {}) {
  let query = supabase
    .from("profiles")
    .select("id, owner_label, team")
    .order("owner_label");

  if (role === "user" && userId) {
    query = query.eq("id", userId);
  } else if (role === "manager" && team) {
    query = query.eq("team", team);
  }

  return safeQuery(query, "getProfileOptions");
}

/* =============================================================================
   CREATE TASK
============================================================================= */
export async function createTask(task) {
  const query = supabase
    .from("tasks")
    .insert(task)
    .select()
    .single();

  return safeQuery(query, "createTask");
}

/* =============================================================================
   UPDATE TASK

   .select() returns the affected rows. Zero rows back from a successful
   update means RLS refused it silently — the house rule is to surface that
   rather than let the UI report a save that never happened.
============================================================================= */
export async function updateTask(taskId, updates) {
  const query = supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select();

  const result = await safeQuery(query, "updateTask");

  if (!result.error && (!result.data || result.data.length === 0)) {
    return {
      data: null,
      count: null,
      error: new Error(
        "The update affected no rows. This is normally RLS refusing the " +
          "write — you may not have permission to modify this task."
      )
    };
  }

  return { ...result, data: result.data?.[0] ?? null };
}

/* =============================================================================
   DELETE TASK
============================================================================= */
export async function deleteTask(taskId) {
  const query = supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .select("id");

  const result = await safeQuery(query, "deleteTask");

  if (!result.error && (!result.data || result.data.length === 0)) {
    return {
      data: null,
      count: null,
      error: new Error(
        "The delete affected no rows — RLS most likely refused it."
      )
    };
  }

  return result;
}
