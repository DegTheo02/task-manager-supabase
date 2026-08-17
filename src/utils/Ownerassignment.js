/* ============================================================
   OWNER ASSIGNMENT POLICY  —  src/utils/ownerAssignment.js

   Single source of truth for "who may this person assign a task to?"
   and "which team should the task land on?".

   Imported by BOTH TaskForm.jsx (gates the dropdowns) and Tasks.jsx
   (gates the actual write), so the rule cannot drift between the
   two the way the old inline copies did.

   ⚠️  CLIENT-SIDE / UX LAYER ONLY.
   The authoritative checks live in Supabase:

     • INSERT — "Role based task insert" already permits a manager to
       insert a row whose owner_id is a profile on their own team.
       This file simply stops lying to the manager about it.

     • UPDATE — "Update tasks based on permissions" permits a write to
       any row whose `team` matches the caller's own team (when they
       hold view_team_tasks).  It does NOT validate that a *new*
       owner_id belongs to that team.  Until a
       `BEFORE UPDATE OF owner_id` trigger exists, that specific gap
       is closed here and here only — a crafted REST call bypasses it.
       (Same outstanding backstop as initial_deadline.)
============================================================ */

import { OWNER_TEAM_MAP } from "../constants/taskConstants";

/* Assignment reach, widest to narrowest. */
export const OWNER_SCOPE = {
  ALL: "all",     // admins — anyone holding manage_users
  TEAM: "team",   // managers — their own team only
  SELF: "self"    // everyone else — themselves only
};

/* ctx shape used throughout this module:
     { owners, permissions, role, user, myTeam }
   `owners` is the profile list already loaded by the page
   (id, owner_label, team). */
export const ownerScopeFor = ctx => {
  if (ctx?.permissions?.manage_users) return OWNER_SCOPE.ALL;
  if (ctx?.role === "manager") return OWNER_SCOPE.TEAM;
  return OWNER_SCOPE.SELF;
};

/* May `ownerId` be assigned a task by the current actor?

   The TEAM branch compares against profiles.team specifically — NOT
   the OWNER_TEAM_MAP override — because profiles.team is what the RLS
   policies read.  Checking anything else here would green-light a
   selection the server then silently rejects. */
export const canAssignTo = (ownerId, ctx) => {
  if (!ownerId || !ctx?.user) return false;

  switch (ownerScopeFor(ctx)) {
    case OWNER_SCOPE.ALL:
      return true;

    case OWNER_SCOPE.TEAM: {
      // Fail closed: no resolvable team → self only.
      if (!ctx.myTeam) return ownerId === ctx.user.id;

      const target = (ctx.owners || []).find(o => o.id === ownerId);
      if (!target) return false;

      return target.team === ctx.myTeam;
    }

    default:
      return ownerId === ctx.user.id;
  }
};

/* The owners the actor may actually pick, for "select all" and counts. */
export const assignableOwners = ctx =>
  (ctx?.owners || []).filter(o => canAssignTo(o.id, ctx));

/* Human-readable refusal, matched to the actor's scope. */
export const assignmentDeniedMessage = ctx => {
  switch (ownerScopeFor(ctx)) {
    case OWNER_SCOPE.TEAM:
      return `You can only assign tasks to members of your own team (${
        ctx?.myTeam || "—"
      }).`;

    case OWNER_SCOPE.SELF:
      return "You can only assign tasks to yourself.";

    default:
      return "You are not allowed to assign tasks to this user.";
  }
};

/* Which team should the task carry, given its owner?

   Scope-aware on purpose, to preserve existing behaviour exactly:

     ALL  → follow the OWNER, not the admin.  OWNER_TEAM_MAP wins so
            this agrees with the create path; profiles.team is the
            fallback.  (This is the fix for an admin reassigning a
            task and silently stamping their OWN team on it.)

     TEAM
     SELF → locked to the actor's own team, unchanged from before.
            A manager or user cannot move a task across teams. */
export const teamForAssignment = (ownerProfile, ctx, fallbackTeam = "") => {
  if (ownerScopeFor(ctx) === OWNER_SCOPE.ALL) {
    return (
      OWNER_TEAM_MAP[ownerProfile?.owner_label] ||
      ownerProfile?.team ||
      fallbackTeam ||
      ctx?.myTeam ||
      ""
    );
  }

  return ctx?.myTeam || fallbackTeam || "";
};
