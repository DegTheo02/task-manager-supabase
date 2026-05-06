import React, { useState, useEffect, useRef } from "react";
import MonthlyRuleSelector from "../MonthlyRuleSelector";
import { REQUESTERS } from "../../constants/taskConstants";


/* ============================================================
   FIELD ERROR — inline error message under a field
   Always reserves vertical space (non-breaking space fallback)
   so layout doesn't jump when an error appears/disappears.
============================================================ */
function FieldError({ message }) {
  return <div style={fieldErrorStyle}>{message || "\u00A0"}</div>;
}


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
  hasError,
  dark
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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
      onChange(checked ? [user.id] : []);
      return;
    }
    onChange(checked ? owners.map(o => o.id) : []);
  };

  const allSelected =
    owners.length > 0 && selectedIds.length === owners.length;

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
      {/* TRIGGER — gets a red border when hasError is true */}
      <div
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          ...formInput,
          ...(hasError && inputErrorStyle),
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

  /* ============================================================
     EDIT GATES
     Initial deadline can only be changed by:
       - admins (any team)
       - managers, but only for tasks in their own team
     On CREATE, anyone allowed to create a task can set it.
  ============================================================ */
  const isAdmin = role === "admin";
  const isManagerOfThisTeam = role === "manager" && form.team === myTeam;
  const canEditInitialDeadline =
    !isEditing || isAdmin || isManagerOfThisTeam;

  const initialDeadlineLockMessage = canEditInitialDeadline
    ? undefined
    : role === "manager"
      ? "Managers can only change the initial deadline for tasks in their own team."
      : "Discuss with your manager if you need to change the initial deadline";


  /* ============================================================
     INLINE VALIDATION
  ============================================================ */
  const [errors, setErrors] = useState({});

  const clearError = field => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateForm = () => {
    const e = {};

    if (!form.title?.trim())     e.title = "Title is required";
    if (!form.assigned_date)     e.assigned_date = "Assigned date is required";
    if (!form.initial_deadline)  e.initial_deadline = "Initial deadline is required";
    if (!form.requester)         e.requester = "Requester is required";

    // Owner — different shape in edit vs create
    if (isEditing) {
      if (!form.owner_id) e.owner = "Please select an owner";
    } else {
      if (!form.owner_ids?.length) e.owner = "Please select at least one owner";
    }

    // Recurrence — only when enabled
    if (recurrence.enabled) {
      const isWeekly =
        recurrence.frequency === "weekly" ||
        recurrence.frequency === "biweekly";

      if (isWeekly && !recurrence.weekly?.weekdays?.length) {
        e.recurrence_weekdays = "Select at least one day";
      }

      if (recurrence.frequency === "monthly") {
        if (!recurrence.monthly || !recurrence.monthly.type) {
          e.recurrence_monthly = "Monthly rule is required";
        }
      }

      if (!recurrence.startDate) e.recurrence_from = "Start date is required";
      if (!recurrence.endDate)   e.recurrence_to   = "End date is required";

      if (
        recurrence.startDate &&
        recurrence.endDate &&
        recurrence.endDate < recurrence.startDate
      ) {
        e.recurrence_to = "End date must be after start date";
      }
    }

    return e;
  };

  const handleSubmit = () => {
    const next = validateForm();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    saveTask();
  };


  /* ============================================================
     RESET — wipes the form back to its empty/default state.
     Only shown in CREATE mode; in EDIT mode the form is bound
     to a specific task row (form.id), and clearing it would
     leave the parent in an ambiguous "editing nothing" state.
  ============================================================ */
  const resetForm = () => {
    setForm({
      title: "",
      assigned_date: "",
      owner_id: "",
      owner: "",
      owner_ids: [],
      team: "",
      requester: "",
      requester_other: "",
      initial_deadline: "",
      new_deadline: "",
      closing_date: "",
      comments: ""
    });

    setRecurrence({
      enabled: false,
      frequency: "weekly",
      weekly: { weekdays: [] },
      monthly: null,
      startDate: "",
      endDate: ""
    });

    setErrors({});
  };


  /* -------- OWNER CHANGE HANDLER (CREATE / multi) -------- */
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

  /* -------- EDIT MODE: single-owner change -------- */
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

      {/* GRID LAYOUT */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(9, 1fr)",
          gap: 20,
          width: "100%",
          alignItems: "end"
        }}
      >
        {/* ============ TITLE ============ */}
        <label style={formLabel}>
          Title *
          <input
            style={{ ...formInput, ...(errors.title && inputErrorStyle) }}
            value={form.title}
            onChange={e => {
              clearError("title");
              setForm(f => ({ ...f, title: e.target.value }));
            }}
          />
          <FieldError message={errors.title} />
        </label>

        {/* ============ ASSIGNED DATE ============ */}
        <label style={formLabel}>
          Assigned date *
          <input
            type="date"
            style={{ ...formInput, ...(errors.assigned_date && inputErrorStyle) }}
            value={form.assigned_date}
            onChange={e => {
              clearError("assigned_date");
              setForm(f => ({ ...f, assigned_date: e.target.value }));
            }}
          />
          <FieldError message={errors.assigned_date} />
        </label>

        {/* ============ OWNER ============ */}
        <label style={formLabel}>
          {isEditing ? "Owner *" : "Owner(s) *"}

          {isEditing ? (
            <select
              style={{
                ...formInput,
                appearance: "none",
                ...(errors.owner && inputErrorStyle)
              }}
              value={form.owner_id}
              onChange={e => {
                clearError("owner");
                handleSingleOwnerChange(e);
              }}
            >
              <option value="">Select owner</option>
              {owners.map(o => (
                <option key={o.id} value={o.id}>
                  {o.owner_label}
                </option>
              ))}
            </select>
          ) : (
            <OwnerMultiDropdown
              owners={owners}
              selectedIds={form.owner_ids || []}
              onChange={ids => {
                clearError("owner");
                handleOwnerIdsChange(ids);
              }}
              permissions={permissions}
              user={user}
              hasError={!!errors.owner}
              dark={dark}
            />
          )}
          <FieldError message={errors.owner} />
        </label>

        {/* ============ REQUESTER ============ */}
        <label style={formLabel}>
          Requester *
          <select
            style={{ ...formInput, ...(errors.requester && inputErrorStyle) }}
            value={form.requester}
            onChange={e => {
              clearError("requester");
              setForm(f => ({
                ...f,
                requester: e.target.value,
                requester_other:
                  e.target.value === "OTHER" ? f.requester_other : ""
              }));
            }}
          >
            <option value="">Select requester</option>
            {REQUESTERS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <FieldError message={errors.requester} />
        </label>

        {/* ============ INITIAL DEADLINE ============ */}
        {/* Locked on edit unless caller is admin or a manager of the
            task's team. The disabled <input> still submits its current
            value, and because that value is what was loaded from the DB,
            the UPDATE payload becomes a no-op for this column. */}
        <label style={formLabel}>
          Initial deadline *
          <input
            type="date"
            style={{
              ...formInput,
              ...(errors.initial_deadline && inputErrorStyle),
              ...(canEditInitialDeadline
                ? null
                : { opacity: 0.6, cursor: "not-allowed" })
            }}
            value={form.initial_deadline}
            disabled={!canEditInitialDeadline}
            title={initialDeadlineLockMessage}
            onChange={e => {
              clearError("initial_deadline");
              setForm(f => ({ ...f, initial_deadline: e.target.value }));
            }}
          />
          <FieldError message={errors.initial_deadline} />
        </label>

        {/* ============ NEW DEADLINE (optional) ============ */}
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
          <FieldError message={null} />
        </label>

        {/* ============ RECURRING TASK CHECKBOX ============ */}
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

        {/* ============ RECURRENCE FREQUENCY ============ */}
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

        {/* ============ MONTHLY RECURRENCE BLOCK ============ */}
        {recurrence.enabled && recurrence.frequency === "monthly" && (
          <div
            style={{
              gridColumn: "span 9",
              padding: 12,
              border: "1px dashed #999",
              borderRadius: 6
            }}
          >
            <MonthlyRuleSelector
              value={recurrence.monthly}
              baseDate={form.initial_deadline}
              onChange={rule => {
                clearError("recurrence_monthly");
                setRecurrence(r => ({ ...r, monthly: rule }));
              }}
            />
            <FieldError message={errors.recurrence_monthly} />

            {/* Date range for monthly recurrence */}
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <label>
                From *
                <input
                  type="date"
                  style={errors.recurrence_from ? inputErrorStyle : undefined}
                  value={recurrence.startDate}
                  onChange={e => {
                    clearError("recurrence_from");
                    setRecurrence(r => ({ ...r, startDate: e.target.value }));
                  }}
                />
                <FieldError message={errors.recurrence_from} />
              </label>

              <label>
                To *
                <input
                  type="date"
                  style={errors.recurrence_to ? inputErrorStyle : undefined}
                  value={recurrence.endDate}
                  onChange={e => {
                    clearError("recurrence_to");
                    setRecurrence(r => ({ ...r, endDate: e.target.value }));
                  }}
                />
                <FieldError message={errors.recurrence_to} />
              </label>
            </div>
          </div>
        )}
        {/* ============ END MONTHLY RECURRENCE BLOCK ============ */}


        {/* ============ WEEKLY/BIWEEKLY BLOCK ============ */}
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
              Repeat on *
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
              {WEEKDAYS.map(d => (
                <label key={d.value}>
                  <input
                    type="checkbox"
                    checked={recurrence.weekly.weekdays.includes(d.value)}
                    onChange={() => {
                      clearError("recurrence_weekdays");
                      setRecurrence(r => ({
                        ...r,
                        weekly: {
                          ...r.weekly,
                          weekdays: r.weekly.weekdays.includes(d.value)
                            ? r.weekly.weekdays.filter(x => x !== d.value)
                            : [...r.weekly.weekdays, d.value]
                        }
                      }));
                    }}
                  />
                  {d.label}
                </label>
              ))}
            </div>
            <FieldError message={errors.recurrence_weekdays} />

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <label>
                From *
                <input
                  type="date"
                  style={errors.recurrence_from ? inputErrorStyle : undefined}
                  value={recurrence.startDate}
                  onChange={e => {
                    clearError("recurrence_from");
                    setRecurrence(r => ({ ...r, startDate: e.target.value }));
                  }}
                />
                <FieldError message={errors.recurrence_from} />
              </label>

              <label>
                To *
                <input
                  type="date"
                  style={errors.recurrence_to ? inputErrorStyle : undefined}
                  value={recurrence.endDate}
                  onChange={e => {
                    clearError("recurrence_to");
                    setRecurrence(r => ({ ...r, endDate: e.target.value }));
                  }}
                />
                <FieldError message={errors.recurrence_to} />
              </label>
            </div>
          </div>
        )}
        {/* ============ END WEEKLY/BIWEEKLY BLOCK ============ */}


        {/* ============ CLOSING DATE (optional) ============ */}
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
          <FieldError message={null} />
        </label>

        {/* ============ COMMENTS (optional) ============ */}
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
          <FieldError message={null} />
        </label>

      </div>

      {/* ============ ACTION BUTTONS ============ */}
      <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{
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

        {/* Reset is only meaningful in CREATE mode — see resetForm comment. */}
        {!isEditing && (
          <button
            type="button"
            onClick={resetForm}
            disabled={isSubmitting}
            style={{
              background: "#E5E7EB",
              color: "#111827",
              border: "1px solid #D1D5DB",
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? "not-allowed" : "pointer"
            }}
          >
            Reset
          </button>
        )}
      </div>
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

const fieldErrorStyle = {
  color: "#DC2626",
  fontSize: 12,
  marginTop: 4,
  fontWeight: 500,
  minHeight: 16   // reserves space so the layout doesn't jump
};

const inputErrorStyle = {
  border: "1px solid #DC2626",
  outline: "none"
};
