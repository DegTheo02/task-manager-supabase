// src/hooks/useTasks.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchTasks } from "../api/tasksApi";
import { DEFAULT_PAGE_SIZE, SORTABLE_COLUMNS } from "../services/taskService";

/* =============================================================================
   WHAT CHANGED AND WHY

   The old hook returned { tasks, loading, reload } — but Tasks.jsx destructured
   { tasks, loading, hasMore, loadMore, reload }. hasMore and loadMore were
   permanently undefined, so the infinite-scroll effect at Tasks.jsx:538 could
   never fire. There was no second page, which is why the whole table had to be
   crammed into one .range(0, 4999) request that the server then truncated.

   Three other defects came with it:

     1. On error it caught, logged, and left `tasks` untouched — so a failed
        query silently kept the PREVIOUS result on screen, looking for all the
        world like a valid filtered result.
     2. The effect depended on [filters], a fresh object identity on every
        setFilters call, so unrelated state changes refetched the table.
     3. Nothing debounced. Now that search runs in Postgres rather than the
        browser, that would be one round trip per keystroke, with responses
        free to arrive out of order and overwrite each other.
============================================================================= */

const DEBOUNCE_MS = 300;

/* Content-addressed, order-independent key for a filter set. Two filter
   objects that mean the same thing produce the same key, so a re-render that
   does not change the query does not refetch. Empty arrays, empty strings and
   `today: false` all drop out — an absent filter and an empty one are the
   same question. */
function normalizeFilters(filters = {}) {
  const out = {};

  Object.keys(filters)
    .sort()
    .forEach(key => {
      const value = filters[key];

      if (value === null || value === undefined) return;
      if (value === "" || value === false) return;

      if (Array.isArray(value)) {
        if (!value.length) return;
        out[key] = [...value].sort();
        return;
      }

      out[key] = value;
    });

  return out;
}

/* A sort the service will actually honour, or null. Keeps a stale sortConfig
   in sessionStorage from reaching PostgREST and 400-ing the first load. */
function normalizeSort(sort) {
  if (!sort?.key || !sort?.direction) return null;
  if (!SORTABLE_COLUMNS.has(sort.key)) return null;
  return { key: sort.key, direction: sort.direction };
}

