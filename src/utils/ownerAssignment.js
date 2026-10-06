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

     • UPDATE — "Manager updates team tasks" permits a write only to
       rows whose `team` matches the caller's own team, and its
       WITH CHECK forbids moving a row out of that team.
       "User modifies own tasks" covers the owner's own rows and,
       having no WITH CHECK of its own, forbids a user reassigning
       owner_id away from themselves.

       Neither validates that a *new* owner_id belongs to the
       manager's team.  Until a `BEFORE UPDATE OF owner_id` trigger
       exists, that specific gap is closed here and here only — a
       crafted REST call bypasses it.
       (Same outstanding backstop as initial_deadline.)

   WHY SCOPE KEYS ON ROLE, NOT ON permissions.manage_users
   -------------------------------------------------------
   It used to read `permissions?.manage_users` for the ALL branch.
   Both managers carried that flag, so they never reached the TEAM
   branch: the dropdown offered them every profile in the company
   while "Role based task insert" rejected the write, and the save
   failed on submit.

   `manage_users` is a permission about administering *users*.  Using
   it as a God-mode flag over *tasks* is what let a UI grant drift
   away from what RLS actually allows — and the same conflation gave
   managers unscoped UPDATE and DELETE on every team's tasks until
   those two policies were rewritten.  Role is the axis the server
   policies key on, so it is the axis this file keys on.
============================================================ */

import { OWNER_TEAM_MAP } from "../constants/taskConstants";

/* Assignment reach, widest to narrowest. */
export const OWNER_SCOPE = {
  ALL: "all",     // admins — role === "admin"
  TEAM: "team",   // managers — their own team only
  SELF: "self"    // everyone else — themselves only
};

/* ctx shape used throughout this module:
     { owners, permissions, role, user, myTeam }
   `owners` is the profile list already loaded by the page
   (id, owner_label, team).

   `permissions` is still accepted in ctx because callers pass the
   whole auth context; it is deliberately not read here. */
export const ownerScopeFor = ctx => {
  if (ctx?.role === "admin") return OWNER_SCOPE.ALL;
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
            A manager or user cannot move a task across teams, which
            is also what the WITH CHECK on "Manager updates team
            tasks" enforces server-side. */
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
