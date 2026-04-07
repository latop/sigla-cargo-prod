import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Loader2, X, Play, CheckCircle2, Clock, AlertTriangle,
  ChevronLeft, ChevronRight, Cpu, Truck, Users, Route as RouteIcon,
  TrendingUp, BarChart3, Timer, Package, Pause, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/auth-fetch";

/* ─── Types ─── */

interface Scenario {
  id: string;
  code: string;
  description: string;
}

interface PlanningModel {
  id: string;
  code: string;
  description: string;
}

interface LocationGroup {
  id: string;
  code: string;
  description: string;
}

type OptStatus = "idle" | "running" | "completed" | "error";

interface OptimizedTrip {
  id: string;
  origin: string;
  destination: string;
  fleetGroup: string;
  vehiclePlate: string;
  driverName: string;
  departureTime: string;
  arrivalTime: string;
  distance: number;
  cost: number;
  status: "allocated" | "pending" | "conflict";
}

/* ─── Mock ─── */

const mockTrips: OptimizedTrip[] = [
  { id: "1", origin: "FAB ITU", destination: "CD CIC", fleetGroup: "BT9", vehiclePlate: "ABC-1A23", driverName: "CARLOS SILVA", departureTime: "06:00", arrivalTime: "12:30", distance: 408, cost: 4500, status: "allocated" },
  { id: "2", origin: "FAB ITU", destination: "CD STL", fleetGroup: "BT6", vehiclePlate: "DEF-4B56", driverName: "JOSÉ SANTOS", departureTime: "07:00", arrivalTime: "16:00", distance: 685, cost: 6200, status: "allocated" },
  { id: "3", origin: "FAB STL", destination: "CDV BHZ", fleetGroup: "SIM", vehiclePlate: "GHI-7C89", driverName: "PEDRO OLIVEIRA", departureTime: "05:30", arrivalTime: "07:00", distance: 78, cost: 1800, status: "allocated" },
  { id: "4", origin: "FAB ITU", destination: "CLT POA", fleetGroup: "BT9", vehiclePlate: "—", driverName: "—", departureTime: "04:00", arrivalTime: "18:00", distance: 1109, cost: 8900, status: "pending" },
  { id: "5", origin: "FAB ITU", destination: "CD RCF", fleetGroup: "BT6", vehiclePlate: "JKL-0D12", driverName: "MARCOS LIMA", departureTime: "08:00", arrivalTime: "11:30", distance: 180, cost: 2300, status: "allocated" },
  { id: "6", origin: "CD CIC", destination: "CLT POA", fleetGroup: "BT9", vehiclePlate: "MNO-3E45", driverName: "LUCAS PEREIRA", departureTime: "14:00", arrivalTime: "19:00", distance: 710, cost: 5400, status: "conflict" },
  { id: "7", origin: "FAB STL", destination: "CD STL", fleetGroup: "SIM", vehiclePlate: "PQR-6F78", driverName: "RAFAEL COSTA", departureTime: "09:00", arrivalTime: "09:30", distance: 15, cost: 450, status: "allocated" },
  { id: "8", origin: "FAB ITU", destination: "CDV BHZ", fleetGroup: "BT9", vehiclePlate: "—", driverName: "—", departureTime: "03:00", arrivalTime: "14:00", distance: 590, cost: 7100, status: "pending" },
];

const statusColors: Record<OptimizedTrip["status"], string> = {
  allocated: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  conflict: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
};

/* ─── Gantt ─── */

