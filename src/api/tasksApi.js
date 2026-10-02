// src/api/tasksApi.js
import {
  getTasks,
  getProfileOptions,
  createTask,
  updateTask,
  deleteTask
} from "../services/taskService";

/* =============================================================================
   GET TASKS

   Signature changed with taskService.getTasks: page / pageSize / sort now
   travel together in an options object.

   The old version returned only { tasks, total } and threw away `count`
   before anything could act on it — so there was no way for the UI to know
   it was looking at a partial result. It now forwards page, pageSize and
   hasMore as well, which is what makes paging possible upstream.
============================================================================= */
export async function fetchTasks(filters, options = {}) {
  const { data, error, count, hasMore, page, pageSize } = await getTasks(
    filters,
    options
  );

  if (error) {
    console.error("API fetchTasks failed", error);
    throw error instanceof Error ? error : new Error("Failed to load tasks");
  }

  return {
    tasks: data || [],
    total: count || 0,
    hasMore: !!hasMore,
    page,
    pageSize
  };
}

/* =============================================================================
   PROFILE OPTIONS  (Owners + Created By dropdowns)
============================================================================= */
export async function fetchProfileOptions(scope) {
  const { data, error } = await getProfileOptions(scope);

  if (error) {
    console.error("API fetchProfileOptions failed", error);
    throw error instanceof Error ? error : new Error("Failed to load profiles");
  }

  return data || [];
}

/* =============================================================================
   CREATE TASK
============================================================================= */
export async function createNewTask(payload) {
  const { data, error } = await createTask(payload);

  if (error) {
    console.error("API createNewTask failed", error);
    throw error instanceof Error ? error : new Error("Failed to create task");
  }

  return data;
}

/* =============================================================================
   UPDATE TASK

   taskService.updateTask now converts a zero-row result into an Error, so a
   silent RLS refusal arrives here as a throw with a message worth showing the
   user — rather than as a success with nothing changed.
============================================================================= */
export async function updateExistingTask(id, updates) {
  const { data, error } = await updateTask(id, updates);

  if (error) {
    console.error("API updateExistingTask failed", error);
    throw error instanceof Error ? error : new Error("Failed to update task");
  }

  return data;
}

/* =============================================================================
   DELETE TASK
============================================================================= */
export async function removeTask(id) {
  const { error } = await deleteTask(id);

  if (error) {
    console.error("API removeTask failed", error);
    throw error instanceof Error ? error : new Error("Failed to delete task");
  }
}
