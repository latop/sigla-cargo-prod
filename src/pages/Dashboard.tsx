import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Truck, Users, CalendarDays, TrendingUp, Route,
  LayoutDashboard, AlertTriangle, CheckCircle2, Timer, XCircle, Loader2, RefreshCw,
  CircleDot, Ban, Play, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip,
} from "recharts";
import clientLogo from "@/assets/client-logo.png";
import { authFetch } from "@/lib/auth-fetch";

/* ─── API helpers ────────────────────────────────── */

const apiFetch = async (endpoint: string, params?: Record<string, string>) => {
  const query = params ? `?${new URLSearchParams(params).toString()}` : "";
  const res = await authFetch(`/${endpoint}${query}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const pagination = res.headers.get("x-pagination");
  const totalCount = pagination ? JSON.parse(pagination).TotalCount : null;
  const data = await res.json();
  return { data, totalCount };
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T00:00:00`;
};

const plusDaysISO = (base: string, days: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T00:00:00`;
};

const toApiDate = (isoDate: string) => isoDate.substring(0, 10);

interface GanttItem {
  dailyTripId: string;
  demand: string | null;
  licensePlate: string | null;
  locationOrigCode: string | null;
  locationDestCode: string | null;
  startPlanned: string | null;
  endPlanned: string | null;
  startActual: string | null;
  endActual: string | null;
  startEstimated?: string | null;
  endEstimated?: string | null;
  driverName: string | null;
  statusTrip: string | null;
  layerType?: string;
  justification?: {
    code?: string;
    description?: string;
    type?: string;
    responsibleSector?: {
      code?: string;
      description?: string;
    };
  } | null;
}

/* ─── Helpers ────────────────────────────────────── */

const formatTime = (v?: string | null) => {
  if (!v) return "--";
  const d = new Date(v);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const formatDateTime = (v?: string | null) => {
  if (!v) return "--";
  const d = new Date(v);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const isToday = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

const isTripDelayed = (trip: GanttItem) => {
  if (!trip.startPlanned) return false;
  const planned = new Date(trip.startPlanned);
  const now = new Date();
  const actual = trip.startActual ? new Date(trip.startActual) : null;
  if (actual) return actual.getTime() - planned.getTime() > 15 * 60 * 1000; // >15min late
  const s = (trip.statusTrip || "").toLowerCase();
  if (s.includes("conclu") || s.includes("complet") || s.includes("cancel")) return false;
  return planned < now; // should have started but didn't
};

const extractTrips = (payload: unknown): GanttItem[] => {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is GanttItem => !!item && typeof item === "object");
  }

  if (!payload || typeof payload !== "object") return [];

  const record = payload as { trips?: unknown; Trips?: unknown };
  const candidate = record.trips ?? record.Trips;

  return Array.isArray(candidate)
    ? candidate.filter((item): item is GanttItem => !!item && typeof item === "object")
    : [];
};

/* ─── Component ──────────────────────────────────── */

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  usePageTitle(t("dashboard.title"), LayoutDashboard);
  const queryClient = useQueryClient();
  const lang: "pt" | "en" | "es" = i18n.language?.toLowerCase().startsWith("en")
    ? "en"
    : i18n.language?.toLowerCase().startsWith("es")
      ? "es"
      : "pt";

  const today = todayISO();
  const endDate = plusDaysISO(today, 1);
  const endWeek = plusDaysISO(today, 7);

  // Today's trips
  const { data: ganttResult, isLoading: ganttLoading } = useQuery({
    queryKey: ["dashboard-gantt", today, endDate],
    queryFn: () =>
      apiFetch("gantt/GetDailyTripsByPeriodGantt", {
        startDate: toApiDate(today),
        endDate: toApiDate(endDate),
        pageNumber: "1",
        pageSize: "500",
      }),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 120 * 1000,
    retry: 1,
  });

  // Week trips for bar chart
  const { data: weekResult } = useQuery({
    queryKey: ["dashboard-gantt-week", today, endWeek],
    queryFn: () =>
      apiFetch("gantt/GetDailyTripsByPeriodGantt", {
        startDate: toApiDate(today),
        endDate: toApiDate(endWeek),
        pageNumber: "1",
        pageSize: "500",
      }),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 120 * 1000,
    retry: 1,
  });

  // Counts
  const { data: driversResult } = useQuery({
    queryKey: ["dashboard-drivers"],
    queryFn: () => apiFetch("Drivers", { PageSize: "1" }),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const { data: trucksResult } = useQuery({
    queryKey: ["dashboard-trucks"],
    queryFn: () => apiFetch("Truck", { PageSize: "1" }),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard-gantt"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-gantt-week"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-drivers"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-trucks"] });
  };

  // Process data
  const ganttData = ganttResult?.data;
  const allItems = extractTrips(ganttData);
  const todayTrips = allItems.filter(
    (item) => (item.layerType === "TRIP" || !item.layerType) && item.startPlanned && isToday(item.startPlanned)
  );

  // Week data
  const weekData = weekResult?.data;
  const weekItems = extractTrips(weekData);
  const weekTrips = weekItems.filter((item) => item.layerType === "TRIP" || !item.layerType);

  // KPI calculations
  const totalToday = todayTrips.length;
  const completedTrips = todayTrips.filter((t) => {
    const s = (t.statusTrip || "").toLowerCase();
    return s.includes("conclu") || s.includes("complet");
  });
  const cancelledTrips = todayTrips.filter((t) => (t.statusTrip || "").toLowerCase().includes("cancel"));
  const inProgressTrips = todayTrips.filter((t) => {
    const s = (t.statusTrip || "").toLowerCase();
    return s.includes("execu") || s.includes("progress");
  });
  const plannedTrips = todayTrips.filter((t) => {
    const s = (t.statusTrip || "").toLowerCase();
    return s.includes("planej") || s.includes("planned") || s === "";
  });
  const delayedTrips = todayTrips.filter(isTripDelayed);

  const uniqueDrivers = new Set(todayTrips.filter((t) => t.driverName).map((t) => t.driverName));
  const uniqueTrucks = new Set(todayTrips.filter((t) => t.licensePlate).map((t) => t.licensePlate));

  const completionRate = totalToday > 0 ? Math.round((completedTrips.length / totalToday) * 100) : 0;
  const cancelRate = totalToday > 0 ? Math.round((cancelledTrips.length / totalToday) * 100) : 0;
  const onTimeRate = totalToday > 0 ? Math.round(((totalToday - delayedTrips.length - cancelledTrips.length) / totalToday) * 100) : 0;

  // Status pie data
  const statusMap = [
    { key: "planned", label: { pt: "Planejadas", en: "Planned", es: "Planificadas" }, count: plannedTrips.length, color: "hsl(220, 72%, 35%)" },
    { key: "progress", label: { pt: "Em Execução", en: "In Progress", es: "En Ejecución" }, count: inProgressTrips.length, color: "hsl(210, 80%, 55%)" },
    { key: "completed", label: { pt: "Concluídas", en: "Completed", es: "Completadas" }, count: completedTrips.length, color: "hsl(142, 71%, 45%)" },
    { key: "delayed", label: { pt: "Atrasadas", en: "Delayed", es: "Retrasadas" }, count: delayedTrips.length, color: "hsl(38, 92%, 50%)" },
    { key: "cancelled", label: { pt: "Canceladas", en: "Cancelled", es: "Canceladas" }, count: cancelledTrips.length, color: "hsl(0, 84%, 60%)" },
  ].filter((s) => s.count > 0);

  const pieData = statusMap.map((s) => ({ name: s.label[lang], value: s.count, fill: s.color }));

  // Bar chart: trips per day (next 7 days)
  const barData = useMemo(() => {
    const days: { date: string; viagens: number }[] = [];
    const dayNames = { pt: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] };
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const label = `${(dayNames[lang] || dayNames.pt)[d.getDay()] ?? "--"} ${String(d.getDate()).padStart(2, "0")}`;
      const count = weekTrips.filter((t) => {
        if (!t.startPlanned) return false;
        const td = new Date(t.startPlanned);
        return td.getDate() === d.getDate() && td.getMonth() === d.getMonth();
      }).length;
      days.push({ date: label, viagens: count });
    }
    return days;
  }, [weekTrips, today, lang]);

  // Next departures (upcoming sorted by planned start)
  const now = new Date();
  const nextDepartures = useMemo(() => {
    return [...todayTrips]
      .filter((t) => {
        const s = (t.statusTrip || "").toLowerCase();
        return !s.includes("conclu") && !s.includes("complet") && !s.includes("cancel");
      })
      .sort((a, b) => {
        const da = a.startPlanned ? new Date(a.startPlanned).getTime() : Infinity;
        const db = b.startPlanned ? new Date(b.startPlanned).getTime() : Infinity;
        return da - db;
      })
      .slice(0, 8);
  }, [todayTrips]);

  // Delays by responsible sector (from justification)
  const delayBySector = useMemo(() => {
    const sectorCounts: Record<string, number> = {};
    todayTrips.forEach((trip) => {
      const sector = trip.justification?.responsibleSector;
      if (sector) {
        const label = sector.description || sector.code || "Sem descrição";
        sectorCounts[label] = (sectorCounts[label] || 0) + 1;
      }
    });
    return Object.entries(sectorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [todayTrips]);

  const getStatusConfig = (trip: GanttItem) => {
    const s = (trip.statusTrip || "").toLowerCase();
    if (s.includes("conclu") || s.includes("complet")) return { icon: CheckCircle2, label: "Concluída", cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" };
    if (s.includes("execu") || s.includes("progress")) return { icon: Play, label: "Em Execução", cls: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800" };
    if (s.includes("cancel")) return { icon: Ban, label: "Cancelada", cls: "text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800" };
    if (isTripDelayed(trip)) return { icon: AlertTriangle, label: "Atrasada", cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800" };
    return { icon: Clock, label: "Planejada", cls: "text-primary bg-primary/5 border-primary/20" };
  };

  const getDepartureUrgency = (trip: GanttItem) => {
    if (!trip.startPlanned) return "";
    const planned = new Date(trip.startPlanned);
    const diffMin = Math.round((planned.getTime() - now.getTime()) / 60000);
    if (diffMin < 0) return "text-red-500 font-semibold";
    if (diffMin <= 30) return "text-amber-500 font-semibold";
    return "text-muted-foreground";
  };

  const getTimeUntil = (trip: GanttItem) => {
    if (!trip.startPlanned) return "";
    const planned = new Date(trip.startPlanned);
    const diffMin = Math.round((planned.getTime() - now.getTime()) / 60000);
    if (diffMin < -60) return `${Math.abs(Math.round(diffMin / 60))}h atrás`;
    if (diffMin < 0) return `${Math.abs(diffMin)}min atrás`;
    if (diffMin === 0) return "Agora";
    if (diffMin < 60) return `em ${diffMin}min`;
    return `em ${Math.round(diffMin / 60)}h`;
  };

  const loading = ganttLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Painel Operacional</h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleRefresh}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <img src={clientLogo} alt="Client Logo" className="h-9 object-contain" />
        </div>
      </motion.div>

      {/* Top KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { icon: CalendarDays, label: "Viagens Hoje", value: totalToday, color: "text-primary", bgColor: "bg-primary/10", borderClass: "border-l-primary" },
          { icon: Play, label: "Em Execução", value: inProgressTrips.length, color: "text-blue-500", bgColor: "bg-blue-500/10", borderClass: "border-l-primary/40" },
          { icon: Users, label: "Motoristas Escalados", value: uniqueDrivers.size, color: "text-emerald-500", bgColor: "bg-emerald-500/10", borderClass: "border-l-primary/40" },
          { icon: Truck, label: "Veículos em Operação", value: uniqueTrucks.size, color: "text-amber-500", bgColor: "bg-amber-500/10", borderClass: "border-l-primary/40" },
          { icon: AlertTriangle, label: "Atrasadas", value: delayedTrips.length, color: delayedTrips.length > 0 ? "text-red-500" : "text-muted-foreground", bgColor: delayedTrips.length > 0 ? "bg-red-500/10" : "bg-muted/50", borderClass: delayedTrips.length > 0 ? "border-l-destructive" : "border-l-border" },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`shadow-sm hover:shadow-md transition-all border-l-2 ${kpi.borderClass}`}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">{kpi.label}</p>
                  <p className="text-2xl font-bold text-foreground leading-tight">{loading ? "..." : kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {[
          { label: "Pontualidade", value: onTimeRate, icon: Timer, color: onTimeRate >= 80 ? "text-emerald-500" : onTimeRate >= 50 ? "text-amber-500" : "text-red-500", progressColor: onTimeRate >= 80 ? "[&>div]:bg-emerald-500" : onTimeRate >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500" },
          { label: "Conclusão", value: completionRate, icon: CheckCircle2, color: "text-emerald-500", progressColor: "[&>div]:bg-emerald-500" },
          { label: "Cancelamentos", value: cancelRate, icon: XCircle, color: cancelRate > 10 ? "text-red-500" : "text-muted-foreground", progressColor: cancelRate > 10 ? "[&>div]:bg-red-500" : "[&>div]:bg-muted-foreground" },
        ].map((ind, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.05 }}>
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <ind.icon className={`h-3.5 w-3.5 ${ind.color}`} />
                    <span className="text-xs font-medium text-muted-foreground">{ind.label}</span>
                  </div>
                  <span className={`text-lg font-bold ${ind.color}`}>{loading ? "..." : `${ind.value}%`}</span>
                </div>
                <Progress value={loading ? 0 : ind.value} className={`h-1.5 ${ind.progressColor}`} />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content: Next Departures + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Next Departures - takes 2 cols */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="shadow-sm h-full">
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Route className="h-4 w-4 text-primary" />
                Próximas Saídas
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">{nextDepartures.length} pendentes</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : nextDepartures.length > 0 ? (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="h-7 px-3 text-[10px] font-semibold">Saída</TableHead>
                        <TableHead className="h-7 px-3 text-[10px] font-semibold">Tempo</TableHead>
                        <TableHead className="h-7 px-3 text-[10px] font-semibold">Demanda</TableHead>
                        <TableHead className="h-7 px-3 text-[10px] font-semibold">Trajeto</TableHead>
                        <TableHead className="h-7 px-3 text-[10px] font-semibold">Placa</TableHead>
                        <TableHead className="h-7 px-3 text-[10px] font-semibold">Motorista</TableHead>
                        <TableHead className="h-7 px-3 text-[10px] font-semibold text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nextDepartures.map((trip, i) => {
                        const sc = getStatusConfig(trip);
                        const StatusIcon = sc.icon;
                        return (
                          <TableRow key={`${trip.dailyTripId}-${i}`} className="h-8 hover:bg-muted/30">
                            <TableCell className="px-3 py-1 text-xs font-mono font-semibold whitespace-nowrap">
                              {formatTime(trip.startPlanned)}
                            </TableCell>
                            <TableCell className={`px-3 py-1 text-[11px] whitespace-nowrap ${getDepartureUrgency(trip)}`}>
                              {getTimeUntil(trip)}
                            </TableCell>
                            <TableCell className="px-3 py-1 text-xs whitespace-nowrap">{trip.demand || "--"}</TableCell>
                            <TableCell className="px-3 py-1 text-xs whitespace-nowrap">
                              <span className="font-medium">{trip.locationOrigCode || "?"}</span>
                              <span className="text-muted-foreground mx-1">→</span>
                              <span className="font-medium">{trip.locationDestCode || "?"}</span>
                            </TableCell>
                            <TableCell className="px-3 py-1 text-xs font-mono whitespace-nowrap">{trip.licensePlate || "--"}</TableCell>
                            <TableCell className="px-3 py-1 text-xs whitespace-nowrap">{trip.driverName || "--"}</TableCell>
                            <TableCell className="px-3 py-1 text-center">
                              <Badge variant="outline" className={`text-[9px] gap-0.5 ${sc.cls}`}>
                                <StatusIcon className="h-2.5 w-2.5" />
                                {sc.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  <p className="text-sm">Nenhuma saída pendente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Status Donut */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-sm h-full">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-primary" />
                Status do Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-44">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : pieData.length > 0 ? (
                <>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          innerRadius={32}
                          strokeWidth={2}
                          stroke="hsl(var(--background))"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            fontSize: "11px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
                    {statusMap.map((s) => (
                      <div key={s.key} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-[10px] text-muted-foreground truncate">{s.label[lang]}</span>
                        <span className="text-[10px] font-bold ml-auto">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-44 text-sm text-muted-foreground">
                  Sem viagens hoje
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom row: Bar Chart + Delay by Sector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart: Week - 2 cols */}
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Viagens Programadas — Próximos 7 Dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} barSize={28}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "11px",
                      }}
                      formatter={(value: number) => [`${value} viagens`, "Total"]}
                    />
                    <Bar dataKey="viagens" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Delay by Responsible Sector */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Justificativas por Setor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-44">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : delayBySector.length > 0 ? (
                <div className="space-y-2.5">
                  {delayBySector.slice(0, 6).map((sector, i) => {
                    const maxCount = delayBySector[0].count;
                    const pct = Math.round((sector.count / maxCount) * 100);
                    const colors = [
                      "bg-destructive", "bg-primary", "bg-primary/80",
                      "bg-primary/60", "bg-primary/40", "bg-muted-foreground",
                    ];
                    return (
                      <div key={sector.name} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-foreground font-medium truncate max-w-[70%]">{sector.name}</span>
                          <span className="text-[11px] font-bold text-foreground">{sector.count}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${colors[i] || colors[5]}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.6 + i * 0.08, duration: 0.5 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-44 text-muted-foreground gap-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  <p className="text-xs">Nenhuma justificativa registrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center pb-2">
        © LATOP Tecnologia da Informação Ltda
      </p>
    </div>
  );
};

export default Dashboard;
