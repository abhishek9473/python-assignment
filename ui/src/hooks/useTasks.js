import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../lib/api";

export default function useTasks(filters, page) {
  const [state, setState] = useState({
    tasks: [],
    count: 0,
    loading: true,
    error: "",
  });
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const params = { page };
      const activeFilters = JSON.parse(filterKey);
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const { data } = await api.get("/tasks/", { params });
      setState({
        tasks: data.results ?? data,
        count: data.count ?? data.length,
        loading: false,
        error: "",
      });
    } catch {
      setState((current) => ({
        ...current,
        loading: false,
        error: "Tasks could not be loaded. Confirm that the API is running.",
      }));
    }
  }, [filterKey, page]);

  useEffect(() => {
    load();
  }, [load]);
  return { ...state, refresh: load };
}
