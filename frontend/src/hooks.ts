import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api";

export function useGet<T>(key: any[], path: string, enabled = true) {
  return useQuery<T>({ queryKey: key, queryFn: () => api.get<T>(path), enabled });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (keys: any[][]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
}

export { useMutation, useQueryClient, api };
