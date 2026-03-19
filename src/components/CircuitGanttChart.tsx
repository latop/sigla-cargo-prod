import React, { useMemo, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DriverRow {
  id: string;
  nickName: string;
  integrationCode: string;
  driverBases: { locationGroup?: { code?: string } }[];
  driverAttributions: { attribution?: { code?: string } }[];
  driverFleets: { fleetGroup?: { code?: string } }[];
  [k: string]: unknown;
}

interface CircuitDriver {
  id: string;
  circuitId?: string;
  circuitJourneyId?: string;
  driverId: string;
  circuitCode: string;
  startDate: string | null;
  endDate: string | null;
  status: number | string | null;
  [k: string]: unknown;
}

interface CircuitGanttChartProps {
  drivers: DriverRow[];
  circuitDrivers: CircuitDriver[];
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

const ROW_HEIGHT = 48;
const dateToAbsMin = (iso: string): number => Math.floor(new Date(iso).getTime() / 60000);

const formatDTShort = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const STATUS_COLORS: Record<number, string> = {
  0: "hsl(210, 60%, 55%)",  // Previsto - blue
  1: "hsl(40, 90%, 50%)",   // Em andamento - amber
  2: "hsl(140, 55%, 45%)",  // Realizado - green
};

const STATUS_LABELS: Record<number, string> = {
  0: "Previsto",
  1: "Em andamento",
  2: "Realizado",
};

const CircuitGanttChart: React.FC<CircuitGanttChartProps> = ({ drivers, circuitDrivers }) => {
  const [zoom, setZoom] = useState<ZoomLevel>("1d");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const refStartMin = useMemo(() => {
    if (circuitDrivers.length === 0) return Math.floor(new Date().setHours(0, 0, 0, 0) / 60000);
    let earliest = Infinity;
    for (const c of circuitDrivers) {
      if (c.startDate) {
        const m = dateToAbsMin(c.startDate);
        if (m < earliest) earliest = m;
      }
    }
    if (earliest === Infinity) return Math.floor(new Date().setHours(0, 0, 0, 0) / 60000);
    const d = new Date(earliest * 60000);
    d.setHours(0, 0, 0, 0);
    return Math.floor(d.getTime() / 60000);
  }, [circuitDrivers]);

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

  const driverCircuitsMap = useMemo(() => {
    const map = new Map<string, CircuitDriver[]>();
    for (const cd of circuitDrivers) {
      if (!map.has(cd.driverId)) map.set(cd.driverId, []);
      map.get(cd.driverId)!.push(cd);
    }
    return map;
  }, [circuitDrivers]);

  const nowAbsMin = Math.floor(now.getTime() / 60000);
  const showNow = nowAbsMin >= windowStart && nowAbsMin <= windowEnd;
  const nowPct = pctLeft(nowAbsMin);

  const maxEndMin = useMemo(() => {
    if (circuitDrivers.length === 0) return refStartMin + 24 * 60;
    let latest = 0;
    for (const c of circuitDrivers) {
      if (c.endDate) {
        const m = dateToAbsMin(c.endDate);
        if (m > latest) latest = m;
      }
    }
    return latest;
  }, [circuitDrivers, refStartMin]);

  const canPrev = windowStartOffset > 0;
  const canNext = windowEnd < maxEndMin + 60;
  const handlePrev = () => setWindowStartOffset(Math.max(0, windowStartOffset - totalMinutes));
  const handleNext = () => setWindowStartOffset(windowStartOffset + totalMinutes);

  const windowStartDate = new Date(windowStart * 60000);
  const windowEndDate = new Date(windowEnd * 60000);
  const windowLabel = `${String(windowStartDate.getDate()).padStart(2, "0")}/${String(windowStartDate.getMonth() + 1).padStart(2, "0")} ${String(windowStartDate.getHours()).padStart(2, "0")}:00 — ${String(windowEndDate.getDate()).padStart(2, "0")}/${String(windowEndDate.getMonth() + 1).padStart(2, "0")} ${String(windowEndDate.getHours()).padStart(2, "0")}:00`;

  const getBase = (d: DriverRow) => d.driverBases?.[0]?.locationGroup?.code || "";
  const getAttr = (d: DriverRow) => d.driverAttributions?.[0]?.attribution?.code || "";
  const getFleet = (d: DriverRow) => d.driverFleets?.[0]?.fleetGroup?.code || "";

  const renderCircuitBar = (circuit: CircuitDriver, yOffset: number, barHeight: number) => {
    if (!circuit.startDate || !circuit.endDate) return null;
    const startMin = dateToAbsMin(circuit.startDate);
    const endMin = dateToAbsMin(circuit.endDate);
    if (endMin < windowStart || startMin > windowEnd) return null;

    const clampedStart = Math.max(startMin, windowStart);
    const clampedEnd = Math.min(endMin, windowEnd);
    const left = pctLeft(clampedStart);
    const width = pctWidth(clampedStart, clampedEnd);
    const color = STATUS_COLORS[circuit.status ?? 0] || STATUS_COLORS[0];
    const statusLabel = STATUS_LABELS[circuit.status ?? 0] || "Previsto";

    return (
      <Tooltip key={circuit.id}>
        <TooltipTrigger asChild>
          <div
            className="absolute rounded-[2px] flex items-center justify-center text-white cursor-pointer border-l-2 shadow-sm transition-transform hover:brightness-125 hover:z-10 overflow-hidden"
            style={{
              left: `${left}%`,
              width: `${Math.max(width, 0.4)}%`,
              top: `${yOffset}px`,
              height: `${barHeight}px`,
              backgroundColor: color,
              borderColor: color,
            }}
          >
            {width > 4 && (
              <span className="truncate px-1 drop-shadow-sm text-[9px] font-semibold">
                {circuit.circuitCode}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs space-y-1 max-w-[250px]">
          <p className="font-semibold">{circuit.circuitCode}</p>
          <p className="text-muted-foreground text-[10px]">
            {formatDTShort(circuit.startDate)} — {formatDTShort(circuit.endDate)}
          </p>
          <p className="text-muted-foreground text-[10px]">Status: {statusLabel}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div>
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
            {/* Legend */}
            <div className="flex items-center gap-3">
              {Object.entries(STATUS_LABELS).map(([k, label]) => (
                <div key={k} className="flex items-center gap-1">
                  <div className="w-3 h-2 rounded-[1px]" style={{ backgroundColor: STATUS_COLORS[Number(k)] }} />
                  <span className="text-[9px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
            <span className="text-[9px] text-muted-foreground">
              {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Header */}
            <div className="flex border-b border-border bg-muted/30">
              <div className="w-[200px] shrink-0 px-3 py-2 text-xs font-semibold text-foreground">Motorista</div>
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
            {drivers.map((driver, idx) => {
              const circuits = driverCircuitsMap.get(driver.id) || [];
              const planned = circuits.filter((c) => c.status === 0 || c.status === null);
              const executed = circuits.filter((c) => c.status === 1 || c.status === 2);
              const base = getBase(driver);
              const attr = getAttr(driver);
              const fleet = getFleet(driver);
              const details = [base, attr, fleet].filter(Boolean).join(" | ");

              return (
                <div key={driver.id} className={cn("flex border-b border-border/50 transition-colors", idx % 2 === 0 ? "bg-background" : "bg-muted/10")}>
                  <div className="w-[200px] shrink-0 px-3 py-1 flex flex-col justify-center">
                    <span className="text-xs font-semibold text-foreground">{driver.nickName}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{driver.integrationCode}</span>
                    {details && <span className="text-[9px] text-muted-foreground truncate">{details}</span>}
                  </div>
                  <div className="flex-1 relative" style={{ height: `${ROW_HEIGHT}px` }}>
                    {hourLabels.map((_, i) => (
                      <div key={i} className="absolute top-0 bottom-0 border-l border-border/20" style={{ left: `${(i / hourLabels.length) * 100}%` }} />
                    ))}
                    {showNow && <div className="absolute top-0 bottom-0 w-px bg-destructive/70 z-10" style={{ left: `${nowPct}%` }} />}

                    {/* Planned row (top) */}
                    <div className="absolute left-0 top-0 h-[24px] flex items-center pointer-events-none">
                      <span className="text-[7px] text-muted-foreground/50 uppercase tracking-wider pl-1">Plan.</span>
                    </div>
                    {planned.map((c) => renderCircuitBar(c, 3, 18))}

                    <div className="absolute left-0 right-0 top-[24px] border-t border-border/10" />

                    {/* Executed row (bottom) */}
                    <div className="absolute left-0 top-[24px] h-[24px] flex items-center pointer-events-none">
                      <span className="text-[7px] text-muted-foreground/50 uppercase tracking-wider pl-1">Exec.</span>
                    </div>
                    {executed.map((c) => renderCircuitBar(c, 27, 18))}
                  </div>
                </div>
              );
            })}

            {drivers.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhum motorista com circuitos no período.</div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default CircuitGanttChart;
