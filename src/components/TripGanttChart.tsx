import React, { useMemo, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export interface TripRow {
  dailyTripId: string;
  demand: string | null;
  licensePlate: string | null;
  startPlanned: string | null;
  endPlanned: string | null;
  startEstimated: string | null;
  endEstimated: string | null;
  startActual: string | null;
  endActual: string | null;
  startStop: string | null;
  endStop: string | null;
  locationOrigCode: string | null;
  locationDestCode: string | null;
  stopType: string | null;
  driverName: string | null;
  statusTrip: string | null;
  colorRGBPlanned: string | null;
  colorRGBActual: string | null;
  colorRGBStop: string | null;
  distancePlanned: number | null;
  distanceActual: number | null;
  distanceProgress: number | null;
}

export interface TruckRow {
  truckId: string;
  licensePlate: string;
  fleetCode: string;
  fleetGroupCode: string;
}

interface TripGanttChartProps {
  trucks: TruckRow[];
  trips: TripRow[];
  expanded?: boolean;
  onToggleExpand?: () => void;
  onTripDoubleClick?: (trip: TripRow) => void;
}

type ZoomLevel = "12h" | "1d" | "2d" | "3d" | "7d" | "15d";

const ZOOM_OPTIONS: { key: ZoomLevel; label: string; hours: number }[] = [
  { key: "12h", label: "12h", hours: 12 },
  { key: "1d", label: "1 dia", hours: 24 },
  { key: "2d", label: "2 dias", hours: 48 },
  { key: "3d", label: "3 dias", hours: 72 },
  { key: "7d", label: "7 dias", hours: 168 },
  { key: "15d", label: "15 dias", hours: 360 },
];

const ROW_HEIGHT = 40;

const dateToAbsMin = (iso: string): number => Math.floor(new Date(iso).getTime() / 60000);

const formatDateShort = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const TripGanttChart: React.FC<TripGanttChartProps> = ({
  trucks,
  trips,
  expanded,
  onToggleExpand,
  onTripDoubleClick,
}) => {
  const [zoom, setZoom] = useState<ZoomLevel>("1d");
  const [now, setNow] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const refStartMin = useMemo(() => {
    if (trips.length === 0) return Math.floor(new Date().setHours(0, 0, 0, 0) / 60000);
    let earliest = Infinity;
    for (const trip of trips) {
      if (trip.startPlanned) {
        const m = dateToAbsMin(trip.startPlanned);
        if (m < earliest) earliest = m;
      }
    }
    if (earliest === Infinity) return Math.floor(new Date().setHours(0, 0, 0, 0) / 60000);
    const d = new Date(earliest * 60000);
    d.setHours(0, 0, 0, 0);
    return Math.floor(d.getTime() / 60000);
  }, [trips]);

  const [windowStartOffset, setWindowStartOffset] = useState(0);
  useEffect(() => { setWindowStartOffset(0); }, [refStartMin]);

  const zoomConfig = ZOOM_OPTIONS.find((z) => z.key === zoom)!;
  const totalMinutes = zoomConfig.hours * 60;
  const windowStart = refStartMin + windowStartOffset;
  const windowEnd = windowStart + totalMinutes;

  const pctLeft = (absMin: number) => ((absMin - windowStart) / totalMinutes) * 100;
  const pctWidth = (start: number, end: number) => ((end - start) / totalMinutes) * 100;

  const hourLabels = useMemo(() => {
    const labels: { hour: number; dateLabel?: string }[] = [];
    let step = 1;
    if (zoomConfig.hours >= 168) step = 12;
    else if (zoomConfig.hours >= 72) step = 6;
    else if (zoomConfig.hours >= 48) step = 3;
    else if (zoomConfig.hours >= 24) step = 2;

    for (let m = windowStart; m < windowEnd; m += step * 60) {
      const date = new Date(m * 60000);
      const h = date.getHours();
      const dayStr = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
      labels.push({ hour: h, dateLabel: h === 0 || m === windowStart ? dayStr : undefined });
    }
    return labels;
  }, [windowStart, windowEnd, zoomConfig.hours]);

  // Group trips by truck via licensePlate
  const truckTripsMap = useMemo(() => {
    const map = new Map<string, TripRow[]>();
    for (const trip of trips) {
      if (!trip.licensePlate) continue;
      const truck = trucks.find((t) => t.licensePlate === trip.licensePlate);
      if (!truck) continue;
      if (!map.has(truck.truckId)) map.set(truck.truckId, []);
      map.get(truck.truckId)!.push(trip);
    }
    return map;
  }, [trucks, trips]);

  const nowAbsMin = Math.floor(now.getTime() / 60000);
  const showNow = nowAbsMin >= windowStart && nowAbsMin <= windowEnd;
  const nowPct = pctLeft(nowAbsMin);

  const maxEndMin = useMemo(() => {
    if (trips.length === 0) return refStartMin + 24 * 60;
    let latest = 0;
    for (const trip of trips) {
      for (const field of [trip.endPlanned, trip.endActual, trip.endStop]) {
        if (field) {
          const m = dateToAbsMin(field);
          if (m > latest) latest = m;
        }
      }
    }
    return latest;
  }, [trips, refStartMin]);

  const canPrev = windowStartOffset > 0;
  const canNext = windowEnd < maxEndMin + 60;
  const handlePrev = () => setWindowStartOffset(Math.max(0, windowStartOffset - totalMinutes));
  const handleNext = () => setWindowStartOffset(windowStartOffset + totalMinutes);

  const windowStartDate = new Date(windowStart * 60000);
  const windowEndDate = new Date(windowEnd * 60000);
  const windowLabel = `${String(windowStartDate.getDate()).padStart(2, "0")}/${String(windowStartDate.getMonth() + 1).padStart(2, "0")} ${String(windowStartDate.getHours()).padStart(2, "0")}:00 — ${String(windowEndDate.getDate()).padStart(2, "0")}/${String(windowEndDate.getMonth() + 1).padStart(2, "0")} ${String(windowEndDate.getHours()).padStart(2, "0")}:00`;

  const renderBar = (
    trip: TripRow,
    startISO: string | null,
    endISO: string | null,
    color: string | null,
    yOffset: number,
    barHeight: number,
    label: string,
    isClickable: boolean,
    wrapperStartMin?: number,
    wrapperSpanMin?: number,
  ) => {
    if (!startISO || !endISO) return null;
    const startMin = dateToAbsMin(startISO);
    const endMin = dateToAbsMin(endISO);
    if (endMin < windowStart || startMin > windowEnd) return null;

    const clampedStart = Math.max(startMin, windowStart);
    const clampedEnd = Math.min(endMin, windowEnd);

    const refStart = wrapperStartMin ?? windowStart;
    const refSpan = wrapperSpanMin ?? totalMinutes;
    const left = ((clampedStart - refStart) / refSpan) * 100;
    const width = ((clampedEnd - clampedStart) / refSpan) * 100;

    return (
      <div
        key={`${trip.dailyTripId}-${yOffset}`}
        onDoubleClick={() => isClickable && onTripDoubleClick?.(trip)}
        className="absolute rounded-[2px] flex items-center justify-center text-white cursor-pointer border-l-2 shadow-sm transition-transform hover:brightness-125 hover:z-10 overflow-hidden"
        style={{
          left: `${left}%`,
          width: `${Math.max(width, 0.4)}%`,
          top: `${yOffset}px`,
          height: `${barHeight}px`,
          backgroundColor: color || "#666",
          borderColor: color || "#666",
        }}
      >
        {width > 4 && (
          <span className="truncate px-1 drop-shadow-sm text-[9px] font-semibold">
            {label}
          </span>
        )}
      </div>
    );
  };

  const renderTripBars = (trip: TripRow) => {
    const demandLabel = trip.demand || "";
    const stopLabel = trip.stopType || trip.demand || "";

    // Calculate planned bar bounds for tooltip anchor
    const plannedStart = trip.startPlanned ? dateToAbsMin(trip.startPlanned) : null;
    const plannedEnd = trip.endPlanned ? dateToAbsMin(trip.endPlanned) : null;
    const actualStart = (trip.startActual || trip.startEstimated) ? dateToAbsMin((trip.startActual || trip.startEstimated)!) : null;
    const actualEnd = (trip.endActual || trip.endEstimated) ? dateToAbsMin((trip.endActual || trip.endEstimated)!) : null;
    const stopStart = trip.startStop ? dateToAbsMin(trip.startStop) : null;
    const stopEnd = trip.endStop ? dateToAbsMin(trip.endStop) : null;

    // Find the overall left/right extent for the tooltip wrapper
    const allStarts = [plannedStart, actualStart, stopStart].filter((v): v is number => v !== null);
    const allEnds = [plannedEnd, actualEnd, stopEnd].filter((v): v is number => v !== null);
    if (allStarts.length === 0) return null;

    const minStart = Math.max(Math.min(...allStarts), windowStart);
    const maxEnd = Math.min(Math.max(...allEnds), windowEnd);
    if (maxEnd < windowStart || minStart > windowEnd) return null;

    const wrapLeft = pctLeft(minStart);
    const wrapWidth = pctWidth(minStart, maxEnd);
    const wrapSpan = maxEnd - minStart;

    return (
      <Tooltip key={trip.dailyTripId}>
        <TooltipTrigger asChild>
          <div
            className="absolute"
            style={{
              left: `${wrapLeft}%`,
              width: `${Math.max(wrapWidth, 0.4)}%`,
              top: 0,
              height: `${ROW_HEIGHT}px`,
            }}
          >
            {renderBar(trip, trip.startPlanned, trip.endPlanned, trip.colorRGBPlanned, 1, 18, demandLabel, true, minStart, wrapSpan)}
            {renderBar(trip, trip.startStop, trip.endStop, trip.colorRGBStop, 5, 10, stopLabel, false, minStart, wrapSpan)}
            {renderBar(trip, trip.startActual || trip.startEstimated, trip.endActual || trip.endEstimated, trip.colorRGBActual, 21, 18, demandLabel, false, minStart, wrapSpan)}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs space-y-1 max-w-[280px]">
          {trip.demand && <p className="font-semibold">{trip.demand}</p>}
          {trip.locationOrigCode && (
            <p>{trip.locationOrigCode} → {trip.locationDestCode}</p>
          )}
          {trip.startPlanned && trip.endPlanned && (
            <p className="text-muted-foreground text-[10px]">
              Plan: {formatDateShort(trip.startPlanned)} — {formatDateShort(trip.endPlanned)}
            </p>
          )}
          {(trip.startActual || trip.endActual) && (
            <p className="text-muted-foreground text-[10px]">
              Exec: {trip.startActual ? formatDateShort(trip.startActual) : "—"} — {trip.endActual ? formatDateShort(trip.endActual) : "—"}
            </p>
          )}
          {(trip.startEstimated || trip.endEstimated) && (
            <p className="text-muted-foreground text-[10px]">
              Est: [{trip.startEstimated ? formatDateShort(trip.startEstimated) : "—"} — {trip.endEstimated ? formatDateShort(trip.endEstimated) : "—"}]
            </p>
          )}
          {trip.stopType && (
            <p className="text-muted-foreground text-[10px]">Parada: {trip.stopType}</p>
          )}
          {trip.statusTrip && (
            <p className="text-muted-foreground text-[10px]">Status: {trip.statusTrip}</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div ref={containerRef}>
        {/* Zoom controls */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/20 flex-wrap">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mr-1">Zoom:</span>
          {ZOOM_OPTIONS.map((opt) => (
            <Button key={opt.key} size="sm" variant={zoom === opt.key ? "default" : "outline"} className="h-6 text-[10px] px-2" onClick={() => setZoom(opt.key)}>
              {opt.label}
            </Button>
          ))}
          <div className="ml-2 flex items-center gap-1">
            <Button size="sm" variant="outline" className="h-6 w-6 p-0" disabled={!canPrev} onClick={handlePrev}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{windowLabel}</span>
            <Button size="sm" variant="outline" className="h-6 w-6 p-0" disabled={!canNext} onClick={handleNext}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[9px] text-muted-foreground">
              {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {onToggleExpand && (
              <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={onToggleExpand} title={expanded ? "Recolher" : "Expandir"}>
                {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Header */}
            <div className="flex border-b border-border bg-muted/30">
              <div className="w-[160px] shrink-0 px-3 py-2 text-xs font-semibold text-foreground">Veículo</div>
              <div className="flex-1 flex">
                {hourLabels.map((lbl, i) => (
                  <div key={i} className="flex-1 text-center text-[10px] font-medium text-muted-foreground border-l border-border/50 py-2">
                    {lbl.dateLabel && <div className="text-[8px] font-bold text-foreground/70">{lbl.dateLabel}</div>}
                    {String(lbl.hour).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            {trucks.map((truck, idx) => {
              const truckTrips = truckTripsMap.get(truck.truckId) || [];
              return (
                <div key={truck.truckId} className={cn("flex border-b border-border/50 transition-colors", idx % 2 === 0 ? "bg-background" : "bg-muted/10")}>
                  <div className="w-[160px] shrink-0 px-3 py-2.5 flex flex-col justify-center">
                    <span className="text-xs font-semibold text-foreground font-mono">
                      {truck.licensePlate} <span className="text-muted-foreground font-normal">{truck.fleetCode}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">{truck.fleetGroupCode}</span>
                  </div>
                  <div className="flex-1 relative" style={{ height: `${ROW_HEIGHT}px` }}>
                    {hourLabels.map((_, i) => (
                      <div key={i} className="absolute top-0 bottom-0 border-l border-border/20" style={{ left: `${(i / hourLabels.length) * 100}%` }} />
                    ))}
                    {showNow && <div className="absolute top-0 bottom-0 w-px bg-destructive/70 z-10" style={{ left: `${nowPct}%` }} />}
                    <div className="absolute left-0 top-0 h-[20px] flex items-center pointer-events-none">
                      <span className="text-[7px] text-muted-foreground/50 uppercase tracking-wider pl-1">Plan.</span>
                    </div>
                    <div className="absolute left-0 top-[20px] h-[19px] flex items-center pointer-events-none">
                      <span className="text-[7px] text-muted-foreground/50 uppercase tracking-wider pl-1">Exec.</span>
                    </div>
                    <div className="absolute left-0 right-0 top-[20px] border-t border-border/10" />

                    {truckTrips.map((trip) => renderTripBars(trip))}
                  </div>
                </div>
              );
            })}

            {trucks.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhum veículo com viagens no período.</div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TripGanttChart;
