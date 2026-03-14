import {
  getTasks,
  createTask,
  updateTask,
  deleteTask
} from "../services/taskService";

/* ===============================
   GET TASKS
================================ */
export async function fetchTasks(filters, page = 0, limit = 50) {
  const { data, error, count } = await getTasks(filters, page, limit);

  if (error) {
    console.error("API fetchTasks failed", error);
    throw new Error("Failed to load tasks");
  }

  return { tasks: data || [], total: count || 0 };
}

/* ===============================
   CREATE TASK
================================ */
export async function createNewTask(payload) {
  const { data, error } = await createTask(payload);

  if (error) {
    console.error("API createNewTask failed", error);
    throw new Error("Failed to create task");
  }

  return data;
}

/* ===============================
   UPDATE TASK
================================ */
export async function updateExistingTask(id, updates) {
  const { data, error } = await updateTask(id, updates);

  if (error) {
    console.error("API updateExistingTask failed", error);
    throw new Error("Failed to update task");
  }

  return data;
}

/* ===============================
   DELETE TASK
================================ */
export async function removeTask(id) {
  const { error } = await deleteTask(id);

  if (error) {
    console.error("API removeTask failed", error);
    throw new Error("Failed to delete task");
  }
}
