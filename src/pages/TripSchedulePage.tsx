import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search, Loader2, X, ArrowUp, ArrowDown, ArrowUpDown, Plus, MoreVertical, ChevronLeft, ChevronRight, Eraser,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/config/api";
import { authFetch } from "@/lib/auth-fetch";
import { DatePickerField } from "@/components/DatePickerField";
import { LookupSearchField } from "@/components/LookupSearchField";
import { cn } from "@/lib/utils";
import { getOnTimeStatus } from "@/lib/ontime-utils";

import TripGanttChart, {
  type TripRow,
  type TruckRow,
} from "@/components/TripGanttChart";
import { DailyTripEditPanel } from "@/components/DailyTripEditPanel";
import { NewTripDialog } from "@/components/NewTripDialog";

interface LookupItem {
  id: string;
  code?: string;
  description?: string;
  name?: string;
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

const daysBetween = (a: string, b: string) => {
  const da = new Date(a);
  const db = new Date(b);
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
};

const formatDateShort = (v?: string | null) => {
  if (!v) return "--";
  try {
    const d = new Date(v);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "--";
  }
};

type SortDirection = "asc" | "desc" | null;
interface SortConfig { key: string; direction: SortDirection; }

interface ApiResponse {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  trucks: TruckRow[];
  trips: TripRow[];
}

// Multi-select dropdown component
function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
  placeholder = "Todos",
}: {
  label: string;
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
          <label
            key={opt.value}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs"
          >
            <Checkbox
              checked={selected.includes(opt.value)}
              onCheckedChange={() => onToggle(opt.value)}
              className="h-3.5 w-3.5"
            />
            <span className="truncate">{opt.label}</span>
          </label>
        ))}
        {options.length === 0 && (
          <span className="text-xs text-muted-foreground px-2">Carregando...</span>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function TripSchedulePage() {
  const { t } = useTranslation();
  usePageTitle(t("menu.dailyTripsSchedule"));

  const { toast } = useToast();
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [creatingTripData, setCreatingTripData] = useState<Record<string, unknown> | null>(null);
  const [newTripDialogOpen, setNewTripDialogOpen] = useState(false);

  // Lookups
  const { data: fleetGroups } = useQuery<LookupItem[]>({ queryKey: ["fleet-groups"], queryFn: () => fetchLookup("FleetGroup") });
  const { data: locationGroups } = useQuery<LookupItem[]>({ queryKey: ["location-groups-sched"], queryFn: () => fetchLookup("LocationGroup") });

  // Filters
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(plusDaysISO(todayISO(), 7));
  const [fleetGroupCodes, setFleetGroupCodes] = useState<string[]>([]);
  const [locationGroupCode, setLocationGroupCode] = useState("");
  const [licensePlates, setLicensePlates] = useState<string[]>([]);
  const [demandFilter, setDemandFilter] = useState("");

  // Data
  const [trucks, setTrucks] = useState<TruckRow[]>([]);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [pageSize, setPageSize] = useState(200);

  // UI
  const [activeTab, setActiveTab] = useState<"gantt" | "list">("list");
  
  const [sort, setSort] = useState<SortConfig>({ key: "", direction: null });
  
  
  const handleStartDateChange = (val: string | null) => {
    if (!val) return;
    setStartDate(val);
    setEndDate(plusDaysISO(val, 7));
  };

  const handleEndDateChange = (val: string | null) => {
    if (!val) return;
    if (daysBetween(startDate, val) > 15) {
      toast({ title: "Período máximo", description: "A consulta não pode ser superior a 15 dias.", variant: "destructive" });
      return;
    }
    setEndDate(val);
  };

  const toggleFleetGroup = (code: string) => {
    setFleetGroupCodes((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
  };

  const buildUrl = (page: number, overridePageSize?: number) => {
    const params = new URLSearchParams();
    params.set("startDate", startDate.substring(0, 10));
    params.set("endDate", endDate.substring(0, 10));
    params.set("pageNumber", String(page));
    params.set("pageSize", String(overridePageSize ?? pageSize));
    if (locationGroupCode) params.set("locationGroupCode", locationGroupCode);
    if (demandFilter) params.set("demand", demandFilter);
    // Array params
    fleetGroupCodes.forEach((c) => params.append("fleetGroupCodes", c));
    licensePlates.forEach((p) => params.append("licensePlates", p));
    return `${API_BASE}/gantt/GetDailyTripsByPeriodGantt?${params.toString()}`;
  };

  const fetchPage = useCallback(
    async (page: number, overridePageSize?: number) => {
      setLoading(true);
      try {
        const res = await fetch(buildUrl(page, overridePageSize));
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data: ApiResponse = await res.json();
        setTrucks(data.trucks);
        setTrips(data.trips);
        setCurrentPage(data.currentPage);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
        setHasNext(data.hasNext);
        setSearched(true);
      } catch (err) {
        toast({ title: "Erro", description: "Erro ao carregar dados da coordenação.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, fleetGroupCodes, locationGroupCode, licensePlates, demandFilter, pageSize]
  );

  const handleSearch = () => {
    if (daysBetween(startDate, endDate) > 15) {
      toast({ title: "Período máximo", description: "A consulta não pode ser superior a 15 dias.", variant: "destructive" });
      return;
    }
    setTrucks([]);
    setTrips([]);
    setCurrentPage(1);
    fetchPage(1);
  };

  const handleClear = () => {
    setStartDate(todayISO());
    setEndDate(plusDaysISO(todayISO(), 7));
    setFleetGroupCodes([]);
    setLocationGroupCode("");
    setLicensePlates([]);
    setDemandFilter("");
    setTrucks([]);
    setTrips([]);
    setSearched(false);
    setCurrentPage(1);
    setSort({ key: "", direction: null });
  };

  const GANTT_PAGE_SIZES = [100, 150, 200, 250, 300, 350, 400];

  // Sorting
  const handleSort = (key: string) => {
    setSort((prev) => {
      if (prev.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        if (prev.direction === "desc") return { key: "", direction: null };
        return { key, direction: "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const sortedTrips = useMemo(() => {
    if (!sort.key || !sort.direction) return trips;
    return [...trips].sort((a, b) => {
      const va = (a as any)[sort.key] ?? "";
      const vb = (b as any)[sort.key] ?? "";
      if (va < vb) return sort.direction === "asc" ? -1 : 1;
      if (va > vb) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [trips, sort]);

  const SortIcon = ({ column }: { column: string }) => {
    if (sort.key !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    if (sort.direction === "asc") return <ArrowUp className="h-3 w-3 ml-1" />;
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const columns = [
    { key: "licensePlate", label: "Placa" },
    { key: "demand", label: "Demanda" },
    { key: "locationOrigCode", label: "Origem" },
    { key: "locationDestCode", label: "Destino" },
    { key: "startPlanned", label: "Início Plan." },
    { key: "endPlanned", label: "Fim Plan." },
    { key: "startActual", label: "Início Real" },
    { key: "endActual", label: "Fim Real" },
    
    { key: "onTimeDeparture", label: "OnTime Saída" },
    { key: "onTimeDelivery", label: "OnTime Entrega" },
    { key: "driverName", label: "Motorista" },
    { key: "statusTrip", label: "Status" },
  ];




  const refreshData = () => {
    setTrucks([]);
    setTrips([]);
    fetchPage(1);
  };

  // Fleet group options for multi-select
  const fleetGroupOptions = useMemo(() =>
    (fleetGroups || []).map((fg) => ({
      value: fg.code || fg.id,
      label: `${fg.code}${fg.description ? ` - ${fg.description}` : ""}`,
    })),
    [fleetGroups]
  );

  const handleMultiPlateConfirm = (selections: { id: string; label: string; item: Record<string, unknown> }[]) => {
    setLicensePlates(selections.map((s) => s.label));
  };

  const removeLicensePlate = (plate: string) => {
    setLicensePlates((prev) => prev.filter((p) => p !== plate));
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full min-h-0 flex flex-col gap-3"
    >
      {/* Filters */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Data Início <span className="text-destructive">*</span></Label>
          <DatePickerField value={startDate} onChange={handleStartDateChange} placeholder="dd/mm/aaaa" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data Fim <span className="text-destructive">*</span></Label>
          <DatePickerField value={endDate} onChange={handleEndDateChange} placeholder="dd/mm/aaaa" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Grupo de Localidade</Label>
          <Select value={locationGroupCode || "all"} onValueChange={(v) => setLocationGroupCode(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos</SelectItem>
              {locationGroups?.map((lg) => (
                <SelectItem key={lg.id} value={lg.code || lg.id} className="text-xs">
                  {lg.code}{lg.description ? ` - ${lg.description}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Grupo de Frota</Label>
          <MultiSelectDropdown
            label="Grupo de Frota"
            options={fleetGroupOptions}
            selected={fleetGroupCodes}
            onToggle={toggleFleetGroup}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Veículo</Label>
          <LookupSearchField
            endpoint="Truck"
            labelFn="codeName"
            searchFilterParam="Filter1String"
            value=""
            onChange={() => {}}
            placeholder="Selecionar placas..."
            multiSelect
            selectedValues={licensePlates}
            onMultiSelectConfirm={handleMultiPlateConfirm}
            multiSelectValueKey="licensePlate"
            transformItem={(item) => ({
              ...item,
              code: (item.licensePlate as string) || "",
              name: (item.fleetCode as string) || "",
            })}
            modalVisibleColumns={["licensePlate", "fleetCode"]}
            columnLabels={{ licensePlate: "Placa", fleetCode: "Cód. Frota" }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Demanda</Label>
          <Input
            className="h-8 text-xs"
            placeholder="STO, código..."
            value={demandFilter}
            onChange={(e) => setDemandFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between">
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSearch} disabled={loading} className="h-8 gap-1.5 text-xs">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Pesquisar
          </Button>
          <Button size="sm" variant="outline" onClick={handleClear} className="h-8 gap-1.5 text-xs">
            <Eraser className="h-3.5 w-3.5" /> Limpar
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {searched && (
            <span className="text-xs text-muted-foreground">{totalCount} veículos encontrados</span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                <MoreVertical className="h-3.5 w-3.5" />
                Ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setNewTripDialogOpen(true)} className="text-xs gap-2">
                <Plus className="h-3.5 w-3.5" />
                Nova Viagem
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>




      {/* Results */}
      {searched && (
        <div className="flex-1 min-h-0">
          <div className="bg-card rounded-xl border border-border overflow-hidden flex h-full min-h-0 flex-col transition-all">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "gantt" | "list")} className="flex h-full w-full min-h-0 flex-col">
              <div className="px-3 pt-2 flex items-center justify-between border-b border-border pb-2 shrink-0">
                <TabsList className="h-8">
                  <TabsTrigger value="list" className="text-xs h-7 px-3">Listagem</TabsTrigger>
                  <TabsTrigger value="gantt" className="text-xs h-7 px-3">Gantt</TabsTrigger>
                </TabsList>
                <span className="text-xs text-muted-foreground">{trips.length} viagens nesta página</span>
              </div>

              <TabsContent
                value="gantt"
                className="mt-0 h-0 flex-1 min-h-0 overflow-hidden"
                style={{ display: activeTab === "gantt" ? "flex" : undefined, flexDirection: "column" }}
              >
                <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                  <TripGanttChart
                    trucks={trucks}
                    trips={trips}
                    onTripDoubleClick={(trip) => setEditingTripId(trip.dailyTripId)}
                    footer={
                      <div className="flex items-center justify-between px-3 py-2 border-t border-border shrink-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{totalCount} veículos</span>
                          <span className="text-border">|</span>
                          <span>Por página:</span>
                          <Select value={String(pageSize)} onValueChange={(v) => { const ns = Number(v); setPageSize(ns); fetchPage(1, ns); }}>
                            <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {GANTT_PAGE_SIZES.map((n) => (
                                <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Página {currentPage} de {totalPages}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage <= 1} onClick={() => fetchPage(currentPage - 1)}>
                            <ChevronLeft className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage >= totalPages} onClick={() => fetchPage(currentPage + 1)}>
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    }
                  />
                </div>
              </TabsContent>

              <TabsContent value="list" className="mt-0 h-0 flex-1 min-h-0 flex flex-col">
                <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-card">
                      <TableRow>
                        {columns.map((col) => (
                          <TableHead key={col.key} className="text-xs cursor-pointer select-none whitespace-nowrap h-9" onClick={() => handleSort(col.key)}>
                            <span className="flex items-center">{col.label}<SortIcon column={col.key} /></span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTrips.map((trip) => (
                        <TableRow key={trip.dailyTripId} className="h-9">
                          <TableCell className="text-xs py-1">{trip.licensePlate || "--"}</TableCell>
                          <TableCell className="text-xs py-1 max-w-[200px] truncate">{trip.demand || "--"}</TableCell>
                          <TableCell className="text-xs py-1">{trip.locationOrigCode || "--"}</TableCell>
                          <TableCell className="text-xs py-1">{trip.locationDestCode || "--"}</TableCell>
                          <TableCell className="text-xs py-1 whitespace-nowrap">{formatDateShort(trip.startPlanned)}</TableCell>
                          <TableCell className="text-xs py-1 whitespace-nowrap">{formatDateShort(trip.endPlanned)}</TableCell>
                          <TableCell className="text-xs py-1 whitespace-nowrap">{formatDateShort(trip.startActual)}</TableCell>
                          <TableCell className="text-xs py-1 whitespace-nowrap">{formatDateShort(trip.endActual)}</TableCell>
                          <TableCell className="text-xs py-1 whitespace-nowrap">
                            {(() => { const s = getOnTimeStatus(trip.startPlanned, trip.startActual, true); return s.category !== "unknown" ? <Badge variant="outline" className={cn("text-[10px]", s.badgeClass)}>{s.label}</Badge> : "--"; })()}
                          </TableCell>
                          <TableCell className="text-xs py-1 whitespace-nowrap">
                            {(() => { const s = getOnTimeStatus(trip.endPlanned, trip.endActual, false); return s.category !== "unknown" ? <Badge variant="outline" className={cn("text-[10px]", s.badgeClass)}>{s.label}</Badge> : "--"; })()}
                          </TableCell>
                          <TableCell className="text-xs py-1">{trip.driverName || "--"}</TableCell>
                          <TableCell className="text-xs py-1">
                            <Badge variant="outline" className="text-[10px]">{trip.statusTrip || "--"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {sortedTrips.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">Nenhuma viagem encontrada.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {/* List Pagination */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-border shrink-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{totalCount} veículos</span>
                    <span className="text-border">|</span>
                    <span>Por página:</span>
                    <Select value={String(pageSize)} onValueChange={(v) => { const ns = Number(v); setPageSize(ns); fetchPage(1, ns); }}>
                      <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {GANTT_PAGE_SIZES.map((n) => (
                          <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Página {currentPage} de {totalPages}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage <= 1} onClick={() => fetchPage(currentPage - 1)}>
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage >= totalPages} onClick={() => fetchPage(currentPage + 1)}>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {/* Edit trip modal */}
      {editingTripId && (
        <DailyTripEditPanel
          tripId={editingTripId}
          onClose={() => setEditingTripId(null)}
          onSaved={() => { setEditingTripId(null); refreshData(); }}
        />
      )}

      {/* Create trip modal */}
      {creatingTripData && (
        <DailyTripEditPanel
          initialData={creatingTripData}
          onClose={() => setCreatingTripData(null)}
          onSaved={() => { setCreatingTripData(null); if (searched) refreshData(); }}
        />
      )}

      {/* New trip dialog */}
      <NewTripDialog
        open={newTripDialogOpen}
        onOpenChange={setNewTripDialogOpen}
        onTripGenerated={(data) => setCreatingTripData(data as Record<string, unknown>)}
      />
    </motion.div>
  );
}
