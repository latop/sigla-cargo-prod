import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery } from "@tanstack/react-query";
import { Truck, MapPin, RefreshCw, Loader2, ArrowDownToLine, ArrowUpFromLine, Check, ChevronsUpDown, Maximize, Minimize } from "lucide-react";
import { API_BASE } from "@/config/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// --- Types ---
interface FlightBoardItem {
  seq: number;
  timePlanned: string | null;
  locCode: string | null;
  sto: string | null;
  dt: string | null;
  statusTrip: string | null;
  timeEstimated: string | null;
  truckFleetCode: string | null;
  nickName: string | null;
  licensePlate: string | null;
  direction: string;
}

interface LocationOption {
  code: string;
  name: string;
  label: string;
}

// --- Helpers ---
const parseCustomDate = (v?: string | null): Date | null => {
  if (!v) return null;
  const parts = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{1,2})$/);
  if (parts) {
    const [, day, month, year, hour, min] = parts;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min));
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const formatTime = (v?: string | null): string => {
  const d = parseCustomDate(v);
  if (!d) return "--:--";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const formatDate = (v?: string | null): string => {
  const d = parseCustomDate(v);
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

type RowStatus = "arrived" | "departed" | "delayed" | "attention" | "scheduled";

const getRowStatus = (item: FlightBoardItem, direction: string): RowStatus => {
  const status = (item.statusTrip || "").trim().toUpperCase();
  const now = new Date();
  const planned = parseCustomDate(item.timePlanned);

  if (status === "DONE" || status === "COMPLETED" || status === "ARRIVED" || status === "FINISHED") {
    return direction === "ARR" ? "arrived" : "departed";
  }
  if (status === "DELAYED" || status === "ATRASO" || status === "ATRASADO") {
    return "delayed";
  }
  if (status === "IN_TRANSIT" || status === "EM_TRANSITO" || status === "TRANSIT") {
    return "attention";
  }

  if (!planned) return "scheduled";
  const diffMs = planned.getTime() - now.getTime();
  const diffMin = diffMs / 60000;

  if (diffMin < -15) return "delayed";
  if (diffMin < 0) return direction === "ARR" ? "arrived" : "departed";
  if (diffMin <= 60) return "attention";
  return "scheduled";
};

const statusColors: Record<RowStatus, string> = {
  delayed: "bg-destructive text-destructive-foreground",
  attention: "bg-yellow-500 text-black dark:bg-yellow-500 dark:text-black",
  departed: "bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white",
  arrived: "bg-muted-foreground/60 text-white dark:bg-muted-foreground/60 dark:text-white",
  scheduled: "bg-[hsl(var(--board-status-scheduled-bg))] text-[hsl(var(--board-status-scheduled-text))]",
};

const statusLabel: Record<RowStatus, string> = {
  delayed: "ATRASADO",
  attention: "ATENÇÃO",
  departed: "SAIU",
  arrived: "CHEGOU",
  scheduled: "PROGRAMADO",
};

// --- API ---
const fetchLocations = async (): Promise<LocationOption[]> => {
  const res = await fetch(`${API_BASE}/Location/GetLocationRelease?PageSize=200`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const items: Record<string, unknown>[] = await res.json();
  return items.map((item) => ({
    code: String(item.code || ""),
    name: String(item.codeIntegration2 || ""),
    label: `${item.code || ""} - ${item.codeIntegration2 || ""}`,
  }));
};

const fetchBoard = async (locationCode: string, direction: string): Promise<FlightBoardItem[]> => {
  if (!locationCode) return [];
  const params = new URLSearchParams();
  params.append("locationCode", locationCode);
  params.append("direction", direction);
  const res = await fetch(`${API_BASE}/gantt/GetArrivalDeparture?${params.toString()}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

// --- Component ---
const ArrivalDeparturePage = () => {
  const { t } = useTranslation();
  usePageTitle(t("menu.departuresAndArrivals"), Truck);

  const [locationCode, setLocationCode] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [locOpen, setLocOpen] = useState(false);
  const [locSearch, setLocSearch] = useState("");

  const { data: locations = [], isLoading: locationsLoading } = useQuery<LocationOption[]>({
    queryKey: ["location-release-options"],
    queryFn: fetchLocations,
    staleTime: 5 * 60 * 1000,
  });

  const filteredLocations = locSearch
    ? locations.filter((l) => l.label.toUpperCase().includes(locSearch.toUpperCase()))
    : locations;

  const { data: arrivals = [], isLoading: loadingArr, refetch: refetchArr } = useQuery<FlightBoardItem[]>({
    queryKey: ["arrival-board", locationCode],
    queryFn: () => fetchBoard(locationCode, "ARR"),
    enabled: !!locationCode,
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: departures = [], isLoading: loadingDep, refetch: refetchDep } = useQuery<FlightBoardItem[]>({
    queryKey: ["departure-board", locationCode],
    queryFn: () => fetchBoard(locationCode, "DEP"),
    enabled: !!locationCode,
    refetchInterval: 5 * 60 * 1000,
  });

  const handleRefresh = () => {
    refetchArr();
    refetchDep();
  };

  const [expanded, setExpanded] = useState(false);
  const isLoading = loadingArr || loadingDep;

  return (
    <div className={cn(
      "flex flex-col bg-board text-board-text overflow-hidden",
      expanded ? "fixed inset-0 z-50" : "h-full"
    )}>
      {/* Header bar */}
      <div className="flex items-center gap-4 px-4 py-3 bg-board-header border-b border-board-border">
        <MapPin className="h-5 w-5 text-primary shrink-0" />
        <Popover open={locOpen} onOpenChange={setLocOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 h-8 px-3 rounded border border-board-border bg-board-surface text-sm text-board-text hover:bg-board-surface-alt transition-colors min-w-[240px] max-w-[320px]">
              <span className="truncate flex-1 text-left">
                {locationLabel || "Selecione a localidade..."}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-board-text-muted shrink-0" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0 bg-board-surface border-board-border" align="start">
            <div className="p-2 border-b border-board-border">
              <Input
                className="h-7 text-xs bg-board-surface-alt border-board-border text-board-text placeholder:text-board-text-muted"
                placeholder="Buscar localidade..."
                value={locSearch}
                onChange={(e) => setLocSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-52 overflow-y-auto">
              {locationsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-board-text-muted" />
                </div>
              ) : filteredLocations.length === 0 ? (
                <div className="py-4 text-center text-board-text-muted text-xs">Nenhuma localidade encontrada</div>
              ) : (
                filteredLocations.map((loc) => (
                  <button
                    key={loc.code}
                    className={cn(
                      "relative flex w-full items-center py-2 pl-8 pr-3 text-xs hover:bg-board-surface-alt text-board-text transition-colors",
                      locationCode === loc.code && "bg-board-surface-alt text-primary"
                    )}
                    onClick={() => {
                      setLocationCode(loc.code);
                      setLocationLabel(loc.label);
                      setLocOpen(false);
                      setLocSearch("");
                    }}
                  >
                    <span className={cn(
                      "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
                      locationCode !== loc.code && "invisible"
                    )}>
                      <Check className="h-3 w-3" />
                    </span>
                    {loc.label}
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {locationLabel && (
          <span className="text-lg font-bold tracking-wider text-primary font-mono uppercase hidden md:block">
            {locationLabel}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          <button
            onClick={handleRefresh}
            disabled={!locationCode}
            className="p-2 rounded hover:bg-board-surface-alt disabled:opacity-30 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-2 rounded hover:bg-board-surface-alt transition-colors"
            title={expanded ? "Restaurar" : "Expandir"}
          >
            {expanded ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
          <span className="text-xs text-board-text-muted font-mono hidden sm:block">
            Auto-refresh 5min
          </span>
        </div>
      </div>

      {/* Board panels */}
      {!locationCode ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <MapPin className="h-12 w-12 text-board-text-muted mx-auto" />
            <p className="text-board-text-muted text-sm">Selecione uma localidade para visualizar as chegadas e partidas.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
          <BoardPanel
            title="CHEGADAS"
            icon={<ArrowDownToLine className="h-5 w-5" />}
            items={arrivals}
            loading={loadingArr}
            direction="ARR"
            accentColor="text-sky-500 dark:text-sky-400"
            headerBg="bg-sky-500/10 dark:bg-sky-900/30"
          />
          <BoardPanel
            title="PARTIDAS"
            icon={<ArrowUpFromLine className="h-5 w-5" />}
            items={departures}
            loading={loadingDep}
            direction="DEP"
            accentColor="text-amber-600 dark:text-amber-400"
            headerBg="bg-amber-500/10 dark:bg-amber-900/30"
          />
        </div>
      )}
    </div>
  );
};

// --- Board Panel Sub-component ---
interface BoardPanelProps {
  title: string;
  icon: React.ReactNode;
  items: FlightBoardItem[];
  loading: boolean;
  direction: string;
  accentColor: string;
  headerBg: string;
}

const BoardPanel = ({ title, icon, items, loading, direction, accentColor, headerBg }: BoardPanelProps) => {
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const da = parseCustomDate(a.timePlanned);
      const db = parseCustomDate(b.timePlanned);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da.getTime() - db.getTime();
    });
  }, [items]);

  return (
    <div className={cn("flex flex-col border-r border-board-border last:border-r-0 overflow-hidden", direction === "DEP" && "border-l border-board-border")}>
      {/* Panel header */}
      <div className={cn("flex items-center gap-2 px-4 py-2 border-b border-board-border", headerBg)}>
        <span className={accentColor}>{icon}</span>
        <span className={cn("text-sm font-bold tracking-[0.2em] uppercase", accentColor)}>{title}</span>
        <span className="text-xs text-board-text-muted ml-auto font-mono">{items.length} viagens</span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[55px_45px_1fr_75px_60px_1fr_72px] gap-0 px-2 py-1.5 bg-board-header border-b border-board-border text-[10px] font-bold tracking-wider text-board-text-muted uppercase">
        <span>Hora</span>
        <span>Data</span>
        <span>{direction === "ARR" ? "Origem" : "Destino"}</span>
        <span>Placa</span>
        <span>Frota</span>
        <span>Motorista</span>
        <span className="text-center">Status</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-board-text-muted" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-board-text-muted text-sm">
            Nenhum registro encontrado
          </div>
        ) : (
          sorted.map((item, idx) => {
            const status = getRowStatus(item, direction);
            return (
              <div
                key={`${item.seq}-${idx}`}
                className={cn(
                  "grid grid-cols-[55px_45px_1fr_75px_60px_1fr_72px] gap-0 px-2 py-1.5 border-b border-board-border/50 font-mono text-xs transition-colors",
                  idx % 2 === 0 ? "bg-board" : "bg-board-surface-alt",
                  status === "delayed" && "!bg-red-50 dark:!bg-red-950/40",
                  status === "attention" && "!bg-yellow-50 dark:!bg-yellow-950/30",
                )}
              >
                <span className={cn(
                  "font-bold text-sm tabular-nums",
                  status === "delayed" ? "text-destructive" :
                  status === "attention" ? "text-yellow-600 dark:text-yellow-300" :
                  "text-board-text"
                )}>
                  {formatTime(item.timePlanned)}
                </span>
                <span className="text-board-text-muted tabular-nums self-center">
                  {formatDate(item.timePlanned)}
                </span>
                <span className="text-board-text-secondary truncate self-center" title={item.locCode || ""}>
                  {item.locCode || "--"}
                </span>
                <span className="text-board-text tabular-nums self-center font-semibold">
                  {item.licensePlate || "--"}
                </span>
                <span className="text-board-text-muted tabular-nums self-center text-[10px]">
                  {item.truckFleetCode || "--"}
                </span>
                <span className="text-board-text-secondary truncate self-center" title={item.nickName || ""}>
                  {item.nickName || "--"}
                </span>
                <span className="flex items-center justify-center">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider leading-none",
                    statusColors[status],
                  )}>
                    {statusLabel[status]}
                  </span>
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ArrivalDeparturePage;
