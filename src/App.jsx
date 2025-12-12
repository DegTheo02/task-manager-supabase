import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const OWNERS = ['AURELLE','CHRISTIAN','SERGEA','FABRICE','FLORIAN','JOSIAS','ESTHER','MARIUS','THEOPHANE'];
const STATUS_OPTIONS = ['OPEN','ONGOING','CLOSED','PENDING','LATE','ON HOLD'];
const STATUS_COLORS = {
  OPEN: '#3b82f6',
  ONGOING: '#0ea5a4',
  CLOSED: '#16a34a',
  PENDING: '#f59e0b',
  LATE: '#dc2626',
  'ON HOLD': '#6b7280',
};

export default function App(){
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({
    title: '',
    assigned_date: new Date().toISOString().slice(0,10),
    initial_deadline: '',
    new_deadline: '',
    owner: '',
    status: 'OPEN',
  });
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  // Fetch tasks
  async function fetchTasks(){
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending:false });
    setLoading(false);
    if(error) console.error(error);
    else setTasks(data || []);
  }

  useEffect(() => { fetchTasks(); }, []);

  // Handle submit
  async function handleSubmit(e){
    e.preventDefault();
    if(!form.title.trim()) return alert('Please enter a title');
    if(!form.owner) return alert('Please select an owner');

    const payload = {
      title: form.title,
      assigned_date: form.assigned_date,
      initial_deadline: form.initial_deadline || null,
      new_deadline: form.new_deadline || null,
      owner: form.owner,
      status: form.status,
    };

    if(editingId){
      const { error } = await supabase.from('tasks').update(payload).eq('id', editingId);
      if(error) return alert(error.message);
    } else {
      const { error } = await supabase.from('tasks').insert(payload);
      if(error) return alert(error.message);
    }

    fetchTasks();
    resetForm();
  }

  function resetForm(){
    setForm({
      title:'',
      assigned_date:new Date().toISOString().slice(0,10),
      initial_deadline:'',
      new_deadline:'',
      owner:'',
      status:'OPEN'
    });
    setEditingId(null);
  }

  function handleEdit(task){
    setEditingId(task.id);
    setForm({
      title: task.title,
      assigned_date: task.assigned_date,
      initial_deadline: task.initial_deadline || '',
      new_deadline: task.new_deadline || '',
      owner: task.owner,
      status: task.status
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id){
    if(!confirm('Delete this task?')) return;
    await supabase.from('tasks').delete().eq('id', id);
    fetchTasks();
  }

  async function toggleStatus(id, status){
    await supabase.from('tasks').update({ status }).eq('id', id);
    fetchTasks();
  }

  async function applyNewDeadline(id, date){
    await supabase.from('tasks').update({ new_deadline: date }).eq('id', id);
    fetchTasks();
  }

  const visibleTasks = tasks.filter(t => filter === 'ALL' ? true : t.status === filter);

  return (
    <div className="container">
      <div className="card">
        <header style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h1>Task Manager</h1>
        </header>

        {/* Create / Edit Task */}
        <section style={{marginTop:20}}>
          <h2>Create / Edit Task</h2>
          <form onSubmit={handleSubmit} style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div style={{gridColumn:'1 / -1'}}>
              <label>Title</label>
              <input value={form.title} onChange={e=>setForm(s=>({...s, title:e.target.value}))} />
            </div>

            <div>
              <label>Assigned date</label>
              <input type="date" value={form.assigned_date} onChange={e=>setForm(s=>({...s, assigned_date:e.target.value}))} />
            </div>

            <div>
              <label>Initial deadline</label>
              <input type="date" value={form.initial_deadline} onChange={e=>setForm(s=>({...s, initial_deadline:e.target.value}))} />
            </div>

            <div>
              <label>New deadline</label>
              <input type="date" value={form.new_deadline} onChange={e=>setForm(s=>({...s, new_deadline:e.target.value}))} />
            </div>

            <div>
              <label>Owner</label>
              <select value={form.owner} onChange={e=>setForm(s=>({...s, owner:e.target.value}))}>
                <option value="">-- Select owner --</option>
                {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div>
              <label>Status</label>
              <select value={form.status} onChange={e=>setForm(s=>({...s, status:e.target.value}))}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={{gridColumn:'1 / -1', display:'flex', justifyContent:'flex-end', gap:8}}>
              <button type="button" onClick={resetForm}>Clear</button>
              <button>Create</button>
            </div>
          </form>
        </section>

        {/* Filter */}
        <section style={{marginTop:30}}>
          <label>Filter</label>
          <select value={filter} onChange={e=>setFilter(e.target.value)}>
            <option value="ALL">ALL</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </section>

        {/* Task list */}
        <section style={{marginTop:20}}>
          {loading && <div>Loading...</div>}
          {visibleTasks.map(task => {
            const deadline = task.new_deadline || task.initial_deadline;
            const isLate = deadline && new Date(deadline) < new Date() && task.status !== 'CLOSED';
            const bg = STATUS_COLORS[task.status];

            return (
              <article key={task.id} className="card" style={{marginTop:12, padding:12}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <div>
                    <div style={{display:'flex', gap:10, alignItems:'center'}}>
                      <h3>{task.title}</h3>
                      <span style={{background:bg, color:'white', padding:'3px 6px', borderRadius:4}}>
                        {task.status}
                      </span>
                      {isLate && <span style={{color:'red'}}>(Late)</span>}
                    </div>
                    <div>Owner: {task.owner}</div>
                    <div>Assigned: {task.assigned_date}</div>
                    <div>Deadline: {task.new_deadline || task.initial_deadline || '—'}</div>
                  </div>

                  <div style={{display:'flex', gap:8}}>
                    <select value={task.status} onChange={e=>toggleStatus(task.id, e.target.value)}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <input type="date" value={task.new_deadline || ''} onChange={e=>applyNewDeadline(task.id, e.target.value)} />

                    <button onClick={()=>handleEdit(task)}>Edit</button>
                    <button onClick={()=>handleDelete(task.id)}>Delete</button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
