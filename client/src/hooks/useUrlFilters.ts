import { useState, useEffect, useCallback, useMemo } from "react";

interface UseUrlFiltersOptions {
  /** Query param name mapping: { filterKey: "urlParamName" } */
  paramMap?: Record<string, string>;
}

export function useUrlFilters<T extends Record<string, string>>(
  basePath: string,
  defaults: T,
  options?: UseUrlFiltersOptions
) {
  const paramMap = options?.paramMap || {};

  // Helper: URL param name for a key
  const paramName = useCallback((key: string) => paramMap[key] || key, [paramMap]);

  // Read initial values from URL
  const getInitialValues = useCallback((): T => {
    if (typeof window === "undefined") return { ...defaults };
    const sp = new URLSearchParams(window.location.search);
    const values = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const urlVal = sp.get(paramName(key));
      if (urlVal !== null) {
        (values as Record<string, string>)[key] = urlVal;
      }
    }
    return values;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filters, setFilters] = useState<T>(getInitialValues);
  const [page, setPage] = useState(() => {
    if (typeof window === "undefined") return 1;
    return parseInt(new URLSearchParams(window.location.search).get("page") || "1", 10);
  });

  // Sync filters -> URL
  useEffect(() => {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== defaults[key] && value !== "" && value !== "all") {
        sp.set(paramName(key), value);
      }
    }
    if (page !== 1) sp.set("page", String(page));
    const qs = sp.toString();
    const newUrl = `${basePath}${qs ? `?${qs}` : ""}`;
    if (window.location.pathname + window.location.search !== newUrl) {
      window.history.replaceState(null, "", newUrl);
    }
  }, [filters, page, basePath, defaults, paramName]);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ ...defaults });
    setPage(1);
  }, [defaults]);

  // Count active filters
  const activeCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      return value !== defaults[key] && value !== "" && value !== "all";
    }).length;
  }, [filters, defaults]);

  // Build query string for API calls
  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value && value !== "all" && value !== defaults[key]) {
        sp.set(paramName(key), value);
      }
      // Include keys that have explicit non-default values even if they equal a non-"all" default
      else if (value && value !== "all" && value === defaults[key] && defaults[key] !== "" && defaults[key] !== "all") {
        sp.set(paramName(key), value);
      }
    }
    sp.set("page", String(page));
    return sp.toString();
  }, [filters, page, defaults, paramName]);

  return {
    filters,
    setFilter,
    resetFilters,
    page,
    setPage,
    activeCount,
    queryString,
  };
}
