import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Radio, Users, CheckCircle2, Clock, Moon, Search, Filter, Download, MoreHorizontal, Truck, MapPin, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageTitle } from "@/hooks/use-page-title";

// --- Mock Data ---
const driverData = [
  { name: "Carlos Silva", vehicle: "ABC-1234", fleet: "FL-001", base: "CD Guarulhos", location: "SP - Capital", lastTrip: "VD-330-001", endTime: "14:30", restRemaining: "—", nextAvailable: "Agora", status: "available" },
  { name: "José Santos", vehicle: "DEF-5678", fleet: "FL-005", base: "CD Barueri", location: "SP - Oeste", lastTrip: "VD-330-005", endTime: "—", restRemaining: "—", nextAvailable: "—", status: "on_trip" },
  { name: "Maria Oliveira", vehicle: "GHI-9012", fleet: "FL-003", base: "CD Guarulhos", location: "SP - Capital", lastTrip: "VD-329-012", endTime: "22:00", restRemaining: "4h 30min", nextAvailable: "09:30", status: "resting" },
  { name: "Pedro Costa", vehicle: "JKL-3456", fleet: "FL-008", base: "CD Jundiaí", location: "SP - Interior", lastTrip: "VD-330-003", endTime: "—", restRemaining: "—", nextAvailable: "—", status: "on_trip" },
  { name: "Ana Pereira", vehicle: "MNO-7890", fleet: "FL-002", base: "CD Guarulhos", location: "SP - Capital", lastTrip: "VD-329-008", endTime: "18:00", restRemaining: "—", nextAvailable: "Agora", status: "available" },
  { name: "Lucas Ferreira", vehicle: "PQR-1122", fleet: "FL-006", base: "CD Barueri", location: "SP - Oeste", lastTrip: "VD-329-015", endTime: "23:45", restRemaining: "6h 15min", nextAvailable: "11:00", status: "resting" },
  { name: "Roberto Almeida", vehicle: "—", fleet: "—", base: "CD Guarulhos", location: "SP - Capital", lastTrip: "—", endTime: "—", restRemaining: "—", nextAvailable: "05/04/2026", status: "unavailable" },
  { name: "Fernanda Lima", vehicle: "STU-3344", fleet: "FL-010", base: "CD Jundiaí", location: "SP - Interior", lastTrip: "VD-330-009", endTime: "16:00", restRemaining: "—", nextAvailable: "Agora", status: "available" },
  { name: "Marcos Souza", vehicle: "VWX-5566", fleet: "FL-004", base: "CD Guarulhos", location: "SP - Capital", lastTrip: "VD-330-011", endTime: "—", restRemaining: "—", nextAvailable: "—", status: "on_trip" },
  { name: "Juliana Costa", vehicle: "YZA-7788", fleet: "FL-007", base: "CD Barueri", location: "SP - Oeste", lastTrip: "VD-329-020", endTime: "20:00", restRemaining: "2h 00min", nextAvailable: "08:00", status: "resting" },
];

const vehicleData = [
  { plate: "ABC-1234", fleet: "FL-001", type: "Truck", base: "CD Guarulhos", location: "SP - Capital", driver: "Carlos Silva", km: "128.430", lastMaint: "25/03/2026", nextMaint: "25/04/2026", status: "in_use" },
  { plate: "DEF-5678", fleet: "FL-005", type: "Carreta", base: "CD Barueri", location: "SP - Oeste", driver: "José Santos", km: "95.200", lastMaint: "20/03/2026", nextMaint: "20/04/2026", status: "in_use" },
  { plate: "GHI-9012", fleet: "FL-003", type: "Truck", base: "CD Guarulhos", location: "SP - Capital", driver: "—", km: "210.880", lastMaint: "18/03/2026", nextMaint: "18/04/2026", status: "available" },
  { plate: "JKL-3456", fleet: "FL-008", type: "Bitrem", base: "CD Jundiaí", location: "SP - Interior", driver: "Pedro Costa", km: "67.300", lastMaint: "22/03/2026", nextMaint: "22/04/2026", status: "in_use" },
  { plate: "MNO-7890", fleet: "FL-002", type: "Truck", base: "CD Guarulhos", location: "SP - Capital", driver: "—", km: "185.600", lastMaint: "15/03/2026", nextMaint: "15/04/2026", status: "available" },
  { plate: "PQR-1122", fleet: "FL-006", type: "Carreta", base: "CD Barueri", location: "SP - Oeste", driver: "—", km: "142.100", lastMaint: "28/03/2026", nextMaint: "28/04/2026", status: "maintenance" },
  { plate: "STU-3344", fleet: "FL-010", type: "Truck", base: "CD Jundiaí", location: "SP - Interior", driver: "Fernanda Lima", km: "78.900", lastMaint: "30/03/2026", nextMaint: "30/04/2026", status: "in_use" },
  { plate: "VWX-5566", fleet: "FL-004", type: "Bitrem", base: "CD Guarulhos", location: "SP - Capital", driver: "Marcos Souza", km: "156.200", lastMaint: "12/03/2026", nextMaint: "12/04/2026", status: "in_use" },
  { plate: "YZA-7788", fleet: "FL-007", type: "Carreta", base: "CD Barueri", location: "SP - Oeste", driver: "—", km: "201.500", lastMaint: "10/03/2026", nextMaint: "10/04/2026", status: "available" },
  { plate: "BCD-9900", fleet: "FL-009", type: "Truck", base: "CD Guarulhos", location: "SP - Capital", driver: "—", km: "44.300", lastMaint: "01/04/2026", nextMaint: "01/05/2026", status: "reserve" },
];

const driverStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  available: { label: "Disponível", variant: "default" },
  on_trip: { label: "Em Viagem", variant: "secondary" },
  resting: { label: "Descansando", variant: "outline" },
  unavailable: { label: "Indisponível", variant: "destructive" },
};

const vehicleStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  available: { label: "Disponível", variant: "default" },
  in_use: { label: "Em Uso", variant: "secondary" },
  maintenance: { label: "Manutenção", variant: "destructive" },
  reserve: { label: "Reserva", variant: "outline" },
};

const driverColumns = [
  { key: "name", label: "Motorista" },
  { key: "vehicle", label: "Veículo" },
  { key: "fleet", label: "Frota" },
  { key: "base", label: "Base" },
  { key: "location", label: "Localidade" },
  { key: "lastTrip", label: "Última Viagem" },
  { key: "restRemaining", label: "Descanso" },
  { key: "nextAvailable", label: "Disponível em" },
  { key: "status", label: "Status" },
];

const vehicleColumns = [
  { key: "plate", label: "Placa" },
  { key: "fleet", label: "Frota" },
  { key: "type", label: "Tipo" },
  { key: "base", label: "Base" },
  { key: "location", label: "Localidade" },
  { key: "driver", label: "Motorista" },
  { key: "km", label: "Km Atual" },
  { key: "nextMaint", label: "Próx. Manutenção" },
  { key: "status", label: "Status" },
];