function GanttChart({ trips }: { trips: OptimizedTrip[] }) {
  const startHour = 0;
  const endHour = 24;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => i + startHour);

  const parseTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h + m / 60;
  };

  return (
    <div className="overflow-auto border rounded-lg" style={{ maxHeight: "calc(100vh - 420px)" }}>
      <div className="min-w-[900px]">
        {/* Header */}
        <div className="flex border-b bg-muted/30 sticky top-0 z-10">
          <div className="w-[200px] shrink-0 p-2 text-xs font-medium text-muted-foreground border-r">
            Rota
          </div>
          <div className="flex-1 flex">
            {hours.map((h) => (
              <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground border-r py-1">
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
        </div>
        {/* Rows */}
        {trips.map((trip, idx) => {
          const dep = parseTime(trip.departureTime);
          const arr = parseTime(trip.arrivalTime);
          const left = ((dep - startHour) / (endHour - startHour)) * 100;
          const width = ((arr - dep) / (endHour - startHour)) * 100;
          const barColor = trip.status === "allocated"
            ? "bg-primary/80"
            : trip.status === "pending"
              ? "bg-amber-500/70"
              : "bg-red-500/70";

          return (
            <div key={trip.id} className={`flex border-b ${idx % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
              <div className="w-[200px] shrink-0 p-2 text-xs border-r truncate">
                <span className="font-medium">{trip.origin}</span>
                <span className="text-muted-foreground"> → </span>
                <span className="font-medium">{trip.destination}</span>
              </div>
              <div className="flex-1 relative h-8">
                <div
                  className={`absolute top-1 h-6 rounded text-[10px] text-primary-foreground flex items-center justify-center px-1 truncate ${barColor}`}
                  style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%` }}
                  title={`${trip.departureTime} - ${trip.arrivalTime} | ${trip.vehiclePlate} | ${trip.driverName}`}
                >
                  {trip.vehiclePlate !== "—" ? trip.vehiclePlate : "?"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function TripOptimizationPage() {
  const { t } = useTranslation();
  usePageTitle(t("tripOptimization.title"));

  const { toast } = useToast();

  /* Filters */
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedLocationGroupId, setSelectedLocationGroupId] = useState("");

  /* Optimization state */
  const [optStatus, setOptStatus] = useState<OptStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [trips, setTrips] = useState<OptimizedTrip[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  /* Pagination */
  const [page, setPage] = useState(1);
  const pageSize = 50;

  /* Fetch scenarios */
  const { data: scenarios = [], isLoading: loadingScenarios } = useQuery({
    queryKey: ["scenarios-lookup"],
    queryFn: async () => {
      const res = await authFetch("/Scenario?PageSize=200&PageNumber=1");
      if (!res.ok) return [];
      return (await res.json()) as Scenario[];
    },
  });

  /* Fetch planning models */
  const { data: models = [] } = useQuery({
    queryKey: ["planning-models-lookup"],
    queryFn: async () => {
      const res = await authFetch("/PlanningModel?PageSize=200&PageNumber=1");
      if (!res.ok) return [];
      return (await res.json()) as PlanningModel[];
    },
  });

  /* Fetch location groups */
  const { data: locationGroups = [] } = useQuery({
    queryKey: ["location-groups-lookup"],
    queryFn: async () => {
      const res = await authFetch("/LocationGroup?PageSize=200");
      if (!res.ok) return [];
      const data = (await res.json()) as LocationGroup[];
      return data.sort((a, b) => a.code.localeCompare(b.code));
    },
  });

  /* Execute optimization (mock) */
  const handleRunOptimization = () => {
    if (!selectedScenarioId || !selectedModelId) {
      toast({ title: t("tripOptimization.selectRequired"), variant: "error" });
      return;
    }
    setOptStatus("running");
    setProgress(0);
    setTrips([]);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setOptStatus("completed");
          setTrips(mockTrips);
          toast({ title: t("tripOptimization.optimizationComplete"), variant: "success" });
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 400);
  };

  const handleReset = () => {
    setOptStatus("idle");
    setProgress(0);
    setTrips([]);
    setStatusFilter("all");
  };

  /* Filtered & paginated trips */
  const filteredTrips = useMemo(() => {
    if (statusFilter === "all") return trips;
    return trips.filter((t) => t.status === statusFilter);
  }, [trips, statusFilter]);

  const paginatedTrips = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTrips.slice(start, start + pageSize);
  }, [filteredTrips, page]);

  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / pageSize));

  /* KPIs */
  const kpis = useMemo(() => {
    if (!trips.length) return null;
    const totalRoutes = trips.length;
    const allocated = trips.filter((t) => t.status === "allocated").length;
    const pending = trips.filter((t) => t.status === "pending").length;
    const conflicts = trips.filter((t) => t.status === "conflict").length;
    const totalCost = trips.reduce((s, t) => s + t.cost, 0);
    const totalDistance = trips.reduce((s, t) => s + t.distance, 0);
    const allocationRate = Math.round((allocated / totalRoutes) * 100);
    return { totalRoutes, allocated, pending, conflicts, totalCost, totalDistance, allocationRate };
  }, [trips]);

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-display font-semibold">{t("tripOptimization.title")}</h1>
        </div>
        {optStatus !== "idle" && (
          <Badge variant="outline" className={
            optStatus === "running" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" :
            optStatus === "completed" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" :
            "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30"
          }>
            {optStatus === "running" && <><Loader2 className="h-3 w-3 animate-spin mr-1" />{t("tripOptimization.statusRunning")}</>}
            {optStatus === "completed" && <><CheckCircle2 className="h-3 w-3 mr-1" />{t("tripOptimization.statusCompleted")}</>}
            {optStatus === "error" && <><AlertTriangle className="h-3 w-3 mr-1" />{t("tripOptimization.statusError")}</>}
          </Badge>
        )}
      </div>

      {/* Filters + Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Scenario */}
            <div className="space-y-1.5 min-w-[220px]">
              <label className="text-xs font-medium text-muted-foreground">{t("tripOptimization.scenario")}</label>
              <Select value={selectedScenarioId} onValueChange={setSelectedScenarioId} disabled={optStatus === "running"}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={t("tripOptimization.selectScenario")} />
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.code} - {s.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Planning Model */}
            <div className="space-y-1.5 min-w-[220px]">
              <label className="text-xs font-medium text-muted-foreground">{t("tripOptimization.planningModel")}</label>
              <Select value={selectedModelId} onValueChange={setSelectedModelId} disabled={optStatus === "running"}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={t("tripOptimization.selectModel")} />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.code} - {m.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location Group */}
            <div className="space-y-1.5 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground">{t("tripOptimization.locationGroup")}</label>
              <Select value={selectedLocationGroupId} onValueChange={setSelectedLocationGroupId} disabled={optStatus === "running"}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={t("tripOptimization.allGroups")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">{t("tripOptimization.allGroups")}</SelectItem>
                  {locationGroups.map((lg) => (
                    <SelectItem key={lg.id} value={lg.id} className="text-xs">
                      {lg.code} - {lg.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 ml-auto">
              {optStatus !== "running" && (
                <Button size="sm" className="h-9 gap-1.5" onClick={handleRunOptimization}>
                  <Play className="h-3.5 w-3.5" />
                  {t("tripOptimization.runOptimization")}
                </Button>
              )}
              {optStatus === "running" && (
                <Button size="sm" variant="outline" className="h-9 gap-1.5" disabled>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("tripOptimization.statusRunning")}
                </Button>
              )}
              {(optStatus === "completed" || optStatus === "error") && (
                <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={handleReset}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t("tripOptimization.reset")}
                </Button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {optStatus === "running" && (
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("tripOptimization.processing")}</span>
                <span>{Math.min(100, Math.round(progress))}%</span>
              </div>
              <Progress value={Math.min(100, progress)} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: t("tripOptimization.kpi.totalRoutes"), value: kpis.totalRoutes, icon: RouteIcon, color: "text-primary" },
            { label: t("tripOptimization.kpi.allocated"), value: kpis.allocated, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
            { label: t("tripOptimization.kpi.pending"), value: kpis.pending, icon: Clock, color: "text-amber-600 dark:text-amber-400" },
            { label: t("tripOptimization.kpi.conflicts"), value: kpis.conflicts, icon: AlertTriangle, color: "text-red-600 dark:text-red-400" },
            { label: t("tripOptimization.kpi.allocationRate"), value: `${kpis.allocationRate}%`, icon: TrendingUp, color: "text-primary" },
            { label: t("tripOptimization.kpi.totalDistance"), value: `${kpis.totalDistance.toLocaleString("pt-BR")} km`, icon: RouteIcon, color: "text-muted-foreground" },
            { label: t("tripOptimization.kpi.totalCost"), value: `R$ ${kpis.totalCost.toLocaleString("pt-BR")}`, icon: BarChart3, color: "text-primary" },
          ].map((kpi, i) => (
            <Card key={i}>
              <CardContent className="p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
                </div>
                <span className="text-lg font-semibold">{kpi.value}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {optStatus === "completed" && trips.length > 0 && (
        <Tabs defaultValue="list" className="space-y-3">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="list" className="text-xs">{t("tripOptimization.tabList")}</TabsTrigger>
              <TabsTrigger value="gantt" className="text-xs">{t("tripOptimization.tabGantt")}</TabsTrigger>
            </TabsList>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">{t("tripOptimization.filterAll")}</SelectItem>
                <SelectItem value="allocated" className="text-xs">{t("tripOptimization.filterAllocated")}</SelectItem>
                <SelectItem value="pending" className="text-xs">{t("tripOptimization.filterPending")}</SelectItem>
                <SelectItem value="conflict" className="text-xs">{t("tripOptimization.filterConflict")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="list">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs h-9">{t("tripOptimization.col.origin")}</TableHead>
                    <TableHead className="text-xs h-9">{t("tripOptimization.col.destination")}</TableHead>
                    <TableHead className="text-xs h-9">{t("tripOptimization.col.fleet")}</TableHead>
                    <TableHead className="text-xs h-9">{t("tripOptimization.col.vehicle")}</TableHead>
                    <TableHead className="text-xs h-9">{t("tripOptimization.col.driver")}</TableHead>
                    <TableHead className="text-xs h-9">{t("tripOptimization.col.departure")}</TableHead>
                    <TableHead className="text-xs h-9">{t("tripOptimization.col.arrival")}</TableHead>
                    <TableHead className="text-xs h-9 text-right">{t("tripOptimization.col.distance")}</TableHead>
                    <TableHead className="text-xs h-9 text-right">{t("tripOptimization.col.cost")}</TableHead>
                    <TableHead className="text-xs h-9">{t("tripOptimization.col.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTrips.map((trip, idx) => (
                    <TableRow key={trip.id} className={idx % 2 === 0 ? "" : "bg-muted/20"}>
                      <TableCell className="text-xs py-2">{trip.origin}</TableCell>
                      <TableCell className="text-xs py-2">{trip.destination}</TableCell>
                      <TableCell className="text-xs py-2">{trip.fleetGroup}</TableCell>
                      <TableCell className="text-xs py-2 font-mono">{trip.vehiclePlate}</TableCell>
                      <TableCell className="text-xs py-2">{trip.driverName}</TableCell>
                      <TableCell className="text-xs py-2 font-mono">{trip.departureTime}</TableCell>
                      <TableCell className="text-xs py-2 font-mono">{trip.arrivalTime}</TableCell>
                      <TableCell className="text-xs py-2 text-right">{trip.distance.toLocaleString("pt-BR")} km</TableCell>
                      <TableCell className="text-xs py-2 text-right">R$ {trip.cost.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-xs py-2">
                        <Badge variant="outline" className={`text-[10px] ${statusColors[trip.status]}`}>
                          {t(`tripOptimization.status.${trip.status}`)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">
                {filteredTrips.length} {t("tripOptimization.records")}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs">{page} / {totalPages}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gantt">
            <GanttChart trips={filteredTrips} />
          </TabsContent>
        </Tabs>
      )}

      {/* Empty state */}
      {optStatus === "idle" && (
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-3">
            <Cpu className="h-12 w-12 text-muted-foreground/30" />
            <div>
              <h3 className="font-medium text-muted-foreground">{t("tripOptimization.emptyTitle")}</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">{t("tripOptimization.emptyDesc")}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
