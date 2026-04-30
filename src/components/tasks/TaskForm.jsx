import React, { useState, useEffect, useRef } from "react";
import MonthlyRuleSelector from "../MonthlyRuleSelector";
import { REQUESTERS } from "../../constants/taskConstants";


/* ============================================================
   OWNER MULTI-DROPDOWN (checkbox style — matches Filters.jsx)
============================================================ */
function OwnerMultiDropdown({
  owners,
  selectedIds,
  onChange,
  permissions,
  user,
  disabled,
  dark
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isDark = dark?.background === "#000";

  const toggleOne = (ownerId, checked) => {
    // Non-admin guard — locked to self
    if (!permissions?.manage_users && ownerId !== user.id) {
      alert("You can only assign tasks to yourself.");
      return;
    }

    const next = checked
      ? [...selectedIds, ownerId]
      : selectedIds.filter(id => id !== ownerId);

    onChange(next);
  };

  const toggleAll = checked => {
    if (!permissions?.manage_users) {
      // Non-admin: "All" just means themselves
      onChange(checked ? [user.id] : []);
      return;
    }
    onChange(checked ? owners.map(o => o.id) : []);
  };

  const allSelected =
    owners.length > 0 && selectedIds.length === owners.length;

  // Closed-state label
  let triggerLabel = "Select owner(s)";
  if (selectedIds.length > 0) {
    if (allSelected) {
      triggerLabel = "All selected";
    } else if (selectedIds.length === 1) {
      const only = owners.find(o => o.id === selectedIds[0]);
      triggerLabel = only ? only.owner_label : "1 selected";
    } else {
      triggerLabel = `${selectedIds.length} selected`;
    }
  }

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      {/* TRIGGER — always white to match the other form inputs */}
      <div
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          ...formInput,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: disabled ? "not-allowed" : "pointer",
          background: "#fff",
          color: "#000",
          opacity: disabled ? 0.6 : 1
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: selectedIds.length === 0 ? "#9CA3AF" : "inherit"
          }}
        >
          {triggerLabel}
        </span>
        <span style={{ marginLeft: 6, opacity: 0.6 }}>▾</span>
      </div>

      {/* DROPDOWN PANEL — follows dark mode */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            left: 0,
            minWidth: "100%",
            maxHeight: 260,
            overflowY: "auto",
            background: isDark ? "#111" : "#fff",
            color: isDark ? "#fff" : "#000",
            border: isDark ? "1px solid #333" : "1px solid #D1D5DB",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            padding: 4
          }}
        >
          {/* SELECT ALL — admins only */}
          {permissions?.manage_users && owners.length > 1 && (
            <label
              style={{
                ...rowStyle(isDark),
                fontWeight: 600,
                borderBottom: isDark
                  ? "1px solid #333"
                  : "1px solid #E5E7EB"
              }}
            >
              <input
                type="checkbox"
                checked={allSelected}
                onChange={e => toggleAll(e.target.checked)}
              />
              <span>All</span>
            </label>
          )}

          {/* INDIVIDUAL OWNERS */}
          {owners.map(o => {
            const checked = selectedIds.includes(o.id);
            const lockedOut =
              !permissions?.manage_users && o.id !== user.id;

            return (
              <label
                key={o.id}
                style={{
                  ...rowStyle(isDark),
                  opacity: lockedOut ? 0.4 : 1,
                  cursor: lockedOut ? "not-allowed" : "pointer"
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={lockedOut}
                  onChange={e => toggleOne(o.id, e.target.checked)}
                />
                <span>{o.owner_label}</span>
              </label>
            );
          })}

          {owners.length === 0 && (
            <div
              style={{
                padding: "8px 12px",
                fontSize: 13,
                opacity: 0.7
              }}
            >
              No owners available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const rowStyle = isDark => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  fontSize: 14,
  cursor: "pointer",
  borderRadius: 4,
  userSelect: "none"
});


/* ============================================================
   TASK FORM
============================================================ */
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

  /* -------- OWNER CHANGE HANDLER (CREATE / multi) --------
     Maintains both the multi-value field (owner_ids) AND the legacy
     single-owner fields (owner / owner_id / team) off the FIRST
     selection so any downstream code that still reads them keeps
     working (validation, recurrence engine, etc.). */
  const handleOwnerIdsChange = ids => {
    const first = ids[0]
      ? owners.find(o => o.id === ids[0])
      : null;

    const firstTeam = first
      ? (role === "manager" ? first.team : myTeam)
      : "";

    setForm(f => ({
      ...f,
      owner_ids: ids,
      owner_id: first?.id || "",
      owner: first?.owner_label || "",
      team: firstTeam
    }));
  };

  /* -------- EDIT MODE: single-owner change --------
     Edit form keeps the original native <select> behaviour so an
     admin can reassign one task without falling into multi-select UX. */
  const handleSingleOwnerChange = e => {
    const selectedOwnerId = e.target.value;

    if (!permissions?.manage_users && selectedOwnerId !== user.id) {
      alert("You can only assign tasks to yourself.");
      return;
    }

    const selectedOwner = owners.find(o => o.id === selectedOwnerId);
    if (!selectedOwner) return;

    setForm(f => ({
      ...f,
      owner_id: selectedOwnerId,
      owner: selectedOwner.owner_label,
      owner_ids: [selectedOwnerId],
      team: role === "manager" ? selectedOwner.team : myTeam
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

          
          {/* ============= OWNER ============= */}
          <label style={formLabel}>
            {isEditing ? "Owner *" : "Owner(s) *"}

            {isEditing ? (
              // EDIT MODE — single native select (same as before)
              <select
                style={{ ...formInput, appearance: "none" }}
                value={form.owner_id}
                onChange={handleSingleOwnerChange}
              >
                <option value="">Select owner</option>
                {owners.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.owner_label}
                  </option>
                ))}
              </select>
            ) : (
              // CREATE MODE — multi-checkbox dropdown
              <OwnerMultiDropdown
                owners={owners}
                selectedIds={form.owner_ids || []}
                onChange={handleOwnerIdsChange}
                permissions={permissions}
                user={user}
                dark={dark}
              />
            )}
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
