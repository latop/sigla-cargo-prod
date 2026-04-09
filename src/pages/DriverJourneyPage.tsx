import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { motion } from "framer-motion";
import {
  Search, Loader2, X, ChevronLeft, ChevronRight, Plus, Trash2,
  ArrowUpDown, ArrowUp, ArrowDown, Eraser,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/config/api";
import { authFetch } from "@/lib/auth-fetch";
import { DatePickerField } from "@/components/DatePickerField";
import { LookupSearchField } from "@/components/LookupSearchField";
import { cn } from "@/lib/utils";
import JourneyGanttChart from "@/components/JourneyGanttChart";
import { JourneyEditPanel } from "@/components/JourneyEditPanel";

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

export interface JourneyRecord {
  id: string;
  driverId?: string;
  driverNickName?: string;
  driverIntegrationCode?: string;
  circuitJourneyId?: string;
  circuitCode?: string;
  startDate?: string | null;
  endDate?: string | null;
  startPlanned?: string | null;
  endPlanned?: string | null;
  startActual?: string | null;
  endActual?: string | null;
  flgCurrent?: boolean | null;
  flgStatus?: string | null;
  status?: string | null;
  notes?: string | null;
  [k: string]: unknown;
}

type SortDirection = "asc" | "desc" | null;
interface SortConfig { key: string; direction: SortDirection; }

const FLG_CURRENT_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "true", label: "Sim" },
  { value: "false", label: "Não" },
];

const FLG_STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "A", label: "Ativo" },
  { value: "I", label: "Inativo" },
  { value: "P", label: "Previsto" },
  { value: "E", label: "Executado" },
];

