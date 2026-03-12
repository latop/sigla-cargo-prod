import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search, Loader2, X, ChevronDown, ChevronsUpDown, Check,
  ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Download, UserMinus,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/config/api";
import { DatePickerField } from "@/components/DatePickerField";
import { LookupSearchField } from "@/components/LookupSearchField";
import { cn } from "@/lib/utils";
import { JourneyReleaseForm } from "@/components/JourneyReleaseForm";
import { JourneyChecklistForm } from "@/components/JourneyChecklistForm";
import { ClipboardCheck, Truck } from "lucide-react";

// --- Helpers ---
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDateTimeShort = (v?: string | null) => {
  if (!v) return "--";
  try {
    // Try native parsing first (ISO format)
    let d = new Date(v);
    // If invalid, try dd/MM/yyyy HH:mm or dd/MM/yyyy formats
    if (isNaN(d.getTime())) {
      const parts = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
      if (parts) {
        const [, day, month, year, hour = "0", min = "0"] = parts;
        d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min));
      }
    }
    if (isNaN(d.getTime())) return "--";
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch { return "--"; }
};

// --- Types ---

interface LocationOption {
  code: string;
  name: string;
  label: string;
}

interface JourneyReleaseItem {
  saida?: string | null;
  entrega?: string | null;
  demanda?: string | null;
  dt?: string | null;
  destino?: string | null;
  motoristaPlan?: string | null;
  veiculoPlan?: string | null;
  motoristaLiberado?: string | null;
  veiculoLiberado?: string | null;
  dtLiberacao?: string | null;
  dtCheckList?: string | null;
  [k: string]: unknown;
}

interface Filters {
  dtRef: string;
  locOrig: string;
  locOrigLabel: string;
  demand: string;
  nickName: string;
  nickNameLabel: string;
  licensePlate: string;
  licensePlateLabel: string;
  releaseStatus: string;
}

type SortDirection = "asc" | "desc" | null;
interface SortConfig { key: string; direction: SortDirection; }

interface PaginationMeta {
  TotalCount: number;
  PageSize: number;
  CurrentPage: number;
  TotalPages: number;
  HasNext: boolean;
  HasPrevious: boolean;
}

// --- API ---