// --- Base Summary Component ---
function BaseSummary({ driverFiltered, vehicleFiltered }: { driverFiltered: typeof driverData; vehicleFiltered: typeof vehicleData }) {
  const bases = useMemo(() => {
    const allBases = [...new Set([...driverFiltered.map(d => d.base), ...vehicleFiltered.map(v => v.base)])].sort();
    return allBases.map(base => {
      const driversInBase = driverFiltered.filter(d => d.base === base);
      const vehiclesInBase = vehicleFiltered.filter(v => v.base === base);
      return {
        base,
        totalDrivers: driversInBase.length,
        driversAvailable: driversInBase.filter(d => d.status === "available").length,
        driversOnTrip: driversInBase.filter(d => d.status === "on_trip").length,
        totalVehicles: vehiclesInBase.length,
        vehiclesAvailable: vehiclesInBase.filter(v => v.status === "available").length,
        vehiclesInUse: vehiclesInBase.filter(v => v.status === "in_use").length,
        vehiclesMaint: vehiclesInBase.filter(v => v.status === "maintenance").length,
      };
    });
  }, [driverFiltered, vehicleFiltered]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {bases.map((b) => (
        <Card key={b.base} className="border-l-4 border-l-primary">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm text-foreground">{b.base}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Motoristas:</span>
                <span className="font-semibold text-foreground">{b.totalDrivers}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Veículos:</span>
                <span className="font-semibold text-foreground">{b.totalVehicles}</span>
              </div>
              <div className="pl-5">
                <Badge variant="default" className="text-[10px] px-1.5 py-0">{b.driversAvailable} disp.</Badge>
                {" "}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{b.driversOnTrip} viagem</Badge>
              </div>
              <div className="pl-5">
                <Badge variant="default" className="text-[10px] px-1.5 py-0">{b.vehiclesAvailable} disp.</Badge>
                {" "}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{b.vehiclesInUse} uso</Badge>
                {b.vehiclesMaint > 0 && (
                  <>
                    {" "}
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{b.vehiclesMaint} manut.</Badge>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// --- Main Page ---
export default function DriverAvailabilityPage() {
  usePageTitle("Painel de Disponibilidade", Radio);
  const [search, setSearch] = useState("");
  const [selectedBase, setSelectedBase] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("drivers");

  const bases = useMemo(() => [...new Set([...driverData.map(d => d.base), ...vehicleData.map(v => v.base)])].sort(), []);
  const locations = useMemo(() => [...new Set([...driverData.map(d => d.location), ...vehicleData.map(v => v.location)])].sort(), []);

  const filteredDrivers = useMemo(() => {
    return driverData.filter((row) => {
      if (selectedBase !== "all" && row.base !== selectedBase) return false;
      if (selectedLocation !== "all" && row.location !== selectedLocation) return false;
      if (selectedStatus !== "all" && row.status !== selectedStatus) return false;
      if (search) {
        return Object.values(row).some((v) => String(v).toLowerCase().includes(search.toLowerCase()));
      }
      return true;
    });
  }, [search, selectedBase, selectedLocation, selectedStatus]);

  const filteredVehicles = useMemo(() => {
    return vehicleData.filter((row) => {
      if (selectedBase !== "all" && row.base !== selectedBase) return false;
      if (selectedLocation !== "all" && row.location !== selectedLocation) return false;
      if (selectedStatus !== "all" && row.status !== selectedStatus) return false;
      if (search) {
        return Object.values(row).some((v) => String(v).toLowerCase().includes(search.toLowerCase()));
      }
      return true;
    });
  }, [search, selectedBase, selectedLocation, selectedStatus]);

  const driverStats = useMemo(() => {
    const d = filteredDrivers;
    const total = d.length;
    const available = d.filter(r => r.status === "available").length;
    const onTrip = d.filter(r => r.status === "on_trip").length;
    const resting = d.filter(r => r.status === "resting").length;
    const unavailable = d.filter(r => r.status === "unavailable").length;
    return [
      { label: "Motoristas Disponíveis", value: available, icon: CheckCircle2 },
      { label: "Em Viagem", value: onTrip, badge: total > 0 ? `${Math.round((onTrip / total) * 100)}%` : undefined, icon: Radio },
      { label: "Em Descanso", value: resting, icon: Moon },
      { label: "Indisponíveis", value: unavailable, icon: Clock },
    ];
  }, [filteredDrivers]);

  const vehicleStats = useMemo(() => {
    const v = filteredVehicles;
    const total = v.length;
    const available = v.filter(r => r.status === "available").length;
    const inUse = v.filter(r => r.status === "in_use").length;
    const maint = v.filter(r => r.status === "maintenance").length;
    const reserve = v.filter(r => r.status === "reserve").length;
    return [
      { label: "Veículos Disponíveis", value: available, icon: CheckCircle2 },
      { label: "Em Uso", value: inUse, badge: total > 0 ? `${Math.round((inUse / total) * 100)}%` : undefined, icon: Truck },
      { label: "Manutenção", value: maint, icon: Clock },
      { label: "Reserva Técnica", value: reserve, icon: Moon },
    ];
  }, [filteredVehicles]);

  const currentStats = activeTab === "drivers" ? driverStats : vehicleStats;
  const currentStatusMap = activeTab === "drivers" ? driverStatusMap : vehicleStatusMap;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 p-4"
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {currentStats.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-foreground">{s.value}</span>
                  {s.badge && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">{s.badge}</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 min-w-[200px] flex-1 max-w-xs">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={selectedBase} onValueChange={setSelectedBase}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Base" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Bases</SelectItem>
                  {bases.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 min-w-[200px] flex-1 max-w-xs">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Localidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Localidades</SelectItem>
                  {locations.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 min-w-[180px] flex-1 max-w-[200px]">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {Object.entries(currentStatusMap).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSelectedBase("all"); setSelectedLocation("all"); setSelectedStatus("all"); setSearch(""); }}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Base Summary */}
      <BaseSummary driverFiltered={filteredDrivers} vehicleFiltered={filteredVehicles} />

      {/* Tabs: Motoristas / Veículos */}
      <Card>
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedStatus("all"); }}>
          <CardHeader className="pb-0 pt-4 px-4">
            <div className="flex items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="drivers" className="gap-1.5">
                  <Users className="h-4 w-4" /> Motoristas
                </TabsTrigger>
                <TabsTrigger value="vehicles" className="gap-1.5">
                  <Truck className="h-4 w-4" /> Veículos
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <div className="relative max-w-[240px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" /> Exportar
                </Button>
              </div>
            </div>
          </CardHeader>

          <TabsContent value="drivers" className="mt-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {driverColumns.map((col) => (
                      <TableHead key={col.key} className="text-xs font-semibold">{col.label}</TableHead>
                    ))}
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers.map((row, i) => (
                    <TableRow key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                      {driverColumns.map((col) => (
                        <TableCell key={col.key} className="text-sm py-2.5">
                          {col.key === "status"
                            ? (() => {
                                const mapped = driverStatusMap[row.status];
                                return mapped ? <Badge variant={mapped.variant} className="text-xs">{mapped.label}</Badge> : row.status;
                              })()
                            : (row as Record<string, string>)[col.key]}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="px-4 py-3 text-xs text-muted-foreground border-t">
                {filteredDrivers.length} motorista(s) encontrado(s)
              </div>
            </CardContent>
          </TabsContent>

          <TabsContent value="vehicles" className="mt-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {vehicleColumns.map((col) => (
                      <TableHead key={col.key} className="text-xs font-semibold">{col.label}</TableHead>
                    ))}
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((row, i) => (
                    <TableRow key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                      {vehicleColumns.map((col) => (
                        <TableCell key={col.key} className="text-sm py-2.5">
                          {col.key === "status"
                            ? (() => {
                                const mapped = vehicleStatusMap[row.status];
                                return mapped ? <Badge variant={mapped.variant} className="text-xs">{mapped.label}</Badge> : row.status;
                              })()
                            : (row as Record<string, string>)[col.key]}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="px-4 py-3 text-xs text-muted-foreground border-t">
                {filteredVehicles.length} veículo(s) encontrado(s)
              </div>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </motion.div>
  );
}
