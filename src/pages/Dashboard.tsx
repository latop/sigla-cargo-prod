import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Truck, Users, CalendarDays, TrendingUp, Route,
  LayoutDashboard, AlertTriangle, CheckCircle2, Timer, XCircle, Loader2, RefreshCw,
  CircleDot, Ban, Play, Clock, Filter, UserCheck, UserX, ShieldCheck, Activity,
  ChevronLeft, ChevronRight,
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
import { useLocalizedLogos } from "@/hooks/use-localized-logos";
import clientLogo from "@/assets/client-logo.png";
import { authFetch } from "@/lib/auth-fetch";

/* ─── Types ──────────────────────────────────────── */

interface DashboardSummary {
  tripDate: string;
  locationGroupCode: string | null;
  totalTrips: number;
  inProgress: number;
  completed: number;
  planned: number;
  cancelled: number;
  delayed: number;
  uniqueDrivers: number;
  uniqueVehicles: number;
  onTimeRate: number;
  completionRate: number;
  cancelRate: number;
  tripCounts: { dtRef: string; qtyTrips: number }[];
  nextDepartures: {
    dailyTripId: string;
    startPlanned: string | null;
    demand: string;
    locationOrigCode: string;
    locationDestCode: string;
    licensePlate: string | null;
    nickName: string | null;
    statusTrip: string;
  }[];
  justificationsBySectors: { responsibleSectorCode: string; qtyJustifications: number }[];
}

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

const getDateISO = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* ─── Helpers ────────────────────────────────────── */

