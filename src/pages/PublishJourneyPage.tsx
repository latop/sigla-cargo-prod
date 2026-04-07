import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search, Loader2, X, ChevronLeft, ChevronRight,
  Megaphone, Eye, Send, Download, FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/config/api";
import { DatePickerField } from "@/components/DatePickerField";
import { LookupSearchField } from "@/components/LookupSearchField";
import { FloatingPanel } from "@/components/FloatingPanel";
import { cn } from "@/lib/utils";

// --- Types ---
interface LookupItem { id: string; code?: string; description?: string; name?: string; [k: string]: unknown; }

// --- Helpers ---
const fetchLookup = async (endpoint: string): Promise<LookupItem[]> => {
  const res = await fetch(`${API_BASE}/${endpoint}?PageSize=999`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const lookupLabel = (item: LookupItem) =>
  item.code && item.description ? `${item.code} - ${item.description}` : item.code || item.description || item.name || item.id;

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDateTime = (v?: string | null) => {
  if (!v) return "--";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "--";
    return d.toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "--";
  }
};

const formatDateShort = (v?: string | null) => {
  if (!v) return "--";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "--";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "--";
  }
};

// --- Types ---
interface PublishJourneyItem {
  id?: string;
  date?: string | null;
  activityDescription?: string | null;
  locationGroupDescription?: string | null;
  fleetGroupDescription?: string | null;
  driverName?: string | null;
  scheduleDescription?: string | null;
  flgStatus?: string | null;
  note?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  [k: string]: unknown;
}

interface PaginationMeta {
  TotalCount: number;
  PageSize: number;
  CurrentPage: number;
  TotalPages: number;
  HasNext: boolean;
  HasPrevious: boolean;
}

