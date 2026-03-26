import React from "react";

export default function TaskForm({
  form,
  setForm,
  owners,
  permissions,
  user,
  role,
  myTeam,
  recurrence,
  setRecurrence,
  isEditing,
  isSubmitting,
  saveTask,
  WEEKDAYS
}) {
  return (
    <div 
      
      {/* NEW / EDIT TASK FORM */}
      <div style={{ ...formBox, ...dark }}>
        <h2>{isEditing ? "Edit Task" : "New Task"}</h2>

        {/* 1 ROW LAYOUT */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(9, 1fr)",
            gap: 20,
            width: "100%",
            alignItems: "end"
          }}
        >
          {/* ROW 1 */}
          <label style={formLabel}>
            Title *
            <input
              style={formInput}
              value={form.title}
              onChange={e =>
                setForm(f => ({ ...f, title: e.target.value }))
              }
            />
          </label>

          <label style={formLabel}>
            Assigned date *
            <input
              type="date"
              style={formInput}
              value={form.assigned_date}
              onChange={e =>
                setForm(f => ({ ...f, assigned_date: e.target.value }))
              }
            />
          </label>

          
            <label style={formLabel}>
              Owner *
              <select
                  style={{
                    ...formInput,
                    appearance: "none"
                  }}
                value={form.owner_id}
                onChange={e => {
                  const selectedOwnerId = e.target.value;
                
                  if (!permissions?.manage_users && selectedOwnerId !== user.id) {
                    alert("You can only assign tasks to yourself.");
                    return;
                  }
                
                  const selectedOwner = owners.find(
                    o => o.id === selectedOwnerId
                  );
                
                  if (!selectedOwner) return;
                
                  setForm(f => ({
                    ...f,
                    owner_id: selectedOwnerId,               // ✅ VERY IMPORTANT
                    owner: selectedOwner.owner_label,        // ✅ string, not object
                    team: role === "manager"
                      ? selectedOwner.team                  // ✅ correct team
                      : myTeam
                  }));
                }}

              >
                <option value="">Select owner</option>
                {owners.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.owner_label}
                  </option>
                ))}
              </select>   
            </label>


          <label style={formLabel}>
            Requester *
            <select
              style={formInput}
              value={form.requester}
              required
              onChange={e =>
                setForm(f => ({
                  ...f,
                  requester: e.target.value,
                  requester_other:
                    e.target.value === "OTHER" ? f.requester_other : ""
                }))
              }
            >
              <option value="">Select requester</option>
              {REQUESTERS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            </label>


          <label style={formLabel}>
            Initial deadline *
            <input
              type="date"
              style={formInput}
              value={form.initial_deadline}
              onChange={e =>
                setForm(f => ({
                  ...f,
                  initial_deadline: e.target.value
                }))
              }
            />
          </label>
      

          <label style={formLabel}>
            New deadline
            <input
              type="date"
              style={formInput}
              value={form.new_deadline}
              onChange={e =>
                setForm(f => ({ ...f, new_deadline: e.target.value }))
              }
            />
          </label>

              


          
          <label style={formLabel}>
          <input
            type="checkbox"
            checked={recurrence.enabled}
            onChange={e =>
              setRecurrence(r => ({
                ...r,
                enabled: e.target.checked
              }))
            }
          />  
          Recurring task
        </label>

             {/* RECURRENCE FREQUENCY */}
              {recurrence.enabled && (
                <label style={formLabel}>
                  Recurrence frequency
                  <select
                    style={formInput}
                    value={recurrence.frequency}
                      onChange={e =>
                        setRecurrence(r => ({
                          ...r,
                          frequency: e.target.value,
                          weekly: { weekdays: [] },
                          monthly:
                            e.target.value === "monthly"
                              ? {
                                  type: "day_of_month",
                                  day: new Date(form.initial_deadline).getDate()
                                }
                              : null
                        }))
                      }

                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </label>
              )}

          
          {/* ================= MONTHLY RECURRENCE BLOCK ================= */}
                {recurrence.enabled && recurrence.frequency === "monthly" && (
                  <div
                    style={{
                      gridColumn: "span 9",
                      padding: 12,
                      border: "1px dashed #999",
                      borderRadius: 6
                    }}
                  >
                    {/* Monthly rule selector (nth weekday / last weekday / day of month) */}
                      <MonthlyRuleSelector
                        value={recurrence.monthly}
                        baseDate={form.initial_deadline}
                        onChange={rule =>
                          setRecurrence(r => ({
                            ...r,
                            monthly: rule
                          }))
                        }
                      />

                
                    {/* Date range for monthly recurrence */}
                    <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                      <label>
                        From
                        <input
                          type="date"
                          value={recurrence.startDate}
                          onChange={e =>
                            setRecurrence(r => ({
                              ...r,
                              startDate: e.target.value
                            }))
                          }
                        />
                      </label>
                
                      <label>
                        To
                        <input
                          type="date"
                          value={recurrence.endDate}
                          onChange={e =>
                            setRecurrence(r => ({
                              ...r,
                              endDate: e.target.value
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                )}
  {/* ================= END MONTHLY RECURRENCE BLOCK ================= */}



          { /*  START WEEKLY/BIWEEKLY FREQUENCY SELECTOR BLOCK   */}
        {recurrence.enabled && (recurrence.frequency === "weekly" || recurrence.frequency === "biweekly") && (

          <div
            style={{
              gridColumn: "span 9",
              padding: 12,
              border: "1px dashed #999",
              borderRadius: 6
            }}
          >
            <div style={{ marginBottom: 10, fontWeight: 700 }}>             
                            
              Repeat on
            </div>
        
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              {WEEKDAYS.map(d => (
                <label key={d.value}>
                  <input
                    type="checkbox"
                    checked={recurrence.weekly.weekdays.includes(d.value)}

                    onChange={() =>
                      setRecurrence(r => ({
                        ...r,
                        weekly: {
                          ...r.weekly,
                          weekdays: r.weekly.weekdays.includes(d.value)
                            ? r.weekly.weekdays.filter(x => x !== d.value)
                            : [...r.weekly.weekdays, d.value]
                        }
                      }))
                    }

                    
                  />
                  {d.label}
                </label>
              ))}
            </div>
        
            <div style={{ display: "flex", gap: 12 }}>
              <label>
                From
                <input
                  type="date"
                    value={recurrence.startDate}
                    onChange={e =>
                      setRecurrence(r => ({
                        ...r,
                        startDate: e.target.value
                      }))
                    }

                />
              </label>
        
              <label>
                To
                <input
                  type="date"
                    value={recurrence.endDate}
                    onChange={e =>
                      setRecurrence(r => ({
                        ...r,
                        endDate: e.target.value
                      }))
                    }

                />
              </label>
            </div>
          </div>
        )}             
          
          <label style={formLabel}>
            Closing Date
            <input
              type="date"
              style={formInput}
              value={form.closing_date || ""}
              min={
                role?.toLowerCase() !== "admin"
                  ? new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .slice(0, 10)
                  : undefined
              }
              onChange={e =>
                setForm(f => ({ ...f, closing_date: e.target.value }))
              }
            />
          </label>
          
          <label style={formLabel}>
            Comments
           <textarea
             style={{
               ...formInput,
               minHeight: 30,
               resize: "vertical",
               resize: "horizontal"
             }}
             value={form.comments}
             onChange={e =>
               setForm(f => ({ ...f, comments: e.target.value }))
             }
             placeholder="Type your comment here…"
           />
         </label>

        </div>

          <button
          onClick={saveTask}
          disabled={isSubmitting}
          style={{
            marginTop: 10,
            opacity: isSubmitting ? 0.6 : 1,
            cursor: isSubmitting ? "not-allowed" : "pointer"
          }}
        >
          {isSubmitting ? "Creating..." : isEditing ? "Update Task" : "Create Task"}
        </button>

      </div>
    </div>
  );
}
