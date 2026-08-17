import React, { useState, useEffect, useRef, useMemo } from "react";
import MonthlyRuleSelector from "../MonthlyRuleSelector";
import { REQUESTERS } from "../../constants/taskConstants";
import {
  canAssignTo,
  assignableOwners,
  assignmentDeniedMessage,
  teamForAssignment
} from "../../utils/ownerAssignment";

/* Read the day-of-month (1–31) straight from a "YYYY-MM-DD" string.
   We deliberately avoid `new Date(str).getDate()` here: that parses the
   string as UTC midnight and then reads the LOCAL day, which is off by one
   for some timezones. Reading the day component directly is timezone-proof
   and never returns NaN. Returns null when the date is empty/invalid. */
const dayFromISO = iso => {
  if (!iso || typeof iso !== "string") return null;
  const day = Number(iso.split("-")[2]);
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
};


/* ============================================================
   OWNER MULTI-DROPDOWN (checkbox style — matches Filters.jsx)

   Selectability now comes from the shared assignment policy
   (utils/ownerAssignment) instead of an inline manage_users check,
   so a manager sees their whole team as pickable — which is what
   the RLS INSERT policy has always allowed.
============================================================ */
function OwnerMultiDropdown({
  owners,
  selectedIds,
  onChange,
  assignCtx,
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

  /* Everyone this actor is actually permitted to pick. */
  const pickable = useMemo(
    () => assignableOwners(assignCtx),
    [assignCtx]
  );

  const toggleOne = (ownerId, checked) => {
    if (!canAssignTo(ownerId, assignCtx)) {
      alert(assignmentDeniedMessage(assignCtx));
      return;
    }

    const next = checked
      ? [...selectedIds, ownerId]
      : selectedIds.filter(id => id !== ownerId);

    onChange(next);
  };

  /* "All" means all PICKABLE owners — for a manager that's their team,
     for a plain user it collapses to just themselves. */
  const toggleAll = checked => {
    onChange(checked ? pickable.map(o => o.id) : []);
  };

  const allSelected =
    pickable.length > 0 && selectedIds.length === pickable.length;

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
          {/* SELECT ALL — shown whenever there's more than one pickable
              owner (admins, and now managers with a team) */}
          {pickable.length > 1 && (
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
            const lockedOut = !canAssignTo(o.id, assignCtx);

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

  /* -------- ASSIGNMENT CONTEXT --------
     Bundled once and handed to the policy helpers, so the dropdowns
     and saveTask() are answering the same question from the same
     inputs. Memoised because OwnerMultiDropdown derives its pickable
     list from it. */
  const assignCtx = useMemo(
    () => ({ owners, permissions, role, user, myTeam }),
    [owners, permissions, role, user, myTeam]
  );

  /* -------- KEEP MONTHLY "DAY OF MONTH" IN SYNC WITH DEADLINE --------
     monthly.day is otherwise snapshotted only at the moment "Monthly" (or
     the "Same day each month" radio) is picked. If the Initial deadline is
     empty then — or is changed afterward — the day goes stale (NaN/null).
     That breaks two things:
       1) the local occurrence engine generates zero occurrences, and
       2) recurrence_rule is saved with "day": null, so the monthly cron
          (computeNextOccurrence) bails out and the series never rolls.
     This effect re-derives the day from the deadline whenever it changes. */
  useEffect(() => {
    if (
      !recurrence.enabled ||
      recurrence.frequency !== "monthly" ||
      recurrence.monthly?.type !== "day_of_month"
    ) {
      return;
    }

    const day = dayFromISO(form.initial_deadline);
    if (day && day !== recurrence.monthly.day) {
      setRecurrence(r => ({
        ...r,
        monthly: { ...r.monthly, day }
      }));
    }
  }, [
    form.initial_deadline,
    recurrence.enabled,
    recurrence.frequency,
    recurrence.monthly?.type,
    recurrence.monthly?.day,
    setRecurrence
  ]);

  /* -------- OWNER CHANGE HANDLER (CREATE / multi) --------
     Maintains both the multi-value field (owner_ids) AND the legacy
     single-owner fields (owner / owner_id / team) off the FIRST
     selection so any downstream code that still reads them keeps
     working (validation, recurrence engine, etc.).

     Team now comes from teamForAssignment(), which follows the OWNER
     for admins and stays locked to the actor's own team otherwise. The
     old expression (`role === "manager" ? first.team : myTeam`) had the
     admin branch backwards — it stamped the admin's own team on a task
     being created for someone else. */
  const handleOwnerIdsChange = ids => {
    // Defensive: never let a non-assignable id through, even if a
    // checkbox somehow fired while disabled.
    const allowed = ids.filter(id => canAssignTo(id, assignCtx));

    const first = allowed[0]
      ? owners.find(o => o.id === allowed[0])
      : null;

    setForm(f => ({
      ...f,
      owner_ids: allowed,
      owner_id: first?.id || "",
      owner: first?.owner_label || "",
      team: first ? teamForAssignment(first, assignCtx, f.team) : ""
    }));
  };

  /* -------- EDIT MODE: single-owner change --------
     Edit form keeps the original native <select> behaviour so one task
     can be reassigned without falling into multi-select UX.

     Reassignment is now open to managers within their own team, not
     just manage_users holders. The write side (Tasks.jsx) re-checks
     with the same helper and actually persists owner_id — previously
     it dropped it, so only the display label moved and the row stayed
     invisible to its new owner. */
  const handleSingleOwnerChange = e => {
    const selectedOwnerId = e.target.value;

    if (!selectedOwnerId) {
      setForm(f => ({ ...f, owner_id: "", owner: "", owner_ids: [] }));
      return;
    }

    if (!canAssignTo(selectedOwnerId, assignCtx)) {
      alert(assignmentDeniedMessage(assignCtx));
      return;
    }

    const selectedOwner = owners.find(o => o.id === selectedOwnerId);
    if (!selectedOwner) return;

    setForm(f => ({
      ...f,
      owner_id: selectedOwnerId,
      owner: selectedOwner.owner_label,
      owner_ids: [selectedOwnerId],
      team: teamForAssignment(selectedOwner, assignCtx, f.team)
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
              // EDIT MODE — single native select.
              // Options the actor can't assign to are disabled rather
              // than hidden, so the current owner of a task still
              // renders correctly even if they're out of scope.
              <select
                style={{ ...formInput, appearance: "none" }}
                value={form.owner_id || ""}
                onChange={handleSingleOwnerChange}
              >
                <option value="">Select owner</option>
                {owners.map(o => {
                  const lockedOut =
                    !canAssignTo(o.id, assignCtx) && o.id !== form.owner_id;

                  return (
                    <option
                      key={o.id}
                      value={o.id}
                      disabled={lockedOut}
                    >
                      {o.owner_label}
                    </option>
                  );
                })}
              </select>
            ) : (
              // CREATE MODE — multi-checkbox dropdown
              <OwnerMultiDropdown
                owners={owners}
                selectedIds={form.owner_ids || []}
                onChange={handleOwnerIdsChange}
                assignCtx={assignCtx}
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
                                  day: dayFromISO(form.initial_deadline)
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
               resize: "both"
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
            ? (isEditing ? "Updating..." : "Creating...")
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