interface Filters {
  startDate: string;
  endDate: string;
  locationGroupId: string;
  fleetGroupId: string;
  activityId: string;
  flgStatus: string;
  search: string;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  P: {
    label: "Pendente",
    className: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
  },
  A: {
    label: "Publicado",
    className: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700",
  },
  C: {
    label: "Cancelado",
    className: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
  },
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// --- API ---
const fetchJourneys = async (
  filters: Filters,
  pageNumber: number,
  pageSize: number,
): Promise<{ items: PublishJourneyItem[]; pagination: PaginationMeta }> => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append("StartDate", filters.startDate);
  if (filters.endDate) params.append("EndDate", filters.endDate);
  if (filters.locationGroupId) params.append("LocationGroupId", filters.locationGroupId);
  if (filters.fleetGroupId) params.append("FleetGroupId", filters.fleetGroupId);
  if (filters.activityId) params.append("ActivityId", filters.activityId);
  if (filters.flgStatus) params.append("FlgStatus", filters.flgStatus);
  if (filters.search) params.append("Search", filters.search);
  params.append("PageNumber", String(pageNumber));
  params.append("PageSize", String(pageSize));
  const res = await fetch(`${API_BASE}/PublishJourney?${params.toString()}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const items: PublishJourneyItem[] = await res.json();
  const paginationHeader = res.headers.get("x-pagination");
  const pagination: PaginationMeta = paginationHeader
    ? JSON.parse(paginationHeader)
    : { TotalCount: items.length, PageSize: pageSize, CurrentPage: pageNumber, TotalPages: 1, HasNext: false, HasPrevious: false };
  return { items, pagination };
};

const publishJourney = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/PublishJourney/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
};

// --- Component ---
const PublishJourneyPage = () => {
  const { t } = useTranslation();
  usePageTitle(t("menu.publishJourney"), Megaphone);
  const { toast } = useToast();

  const emptyFilters = (): Filters => ({
    startDate: todayISO(),
    endDate: todayISO(),
    locationGroupId: "",
    fleetGroupId: "",
    activityId: "",
    flgStatus: "",
    search: "",
  });

  const [filters, setFilters] = useState<Filters>(emptyFilters());
  const [searched, setSearched] = useState(false);
  const [searchParams, setSearchParams] = useState<Filters>(emptyFilters());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [publishItem, setPublishItem] = useState<PublishJourneyItem | null>(null);
  const [detailItem, setDetailItem] = useState<PublishJourneyItem | null>(null);

  // Lookups
  const { data: locationGroups } = useQuery<LookupItem[]>({ queryKey: ["location-groups-pj"], queryFn: () => fetchLookup("LocationGroup") });
  const { data: fleetGroups } = useQuery<LookupItem[]>({ queryKey: ["fleet-groups-pj"], queryFn: () => fetchLookup("FleetGroup") });

  const { data: queryData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["publish-journey", searchParams, currentPage, pageSize],
    queryFn: () => fetchJourneys(searchParams, currentPage, pageSize),
    enabled: searched,
  });

  const items = queryData?.items || [];
  const pagination = queryData?.pagination;
  const totalPages = pagination?.TotalPages || 1;
  const totalCount = pagination?.TotalCount || 0;

  const publishMutation = useMutation({
    mutationFn: publishJourney,
    onSuccess: () => {
      toast({ title: "Jornada publicada com sucesso!", variant: "success" });
      setPublishItem(null);
      refetch();
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao publicar", description: err.message, variant: "error" });
    },
  });

  const handleSearch = () => {
    if (!filters.startDate || !filters.endDate) {
      toast({ title: "Período obrigatório", description: "Informe a data inicial e a data final.", variant: "error" });
      return;
    }
    if (filters.startDate > filters.endDate) {
      toast({ title: t("driverVacation.startAfterEnd"), variant: "destructive" });
      return;
    }
    setSearchParams({ ...filters });
    setCurrentPage(1);
    setSearched(true);
  };

  const handleClear = () => {
    setFilters(emptyFilters());
    setSearched(false);
  };

  const handleFilterKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleExportExcel = () => {
    if (!items || items.length === 0) return;
    const exportData = items.map((item) => ({
      Data: formatDateShort(item.date),
      Atividade: item.activityDescription || "",
      "Grupo de Localidade": item.locationGroupDescription || "",
      "Grupo de Frota": item.fleetGroupDescription || "",
      Motorista: item.driverName || "",
      Programação: item.scheduleDescription || "",
      Status: STATUS_MAP[(item.flgStatus || "P").toUpperCase()]?.label || item.flgStatus || "",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Publicação de Jornadas");
    XLSX.writeFile(wb, `publicacao-jornadas-${searchParams.startDate}.xlsx`);
  };

  const renderStatus = (status?: string | null) => {
    const s = (status || "P").toUpperCase();
    const config = STATUS_MAP[s] || STATUS_MAP.P;
    return (
      <Badge variant="outline" className={cn("text-xs", config.className)}>
        {config.label}
      </Badge>
    );
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  const columns = [
    { key: "date", label: "Data", format: formatDateShort },
    { key: "activityDescription", label: "Atividade" },
    { key: "locationGroupDescription", label: "Grupo de Localidade" },
    { key: "fleetGroupDescription", label: "Grupo de Frota" },
    { key: "driverName", label: "Motorista" },
    { key: "scheduleDescription", label: "Programação" },
    { key: "flgStatus", label: "Status", render: renderStatus },
  ];

  // Detail fields for the floating panel
  const detailFields = [
    { key: "date", label: "Data", format: formatDateTime },
    { key: "activityDescription", label: "Atividade" },
    { key: "locationGroupDescription", label: "Grupo de Localidade" },
    { key: "fleetGroupDescription", label: "Grupo de Frota" },
    { key: "driverName", label: "Motorista" },
    { key: "scheduleDescription", label: "Programação" },
    { key: "note", label: "Observação" },
    { key: "flgStatus", label: "Status" },
    { key: "createdAt", label: "Criado em", format: formatDateTime },
    { key: "updatedAt", label: "Atualizado em", format: formatDateTime },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* Detail Panel */}
        {detailItem && (
          <FloatingPanel
            title="Detalhes da Jornada"
            onClose={() => setDetailItem(null)}
            width={520}
          >
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {detailFields.map((f) => {
                  const val = detailItem[f.key];
                  let display: React.ReactNode;
                  if (f.key === "flgStatus") {
                    display = renderStatus(val as string | null);
                  } else if (f.format) {
                    display = f.format(val as string | null);
                  } else {
                    display = val != null ? String(val) : "--";
                  }
                  return (
                    <div key={f.key} className="space-y-0.5">
                      <Label className="text-xs text-muted-foreground">{f.label}</Label>
                      <div className="text-sm select-text">{display}</div>
                    </div>
                  );
                })}
              </div>
              {(detailItem.flgStatus || "P").toUpperCase() === "P" && (
                <div className="pt-2 border-t flex justify-end">
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => {
                      setDetailItem(null);
                      setPublishItem(detailItem);
                    }}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Publicar
                  </Button>
                </div>
              )}
            </div>
          </FloatingPanel>
        )}

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              Período Inicial <span className="text-destructive">*</span>
            </Label>
            <DatePickerField
              value={filters.startDate}
              onChange={(v) => setFilters((f) => ({ ...f, startDate: v || "" }))}
              className="h-8 text-xs"
              hasError={!filters.startDate}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              Período Final <span className="text-destructive">*</span>
            </Label>
            <DatePickerField
              value={filters.endDate}
              onChange={(v) => setFilters((f) => ({ ...f, endDate: v || "" }))}
              className="h-8 text-xs"
              hasError={!filters.endDate}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Grupo de Localidade</Label>
            <Select
              value={filters.locationGroupId || "__all__"}
              onValueChange={(v) => setFilters((f) => ({ ...f, locationGroupId: v === "__all__" ? "" : v }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs text-muted-foreground">-- Todos --</SelectItem>
                {locationGroups?.map((g) => (
                  <SelectItem key={g.id} value={g.id} className="text-xs">{lookupLabel(g)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Grupo de Frota</Label>
            <Select
              value={filters.fleetGroupId || "__all__"}
              onValueChange={(v) => setFilters((f) => ({ ...f, fleetGroupId: v === "__all__" ? "" : v }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs text-muted-foreground">-- Todos --</SelectItem>
                {fleetGroups?.map((g) => (
                  <SelectItem key={g.id} value={g.id} className="text-xs">{lookupLabel(g)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Atividade</Label>
            <LookupSearchField
              endpoint="ActivityTruck"
              searchFilterParam="Filter1String"
              value={filters.activityId}
              onChange={(id) => setFilters((f) => ({ ...f, activityId: id }))}
              labelFn="codeDescription"
              placeholder="Atividade..."
              nullable
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Status</Label>
            <Select
              value={filters.flgStatus}
              onValueChange={(v) => setFilters((f) => ({ ...f, flgStatus: v === "__all__" ? "" : v }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs text-muted-foreground">-- Todos --</SelectItem>
                <SelectItem value="P" className="text-xs">Pendente</SelectItem>
                <SelectItem value="A" className="text-xs">Publicado</SelectItem>
                <SelectItem value="C" className="text-xs">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Busca</Label>
            <Input
              className="h-8 text-xs"
              placeholder="Buscar..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              onKeyDown={handleFilterKeyDown}
            />
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={handleSearch} disabled={isLoading} className="h-7 gap-1.5 text-xs">
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            {t("common.search")}
          </Button>
          {searched && (
            <Button size="sm" variant="outline" onClick={handleClear} className="h-7 gap-1.5 text-xs">
              <X className="h-3.5 w-3.5" />
              {t("common.clear")}
            </Button>
          )}
          <div className="flex-1" />
          {searched && items.length > 0 && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Exportar Excel
            </Button>
          )}
        </div>

        {/* Results */}
        {searched && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {isError && (
              <p className="text-sm text-destructive py-4">
                {(error as Error)?.message || "Erro ao carregar dados."}
              </p>
            )}
            {items.length === 0 && !isLoading && !isError && (
              <p className="text-sm text-muted-foreground py-4">{t("common.noResults")}</p>
            )}
            {items.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          {columns.map((col) => (
                            <TableHead key={col.key} className="whitespace-nowrap font-medium h-8 px-3 text-xs">
                              {col.label}
                            </TableHead>
                          ))}
                          <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs text-center w-24">
                            {t("common.actions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((row, i) => {
                          const isPending = (row.flgStatus || "P").toUpperCase() === "P";
                          return (
                            <TableRow key={String(row.id || i)} className="hover:bg-muted/30 group h-6">
                              {columns.map((col) => (
                                <TableCell key={col.key} className="whitespace-nowrap text-xs py-0.5 px-3">
                                  {"render" in col && col.render
                                    ? col.render(row[col.key] as string | null)
                                    : "format" in col && col.format
                                      ? col.format(row[col.key] as string | null)
                                      : row[col.key] != null
                                        ? String(row[col.key])
                                        : "--"}
                                </TableCell>
                              ))}
                              <TableCell className="text-center text-xs py-0.5 px-3">
                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title="Ver detalhes"
                                    onClick={() => setDetailItem(row)}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  {isPending && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-primary hover:text-primary"
                                      title="Publicar"
                                      onClick={() => setPublishItem(row)}
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between border-t border-border px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t("common.rowsPerPage")}:</span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}
                      >
                        <SelectTrigger className="h-7 w-16 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAGE_SIZE_OPTIONS.map((s) => (
                            <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground ml-2">
                        {totalCount} {t("common.records")}
                      </span>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" disabled={!pagination?.HasPrevious} onClick={() => setCurrentPage((p) => p - 1)}>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </Button>
                        {getPageNumbers().map((p, i) =>
                          p === "ellipsis" ? (
                            <span key={`e${i}`} className="text-xs text-muted-foreground px-1">…</span>
                          ) : (
                            <Button key={p} variant={p === currentPage ? "default" : "outline"} size="icon" className="h-7 w-7 text-xs" onClick={() => setCurrentPage(p)}>
                              {p}
                            </Button>
                          ),
                        )}
                        <Button variant="outline" size="icon" className="h-7 w-7" disabled={!pagination?.HasNext} onClick={() => setCurrentPage((p) => p + 1)}>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </div>

      {/* Publish confirmation */}
      <AlertDialog open={publishItem !== null} onOpenChange={() => setPublishItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publicar Jornada</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja publicar esta programação?
              {publishItem?.driverName && (
                <span className="block mt-1 font-semibold text-foreground">
                  Motorista: {publishItem.driverName}
                </span>
              )}
              {publishItem?.scheduleDescription && (
                <span className="block mt-0.5 text-foreground">
                  Programação: {publishItem.scheduleDescription}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const id = String(publishItem?.id || "");
                if (id) publishMutation.mutate(id);
              }}
            >
              {publishMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Publicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PublishJourneyPage;
