import { useState, useEffect } from "react";
import { fetchTasks } from "../api/tasksApi";

export function useTasks(filters) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const { tasks } = await fetchTasks(filters, 0, 50);
      setTasks(tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [filters]);

  return { tasks, loading, reload: loadTasks };
}
