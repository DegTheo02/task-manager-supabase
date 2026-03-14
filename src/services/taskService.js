import { supabase } from "../supabaseClient";

/* ==============================
   GET TASKS (WITH FILTERS + PAGINATION)
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

  const { data, error, count } = await query;

  if (error) throw error;

  return { data, count };
}

/* ==============================
   CREATE TASK
============================== */
export async function createTask(task) {
  const { data, error } = await supabase
    .from("tasks")
    .insert(task)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/* ==============================
   UPDATE TASK
============================== */
export async function updateTask(taskId, updates) {
  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/* ==============================
   DELETE TASK
============================== */
export async function deleteTask(taskId) {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);

  if (error) throw error;
}

/* ==============================
   GET TASK BY ID
============================== */
export async function getTaskById(id) {
  const { data, error } = await supabase
    .from("tasks_with_creator")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}
