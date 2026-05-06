/**
 * Build a /tasks URL with query params from a filter object.
 *
 * Used to deep-link from Dashboard / DailyTaskVolume / charts / tables
 * into the Tasks page with filters pre-applied.
 *
 *   buildTasksUrl(dashboardFilters, { teams: ["BI"], statuses: ["OPEN"] })
 *   // → "/tasks?owners=...&teams=BI&statuses=OPEN&..."
 *
 * `overrides` win over `filters` for any key they share.
 *
 * @param {object} filters    base filter object (e.g. dashboard filters)
 * @param {object} overrides  per-click overrides (clicked team / status / etc.)
 * @returns {string}          a URL like "/tasks?statuses=OPEN&teams=BI"
 */
export function buildTasksUrl(filters = {}, overrides = {}) {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();

  /* Array filters → comma-joined */
  const arrayKeys = [
    "statuses",
    "owners",
    "teams",
    "requesters",
    "recurrence_types"
  ];
  arrayKeys.forEach(key => {
    if (Array.isArray(merged[key]) && merged[key].length) {
      params.set(key, merged[key].join(","));
    }
  });

  /* Singular `status` (legacy / convenience). Skipped if `statuses` is set. */
  if (merged.status && !params.has("statuses")) {
    params.set("status", merged.status);
  }

  /* Date ranges */
  const dateKeys = [
    "assigned_from",
    "assigned_to",
    "deadline_from",
    "deadline_to",
    "closing_from",
    "closing_to"
  ];
  dateKeys.forEach(key => {
    if (merged[key]) params.set(key, merged[key]);
  });

  /* Legacy date_from / date_to → deadline_* (DailyTaskVolume convention) */
  if (merged.date_from && !params.has("deadline_from")) {
    params.set("deadline_from", merged.date_from);
  }
  if (merged.date_to && !params.has("deadline_to")) {
    params.set("deadline_to", merged.date_to);
  }

  /* Free text search */
  if (merged.search) params.set("search", merged.search);

  return `/tasks?${params.toString()}`;
}

/**
 * Navigate to /tasks with filters applied. Opens in a new tab on Ctrl/Cmd+click.
 *
 * Works with both DOM events and chart.js click events (which expose the
 * underlying DOM event under `evt.native`).
 *
 * @param {function} navigate  react-router's `useNavigate()` result
 * @param {object}   filters   base filters
 * @param {object}   overrides per-click overrides
 * @param {Event|object} evt   DOM or chart.js click event
 */
export function openTasksWithFilters(navigate, filters, overrides, evt) {
  const url = buildTasksUrl(filters, overrides);
  const native = evt?.native || evt;
  const newTab = !!(native?.ctrlKey || native?.metaKey);

  if (newTab) {
    window.open(url, "_blank");
  } else {
    navigate(url);
  }
}
