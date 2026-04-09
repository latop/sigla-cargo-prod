export type OnTimeCategory = "on-time" | "early" | "late" | "cancelled" | "unknown";

export interface OnTimeStatus {
  category: OnTimeCategory;
  label: string;
  diffMin: number | null;
  badgeClass: string;
}

const THRESHOLD_MIN = 15;

/**
 * Classify a trip's punctuality based on planned vs actual times.
 * @param plannedISO  - planned datetime ISO string
 * @param actualISO   - actual datetime ISO string (null if not yet occurred)
 * @param isDeparture - true for departure check
 */
export function getOnTimeStatus(
  plannedISO: string | null,
  actualISO: string | null,
  isDeparture: boolean,
): OnTimeStatus {
  if (!plannedISO) return { category: "unknown", label: "--", diffMin: null, badgeClass: "bg-muted text-muted-foreground" };

  const planned = new Date(plannedISO).getTime();
  if (isNaN(planned)) return { category: "unknown", label: "--", diffMin: null, badgeClass: "bg-muted text-muted-foreground" };

  if (!actualISO) {
    return { category: "unknown", label: "--", diffMin: null, badgeClass: "bg-muted text-muted-foreground" };
  }

  const actual = new Date(actualISO).getTime();
  if (isNaN(actual)) return { category: "unknown", label: "--", diffMin: null, badgeClass: "bg-muted text-muted-foreground" };

  const diffMin = Math.round((actual - planned) / 60000);

  if (diffMin > THRESHOLD_MIN) {
    return { category: "late", label: `Atrasado +${diffMin}min`, diffMin, badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30" };
  }
  if (diffMin < -THRESHOLD_MIN) {
    return { category: "early", label: `Adiantado ${diffMin}min`, diffMin, badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" };
  }
  return { category: "on-time", label: "No horário", diffMin, badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" };
}

export interface OnTimeSummary {
  onTime: number;
  early: number;
  late: number;
  cancelled: number;
  total: number;
}

export function computeOnTimeSummary(
  trips: { startPlanned: string | null; endPlanned: string | null; startActual: string | null; endActual: string | null; statusTrip?: string | null }[],
  isDeparture: boolean,
): OnTimeSummary {
  const summary: OnTimeSummary = { onTime: 0, early: 0, late: 0, cancelled: 0, total: 0 };
  for (const trip of trips) {
    // Check cancelled first
    const st = (trip.statusTrip ?? "").toLowerCase();
    if (st.includes("cancel")) {
      summary.cancelled++;
      continue;
    }

    const planned = isDeparture ? trip.startPlanned : trip.endPlanned;
    const actual = isDeparture ? trip.startActual : trip.endActual;
    const status = getOnTimeStatus(planned, actual, isDeparture);
    if (status.category === "unknown") continue;
    summary.total++;
    if (status.category === "on-time") summary.onTime++;
    else if (status.category === "early") summary.early++;
    else if (status.category === "late") summary.late++;
  }
  return summary;
}
