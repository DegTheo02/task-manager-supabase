import React from "react";
import Select from "react-select";
import MonthlyRuleSelector from "../MonthlyRuleSelector";
import { REQUESTERS } from "../../constants/taskConstants";

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
  WEEKDAYS,
  dark
}) {

  /* -------- OWNER OPTIONS / VALUE -------- */
  const ownerOptions = owners.map(o => ({
    value: o.id,
    label: o.owner_label,
    team: o.team
  }));

  // For multi-select (create): mirror form.owner_ids
  // For single-select (edit):  mirror form.owner_id
  const selectedOwnerValue = isEditing
    ? ownerOptions.find(opt => opt.value === form.owner_id) || null
    : (form.owner_ids || [])
        .map(id => ownerOptions.find(opt => opt.value === id))
        .filter(Boolean);

  /* -------- OWNER CHANGE HANDLER -------- */
  const handleOwnerChange = selected => {
    // react-select returns array (multi) or object (single)
    const arr = Array.isArray(selected)
      ? selected
      : selected
      ? [selected]
      : [];

    const ids = arr.map(s => s.value);

    // Non-admin guard: can only assign to themselves
    if (!permissions?.manage_users) {
      const onlySelf =
        ids.length === 0 ||
        (ids.length === 1 && ids[0] === user.id);

      if (!onlySelf) {
        alert("You can only assign tasks to yourself.");
        return;
      }
    }

    // Maintain legacy single-owner fields off the FIRST selection so any
    // downstream code that still reads form.owner / form.owner_id / form.team
    // keeps working (recurrence engine, validation, etc.)
    const first = arr[0];
    const firstTeam = first
      ? (role === "manager" ? first.team : myTeam)
      : "";

    setForm(f => ({
      ...f,
      owner_ids: ids,
      owner_id: first?.value || "",
      owner: first?.label || "",
      team: firstTeam
    }));
  };

  return (
      <div style={{ ...formBox, ...dark }}>
        <h2>{isEditing ? "Edit Task" : "New Task"}</h2>
      {/* NEW / EDIT TASK FORM */}
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
              Owner{isEditing ? " *" : "(s) *"}
              <Select
                isMulti={!isEditing}
                isClearable={false}
                placeholder={isEditing ? "Select owner" : "Select owner(s)…"}
                options={ownerOptions}
                value={selectedOwnerValue}
                isOptionDisabled={opt =>
                  // Non-admin users can only select themselves.
                  // (`owners` list is already filtered for them, but
                  //  belt-and-braces in case extras leak in.)
                  !permissions?.manage_users && opt.value !== user.id
                }
                onChange={handleOwnerChange}
                styles={ownerSelectStyles}
                menuPortalTarget={
                  typeof document !== "undefined" ? document.body : null
                }
              />
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
          {isSubmitting
            ? "Creating..."
            : isEditing
            ? "Update Task"
            : (form.owner_ids?.length > 1
                ? `Create ${form.owner_ids.length} Tasks`
                : "Create Task")}
        </button>
    </div>
  );
}




/* ----------------------------------
   STYLES
---------------------------------- */
const formBox = {
  display: "grid",
  gap: 10,
  maxWidth: 900,
  marginBottom: 30,
  padding: 12,
  borderRadius: 6
};

const formLabel = {
  display: "flex",
  flexDirection: "column",
  fontWeight: 600,
  fontSize: 14,
  gap: 6
};

const formInput = {
  padding: "6px 8px",
  border: "1px solid #D1D5DB",
  borderRadius: 4,
  height: 36,
  boxSizing: "border-box"
};

/* react-select styling — keeps the control aligned with the
   surrounding native inputs (36px min height, same border radius).
   The control will grow taller when several owners are selected,
   which is fine because the form row uses `alignItems: "end"`. */
const ownerSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 36,
    borderColor: "#D1D5DB",
    boxShadow: state.isFocused ? "0 0 0 1px #0EA5A8" : "none",
    "&:hover": { borderColor: "#9CA3AF" }
  }),
  valueContainer: base => ({
    ...base,
    padding: "2px 6px"
  }),
  multiValue: base => ({
    ...base,
    background: "#E0F2F1"
  }),
  menuPortal: base => ({
    ...base,
    zIndex: 9999
  })
};
