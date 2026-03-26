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
    <div style={{ marginBottom: 30 }}>
      <h2>{isEditing ? "Edit Task" : "New Task"}</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(9, 1fr)",
          gap: 20,
          width: "100%",
          alignItems: "end"
        }}
      >
        {/* Title */}
        <label>
          Title *
          <input
            value={form.title}
            onChange={e =>
              setForm(f => ({ ...f, title: e.target.value }))
            }
          />
        </label>

        {/* Assigned date */}
        <label>
          Assigned date *
          <input
            type="date"
            value={form.assigned_date}
            onChange={e =>
              setForm(f => ({ ...f, assigned_date: e.target.value }))
            }
          />
        </label>

        {/* Owner */}
        <label>
          Owner *
          <select
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
                owner_id: selectedOwnerId,
                owner: selectedOwner.owner_label,
                team:
                  role === "manager"
                    ? selectedOwner.team
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

        {/* Requester */}
        <label>
          Requester *
          <input
            value={form.requester}
            onChange={e =>
              setForm(f => ({ ...f, requester: e.target.value }))
            }
          />
        </label>

        {/* Initial deadline */}
        <label>
          Initial deadline *
          <input
            type="date"
            value={form.initial_deadline}
            onChange={e =>
              setForm(f => ({
                ...f,
                initial_deadline: e.target.value
              }))
            }
          />
        </label>

        {/* Submit */}
      </div>

      <button
        onClick={saveTask}
        disabled={isSubmitting}
        style={{
          marginTop: 10,
          opacity: isSubmitting ? 0.6 : 1
        }}
      >
        {isSubmitting
          ? "Creating..."
          : isEditing
          ? "Update Task"
          : "Create Task"}
      </button>
    </div>
  );
}