const fetchJourneyRelease = async (filters: Filters, pageNumber: number, pageSize: number): Promise<{ items: JourneyReleaseItem[]; pagination: PaginationMeta }> => {
  const params = new URLSearchParams();
  params.append("dtRef", filters.dtRef);
  params.append("locOrig", filters.locOrig);
  if (filters.demand) params.append("demand", filters.demand);
  if (filters.nickName) params.append("nickName", filters.nickName);
  if (filters.licensePlate) params.append("licensePlate", filters.licensePlate);
  params.append("releaseStatus", filters.releaseStatus || "all");
  params.append("PageNumber", String(pageNumber));
  params.append("PageSize", String(pageSize));
  const res = await fetch(`${API_BASE}/Journey/ReleaseDriver?${params.toString()}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const items: JourneyReleaseItem[] = await res.json();
  const paginationHeader = res.headers.get("x-pagination");
  const pagination: PaginationMeta = paginationHeader
    ? JSON.parse(paginationHeader)
    : { TotalCount: items.length, PageSize: pageSize, CurrentPage: pageNumber, TotalPages: 1, HasNext: false, HasPrevious: false };
  return { items, pagination };
};

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

// --- Component ---
const JourneyReleasePage = () => {
  const { t } = useTranslation();
  usePageTitle(t("menu.releaseDriver"), UserMinus);
  const { toast } = useToast();

  const emptyFilters = (): Filters => ({
    dtRef: todayISO(),
    locOrig: "",
    locOrigLabel: "",
    demand: "",
    nickName: "",
    nickNameLabel: "",
    licensePlate: "",
    licensePlateLabel: "",
    releaseStatus: "all",
  });

  const [filters, setFilters] = useState<Filters>(emptyFilters());
  const [searched, setSearched] = useState(false);
  const [searchParams, setSearchParams] = useState<Filters>(emptyFilters());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "saida", direction: "asc" });
  const [releaseItem, setReleaseItem] = useState<JourneyReleaseItem | null>(null);
  const [checklistItem, setChecklistItem] = useState<JourneyReleaseItem | null>(null);

  // Location combobox state
  const [locOpen, setLocOpen] = useState(false);
  const [locSearch, setLocSearch] = useState("");

  // Fetch locations for dropdown
  const { data: locations = [], isLoading: locationsLoading } = useQuery<LocationOption[]>({
    queryKey: ["location-release-options"],
    queryFn: fetchLocations,
    staleTime: 5 * 60 * 1000,
  });

  // Filter locations by search
  const filteredLocations = locSearch
    ? locations.filter((loc) =>
        loc.label.toUpperCase().includes(locSearch.toUpperCase())
      )
    : locations;

  // Journey release query
  const { data: queryData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["journey-release", searchParams, currentPage, pageSize],
    queryFn: () => fetchJourneyRelease(searchParams, currentPage, pageSize),
    enabled: searched,
  });

  const rawItems = queryData?.items;
  const pagination = queryData?.pagination;

  // Client-side sorting
  const items = rawItems ? [...rawItems].sort((a, b) => {
    if (!sortConfig.direction || !sortConfig.key) return 0;
    const strA = a[sortConfig.key] == null ? "" : String(a[sortConfig.key]);
    const strB = b[sortConfig.key] == null ? "" : String(b[sortConfig.key]);
    const cmp = strA.localeCompare(strB, "pt-BR", { numeric: true });
    return sortConfig.direction === "asc" ? cmp : -cmp;
  }) : undefined;

  const toggleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        if (prev.direction === "desc") return { key: "", direction: null };
        return { key, direction: "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortConfig.key !== colKey) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    if (sortConfig.direction === "asc") return <ArrowUp className="h-3 w-3 ml-1 text-primary" />;
    return <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  const handleSearch = () => {
    if (!filters.dtRef) {
      toast({ title: "Campo obrigatório", description: "Informe a Data da Viagem.", variant: "error" });
      return;
    }
    if (!filters.locOrig) {
      toast({ title: "Campo obrigatório", description: "Informe o Local de Saída.", variant: "error" });
      return;
    }
    setSearchParams({ ...filters });
    setCurrentPage(1);
    setSearched(true);
  };

  const handleClearFilters = () => {
    setFilters(emptyFilters());
    setSearched(false);
  };

  const releaseStatusLabel = (s: string) => {
    if (s === "notReleased") return "Pendente Liberação";
    if (s === "Released") return "Liberado";
    return "Todos";
  };

  const renderActionButtons = (item: JourneyReleaseItem) => {
    const hasChecklist = !!item.dtCheckList;
    const hasRelease = !!item.dtLiberacao;

    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => setChecklistItem(item)}
          className="cursor-pointer"
          title={hasChecklist ? "Checklist realizado - Clique para editar" : "Realizar Checklist"}
        >
          <Badge
            variant="outline"
            className={cn(
              "text-xs transition-colors gap-1",
              hasChecklist
                ? "bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-900/50"
                : "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/50 animate-pulse",
              hasRelease && "opacity-60"
            )}
          >
            <ClipboardCheck className="h-3 w-3" />
            Check
          </Badge>
        </button>
        <button
          onClick={() => {
            if (!hasChecklist && !hasRelease) {
              toast({ title: "Checklist pendente", description: "Realize o Checklist antes de liberar a viagem.", variant: "error" });
              return;
            }
            setReleaseItem(item);
          }}
          className="cursor-pointer"
          title={hasRelease ? "Viagem liberada" : hasChecklist ? "Liberar viagem" : "Checklist pendente"}
        >
          <Badge
            variant="outline"
            className={cn(
              "text-xs transition-colors gap-1",
              hasRelease
                ? "bg-muted text-muted-foreground border-border"
                : hasChecklist
                  ? "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/50 animate-pulse"
                  : "bg-muted text-muted-foreground border-border opacity-50"
            )}
          >
            <Truck className="h-3 w-3" />
            {hasRelease ? "Liberado" : "Liberar"}
          </Badge>
        </button>
      </div>
    );
  };

  // Table columns
  const columns: { key: string; label: string; width?: string }[] = [
    { key: "saida", label: "Saída", width: "w-[130px]" },
    { key: "entrega", label: "Entrega", width: "w-[130px]" },
    { key: "dt", label: "DT", width: "w-[140px]" },
    { key: "demanda", label: "STO", width: "w-[140px]" },
    { key: "destino", label: "Destino", width: "w-[160px]" },
    { key: "motoristaPlan", label: "Motorista Plan.", width: "w-[150px]" },
    { key: "veiculoPlan", label: "Veículo Plan.", width: "w-[100px]" },
    { key: "motoristaLiberado", label: "Motorista Lib.", width: "w-[150px]" },
    { key: "veiculoLiberado", label: "Veículo Lib.", width: "w-[100px]" },
    { key: "_actions", label: "Ações", width: "w-[180px]" },
  ];

  const handleExportExcel = () => {
    if (!items || items.length === 0) return;
    const exportData = items.map((item) => ({
      "Saída": formatDateTimeShort(item.saida),
      "Entrega": formatDateTimeShort(item.entrega),
      "STO": item.demanda || "",
      "DT": item.dt || "",
      "Destino": item.destino || "",
      "Motorista Plan.": item.motoristaPlan || "",
      "Veículo Plan.": item.veiculoPlan || "",
      "Motorista Lib.": item.motoristaLiberado || "",
      "Veículo Lib.": item.veiculoLiberado || "",
      "Dt Check": formatDateTimeShort(item.dtCheckList),
      "Dt Liberação": formatDateTimeShort(item.dtLiberacao),
      "Status": item.dtLiberacao ? "Liberado" : item.dtCheckList ? "Check OK" : "Pendente",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Liberação de Viagens");
    XLSX.writeFile(wb, `liberacao-viagens-${searchParams.dtRef}.xlsx`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              Data da Viagem <span className="text-destructive">*</span>
            </Label>
            <DatePickerField
              value={filters.dtRef}
              onChange={(v) => setFilters((f) => ({ ...f, dtRef: v || "" }))}
              className="h-8 text-xs"
              hasError={!filters.dtRef}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              Local de Saída <span className="text-destructive">*</span>
            </Label>
            <Popover open={locOpen} onOpenChange={setLocOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={locOpen}
                  className={cn(
                    "w-full h-8 justify-between text-xs font-normal px-2 text-left",
                    !filters.locOrig && "text-muted-foreground",
                    !filters.locOrig && "border-destructive"
                  )}
                >
                  <span className="truncate">
                    {filters.locOrigLabel || "Selecione..."}
                  </span>
                  <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  <input
                    className="flex h-9 w-full bg-transparent py-2 text-xs outline-none placeholder:text-muted-foreground"
                    placeholder="Buscar local..."
                    value={locSearch}
                    onChange={(e) => setLocSearch(e.target.value)}
                  />
                  {locSearch && (
                    <button onClick={() => setLocSearch("")} className="p-0.5">
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <div className="max-h-[200px] overflow-y-auto p-1">
                  {locationsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredLocations.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      Nenhum local encontrado.
                    </div>
                  ) : (
                    filteredLocations.map((loc) => (
                      <button
                        key={loc.code}
                        className={cn(
                          "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-7 pr-2 text-xs outline-none hover:bg-accent hover:text-accent-foreground transition-colors",
                          filters.locOrig === loc.code && "bg-accent"
                        )}
                        onClick={() => {
                          setFilters((f) => ({
                            ...f,
                            locOrig: loc.code,
                            locOrigLabel: loc.label,
                          }));
                          setLocOpen(false);
                          setLocSearch("");
                        }}
                      >
                        <span className={cn(
                          "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
                          filters.locOrig !== loc.code && "invisible"
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
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">STO/DT</Label>
            <Input
              className="h-8 text-xs"
              placeholder="STO/DT"
              value={filters.demand}
              onChange={(e) => setFilters((f) => ({ ...f, demand: e.target.value.toUpperCase() }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Motorista</Label>
            <LookupSearchField
              endpoint="Drivers"
              searchFilterParam="Filter1String"
              value={filters.nickName}
              onChange={(id, item) => {
                const nick = item?.nickName as string || item?.name as string || "";
                setFilters((f) => ({ ...f, nickName: nick, nickNameLabel: nick }));
              }}
              placeholder="Motorista"
              className="h-8 text-xs"
              nullable
              displayAsText
              modalVisibleColumns={["nickName", "integrationCode"]}
              columnLabels={{ nickName: "Nome de Escala", integrationCode: "Cód. Integração" }}
              transformItem={(item) => ({
                ...item,
                id: item.id as string,
                code: "",
                name: `${item.nickName || ""} - ${item.integrationCode || ""}`,
              })}
              initialLabel={filters.nickNameLabel}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Veículo</Label>
            <LookupSearchField
              endpoint="Truck"
              searchFilterParam="Filter1String"
              value={filters.licensePlate}
              onChange={(id, item) => {
                const plate = item?.licensePlate as string || item?.fleetCode as string || "";
                setFilters((f) => ({ ...f, licensePlate: plate, licensePlateLabel: plate }));
              }}
              placeholder="Placa ou Cód. Frota..."
              className="h-8 text-xs"
              nullable
              displayAsText
              modalVisibleColumns={["licensePlate", "fleetCode"]}
              columnLabels={{ licensePlate: "Placa", fleetCode: "Cód. Frota" }}
              transformItem={(item) => ({
                ...item,
                id: item.id as string,
                code: "",
                name: `${item.licensePlate || ""} - ${item.fleetCode || ""}`,
              })}
              initialLabel={filters.licensePlateLabel}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Status</Label>
            <Select
              value={filters.releaseStatus}
              onValueChange={(v) => setFilters((f) => ({ ...f, releaseStatus: v }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos</SelectItem>
                <SelectItem value="notReleased" className="text-xs">Pendente Liberação</SelectItem>
                <SelectItem value="Released" className="text-xs">Liberado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" className="h-8 text-xs gap-1" onClick={handleSearch}>
            <Search className="h-3.5 w-3.5" /> Pesquisar
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleClearFilters}>
            <X className="h-3.5 w-3.5" /> Limpar
          </Button>
          <div className="flex-1" />
          {items && items.length > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleExportExcel}>
              <Download className="h-3.5 w-3.5" /> Exportar Excel
            </Button>
          )}
        </div>

        {/* Location subtitle */}
        {searched && searchParams.locOrigLabel && (
          <div className="text-xs text-muted-foreground font-medium">
            Local de Saída: <span className="text-foreground">{searchParams.locOrigLabel}</span>
          </div>
        )}

        {/* Results */}
        {!searched ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            Utilize os filtros acima para pesquisar as viagens.
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-40 text-destructive text-sm">
            Erro: {(error as Error)?.message}
          </div>
        ) : !items || items.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            Nenhum resultado encontrado.
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-320px)]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                        {columns.map((col) => (
                        <TableHead
                          key={col.key}
                          className={`h-8 text-xs font-semibold cursor-pointer select-none ${col.width || ""}`}
                          onClick={() => col.key !== "_actions" && toggleSort(col.key)}
                        >
                          <div className="flex items-center">
                            {col.label}
                            {col.key !== "_actions" && <SortIcon colKey={col.key} />}
                          </div>
                        </TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx} className="h-6">
                      <TableCell className="py-1 text-xs">{formatDateTimeShort(item.saida)}</TableCell>
                      <TableCell className="py-1 text-xs">{formatDateTimeShort(item.entrega)}</TableCell>
                      <TableCell className="py-1 text-xs truncate max-w-[90px]">{item.dt || "--"}</TableCell>
                      <TableCell className="py-1 text-xs truncate max-w-[90px]">{item.demanda || "--"}</TableCell>
                      <TableCell className="py-1 text-xs truncate max-w-[160px]">{item.destino || "--"}</TableCell>
                      <TableCell className="py-1 text-xs truncate max-w-[150px]">{item.motoristaPlan || "--"}</TableCell>
                      <TableCell className="py-1 text-xs truncate max-w-[100px]">{item.veiculoPlan || "--"}</TableCell>
                      <TableCell className="py-1 text-xs truncate max-w-[150px]">{item.motoristaLiberado || "--"}</TableCell>
                      <TableCell className="py-1 text-xs truncate max-w-[100px]">{item.veiculoLiberado || "--"}</TableCell>
                      <TableCell className="py-1 text-xs">{renderActionButtons(item)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Pagination Footer */}
            {pagination && pagination.TotalPages > 0 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-2 bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t("common.rowsPerPage")}:</span>
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="h-7 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50, 100].map((size) => (
                        <SelectItem key={size} value={String(size)} className="text-xs">{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground ml-2">
                    {pagination.TotalCount} {t("common.records")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground mr-2">
                    {t("common.page")} {pagination.CurrentPage} {t("common.of")} {pagination.TotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!pagination.HasPrevious}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  {Array.from({ length: pagination.TotalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === pagination.TotalPages || Math.abs(p - currentPage) <= 1)
                    .map((page, idx, arr) => (
                      <span key={page} className="flex items-center">
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span className="px-1 text-xs text-muted-foreground">…</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="icon"
                          className="h-7 w-7 text-xs"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      </span>
                    ))}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!pagination.HasNext}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Checklist Form Panel */}
      {checklistItem && (
        <JourneyChecklistForm
          item={checklistItem}
          onClose={() => setChecklistItem(null)}
          onSaved={() => {
            setChecklistItem(null);
            refetch();
          }}
        />
      )}

      {/* Release Form Panel */}
      {releaseItem && (
        <JourneyReleaseForm
          item={releaseItem}
          onClose={() => setReleaseItem(null)}
          onSaved={() => {
            setReleaseItem(null);
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default JourneyReleasePage;