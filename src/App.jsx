
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const STATUS_OPTIONS = [
  'OPEN','ONGOING','CLOSED ON TIME','CLOSED PAST DUE','OVERDUE','ON HOLD'
];

const OWNERS = [
 'AURELLE','CHRISTIAN','SERGEA','FABRICE','FLORIAN','JOSIAS','ESTHER','MARIUS','THEOPHANE'
];

// Count weekdays (Mon–Fri)
function countWeekdays(startDate, endDate) {
  let count = 0;
  let current = new Date(startDate);

  while (current <= endDate) {
    const d = current.getDay();
    if (d !== 0 && d !== 6) count++;  // exclude Sat(6) & Sun(0)
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export default function App() {

  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({
    title: '',
    initial_deadline: '',
    new_deadline: '',
    owner: '',
    status: 'OPEN'
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending:false });
    if (!error) setTasks(data || []);
  }

  async function handleSubmit(e){
    e.preventDefault();
    if(!form.title.trim()) return alert("Title required");
    if(!form.owner) return alert("Owner required");

    const payload = {
      title: form.title,
      initial_deadline: form.initial_deadline || null,
      new_deadline: form.new_deadline || null,
      owner: form.owner,
      status: form.status
    };

    if(editingId){
      await supabase.from('tasks').update(payload).eq('id', editingId);
    } else {
      await supabase.from('tasks').insert(payload);
    }
    reset();
    load();
  }

  function reset(){
    setForm({ title:'', initial_deadline:'', new_deadline:'', owner:'', status:'OPEN' });
    setEditingId(null);
  }

  async function changeStatus(task, newStatus){
    let payload = { status: newStatus };

    // When task is closed → compute closing date + weekday duration
    if(newStatus === 'CLOSED ON TIME' || newStatus === 'CLOSED PAST DUE'){
      const today = new Date();
      const assigned = new Date(task.assigned_date);
      const duration = countWeekdays(assigned, today);

      payload.closing_date = today.toISOString().slice(0,10);
      payload.duration_days = duration;
    }

    await supabase.from('tasks').update(payload).eq('id', task.id);
    load();
  }

  return (
    <div style={{padding:20,fontFamily:'Arial'}}>
      <h1>BI&CVM - Task Manager</h1>

      <form onSubmit={handleSubmit} style={{marginBottom:20}}>

        <input
          placeholder="Title"
          value={form.title}
          onChange={e=>setForm({...form,title:e.target.value})}
          style={{display:'block',marginBottom:10}}
        />

        <label>Initial Deadline</label>
        <input type="date"
          value={form.initial_deadline}
          onChange={e=>setForm({...form,initial_deadline:e.target.value})}
          style={{display:'block',marginBottom:10}}
        />

        <label>New Deadline</label>
        <input type="date"
          value={form.new_deadline}
          onChange={e=>setForm({...form,new_deadline:e.target.value})}
          style={{display:'block',marginBottom:10}}
        />

        <label>Owner</label>
        <select
          value={form.owner}
          onChange={e=>setForm({...form,owner:e.target.value})}
          style={{display:'block',marginBottom:10}}
        >
          <option value="">-- Select owner --</option>
          {OWNERS.map(o=> <option key={o}>{o}</option>)}
        </select>

        <label>Status</label>
        <select
          value={form.status}
          onChange={e=>setForm({...form,status:e.target.value})}
          style={{display:'block',marginBottom:10}}
        >
          {STATUS_OPTIONS.map(s=> <option key={s}>{s}</option>)}
        </select>

        <button type="submit">{editingId?'Update':'Create'}</button>
      </form>

      {tasks.map(t=>(
        <div key={t.id} style={{border:'1px solid #ccc',padding:10,marginBottom:10}}>
          <strong>{t.title}</strong> <br/>
          Status: {t.status} <br/>
          Owner: {t.owner} <br/>
          Assigned: {t.assigned_date} <br/>
          Closing Date: {t.closing_date || '—'} <br/>
          Duration: {t.duration_days || '—'} weekdays <br/>

          <label>Change Status:</label>
          <select
            value={t.status}
            onChange={e=>changeStatus(t,e.target.value)}
            style={{marginLeft:10}}
          >
            {STATUS_OPTIONS.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}
