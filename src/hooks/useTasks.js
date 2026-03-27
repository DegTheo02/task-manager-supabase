import { useState, useEffect, useCallback } from "react";
import { fetchTasks } from "../api/tasksApi";

export function useTasks(filters) {
  const LIMIT = 20;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadTasks = useCallback(async (reset = false) => {
    try {
      setLoading(true);

      const start = reset ? 0 : from;

      const { tasks: newTasks } = await fetchTasks(filters, start, LIMIT);

      if (reset) {
        setTasks(newTasks);
        setFrom(LIMIT);
      } else {
        setTasks(prev => [...prev, ...newTasks]);
        setFrom(prev => prev + LIMIT);
      }

      if (newTasks.length < LIMIT) {
        setHasMore(false);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, from]);

  // 🔄 reload when filters change
  useEffect(() => {
    setFrom(0);
    setHasMore(true);
    loadTasks(true);
  }, [filters]);

  return {
    tasks,
    loading,
    hasMore,
    loadMore: () => loadTasks(false),
    reload: () => loadTasks(true)
  };
}
