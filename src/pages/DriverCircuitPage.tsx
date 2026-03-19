import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search, Loader2, X, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon,
  Pencil, Trash2, Plus, Filter, Truck,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
// collapsible removed - using manual expand/collapse
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/config/api";
import { DatePickerField } from "@/components/DatePickerField";
import { LookupSearchField } from "@/components/LookupSearchField";
import { cn } from "@/lib/utils";
import CircuitGanttChart from "@/components/CircuitGanttChart";
import { CircuitEditPanel } from "@/components/CircuitEditPanel";

interface LookupItem {
  id: string;
  code?: string;
  description?: string;
  [k: string]: unknown;
}

const fetchLookup = async (endpoint: string): Promise<LookupItem[]> => {
  const res = await fetch(`${API_BASE}/${endpoint}?PageSize=999`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
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

const formatDT = (v?: string | null) => {
  if (!v) return "--";
  try {
    const d = new Date(v);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch { return "--"; }
};

// MultiSelectDropdown (reused pattern from TripSchedulePage)
function MultiSelectDropdown({
  options, selected, onToggle, placeholder = "Todos",
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  placeholder?: string;
}) {
  const displayText = selected.length === 0
    ? placeholder
    : selected.length <= 2
      ? selected.join(", ")
      : `${selected.length} selecionados`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-8 text-xs w-full justify-between font-normal">
          <span className="truncate">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-2 max-h-[260px] overflow-y-auto" align="start">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs">
            <Checkbox checked={selected.includes(opt.value)} onCheckedChange={() => onToggle(opt.value)} className="h-3.5 w-3.5" />
            <span className="truncate">{opt.label}</span>
          </label>
        ))}
        {options.length === 0 && <span className="text-xs text-muted-foreground px-2">Carregando...</span>}
      </PopoverContent>
    </Popover>
  );
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

interface DriverRow {
  id: string;
  nickName: string;
  integrationCode: string;
  driverBases: { locationGroup?: { code?: string } }[];
  driverAttributions: { attribution?: { code?: string } }[];
  driverFleets: { fleetGroup?: { code?: string } }[];
  driverPositions: { position?: { code?: string } }[];
  [k: string]: unknown;
}

interface CircuitApiResponse {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  drivers: DriverRow[];
  circuitDrivers: CircuitDriver[];
}

