import { supabase } from "../supabaseClient";

/* ==============================
   SAFE QUERY WRAPPER
============================== */
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

/* ==============================
   GET TASKS (FILTERS + PAGINATION)
============================== */
export async function getTasks(filters = {}, page = 0, limit = 50) {
  let query = supabase
    .from("tasks_with_creator")
    .select("*", { count: "exact" });

  if (filters.statuses?.length)
    query = query.in("status", filters.statuses);

  if (filters.teams?.length)
    query = query.in("team", filters.teams);

  if (filters.owners?.length)
    query = query.in("owner", filters.owners);

  if (filters.requesters?.length)
    query = query.in("requester", filters.requesters);

  if (filters.assigned_from)
    query = query.gte("assigned_date", filters.assigned_from);

  if (filters.assigned_to)
    query = query.lte("assigned_date", filters.assigned_to);

  if (filters.deadline_from)
    query = query.gte("initial_deadline", filters.deadline_from);

  if (filters.deadline_to)
    query = query.lte("initial_deadline", filters.deadline_to);

  query = query.range(page * limit, page * limit + limit - 1);

  return safeQuery(query, "getTasks");
}

/* ==============================
   CREATE TASK
============================== */
export async function createTask(task) {
  const query = supabase
    .from("tasks")
    .insert(task)
    .select()
    .single();

  return safeQuery(query, "createTask");
}

/* ==============================
   UPDATE TASK
============================== */
export async function updateTask(taskId, updates) {
  const query = supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select()
    .single();

  return safeQuery(query, "updateTask");
}

/* ==============================
   DELETE TASK
============================== */
export async function deleteTask(taskId) {
  const query = supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);

  return safeQuery(query, "deleteTask");
}