export default function DriverJourneyPage() {
  const { t } = useTranslation();
  usePageTitle(t("menu.driverJourney"));
  const { toast } = useToast();

  // Filters
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(plusDaysISO(todayISO(), 7));
  const [driverId, setDriverId] = useState("");
  const [driverLabel, setDriverLabel] = useState("");
  const [circuitId, setCircuitId] = useState("");
  const [circuitLabel, setCircuitLabel] = useState("");
  const [flgCurrent, setFlgCurrent] = useState("all");
  const [flgStatus, setFlgStatus] = useState("all");

  // Data
  const [journeys, setJourneys] = useState<JourneyRecord[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // UI
  const [activeTab, setActiveTab] = useState<"gantt" | "list">("list");
  const [sort, setSort] = useState<SortConfig>({ key: "", direction: null });
  const [editJourneyId, setEditJourneyId] = useState<string | null>(null);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [deleteJourneyId, setDeleteJourneyId] = useState<string | null>(null);

  const PAGE_SIZES = [50, 100, 150, 200, 300, 400];

  const buildUrl = (page: number, overridePageSize?: number) => {
    const params = new URLSearchParams();
    params.set("Filter1String", startDate.substring(0, 10));
    params.set("Filter2String", endDate.substring(0, 10));
    if (flgCurrent !== "all") params.set("Filter3String", flgCurrent);
    if (flgStatus !== "all") params.set("Filter4String", flgStatus);
    if (driverId) params.set("Filter1Id", driverId);
    if (circuitId) params.set("Filter2Id", circuitId);
    params.set("PageNumber", String(page));
    params.set("PageSize", String(overridePageSize ?? pageSize));
    return `/Journey?${params.toString()}`;
  };

  const fetchPage = useCallback(async (page: number, overridePageSize?: number) => {
    setLoading(true);
    try {
      const res = await authFetch(buildUrl(page, overridePageSize));
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const pagination = res.headers.get("x-pagination");
      let meta = { TotalCount: 0, PageSize: 50, CurrentPage: 1, TotalPages: 1 };
      if (pagination) meta = JSON.parse(pagination);
      const data: JourneyRecord[] = await res.json();

      // Normalize driver info
      const normalized = data.map((j: any) => ({
        ...j,
        id: j.journeyId || j.id,
        driverNickName: j.driver?.nickName || j.driverNickName || j.nickName || "--",
        driverIntegrationCode: j.driver?.integrationCode || j.driverIntegrationCode || j.integrationCode || "",
        circuitCode: j.circuitDriver?.circuitCode || j.circuitCode || "",
      }));

      setJourneys(normalized);
      setCurrentPage(meta.CurrentPage);
      setTotalPages(meta.TotalPages);
      setTotalCount(meta.TotalCount);
      setSearched(true);
    } catch (err: any) {
      toast({ title: "Erro", description: "Erro ao carregar jornadas.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, driverId, circuitId, flgCurrent, flgStatus, pageSize]);

  const handleSearch = () => {
    setJourneys([]);
    setCurrentPage(1);
    fetchPage(1);
  };

  const handleClear = () => {
    setStartDate(todayISO());
    setEndDate(plusDaysISO(todayISO(), 7));
    setDriverId("");
    setDriverLabel("");
    setCircuitId("");
    setCircuitLabel("");
    setFlgCurrent("all");
    setFlgStatus("all");
    setJourneys([]);
    setSearched(false);
    setSort({ key: "", direction: null });
  };

  const handleDelete = async () => {
    if (!deleteJourneyId) return;
    try {
      const res = await authFetch(`/Journey/${deleteJourneyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      toast({ title: "Jornada excluída com sucesso." });
      setDeleteJourneyId(null);
      fetchPage(currentPage);
    } catch {
      toast({ title: "Erro ao excluir jornada.", variant: "destructive" });
    }
  };

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

  const sortedJourneys = useMemo(() => {
    if (!sort.key || !sort.direction) return journeys;
    return [...journeys].sort((a, b) => {
      const va = (a as any)[sort.key] ?? "";
      const vb = (b as any)[sort.key] ?? "";
      if (va < vb) return sort.direction === "asc" ? -1 : 1;
      if (va > vb) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [journeys, sort]);

  const SortIcon = ({ column }: { column: string }) => {
    if (sort.key !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    if (sort.direction === "asc") return <ArrowUp className="h-3 w-3 ml-1" />;
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const columns = [
    { key: "driverNickName", label: "Motorista" },
    { key: "driverIntegrationCode", label: "GPID" },
    { key: "circuitCode", label: "Circuito" },
    { key: "startPlanned", label: "Início Plan." },
    { key: "endPlanned", label: "Fim Plan." },
    { key: "startActual", label: "Início Real" },
    { key: "endActual", label: "Fim Real" },
    { key: "flgCurrent", label: "Atual" },
    { key: "flgStatus", label: "Status" },
  ];

  // Group journeys by driver for Gantt
  const driverMap = useMemo(() => {
    const map = new Map<string, { nickName: string; integrationCode: string; journeys: JourneyRecord[] }>();
    for (const j of journeys) {
      const key = j.driverId || j.driverNickName || "unknown";
      if (!map.has(key)) {
        map.set(key, { nickName: j.driverNickName || "--", integrationCode: j.driverIntegrationCode || "", journeys: [] });
      }
      map.get(key)!.journeys.push(j);
    }
    return map;
  }, [journeys]);

  const refreshData = () => fetchPage(currentPage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Data Início <span className="text-destructive">*</span></Label>
          <DatePickerField value={startDate} onChange={(v) => v && setStartDate(v)} placeholder="dd/mm/aaaa" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data Fim <span className="text-destructive">*</span></Label>
          <DatePickerField value={endDate} onChange={(v) => v && setEndDate(v)} placeholder="dd/mm/aaaa" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Motorista</Label>
          <LookupSearchField
            endpoint="Drivers"
            labelFn="codeName"
            searchFilterParam="Filter1String"
            alternateSearchFilterParam="Filter2String"
            value={driverId}
            onChange={(id, item) => {
              setDriverId(id);
              setDriverLabel(item ? (item.nickName as string || "") : "");
            }}
            placeholder="Buscar motorista..."
            initialLabel={driverLabel}
            forceActiveOnly
            transformItem={(item) => ({
              ...item,
              code: (item.nickName as string) || "",
              name: (item.integrationCode as string) || "",
            })}
            modalVisibleColumns={["nickName", "integrationCode"]}
            columnLabels={{ nickName: "Nome de Escala", integrationCode: "GPID" }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Circuito</Label>
          <LookupSearchField
            endpoint="CircuitDriver"
            labelFn="codeOnly"
            searchFilterParam="Filter1String"
            value={circuitId}
            onChange={(id, item) => {
              setCircuitId(id);
              setCircuitLabel(item ? (item.circuitCode as string || item.code as string || "") : "");
            }}
            placeholder="Buscar circuito..."
            initialLabel={circuitLabel}
            transformItem={(item) => ({
              ...item,
              code: (item.circuitCode as string) || (item.code as string) || "",
              name: (item.nickName as string) || "",
            })}
            modalVisibleColumns={["circuitCode", "nickName"]}
            columnLabels={{ circuitCode: "Circuito", nickName: "Motorista" }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Atual</Label>
          <Select value={flgCurrent} onValueChange={setFlgCurrent}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FLG_CURRENT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={flgStatus} onValueChange={setFlgStatus}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FLG_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
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
            <Eraser className="h-3.5 w-3.5" /> Limpar
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {searched && (
            <span className="text-xs text-muted-foreground">{totalCount} jornadas encontradas</span>
          )}
          <Button size="sm" onClick={() => setShowCreatePanel(true)} className="h-8 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Nova Jornada
          </Button>
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col h-[calc(100vh-240px)]">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "gantt" | "list")} className="w-full flex flex-col flex-1 min-h-0">
            <div className="px-3 pt-2 flex items-center justify-between border-b border-border pb-2">
              <TabsList className="h-8">
                <TabsTrigger value="list" className="text-xs h-7 px-3">Listagem</TabsTrigger>
                <TabsTrigger value="gantt" className="text-xs h-7 px-3">Gantt</TabsTrigger>
              </TabsList>
              <span className="text-xs text-muted-foreground">{journeys.length} jornadas carregadas</span>
            </div>

            <TabsContent value="gantt" className="mt-0 flex-1 min-h-0">
              <div className="h-full overflow-hidden">
                <JourneyGanttChart
                  driverMap={driverMap}
                  filterStartDate={startDate}
                  filterEndDate={endDate}
                  onJourneyDoubleClick={(j) => setEditJourneyId(j.id)}
                  footer={
                    <div className="flex items-center justify-between px-3 py-2 border-t border-border shrink-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{totalCount} registros</span>
                        <span className="text-border">|</span>
                        <span>Por página:</span>
                        <Select value={String(pageSize)} onValueChange={(v) => { const ns = Number(v); setPageSize(ns); fetchPage(1, ns); }}>
                          <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PAGE_SIZES.map((n) => (
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

            <TabsContent value="list" className="mt-0 flex-1 min-h-0 flex flex-col">
              <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      {columns.map((col) => (
                        <TableHead key={col.key} className="text-xs cursor-pointer select-none whitespace-nowrap h-9" onClick={() => handleSort(col.key)}>
                          <span className="flex items-center">{col.label}<SortIcon column={col.key} /></span>
                        </TableHead>
                      ))}
                      <TableHead className="text-xs h-9 w-16">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedJourneys.map((j) => (
                      <TableRow
                        key={j.id}
                        className="h-9 cursor-pointer hover:bg-muted/50"
                        onDoubleClick={() => setEditJourneyId(j.id)}
                      >
                        <TableCell className="text-xs py-1">{j.driverNickName}</TableCell>
                        <TableCell className="text-xs py-1 font-mono">{j.driverIntegrationCode}</TableCell>
                        <TableCell className="text-xs py-1">{j.circuitCode || "--"}</TableCell>
                        <TableCell className="text-xs py-1 whitespace-nowrap">{formatDT(j.startPlanned || j.startDate)}</TableCell>
                        <TableCell className="text-xs py-1 whitespace-nowrap">{formatDT(j.endPlanned || j.endDate)}</TableCell>
                        <TableCell className="text-xs py-1 whitespace-nowrap">{formatDT(j.startActual)}</TableCell>
                        <TableCell className="text-xs py-1 whitespace-nowrap">{formatDT(j.endActual)}</TableCell>
                        <TableCell className="text-xs py-1">
                          {j.flgCurrent === true ? <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Sim</Badge> :
                           j.flgCurrent === false ? <Badge variant="outline" className="text-[10px]">Não</Badge> : "--"}
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          <Badge variant="outline" className="text-[10px]">{j.flgStatus || j.status || "--"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setDeleteJourneyId(j.id); }}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {sortedJourneys.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-8">Nenhuma jornada encontrada.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* List Pagination */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-border shrink-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{totalCount} registros</span>
                  <span className="text-border">|</span>
                  <span>Por página:</span>
                  <Select value={String(pageSize)} onValueChange={(v) => { const ns = Number(v); setPageSize(ns); fetchPage(1, ns); }}>
                    <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map((n) => (
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
      )}

      {/* Edit Panel */}
      {editJourneyId && (
        <JourneyEditPanel
          journeyId={editJourneyId}
          onClose={() => setEditJourneyId(null)}
          onSaved={() => { setEditJourneyId(null); refreshData(); }}
        />
      )}

      {/* Create Panel */}
      {showCreatePanel && (
        <JourneyEditPanel
          onClose={() => setShowCreatePanel(false)}
          onSaved={() => { setShowCreatePanel(false); if (searched) refreshData(); }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteJourneyId} onOpenChange={(open) => !open && setDeleteJourneyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta jornada? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
