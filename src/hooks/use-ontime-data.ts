import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth-fetch";
import { computeOnTimeSummary, type OnTimeSummary } from "@/lib/ontime-utils";

export interface OnTimeTripRecord {
  startPlanned: string | null;
  endPlanned: string | null;
  startActual: string | null;
  endActual: string | null;
  statusTrip: string | null;
}

interface UseOnTimeDataOptions {
  /** Unique prefix for the query key (e.g. "dashboard", "coordination") */
  keyPrefix: string;
  startDate: string;
  endDate: string;
  locationGroupCode?: string;
  enabled?: boolean;
  /** Auto-refresh interval in ms (default: 120000 = 2min) */
  refetchInterval?: number | false;
}

/**
 * Fetches all trips from the Gantt API and computes OnTime summaries.
 * Shared between Dashboard and Coordination pages.
 */
export function useOnTimeData({
  keyPrefix,
  startDate,
  endDate,
  locationGroupCode,
  enabled = true,
  refetchInterval = 120 * 1000,
}: UseOnTimeDataOptions) {
  const { data: trips } = useQuery<OnTimeTripRecord[]>({
    queryKey: [`${keyPrefix}-ontime-trips`, startDate, endDate, locationGroupCode],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("startDate", startDate.substring(0, 10));
      params.set("endDate", endDate.substring(0, 10));
      params.set("pageNumber", "1");
      params.set("pageSize", "500");
      if (locationGroupCode) params.set("locationGroupCode", locationGroupCode);

      const res = await authFetch(`/gantt/GetDailyTripsByPeriodGantt?${params.toString()}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();

      // Extract trips from root or nested inside trucks
      let allTrips: Record<string, unknown>[] = [];
      const rootTrips = data.trips || data.Trips;
      if (Array.isArray(rootTrips)) {
        allTrips = rootTrips;
      }
      if (allTrips.length === 0) {
        const trucks = data.trucks || data.Trucks;
        if (Array.isArray(trucks)) {
          for (const truck of trucks) {
            const nested = truck?.trips || truck?.Trips;
            if (Array.isArray(nested)) allTrips.push(...nested);
          }
        }
      }

      return allTrips.map((t) => ({
        startPlanned: (t.startPlanned ?? t.StartPlanned ?? null) as string | null,
        endPlanned:   (t.endPlanned   ?? t.EndPlanned   ?? null) as string | null,
        startActual:  (t.startActual  ?? t.StartActual  ?? null) as string | null,
        endActual:    (t.endActual    ?? t.EndActual    ?? null) as string | null,
        statusTrip:   (t.statusTrip   ?? t.StatusTrip   ?? null) as string | null,
      }));
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    refetchInterval: enabled ? refetchInterval : false,
    retry: 1,
  });

  const departureSummary: OnTimeSummary = useMemo(
    () => computeOnTimeSummary(trips ?? [], true),
    [trips],
  );
  const deliverySummary: OnTimeSummary = useMemo(
    () => computeOnTimeSummary(trips ?? [], false),
    [trips],
  );

  return { trips: trips ?? [], departureSummary, deliverySummary };
}
