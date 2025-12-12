
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const STATUS_OPTIONS = [
  'OPEN', 'ONGOING', 'CLOSED ON TIME', 'CLOSED PAST DUE', 'OVERDUE', 'ON HOLD'
];

const STATUS_COLORS = {
  "OPEN": "#3B82F6",
  "ONGOING": "#0EA5A8",
  "CLOSED ON TIME": "#16A34A",
  "CLOSED PAST DUE": "#F97316",
  "OVERDUE": "#DC2626",
  "ON HOLD": "#6B7280"
};

const OWNERS = [
  'AURELLE','CHRISTIAN','SERGEA','FABRICE','FLORIAN','JOSIAS','ESTHER','MARIUS','THEOPHANE'
];

// Weekday counter
function countWeekdays(startDate, endDate) {
  let count = 0;
  let current = new Date(startDate);
  while (current <= endDate) {
    const d = current.getDay();
    if (d !== 0 && d !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export default function App() {

  const [tasks, setTasks] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    title: '',
    initial_deadline: '',
    new_deadline: '',
    owner: '',
    status: 'OPEN',
    closing_date: ''
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending:false });
    setTasks(data || []);
  }

  function reset() {
    setEditingId(null);
    setForm({
      title:'',
      initial_deadline:'',
      new_deadline:'',
      owner:'',
      status:'OPEN',
      closing_date:''
    });
  }

  async function handleSubmit(e){
    e.preventDefault();

    if(!form.title.trim()) return alert("Title required");
    if(!form.owner) return alert("Owner required");

    // If closing status chosen → require closing date
    if ((form.status === 'CLOSED ON TIME' || form.status === 'CLOSED PAST DUE') &&
        !form.closing_date) {
      return alert("Please enter a closing date");
    }

    let payload = {
      title: form.title,
      initial_deadline: form.initial_deadline || null,
      new_deadline: form.new_deadline || null,
      owner: form.owner,
      status: form.status,
      closing_date: form.closing_date || null
    };

    // compute duration if closing fields exist
    if (form.closing_date &&
        (form.status === 'CLOSED ON TIME' || form.status === 'CLOSED PAST DUE')) {

      const assignedRes = await supabase
        .from('tasks')
        .select('assigned_date')
        .eq('id', editingId)
        .maybeSingle();

      const assignedDate = editingId && assignedRes.data
        ? new Date(assignedRes.data.assigned_date)
        : new Date(); // fallback

      const duration = countWeekdays(assignedDate, new Date(form.closing_date));
      payload.duration_days = duration;
    }

    if(editingId){
      await supabase.from('tasks').update(payload).eq('id', editingId);
    } else {
      await supabase.from('tasks').insert(payload);
    }

    reset();
    load();
  }

  function handleEdit(t){
    setEditingId(t.id);
    setForm({
      title: t.title,
      initial_deadline: t.initial_deadline || '',
      new_deadline: t.new_deadline || '',
      owner: t.owner,
      status: t.status,
      closing_date: t.closing_date || ''
    });
    window.scrollTo({ top: 0, behavior:'smooth' });
  }

  return (
    <div style={{padding:20,fontFamily:'Arial'}}>
      <h1>BI&CVM - Task Manager</h1>

      {/* FORM */}
      <form onSubmit={handleSubmit} style={{marginBottom:20}}>

        <input
          placeholder="Title"
          value={form.title}
          onChange={e=>setForm({...form,title:e.target.value})}
          style={{display:'block',marginBottom:10,width:'300px'}}
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

        {/* CONDITIONAL CLOSING DATE FIELD */}
        {(form.status === 'CLOSED ON TIME' || form.status === 'CLOSED PAST DUE') && (
          <>
            <label>Closing Date</label>
            <input type="date"
              value={form.closing_date}
              onChange={e=>setForm({...form,closing_date:e.target.value})}
              style={{display:'block',marginBottom:10}}
            />
          </>
        )}

        <button type="submit">{editingId ? "Update Task" : "Create Task"}</button>
      </form>

      {/* TASK LIST */}
      {tasks.map(t => (
        <div key={t.id}
             style={{border:'1px solid #ccc',padding:10,marginBottom:10,borderLeft:`6px solid ${STATUS_COLORS[t.status]}`}}>
          <strong>{t.title}</strong>
          <span style={{
            background:STATUS_COLORS[t.status],
            color:'white',
            padding:'2px 6px',
            marginLeft:10,
            borderRadius:4
          }}>
            {t.status}
          </span>

          <br/>Owner: {t.owner}
          <br/>Assigned: {t.assigned_date}
          <br/>Initial Deadline: {t.initial_deadline || '—'}
          <br/>New Deadline: {t.new_deadline || '—'}
          <br/>Closing Date: {t.closing_date || '—'}
          <br/>Duration: {t.duration_days || '—'} weekdays
          <br/><br/>

          <button onClick={()=>handleEdit(t)}>Edit Task</button>
        </div>
      ))}

    </div>
  );
}
