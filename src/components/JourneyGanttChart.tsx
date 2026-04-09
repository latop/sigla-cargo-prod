import React, { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import type { JourneyRecord } from "@/pages/DriverJourneyPage";

interface JourneyGanttChartProps {
  driverMap: Map<string, { nickName: string; integrationCode: string; journeys: JourneyRecord[] }>;
  filterStartDate?: string;
  filterEndDate?: string;
  footer?: React.ReactNode;
  onJourneyDoubleClick?: (journey: JourneyRecord) => void;
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
const DRIVER_COL_WIDTH = 200;
const dateToAbsMin = (iso: string): number => Math.floor(new Date(iso).getTime() / 60000);

const formatDTShort = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const STATUS_COLORS: Record<string, string> = {
  A: "hsl(142, 55%, 45%)",
  P: "hsl(210, 60%, 55%)",
  E: "hsl(40, 90%, 50%)",
  I: "hsl(var(--muted-foreground))",
};

const STATUS_LABELS: Record<string, string> = {
  A: "Ativo",
  P: "Previsto",
  E: "Executado",
  I: "Inativo",
};

const JourneyGanttChart: React.FC<JourneyGanttChartProps> = ({ driverMap, filterStartDate, filterEndDate, footer, onJourneyDoubleClick }) => {
  const [zoom, setZoom] = useState<ZoomLevel>("1d");
  const [now, setNow] = useState(new Date());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (expanded) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [expanded]);

  const refStartMin = useMemo(() => {
    if (filterStartDate) {
      const d = new Date(filterStartDate);
      d.setHours(0, 0, 0, 0);
      return Math.floor(d.getTime() / 60000);
    }
    return Math.floor(new Date().setHours(0, 0, 0, 0) / 60000);
  }, [filterStartDate]);

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

  const drivers = useMemo(() => Array.from(driverMap.entries()), [driverMap]);

  const nowAbsMin = Math.floor(now.getTime() / 60000);
  const showNow = nowAbsMin >= windowStart && nowAbsMin <= windowEnd;
  const nowPct = pctLeft(nowAbsMin);

  const maxEndMin = useMemo(() => {
    let latest = refStartMin + 24 * 60;
    for (const [, data] of driverMap) {
      for (const j of data.journeys) {
        const end = j.endPlanned || j.endDate || j.endActual;
        if (end) {
          const m = dateToAbsMin(end);
          if (m > latest) latest = m;
        }
      }
    }
    return latest;
  }, [driverMap, refStartMin]);

  const canPrev = windowStartOffset > 0;
  const canNext = windowEnd < maxEndMin + 60;
  const handlePrev = () => setWindowStartOffset(Math.max(0, windowStartOffset - totalMinutes));
  const handleNext = () => setWindowStartOffset(windowStartOffset + totalMinutes);

  const windowStartDate = new Date(windowStart * 60000);
  const windowEndDate = new Date(windowEnd * 60000);
  const windowLabel = `${String(windowStartDate.getDate()).padStart(2, "0")}/${String(windowStartDate.getMonth() + 1).padStart(2, "0")} ${String(windowStartDate.getHours()).padStart(2, "0")}:00 — ${String(windowEndDate.getDate()).padStart(2, "0")}/${String(windowEndDate.getMonth() + 1).padStart(2, "0")} ${String(windowEndDate.getHours()).padStart(2, "0")}:00`;

  const renderBar = (journey: JourneyRecord, barHeight: number, yOffset: number) => {
    const start = journey.startPlanned || journey.startDate || journey.startActual;
    const end = journey.endPlanned || journey.endDate || journey.endActual;
    if (!start || !end) return null;

    const startMin = dateToAbsMin(start);
    const endMin = dateToAbsMin(end);
    if (endMin < windowStart || startMin > windowEnd) return null;

    const clampedStart = Math.max(startMin, windowStart);
    const clampedEnd = Math.min(endMin, windowEnd);
    const left = pctLeft(clampedStart);
    const width = pctWidth(clampedStart, clampedEnd);
    const statusKey = (journey.flgStatus || journey.status || "P") as string;
    const color = STATUS_COLORS[statusKey] || STATUS_COLORS.P;
    const statusLabel = STATUS_LABELS[statusKey] || statusKey;

    return (
      <Tooltip key={journey.id}>
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
            onDoubleClick={() => onJourneyDoubleClick?.(journey)}
          >
            {width > 3 && (
              <span className="truncate px-1 drop-shadow-sm text-[9px] font-semibold">
                {journey.circuitCode || "Jornada"}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs space-y-1 max-w-[300px]">
          <p className="font-semibold">{journey.driverNickName}</p>
          <p className="text-muted-foreground text-[10px]">
            {formatDTShort(start)} — {formatDTShort(end)}
          </p>
          <p className="text-muted-foreground text-[10px]">Status: {statusLabel}</p>
          {journey.circuitCode && <p className="text-muted-foreground text-[10px]">Circuito: {journey.circuitCode}</p>}
        </TooltipContent>
      </Tooltip>
    );
  };

  const content = (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-full">
        {/* Zoom controls */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/20 flex-wrap shrink-0 z-20">
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
            <div className="flex items-center gap-3">
              {Object.entries(STATUS_LABELS).map(([k, label]) => (
                <div key={k} className="flex items-center gap-1">
                  <div className="w-3 h-2 rounded-[1px]" style={{ backgroundColor: STATUS_COLORS[k] }} />
                  <span className="text-[9px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => setExpanded((e) => !e)} title={expanded ? "Reduzir" : "Expandir"}>
              {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Scrollable area */}
        <div className="overflow-auto flex-1 min-h-0">
          <div className="min-w-[900px]">
            {/* Header */}
            <div className="flex border-b border-border bg-muted/30 sticky top-0 z-10">
              <div className="shrink-0 px-3 py-2 text-xs font-semibold text-foreground bg-muted/30" style={{ width: DRIVER_COL_WIDTH }}>
                Motorista
              </div>
              <div className="flex-1 flex bg-muted/30">
                {hourLabels.map((lbl, i) => (
                  <div key={i} className="flex-1 text-center text-[10px] font-medium text-muted-foreground border-l border-border/50 py-2">
                    {lbl.dateLabel && <div className="text-[8px] font-bold text-foreground/70">{lbl.dateLabel}</div>}
                    {String(lbl.hour).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            {drivers.map(([driverId, data], idx) => (
              <div key={driverId} className={cn("flex border-b border-border/50 transition-colors", idx % 2 === 0 ? "bg-background" : "bg-muted/10")}>
                <div className="shrink-0 px-3 py-1 flex flex-col justify-center" style={{ width: DRIVER_COL_WIDTH }}>
                  <span className="text-xs font-semibold text-foreground">{data.nickName}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{data.integrationCode}</span>
                </div>
                <div className="flex-1 relative" style={{ height: `${ROW_HEIGHT}px` }}>
                  {hourLabels.map((_, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-l border-border/20" style={{ left: `${(i / hourLabels.length) * 100}%` }} />
                  ))}
                  {showNow && <div className="absolute top-0 bottom-0 w-px bg-destructive/70 z-10" style={{ left: `${nowPct}%` }} />}
                  {data.journeys.map((j) => renderBar(j, 28, 6))}
                </div>
              </div>
            ))}

            {drivers.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhum motorista com jornadas no período.</div>
            )}
          </div>
        </div>
        {footer}
      </div>
    </TooltipProvider>
  );

  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {content}
      </div>
    );
  }

  return content;
};

export default JourneyGanttChart;