const statusMap: Record<number, { label: string; color: string }> = {
  0: { label: "Previsto", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  1: { label: "Em andamento", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  2: { label: "Realizado", color: "bg-muted text-muted-foreground" },
};

const getDriverBase = (d: DriverRow) =>
  d.driverBases?.[0]?.locationGroup?.code || "--";
const getDriverAttribution = (d: DriverRow) =>
  d.driverAttributions?.[0]?.attribution?.code || "--";
const getDriverFleet = (d: DriverRow) =>
  d.driverFleets?.[0]?.fleetGroup?.code || "--";

export default function DriverCircuitPage() {
  const { t } = useTranslation();
  usePageTitle(t("menu.driversSchedule"));
  const { toast } = useToast();

  // Lookups
  const { data: locationGroups } = useQuery<LookupItem[]>({ queryKey: ["lg-circuit"], queryFn: () => fetchLookup("LocationGroup") });
  const { data: fleetGroups } = useQuery<LookupItem[]>({ queryKey: ["fg-circuit"], queryFn: () => fetchLookup("FleetGroup") });
  const { data: positions } = useQuery<LookupItem[]>({ queryKey: ["pos-circuit"], queryFn: () => fetchLookup("Position") });

  // Filters
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(plusDaysISO(todayISO(), 7));
  const [locationGroupCode, setLocationGroupCode] = useState("");
  const [fleetGroupCodes, setFleetGroupCodes] = useState<string[]>([]);
  const [driverIds, setDriverIds] = useState<string[]>([]);
  const [positionCode, setPositionCode] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Data
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [circuitDrivers, setCircuitDrivers] = useState<CircuitDriver[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // UI
  const [activeTab, setActiveTab] = useState<"list" | "gantt">("list");
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set());
  const [editCircuitId, setEditCircuitId] = useState<string | null>(null);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [deleteCircuitId, setDeleteCircuitId] = useState<string | null>(null);
  const toggleFleetGroup = (code: string) =>
    setFleetGroupCodes((p) => p.includes(code) ? p.filter((c) => c !== code) : [...p, code]);

  const fleetGroupOptions = useMemo(() =>
    (fleetGroups || [])
      .map((fg) => ({ value: fg.code || fg.id, label: `${fg.code}${fg.description ? ` - ${fg.description}` : ""}` }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [fleetGroups]
  );

  const locationGroupOptions = useMemo(() =>
    (locationGroups || [])
      .map((lg) => ({ value: lg.code || lg.id, label: `${lg.code}${lg.description ? ` - ${lg.description}` : ""}` }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [locationGroups]
  );

  const positionOptions = useMemo(() =>
    (positions || [])
      .map((p) => ({ value: p.code || p.id, label: `${p.code}${p.description ? ` - ${p.description}` : ""}` }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [positions]
  );

  const buildUrl = (page: number, overridePageSize?: number) => {
    const params = new URLSearchParams();
    params.set("startDate", startDate.substring(0, 10));
    params.set("endDate", endDate.substring(0, 10));
    params.set("pageNumber", String(page));
    params.set("pageSize", String(overridePageSize ?? pageSize));
    if (locationGroupCode) params.set("locationGroupCode", locationGroupCode);
    if (positionCode) params.set("positionCode", positionCode);
    fleetGroupCodes.forEach((c) => params.append("fleetGroupCodes", c));
    driverIds.forEach((id) => params.append("driverIds", id));
    return `${API_BASE}/gantt/GetCircuits?${params.toString()}`;
  };

  const fetchData = useCallback(async (page: number, overridePageSize?: number) => {
    if (!startDate || !endDate) {
      toast({ title: "Campos obrigatórios", description: "Preencha as datas de início e fim.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(buildUrl(page, overridePageSize));
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data: CircuitApiResponse = await res.json();
      setDrivers(data.drivers || []);
      setCircuitDrivers(data.circuitDrivers || []);
      setCurrentPage(data.currentPage);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
      setSearched(true);
      setExpandedDrivers(new Set());
    } catch {
      toast({ title: "Erro", description: "Erro ao carregar circuitos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, locationGroupCode, fleetGroupCodes, driverIds, positionCode, pageSize]);

  const handleSearch = () => fetchData(1);
  const handleClear = () => {
    setStartDate(todayISO());
    setEndDate(plusDaysISO(todayISO(), 7));
    setLocationGroupCode("");
    setFleetGroupCodes([]);
    setDriverIds([]);
    setPositionCode("");
    setDrivers([]);
    setCircuitDrivers([]);
    setSearched(false);
    setCurrentPage(1);
    setExpandedDrivers(new Set());
  };

  const toggleDriver = (id: string) => {
    setExpandedDrivers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getCircuitsForDriver = (driverId: string) =>
    circuitDrivers.filter((cd) => cd.driverId === driverId);

  const handleDriverMultiSelect = (selections: { id: string; label: string; item: Record<string, unknown> }[]) => {
    setDriverIds(selections.map((s) => s.id));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-3">
      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Data Início <span className="text-destructive">*</span></Label>
          <DatePickerField value={startDate} onChange={(v) => { if (v) { setStartDate(v); setEndDate(plusDaysISO(v, 7)); } }} placeholder="dd/mm/aaaa" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data Fim <span className="text-destructive">*</span></Label>
          <DatePickerField value={endDate} onChange={(v) => v && setEndDate(v)} placeholder="dd/mm/aaaa" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Grupo de Localidade</Label>
          <Select value={locationGroupCode || "all"} onValueChange={(v) => setLocationGroupCode(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos</SelectItem>
              {locationGroupOptions.map((lg) => (
                <SelectItem key={lg.value} value={lg.value} className="text-xs">{lg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Grupo de Frota</Label>
          <MultiSelectDropdown options={fleetGroupOptions} selected={fleetGroupCodes} onToggle={toggleFleetGroup} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-2">
            Motorista
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Switch checked={showInactive} onCheckedChange={setShowInactive} className="h-3.5 w-7 data-[state=checked]:bg-primary" />
              Inativos
            </span>
          </Label>
          <LookupSearchField
            endpoint="Drivers"
            labelFn="codeName"
            searchFilterParam="Filter1String"
            value=""
            onChange={() => {}}
            placeholder="Motorista..."
            multiSelect
            selectedValues={driverIds}
            onMultiSelectConfirm={handleDriverMultiSelect}
            extraParams={showInactive ? undefined : { IsActive: "1" }}
            transformItem={(item) => ({
              ...item,
              code: (item.nickName as string) || "",
              name: (item.integrationCode as string) || "",
            })}
            modalVisibleColumns={["nickName", "integrationCode"]}
            columnLabels={{ nickName: "Nome de Escala", integrationCode: "Cód. Integração" }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Cargo</Label>
          <Select value={positionCode || "all"} onValueChange={(v) => setPositionCode(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos</SelectItem>
              {positionOptions.map((p) => (
                <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSearch} disabled={loading} className="h-8 gap-1.5 text-xs">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Pesquisar
          </Button>
          <Button size="sm" variant="outline" onClick={handleClear} className="h-8 gap-1.5 text-xs">
            <X className="h-3.5 w-3.5" /> Limpar
          </Button>
        </div>
        {searched && <span className="text-xs text-muted-foreground">{totalCount} motorista(s)</span>}
      </div>

      {/* Action buttons */}
      {searched && (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setShowCreatePanel(true)}>
            <Plus className="h-3.5 w-3.5" /> Novo Circuito
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" disabled>
            <Truck className="h-3.5 w-3.5" /> Viagens Sem Motorista
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" disabled>
            <Filter className="h-3.5 w-3.5" /> Filtrar Demanda em Circuito
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" disabled>
            <Filter className="h-3.5 w-3.5" /> Filtrar Atividade em Circuito
          </Button>
        </div>
      )}

      {/* Results */}
      {searched && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "list" | "gantt")} className="w-full">
            <div className="px-3 pt-2 border-b border-border pb-2">
              <TabsList className="h-8">
                <TabsTrigger value="list" className="text-xs h-7 px-3">Listagem</TabsTrigger>
                <TabsTrigger value="gantt" className="text-xs h-7 px-3">Gantt</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="list" className="mt-0">
              <div className="overflow-auto max-h-[calc(100vh-340px)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8 text-xs px-2 w-8"></TableHead>
                      <TableHead className="h-8 text-xs px-2">Nome de Escala</TableHead>
                      <TableHead className="h-8 text-xs px-2">Cód. Integração</TableHead>
                      <TableHead className="h-8 text-xs px-2">Base</TableHead>
                      <TableHead className="h-8 text-xs px-2">Atribuição</TableHead>
                      <TableHead className="h-8 text-xs px-2">Grupo Frota</TableHead>
                      <TableHead className="h-8 text-xs px-2 text-center">Circuitos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">
                          Nenhum motorista encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      drivers.map((driver) => {
                        const circuits = getCircuitsForDriver(driver.id);
                        const isExpanded = expandedDrivers.has(driver.id);
                        return [
                          <TableRow
                            key={driver.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => toggleDriver(driver.id)}
                          >
                            <TableCell className="h-8 px-2 py-1">
                              <ChevronRightIcon className={cn("h-3.5 w-3.5 transition-transform duration-200", isExpanded && "rotate-90")} />
                            </TableCell>
                            <TableCell className="h-8 text-xs px-2 py-1 font-medium">{driver.nickName || "--"}</TableCell>
                            <TableCell className="h-8 text-xs px-2 py-1">{driver.integrationCode || "--"}</TableCell>
                            <TableCell className="h-8 text-xs px-2 py-1">{getDriverBase(driver)}</TableCell>
                            <TableCell className="h-8 text-xs px-2 py-1">{getDriverAttribution(driver)}</TableCell>
                            <TableCell className="h-8 text-xs px-2 py-1">{getDriverFleet(driver)}</TableCell>
                            <TableCell className="h-8 text-xs px-2 py-1 text-center">
                              <Badge variant="secondary" className="text-[10px]">{circuits.length}</Badge>
                            </TableCell>
                          </TableRow>,
                          ...(isExpanded ? [
                            circuits.length > 0 ? (
                              <TableRow key={`${driver.id}-header`} className="bg-muted/30">
                                <TableCell className="h-6 px-2 py-0"></TableCell>
                                <TableCell colSpan={2} className="h-6 text-[10px] px-2 py-0 font-semibold text-muted-foreground uppercase tracking-wider">Cód. Circuito</TableCell>
                                <TableCell className="h-6 text-[10px] px-2 py-0 font-semibold text-muted-foreground uppercase tracking-wider">Início</TableCell>
                                <TableCell className="h-6 text-[10px] px-2 py-0 font-semibold text-muted-foreground uppercase tracking-wider">Fim</TableCell>
                                <TableCell className="h-6 text-[10px] px-2 py-0 font-semibold text-muted-foreground uppercase tracking-wider">Status</TableCell>
                                <TableCell className="h-6 text-[10px] px-2 py-0 font-semibold text-muted-foreground uppercase tracking-wider text-center">Ações</TableCell>
                              </TableRow>
                            ) : null,
                            ...(circuits.length > 0 ? circuits.map((circuit) => {
                              const st = statusMap[Number(circuit.status) ?? 0] || statusMap[0];
                              return (
                                <TableRow key={circuit.id} className="bg-muted/20">
                                  <TableCell className="h-7 px-2 py-0.5"></TableCell>
                                  <TableCell colSpan={2} className="h-7 text-xs px-2 py-0.5 font-mono">{circuit.circuitCode || "--"}</TableCell>
                                  <TableCell className="h-7 text-xs px-2 py-0.5">{formatDT(circuit.startDate)}</TableCell>
                                  <TableCell className="h-7 text-xs px-2 py-0.5">{formatDT(circuit.endDate)}</TableCell>
                                  <TableCell className="h-7 text-xs px-2 py-0.5">
                                    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${st.color}`}>{st.label}</span>
                                  </TableCell>
                                  <TableCell className="h-7 px-2 py-0.5">
                                    <div className="flex gap-1 justify-center">
                                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Editar" onClick={(e) => { e.stopPropagation(); setEditCircuitId(circuit.circuitJourneyId || circuit.circuitId || circuit.id); }}>
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="Excluir" onClick={(e) => { e.stopPropagation(); setDeleteCircuitId(circuit.circuitJourneyId || circuit.circuitId || circuit.id); }}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            }) : [
                              <TableRow key={`${driver.id}-empty`} className="bg-muted/20">
                                <TableCell colSpan={7} className="h-7 text-xs px-6 py-1 text-muted-foreground">
                                  Nenhum circuito para este motorista.
                                </TableCell>
                              </TableRow>
                            ]),
                          ] : []),
                        ];
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{totalCount} {t("common.records")}</span>
                  <span className="text-border">|</span>
                  <span>{t("common.rowsPerPage")}:</span>
                  <Select value={String(pageSize)} onValueChange={(v) => { const ns = Number(v); setPageSize(ns); fetchData(1, ns); }}>
                    <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50, 100].map((n) => (
                        <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{t("common.page")} {currentPage} {t("common.of")} {totalPages}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage <= 1} onClick={() => fetchData(currentPage - 1)}>
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage >= totalPages} onClick={() => fetchData(currentPage + 1)}>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="gantt" className="mt-0">
              <div className="overflow-auto max-h-[calc(100vh-340px)]">
                <CircuitGanttChart drivers={drivers} circuitDrivers={circuitDrivers} />
              </div>
              {/* Gantt Pagination */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{totalCount} {t("common.records")}</span>
                  <span className="text-border">|</span>
                  <span>{t("common.rowsPerPage")}:</span>
                  <Select value={String(pageSize)} onValueChange={(v) => { const ns = Number(v); setPageSize(ns); fetchData(1, ns); }}>
                    <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50, 100].map((n) => (
                        <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{t("common.page")} {currentPage} {t("common.of")} {totalPages}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage <= 1} onClick={() => fetchData(currentPage - 1)}>
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage >= totalPages} onClick={() => fetchData(currentPage + 1)}>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Circuit edit/create panel */}
      {(editCircuitId || showCreatePanel) && (
        <CircuitEditPanel
          circuitId={editCircuitId || undefined}
          onClose={() => { setEditCircuitId(null); setShowCreatePanel(false); }}
          onSaved={() => fetchData(currentPage)}
        />
      )}

      {/* Delete circuit confirm */}
      <AlertDialog open={!!deleteCircuitId} onOpenChange={(open) => !open && setDeleteCircuitId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Circuito</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este circuito? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              toast({ title: "Exclusão", description: "Funcionalidade de exclusão será implementada com o endpoint." });
              setDeleteCircuitId(null);
            }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
