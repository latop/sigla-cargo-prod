import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Truck, Users, Route, CalendarDays, TrendingUp, MapPin, Clock, Activity,
  LayoutDashboard, AlertTriangle, CheckCircle2, Timer, XCircle, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend,
} from "recharts";
import clientLogo from "@/assets/client-logo.png";
import { API_BASE } from "@/config/api";

/* ─── API helpers ────────────────────────────────── */

const getToken = () => localStorage.getItem("token") || "";

const apiFetch = async (endpoint: string, params?: Record<string, string>) => {
  const url = new URL(`${API_BASE}/${endpoint}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
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

/* ─── Types ──────────────────────────────────────── */

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
  driverName: string | null;
  statusTrip: string | null;
  layerType?: string;
}

/* ─── Component ──────────────────────────────────── */

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  usePageTitle(t("dashboard.title"), LayoutDashboard);
  const userName = localStorage.getItem("userName") || "Usuário";
  const lang = i18n.language as "pt" | "en" | "es";

  const today = todayISO();
  const endDate = plusDaysISO(today, 7);

  // Fetch gantt data for KPIs, charts and table
  const { data: ganttResult, isLoading: ganttLoading } = useQuery({
    queryKey: ["dashboard-gantt", today, endDate],
    queryFn: () =>
      apiFetch("gantt/GetDailyTripsByPeriodGantt", {
        startDate: today,
        endDate,
        PageNumber: "1",
        PageSize: "200",
      }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Fetch counts
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

  const { data: locationsResult } = useQuery({
    queryKey: ["dashboard-locations"],
    queryFn: () => apiFetch("Location", { PageSize: "1" }),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  // Process gantt data — API returns { trucks: [], trips: [], ... }
  const ganttData = ganttResult?.data;
  const allItems: GanttItem[] = Array.isArray(ganttData) ? ganttData : (ganttData?.trips || []);
  const trips = allItems.filter(
    (item: any) => item.layerType === "TRIP" || item.layerType === "TRIP EXEC" || !item.layerType
  );

  // Status distribution
  const statusCounts: Record<string, number> = {};
  trips.forEach((trip) => {
    const status = trip.statusTrip || "Indefinido";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const statusColors: Record<string, string> = {
    "Planejada": "hsl(var(--primary))",
    "Planned": "hsl(var(--primary))",
    "Em Execução": "hsl(210, 80%, 55%)",
    "In Progress": "hsl(210, 80%, 55%)",
    "Concluída": "hsl(142, 71%, 45%)",
    "Completed": "hsl(142, 71%, 45%)",
    "Atrasada": "hsl(38, 92%, 50%)",
    "Delayed": "hsl(38, 92%, 50%)",
    "Cancelada": "hsl(0, 84%, 60%)",
    "Cancelled": "hsl(0, 84%, 60%)",
  };
  const defaultColor = "hsl(var(--muted-foreground))";

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
    fill: statusColors[name] || defaultColor,
  }));

  // Trips by day (last 7 days)
  const tripsByDay: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    tripsByDay[key] = 0;
  }
  trips.forEach((trip) => {
    if (trip.startPlanned) {
      const d = new Date(trip.startPlanned);
      const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in tripsByDay) tripsByDay[key]++;
    }
  });
  const areaData = Object.entries(tripsByDay).map(([date, count]) => ({ date, viagens: count }));

  // Recent trips (last 10)
  const recentTrips = [...trips]
    .sort((a, b) => {
      const da = a.startPlanned ? new Date(a.startPlanned).getTime() : 0;
      const db = b.startPlanned ? new Date(b.startPlanned).getTime() : 0;
      return db - da;
    })
    .slice(0, 10);

  // KPI values
  const totalTripsToday = trips.filter((t) => {
    if (!t.startPlanned) return false;
    const d = new Date(t.startPlanned);
    const td = new Date(today);
    return d.getDate() === td.getDate() && d.getMonth() === td.getMonth() && d.getFullYear() === td.getFullYear();
  }).length;

  const totalDrivers = driversResult?.totalCount ?? "--";
  const totalTrucks = trucksResult?.totalCount ?? "--";
  const totalLocations = locationsResult?.totalCount ?? "--";

  const formatDate = (v?: string | null) => {
    if (!v) return "--";
    const d = new Date(v);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const statusBadgeClass = (status: string | null) => {
    if (!status) return "bg-muted text-muted-foreground";
    const s = status.toLowerCase();
    if (s.includes("conclu") || s.includes("complet")) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
    if (s.includes("execu") || s.includes("progress")) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    if (s.includes("atras") || s.includes("delay")) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    if (s.includes("cancel")) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    return "bg-primary/10 text-primary";
  };

  const kpis = [
    { icon: CalendarDays, label: { pt: "Viagens Hoje", en: "Trips Today", es: "Viajes Hoy" }, value: ganttLoading ? "..." : totalTripsToday, color: "text-primary" },
    { icon: Truck, label: { pt: "Veículos Cadastrados", en: "Registered Vehicles", es: "Vehículos Registrados" }, value: totalTrucks, color: "text-blue-500" },
    { icon: Users, label: { pt: "Motoristas Cadastrados", en: "Registered Drivers", es: "Conductores Registrados" }, value: totalDrivers, color: "text-emerald-500" },
    { icon: MapPin, label: { pt: "Localidades", en: "Locations", es: "Localidades" }, value: totalLocations, color: "text-amber-500" },
  ];

  const tripsLabel = { pt: "Viagens", en: "Trips", es: "Viajes" };
  const chartTitleStatus = { pt: "Viagens por Status", en: "Trips by Status", es: "Viajes por Estado" };
  const chartTitleTrend = { pt: "Viagens nos Próximos 7 Dias", en: "Trips in Next 7 Days", es: "Viajes en los Próximos 7 Días" };
  const recentTripsTitle = { pt: "Últimas Viagens", en: "Recent Trips", es: "Últimos Viajes" };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {t("dashboard.title")}
          </h1>
        </div>
        <img src={clientLogo} alt="Client Logo" className="h-10 object-contain" />
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted/50`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label[lang]}</p>
                  <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Pie */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">{chartTitleStatus[lang]}</CardTitle>
            </CardHeader>
            <CardContent>
              {ganttLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : pieData.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={35}
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
                          fontSize: "12px",
                        }}
                      />
                      <Legend
                        iconSize={8}
                        wrapperStyle={{ fontSize: "11px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  {t("common.noResults")}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Trend Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display">{chartTitleTrend[lang]}</CardTitle>
            </CardHeader>
            <CardContent>
              {ganttLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaData}>
                      <defs>
                        <linearGradient id="colorViagens" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        allowDecimals={false}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          fontSize: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="viagens"
                        name={tripsLabel[lang]}
                        stroke="hsl(var(--primary))"
                        fill="url(#colorViagens)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Trips Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">{recentTripsTitle[lang]}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ganttLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : recentTrips.length > 0 ? (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="h-8 px-3 text-xs font-medium">
                        {lang === "pt" ? "Demanda" : lang === "es" ? "Demanda" : "Demand"}
                      </TableHead>
                      <TableHead className="h-8 px-3 text-xs font-medium">
                        {lang === "pt" ? "Placa" : lang === "es" ? "Placa" : "Plate"}
                      </TableHead>
                      <TableHead className="h-8 px-3 text-xs font-medium">
                        {lang === "pt" ? "Origem" : lang === "es" ? "Origen" : "Origin"}
                      </TableHead>
                      <TableHead className="h-8 px-3 text-xs font-medium">
                        {lang === "pt" ? "Destino" : lang === "es" ? "Destino" : "Destination"}
                      </TableHead>
                      <TableHead className="h-8 px-3 text-xs font-medium">
                        {lang === "pt" ? "Início Plan." : lang === "es" ? "Inicio Plan." : "Start Plan."}
                      </TableHead>
                      <TableHead className="h-8 px-3 text-xs font-medium">
                        {lang === "pt" ? "Motorista" : lang === "es" ? "Conductor" : "Driver"}
                      </TableHead>
                      <TableHead className="h-8 px-3 text-xs font-medium">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTrips.map((trip, i) => (
                      <TableRow key={`${trip.dailyTripId}-${i}`} className="h-7">
                        <TableCell className="px-3 py-1 text-xs whitespace-nowrap">{trip.demand || "--"}</TableCell>
                        <TableCell className="px-3 py-1 text-xs whitespace-nowrap font-mono">{trip.licensePlate || "--"}</TableCell>
                        <TableCell className="px-3 py-1 text-xs whitespace-nowrap">{trip.locationOrigCode || "--"}</TableCell>
                        <TableCell className="px-3 py-1 text-xs whitespace-nowrap">{trip.locationDestCode || "--"}</TableCell>
                        <TableCell className="px-3 py-1 text-xs whitespace-nowrap">{formatDate(trip.startPlanned)}</TableCell>
                        <TableCell className="px-3 py-1 text-xs whitespace-nowrap">{trip.driverName || "--"}</TableCell>
                        <TableCell className="px-3 py-1 text-xs whitespace-nowrap">
                          <Badge variant="outline" className={`text-[10px] ${statusBadgeClass(trip.statusTrip)}`}>
                            {trip.statusTrip || "--"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                {t("common.noResults")}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <p className="text-xs text-muted-foreground text-center">
        © LATOP Tecnologia da Informação Ltda
      </p>
    </div>
  );
};

export default Dashboard;