/* =============================================================================
   useTasks

     const {
       tasks, total, loading, loadingMore, hasMore, loadMore, reload, error
     } = useTasks(filters, sortConfig);

   `filters` uses the shape taskService.getTasks documents — owner_ids and
   creator_ids carry UUIDs, not labels.
============================================================================= */
export function useTasks(filters, sort = null, pageSize = DEFAULT_PAGE_SIZE) {
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const normalizedFilters = useMemo(() => normalizeFilters(filters), [filters]);
  const normalizedSort = useMemo(() => normalizeSort(sort), [sort]);

  const key = useMemo(
    () => JSON.stringify({ f: normalizedFilters, s: normalizedSort, p: pageSize }),
    [normalizedFilters, normalizedSort, pageSize]
  );

  /* ---- Debounce -----------------------------------------------------------
     The query the hook is actually running, as opposed to the one the UI has
     most recently described. The functional update returns the PREVIOUS object
     when the key is unchanged, so React bails out of the render rather than
     re-triggering the fetch effect on identity alone.

     Initialised from the first key so the first paint is not delayed; the
     debounce only costs anything on subsequent changes.
  --------------------------------------------------------------------------- */
  const [activeQuery, setActiveQuery] = useState(() => ({
    key,
    filters: normalizedFilters,
    sort: normalizedSort
  }));

  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveQuery(prev =>
        prev.key === key
          ? prev
          : { key, filters: normalizedFilters, sort: normalizedSort }
      );
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [key, normalizedFilters, normalizedSort]);

  /* ---- Refs ---------------------------------------------------------------
     loadMore is called from a scroll handler, which has no business holding a
     stale closure over page or hasMore. Refs keep it reading live values while
     staying referentially stable, so the scroll listener in Tasks.jsx binds
     once instead of on every render.
  --------------------------------------------------------------------------- */
  const requestRef = useRef(0);        // monotonic — invalidates older responses
  const activeQueryRef = useRef(activeQuery);
  const pageRef = useRef(0);
  const hasMoreRef = useRef(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    activeQueryRef.current = activeQuery;
  }, [activeQuery]);

  /* ---- Page 0 -------------------------------------------------------------
     Every filter or sort change restarts here. The sequence number is bumped
     first, which invalidates any in-flight response — including a loadMore
     that was fetching page 3 of a filter set the user has since abandoned.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    const seq = ++requestRef.current;
    const query = activeQuery;

    pageRef.current = 0;
    hasMoreRef.current = false;
    inFlightRef.current = true;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const result = await fetchTasks(query.filters, {
          page: 0,
          pageSize,
          sort: query.sort
        });

        if (cancelled || seq !== requestRef.current) return;

        setTasks(result.tasks);
        setTotal(result.total);
        setHasMore(result.hasMore);
        hasMoreRef.current = result.hasMore;
        pageRef.current = 0;
      } catch (err) {
        if (cancelled || seq !== requestRef.current) return;

        console.error("useTasks: initial load failed", err);

        /* Clear the table. The old hook left the previous rows in place on
           error, so a broken query rendered as a plausible-looking result set
           — the hardest kind of wrong answer to notice. An empty table beside
           an error message is the honest output. */
        setTasks([]);
        setTotal(0);
        setHasMore(false);
        hasMoreRef.current = false;
        setError(err);
      } finally {
        if (!cancelled && seq === requestRef.current) {
          inFlightRef.current = false;
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeQuery, pageSize, reloadToken]);

  /* ---- Next page ---------------------------------------------------------- */
  const loadMore = useCallback(async () => {
    if (inFlightRef.current) return;
    if (!hasMoreRef.current) return;

    const query = activeQueryRef.current;
    const seq = requestRef.current;          // snapshot, deliberately not bumped
    const nextPage = pageRef.current + 1;

    inFlightRef.current = true;
    setLoadingMore(true);

    try {
      const result = await fetchTasks(query.filters, {
        page: nextPage,
        pageSize,
        sort: query.sort
      });

      /* Two guards: the filter set may have changed while this was in flight,
         and a page-0 reload may have superseded it. Appending either way would
         mix rows from two different questions into one table. */
      if (seq !== requestRef.current) return;
      if (query.key !== activeQueryRef.current.key) return;

      setTasks(prev => {
        /* Dedupe on id. getTasks orders by (sort column, id) so pages cannot
           overlap — but a row edited between two page fetches can shift across
           the boundary, and a duplicate key in a React list is a worse bug
           than a missing row. */
        const seen = new Set(prev.map(t => t.id));
        return [...prev, ...result.tasks.filter(t => !seen.has(t.id))];
      });

      setTotal(result.total);
      setHasMore(result.hasMore);
      hasMoreRef.current = result.hasMore;
      pageRef.current = nextPage;
    } catch (err) {
      if (seq !== requestRef.current) return;

      console.error("useTasks: loadMore failed", err);

      /* Unlike page 0, keep what is already on screen — those rows are still
         a valid prefix of the result. Only the extension failed. */
      setError(err);
      setHasMore(false);
      hasMoreRef.current = false;
    } finally {
      inFlightRef.current = false;
      setLoadingMore(false);
    }
  }, [pageSize]);

  /* ---- Manual refresh ------------------------------------------------------
     Used after a create / edit / delete. Restarts at page 0 under the current
     filters and drops any pages already appended, so the table reflects the
     write rather than the state before it.
  --------------------------------------------------------------------------- */
  const reload = useCallback(() => {
    setReloadToken(token => token + 1);
  }, []);

  return {
    tasks,
    total,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    reload,
    error,
    /* How many rows are actually rendered vs how many match the filters.
       Worth putting in the UI: it is the number that would have made the
       original truncation obvious instead of invisible. */
    loadedCount: tasks.length
  };
}
