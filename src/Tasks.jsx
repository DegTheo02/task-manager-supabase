import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Avatar from "./Avatar";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState("OPEN");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("tasks").select("*");
    setTasks(data || []);
  }

  async function create() {
    if (!title || !owner) return alert("Title & Owner required");

    await supabase.from("tasks").insert({
      title,
      owner,
      status,
      assigned_date: new Date().toISOString().slice(0,10)
    });

    setTitle("");
    load();
  }

  async function remove(id) {
    await supabase.from("tasks").delete().eq("id", id);
    load();
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Tasks</h2>

      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" />
      <select value={owner} onChange={e => setOwner(e.target.value)}>
        <option value="">-- Select owner --</option>
        {["AURELLE","CHRISTIAN","SERGEA","FABRICE","FLORIAN","JOSIAS","ESTHER","MARIUS","THEOPHANE"].map(o =>
          <option key={o}>{o}</option>
        )}
      </select>

      <button onClick={create}>Add</button>

      <table border="1" cellPadding="6">
        <tbody>
          {tasks.map(t =>
            <tr key={t.id}>
              <td><Avatar name={t.owner} /></td>
              <td>{t.title}</td>
              <td>{t.status}</td>
              <td><button onClick={() => remove(t.id)}>🗑</button></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