const formatTime = (v?: string | null) => {
  if (!v) return "--";
  const d = new Date(v);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/* ─── Session flag: first visit requires manual load ─ */
let sessionDashboardLoaded = false;

/* ─── Component ──────────────────────────────────── */

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  usePageTitle(t("dashboard.title"), LayoutDashboard);
  const { siglaLogo, latopLogo } = useLocalizedLogos();
  const queryClient = useQueryClient();
  const [selectedLocationGroup, setSelectedLocationGroup] = useState<string>("");
  const [dayOffset, setDayOffset] = useState(0);
  const [activated, setActivated] = useState(sessionDashboardLoaded);
  const lang: "pt" | "en" | "es" = i18n.language?.toLowerCase().startsWith("en")
    ? "en"
    : i18n.language?.toLowerCase().startsWith("es")
      ? "es"
      : "pt";

  const tripDate = getDateISO(dayOffset);
  const selectedDate = new Date(tripDate + "T00:00:00");
  const isCurrentDay = dayOffset === 0;

  // Location Groups (for filter buttons)
  const { data: locationGroupsResult } = useQuery({
    queryKey: ["dashboard-location-groups"],
    queryFn: () => apiFetch("LocationGroup", { PageSize: "200" }),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  // Single summary endpoint
  const summaryParams: Record<string, string> = { dtRef: tripDate };
  if (selectedLocationGroup) summaryParams.locationGroupCode = selectedLocationGroup;

  const { data: summaryResult, isLoading: loading } = useQuery({
    queryKey: ["dashboard-summary", tripDate, selectedLocationGroup],
    queryFn: async () => {
      const query = `?${new URLSearchParams(summaryParams).toString()}`;
      const res = await authFetch(`/dashboard/GetDashboardSummary${query}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      return (await res.json()) as DashboardSummary;
    },
    enabled: activated,
    staleTime: 2 * 60 * 1000,
    refetchInterval: activated ? 120 * 1000 : false,
    retry: 1,
  });

  const summary = summaryResult;

  const handleRefresh = () => {
    if (!activated) {
      sessionDashboardLoaded = true;
      setActivated(true);
    }
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-location-groups"] });
  };

  const locationGroups: { code: string; description: string }[] = Array.isArray(locationGroupsResult?.data)
    ? locationGroupsResult.data.map((g: Record<string, unknown>) => ({
        code: String(g.code || ""),
        description: String(g.description || g.name || g.code || ""),
      }))
    : [];

  // KPIs from summary
  const totalToday = summary?.totalTrips ?? 0;
  const inProgressCount = summary?.inProgress ?? 0;
  const completedCount = summary?.completed ?? 0;
  const plannedCount = summary?.planned ?? 0;
  const cancelledCount = summary?.cancelled ?? 0;
  const delayedCount = summary?.delayed ?? 0;
  const driversCount = summary?.uniqueDrivers ?? 0;
  const vehiclesCount = summary?.uniqueVehicles ?? 0;
  const onTimeRate = summary?.onTimeRate ?? 0;
  const completionRate = summary?.completionRate ?? 0;
  const cancelRate = summary?.cancelRate ?? 0;

  // Status pie data
  const statusMap = [
    { key: "planned", label: { pt: "Planejadas", en: "Planned", es: "Planificadas" }, count: plannedCount, color: "hsl(220, 72%, 35%)" },
    { key: "progress", label: { pt: "Em Execução", en: "In Progress", es: "En Ejecución" }, count: inProgressCount, color: "hsl(210, 80%, 55%)" },
    { key: "completed", label: { pt: "Concluídas", en: "Completed", es: "Completadas" }, count: completedCount, color: "hsl(142, 71%, 45%)" },
    { key: "delayed", label: { pt: "Atrasadas", en: "Delayed", es: "Retrasadas" }, count: delayedCount, color: "hsl(38, 92%, 50%)" },
    { key: "cancelled", label: { pt: "Canceladas", en: "Cancelled", es: "Canceladas" }, count: cancelledCount, color: "hsl(0, 84%, 60%)" },
  ].filter((s) => s.count > 0);

  const pieData = statusMap.map((s) => ({ name: s.label[lang], value: s.count, fill: s.color }));

  // Bar chart from tripCounts
  const barData = useMemo(() => {
    if (!summary?.tripCounts?.length) return [];
    const dayNames = { pt: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] };
    return summary.tripCounts.map((tc) => {
      const d = new Date(tc.dtRef);
      const label = `${(dayNames[lang] || dayNames.pt)[d.getDay()] ?? "--"} ${String(d.getDate()).padStart(2, "0")}`;
      return { date: label, viagens: tc.qtyTrips };
    });
  }, [summary?.tripCounts, lang]);

  // Next departures from summary
  const nextDepartures = summary?.nextDepartures ?? [];

  // Justifications by sector from summary
  const delayBySector = useMemo(() => {
    if (!summary?.justificationsBySectors?.length) return [];
    return summary.justificationsBySectors
      .map((j) => ({ name: j.responsibleSectorCode || "N/A", count: j.qtyJustifications }))
      .sort((a, b) => b.count - a.count);
  }, [summary?.justificationsBySectors]);

  // ─── Mock data: Driver Circuits & Journeys ──────
  const driverCircuitKpis = useMemo(() => ({
    scheduled: 42,
    idle: 7,
    inProgress: 28,
    complianceRate: 87,
  }), []);

  const driverOccupancyData = useMemo(() => {
    const dayNames = { pt: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] };
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(tripDate + "T00:00:00");
      d.setDate(d.getDate() + i);
      const label = `${(dayNames[lang] || dayNames.pt)[d.getDay()] ?? "--"} ${String(d.getDate()).padStart(2, "0")}`;
      const scheduled = Math.floor(Math.random() * 15) + 30;
      const idle = Math.floor(Math.random() * 8) + 2;
      const dayOff = Math.floor(Math.random() * 5) + 1;
      days.push({ date: label, escalados: scheduled, ociosos: idle, folga: dayOff });
    }
    return days;
  }, [tripDate, lang]);

  const journeyComplianceData = useMemo(() => [
    { name: lang === "en" ? "Compliant" : lang === "es" ? "Conforme" : "Regular", value: 34, fill: "hsl(142, 71%, 45%)" },
    { name: lang === "en" ? "Over Limit" : lang === "es" ? "Excedido" : "Acima do Limite", value: 5, fill: "hsl(38, 92%, 50%)" },
    { name: lang === "en" ? "No Record" : lang === "es" ? "Sin Registro" : "Sem Registro", value: 3, fill: "hsl(var(--muted-foreground))" },
  ], [lang]);

  const driverHoursRanking = useMemo(() => [
    { name: "CARLOS SILVA", hours: 52.3, limit: 44, over: true },
    { name: "MARCOS OLIVEIRA", hours: 48.7, limit: 44, over: true },
    { name: "ANTONIO SANTOS", hours: 44.0, limit: 44, over: false },
    { name: "PEDRO COSTA", hours: 42.5, limit: 44, over: false },
    { name: "RAFAEL LIMA", hours: 41.2, limit: 44, over: false },
    { name: "JONAS PEREIRA", hours: 39.8, limit: 44, over: false },
    { name: "WAGNER SOUZA", hours: 38.1, limit: 44, over: false },
  ], []);

  const circuitStatusData = useMemo(() => [
    { name: lang === "en" ? "Planned" : lang === "es" ? "Planificado" : "Planejado", value: 12, fill: "hsl(220, 72%, 35%)" },
    { name: lang === "en" ? "In Progress" : lang === "es" ? "En Ejecución" : "Em Execução", value: 28, fill: "hsl(210, 80%, 55%)" },
    { name: lang === "en" ? "Completed" : lang === "es" ? "Completado" : "Finalizado", value: 18, fill: "hsl(142, 71%, 45%)" },
    { name: lang === "en" ? "Cancelled" : lang === "es" ? "Cancelado" : "Cancelado", value: 2, fill: "hsl(0, 84%, 60%)" },
  ], [lang]);

  const getStatusBadge = (statusTrip: string) => {
    const s = statusTrip.toLowerCase();
    if (s.includes("conclu") || s.includes("complet")) return { icon: CheckCircle2, label: "Concluída", cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" };
    if (s.includes("execu") || s.includes("progress")) return { icon: Play, label: "Em Execução", cls: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800" };
    if (s.includes("cancel")) return { icon: Ban, label: "Cancelada", cls: "text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800" };
    if (s.includes("atras") || s.includes("delay")) return { icon: AlertTriangle, label: "Atrasada", cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800" };
    return { icon: Clock, label: "Planejada", cls: "text-primary bg-primary/5 border-primary/20" };
  };

  const now = new Date();

  const getDepartureUrgency = (startPlanned: string | null) => {
    if (!startPlanned) return "";
    const planned = new Date(startPlanned);
    const diffMin = Math.round((planned.getTime() - now.getTime()) / 60000);
    if (diffMin < 0) return "text-red-500 font-semibold";
    if (diffMin <= 30) return "text-amber-500 font-semibold";
    return "text-muted-foreground";
  };

  const getTimeUntil = (startPlanned: string | null) => {
    if (!startPlanned) return "";
    const planned = new Date(startPlanned);
    const diffMin = Math.round((planned.getTime() - now.getTime()) / 60000);
    if (diffMin < -60) return `${Math.abs(Math.round(diffMin / 60))}h atrás`;
    if (diffMin < 0) return `${Math.abs(diffMin)}min atrás`;
    if (diffMin === 0) return "Agora";
    if (diffMin < 60) return `em ${diffMin}min`;
    return `em ${Math.round(diffMin / 60)}h`;
  };

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
            <div className="flex items-center gap-1.5 mt-0.5">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setDayOffset(dayOffset - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium min-w-[180px] text-center"
                onClick={() => setDayOffset(0)}
                title="Voltar para hoje"
              >
                {selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                {!isCurrentDay && <span className="ml-1.5 text-[10px] text-primary">(voltar para hoje)</span>}
              </button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setDayOffset(dayOffset + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleRefresh}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <img src={clientLogo} alt="PepsiCo" className="h-9 object-contain" />
        </div>
      </motion.div>

      {/* Location Group Filter */}
      {locationGroups.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="flex items-center gap-2 flex-wrap"
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span className="font-medium">Base:</span>
          </div>
          <Button
            variant={selectedLocationGroup === "" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs px-3 rounded-full"
            onClick={() => setSelectedLocationGroup("")}
          >
            Todas
          </Button>
          {locationGroups.map((g) => (
            <Button
              key={g.code}
              variant={selectedLocationGroup === g.code ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-3 rounded-full"
              onClick={() => setSelectedLocationGroup(g.code)}
            >
              {g.description}
            </Button>
          ))}
        </motion.div>
      )}

      {/* Top KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { icon: CalendarDays, label: "Viagens Hoje", value: totalToday, color: "text-primary", bgColor: "bg-primary/10", borderClass: "border-l-primary" },
          { icon: Play, label: "Em Execução", value: inProgressCount, color: "text-blue-500", bgColor: "bg-blue-500/10", borderClass: "border-l-primary/40" },
          { icon: Users, label: "Motoristas Escalados", value: driversCount, color: "text-emerald-500", bgColor: "bg-emerald-500/10", borderClass: "border-l-primary/40" },
          { icon: Truck, label: "Veículos em Operação", value: vehiclesCount, color: "text-amber-500", bgColor: "bg-amber-500/10", borderClass: "border-l-primary/40" },
          { icon: AlertTriangle, label: "Atrasadas", value: delayedCount, color: delayedCount > 0 ? "text-red-500" : "text-muted-foreground", bgColor: delayedCount > 0 ? "bg-red-500/10" : "bg-muted/50", borderClass: delayedCount > 0 ? "border-l-destructive" : "border-l-border" },
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
                      {nextDepartures.map((dep, i) => {
                        const sc = getStatusBadge(dep.statusTrip || "");
                        const StatusIcon = sc.icon;
                        return (
                          <TableRow key={`${dep.dailyTripId}-${i}`} className="h-8 hover:bg-muted/30">
                            <TableCell className="px-3 py-1 text-xs font-mono font-semibold whitespace-nowrap">
                              {formatTime(dep.startPlanned)}
                            </TableCell>
                            <TableCell className={`px-3 py-1 text-[11px] whitespace-nowrap ${getDepartureUrgency(dep.startPlanned)}`}>
                              {getTimeUntil(dep.startPlanned)}
                            </TableCell>
                            <TableCell className="px-3 py-1 text-xs whitespace-nowrap">{dep.demand || "--"}</TableCell>
                            <TableCell className="px-3 py-1 text-xs whitespace-nowrap">
                              <span className="font-medium">{dep.locationOrigCode || "?"}</span>
                              <span className="text-muted-foreground mx-1">→</span>
                              <span className="font-medium">{dep.locationDestCode || "?"}</span>
                            </TableCell>
                            <TableCell className="px-3 py-1 text-xs font-mono whitespace-nowrap">{dep.licensePlate || "--"}</TableCell>
                            <TableCell className="px-3 py-1 text-xs whitespace-nowrap">{dep.nickName || "--"}</TableCell>
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

      {/* Bottom row: Bar Chart + Justifications by Sector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart - 2 cols */}
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Viagens Programadas — Tendência
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-44">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : barData.length > 0 ? (
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
              ) : (
                <div className="flex items-center justify-center h-44 text-sm text-muted-foreground">
                  Sem dados de tendência
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Justifications by Sector */}
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

      {/* ═══ Driver Circuits & Journeys Section ═══ */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
        <div className="flex items-center gap-2 mt-2 mb-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider">
            Circuitos &amp; Jornadas de Motoristas
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      </motion.div>

      {/* Driver KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: UserCheck, label: "Motoristas Escalados", value: driverCircuitKpis.scheduled, color: "text-emerald-500", bgColor: "bg-emerald-500/10", borderClass: "border-l-emerald-500" },
          { icon: UserX, label: "Motoristas Ociosos", value: driverCircuitKpis.idle, color: "text-amber-500", bgColor: "bg-amber-500/10", borderClass: "border-l-amber-500" },
          { icon: Activity, label: "Jornadas em Andamento", value: driverCircuitKpis.inProgress, color: "text-blue-500", bgColor: "bg-blue-500/10", borderClass: "border-l-blue-500" },
          { icon: ShieldCheck, label: "Conformidade de Jornada", value: `${driverCircuitKpis.complianceRate}%`, color: driverCircuitKpis.complianceRate >= 80 ? "text-emerald-500" : "text-amber-500", bgColor: driverCircuitKpis.complianceRate >= 80 ? "bg-emerald-500/10" : "bg-amber-500/10", borderClass: driverCircuitKpis.complianceRate >= 80 ? "border-l-emerald-500" : "border-l-amber-500" },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.05 }}>
            <Card className={`shadow-sm hover:shadow-md transition-all border-l-2 ${kpi.borderClass}`}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">{kpi.label}</p>
                  <p className="text-2xl font-bold text-foreground leading-tight">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Occupancy Bar + Compliance Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-3">
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card className="shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Ocupação de Motoristas — 7 Dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={driverOccupancyData} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "11px" }} />
                    <Bar dataKey="escalados" fill="hsl(142, 71%, 45%)" radius={[3, 3, 0, 0]} name="Escalados" />
                    <Bar dataKey="ociosos" fill="hsl(38, 92%, 50%)" radius={[3, 3, 0, 0]} name="Ociosos" />
                    <Bar dataKey="folga" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} name="Folga" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                {[
                  { label: "Escalados", color: "hsl(142, 71%, 45%)" },
                  { label: "Ociosos", color: "hsl(38, 92%, 50%)" },
                  { label: "Folga", color: "hsl(var(--muted-foreground))" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                    <span className="text-[10px] text-muted-foreground">{l.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
          <Card className="shadow-sm h-full">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Conformidade de Jornada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={journeyComplianceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={32} strokeWidth={2} stroke="hsl(var(--background))">
                      {journeyComplianceData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 mt-1">
                {journeyComplianceData.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.fill }} />
                    <span className="text-[10px] text-muted-foreground truncate">{s.name}</span>
                    <span className="text-[10px] font-bold ml-auto">{s.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Hours Ranking + Circuit Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-3">
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <Card className="shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Timer className="h-4 w-4 text-primary" />
                Horas Trabalhadas — Top 7 Motoristas (Semana)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {driverHoursRanking.map((driver, i) => {
                  const pct = Math.round((driver.hours / 56) * 100);
                  return (
                    <div key={driver.name} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-foreground font-medium truncate max-w-[60%]">{driver.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[11px] font-bold tabular-nums ${driver.over ? "text-red-500" : "text-foreground"}`}>
                            {driver.hours}h
                          </span>
                          {driver.over && (
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${driver.over ? "bg-red-500" : "bg-primary"}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(pct, 100)}%` }}
                          transition={{ delay: 0.85 + i * 0.06, duration: 0.5 }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
                  <div className="w-2 h-0.5 bg-muted-foreground rounded" />
                  <span className="text-[9px] text-muted-foreground">Limite semanal: 44h</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}>
          <Card className="shadow-sm h-full">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-primary" />
                Circuitos por Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={circuitStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={32} strokeWidth={2} stroke="hsl(var(--background))">
                      {circuitStatusData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 mt-1">
                {circuitStatusData.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.fill }} />
                    <span className="text-[10px] text-muted-foreground truncate">{s.name}</span>
                    <span className="text-[10px] font-bold ml-auto">{s.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-1 pb-2">
        <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Powered by</span>
        <img src={latopLogo} alt="LATOP" className="h-5 object-contain opacity-60" />
      </div>
    </div>
  );
};

export default Dashboard;
