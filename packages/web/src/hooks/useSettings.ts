"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { settingsApi, type Setting } from "../lib/api";

export function useSettings(projectId: number): UseQueryResult<Setting[], Error> {
  return useQuery({
    queryKey: ["settings", projectId],
    queryFn: async () => {
      const res = await settingsApi.get(projectId);
      if ("error" in res) throw new Error(res.error.message);
      return res.data;
    },
  });
}

