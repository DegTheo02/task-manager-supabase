import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const STATUSES = ["OPEN","ONGOING","OVERDUE","ON HOLD","CLOSED ON TIME","CLOSED PAST DUE"];

export default function Kanban() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("tasks").select("*");
    setTasks(data || []);
  }

  return (
    <div style={{ display: "flex", gap: 10, padding: 20 }}>
      {STATUSES.map(s =>
        <div key={s} style={{ width: 200, background: "#f3f4f6", padding: 10 }}>
          <b>{s}</b>
          {tasks.filter(t => t.status === s).map(t =>
            <div key={t.id} style={{ background: "white", margin: 5, padding: 5 }}>
              {t.title}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
