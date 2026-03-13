import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search, Loader2, X, ChevronLeft, ChevronRight,
  UserCheck, CheckCircle2, XCircle, ArrowUp, ArrowDown, ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/config/api";
import { authFetch } from "@/lib/auth-fetch";
import { DatePickerField } from "@/components/DatePickerField";
import { LookupSearchField } from "@/components/LookupSearchField";
import { ExportDropdown } from "@/components/ExportDropdown";
import { type ExportColumn } from "@/lib/export-utils";
import { cn } from "@/lib/utils";

// --- Helpers ---
const MAX_PERIOD_DAYS = 60;
const DEFAULT_PERIOD_DAYS = 30;

const dateToISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const todayISO = () => dateToISO(new Date());

const defaultEndDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + DEFAULT_PERIOD_DAYS);
  return dateToISO(d);
};

const diffDays = (a: string, b: string): number => {
  const da = new Date(a);
  const db = new Date(b);
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
};

const formatDate = (v?: string | null) => {
  if (!v) return "--";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "--";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "--";
  }
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

const formatTime = (v?: string | null) => {
  if (!v) return "--";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "--";
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--";
  }
};

// --- Types ---
type Rec = Record<string, unknown>;

interface DriverObj {
  name?: string;
  lastName?: string;
  nickName?: string;
  integrationCode?: string;
  registration?: string;
  driverBases?: Array<{ base?: { code?: string; description?: string } }> | null;
  driverFleets?: Array<{ fleet?: { code?: string; description?: string }; fleetGroup?: { code?: string } }> | null;
  [k: string]: unknown;
}

interface ActivityObj {
  code?: string;
  description?: string;
  start?: string;
  end?: string;
  [k: string]: unknown;
}

interface DriverRequestItem {
  id?: string;
  driverRequestId?: string;
  driverId?: string;
  driver?: DriverObj | null;
  activityId?: string;
  activity?: ActivityObj | null;
  requestDate?: string | null;
  notes?: string | null;
  flgStatus?: string | null;
  createAt?: string | null;
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
  driverId: string;
  activityId: string;
  fleetGroupId: string;
  locationGroupId: string;
  startDate: string;
  endDate: string;
  flgStatus: string;
}

interface DropdownOption {
  id: string;
  code?: string;
  description?: string;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Pendente",
    className: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
  },
  A: {
    label: "Aprovado",
    className: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700",
  },
  D: {
    label: "Negado",
    className: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
  },
};

const resolveStatus = (flgStatus?: string | null): string =>
  flgStatus ? flgStatus.toUpperCase() : "PENDING";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];


const exportColumns: ExportColumn[] = [
  { key: "requestDate", label: "Data Solicitada", format: (v) => {
    if (!v) return "--";
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? "--" : d.toLocaleDateString("pt-BR");
  }},
  { key: "driver", label: "Motorista" },
  { key: "activity", label: "Atividade" },
  { key: "schedule", label: "Programação" },
  { key: "notes", label: "Observação" },
  { key: "createAt", label: "Data do Pedido", format: (v) => {
    if (!v) return "--";
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? "--" : d.toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }},
  { key: "status", label: "Status", format: (v) => STATUS_MAP[resolveStatus(v as string | null)]?.label || String(v || "Pendente") },
];

const fetchRequests = async (
  filters: Filters,
  pageNumber: number,
  pageSize: number,
): Promise<{ items: DriverRequestItem[]; pagination: PaginationMeta }> => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append("StartDate", filters.startDate.slice(0, 10));
  if (filters.endDate) params.append("EndDate", filters.endDate.slice(0, 10));
  if (filters.driverId) params.append("DriverId", filters.driverId);
  if (filters.activityId) params.append("ActivityId", filters.activityId);
  if (filters.fleetGroupId) params.append("FleetGroupId", filters.fleetGroupId);
  if (filters.locationGroupId) params.append("LocationGroupId", filters.locationGroupId);
  if (filters.flgStatus === "__pending__") {
    params.append("FlgStatus", "T");
  } else if (filters.flgStatus) {
    params.append("FlgStatus", filters.flgStatus);
  }
  params.append("PageNumber", String(pageNumber));
  params.append("PageSize", String(pageSize));
  const res = await authFetch(`/Drivers/driverrequest?${params.toString()}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const items: DriverRequestItem[] = await res.json();
  const paginationHeader = res.headers.get("x-pagination");
  const pagination: PaginationMeta = paginationHeader
    ? JSON.parse(paginationHeader)
    : {
        TotalCount: items.length,
        PageSize: pageSize,
        CurrentPage: pageNumber,
        TotalPages: 1,
        HasNext: false,
        HasPrevious: false,
      };
  return { items, pagination };
};

const updateRequestStatus = async (payload: {
  driverRequestId: string;
  flgStatus: string;
}): Promise<void> => {
  const res = await authFetch("/Drivers/driverrequeststatus", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
};

const fetchDropdownOptions = async (endpoint: string): Promise<DropdownOption[]> => {
  const res = await authFetch(`/${endpoint}?PageSize=999&PageNumber=1`);
  if (!res.ok) return [];
  const data = await res.json();
  const items = Array.isArray(data) ? data : [];
  return items.map((item: Rec) => ({
    id: String(item.id || ""),
    code: String(item.code || ""),
    description: String(item.description || item.name || ""),
  }));
};

// --- Display helpers ---
const getDriverDisplay = (driver?: DriverObj | null): string => {
  if (!driver) return "--";
  const nick = driver.nickName || "";
  const intCode = driver.integrationCode || "";
  return intCode ? `${nick} - ${intCode}` : nick || "--";
};

const getDriverTooltip = (driver?: DriverObj | null): string => {
  if (!driver) return "";
  const parts: string[] = [];
  const nick = driver.nickName || "";
  const intCode = driver.integrationCode || "";
  if (nick || intCode) parts.push(`${nick} [${intCode}]`);
  
  // driverBases - try multiple possible shapes from the API
  if (driver.driverBases && Array.isArray(driver.driverBases) && driver.driverBases.length > 0) {
    const bases = driver.driverBases
      .map((b: any) => b?.description || b?.base?.description || b?.base?.code || b?.baseCode || b?.code || "")
      .filter(Boolean);
    if (bases.length) parts.push(`Base: ${bases.join(", ")}`);
  }

  // driverFleets - try multiple possible shapes from the API
  if (driver.driverFleets && Array.isArray(driver.driverFleets) && driver.driverFleets.length > 0) {
    const fleets = driver.driverFleets
      .map((f: any) => {
        const code = f?.licensePlate || f?.fleet?.code || f?.fleetCode || f?.code || "";
        const group = f?.fleetGroup?.code || f?.fleetGroupCode || "";
        return group ? `${code} (${group})` : code;
      })
      .filter(Boolean);
    if (fleets.length) parts.push(`Frotas: ${fleets.join(", ")}`);
  }

  return parts.join("\n");
};

const getScheduleDisplay = (activity?: ActivityObj | null): string => {
  if (!activity) return "--";
  const start = formatTime(activity.start);
  const end = formatTime(activity.end);
  return `${start} - ${end}`;
};

// --- Component ---
const DriverRequestPage = () => {
  const { t } = useTranslation();
  usePageTitle(t("menu.driversRequest"), UserCheck);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const emptyFilters = (): Filters => ({
    driverId: "",
    activityId: "",
    fleetGroupId: "",
    locationGroupId: "",
    startDate: todayISO(),
    endDate: defaultEndDate(),
    flgStatus: "__pending__",
  });

  const [filters, setFilters] = useState<Filters>(emptyFilters());
  const [searched, setSearched] = useState(false);
  const [searchParams, setSearchParams] = useState<Filters>(emptyFilters());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<string>("requestDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Dropdown data
  const { data: fleetGroups = [] } = useQuery({
    queryKey: ["dropdown-fleet-groups"],
    queryFn: () => fetchDropdownOptions("FleetGroup"),
    staleTime: 10 * 60 * 1000,
  });

  const { data: locationGroups = [] } = useQuery({
    queryKey: ["dropdown-location-groups"],
    queryFn: () => fetchDropdownOptions("LocationGroup"),
    staleTime: 10 * 60 * 1000,
  });

  // Action dialog state
  const [actionDialog, setActionDialog] = useState<{
    item: DriverRequestItem;
    action: "A" | "D";
  } | null>(null);

  // Data query
  const { data: queryData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["driver-requests", searchParams, currentPage, pageSize],
    queryFn: () => fetchRequests(searchParams, currentPage, pageSize),
    enabled: searched,
  });

  const rawItems = queryData?.items || [];
  const pagination = queryData?.pagination;

  // Sort items locally
  const getSortValue = (row: DriverRequestItem, key: string): string => {
    switch (key) {
      case "requestDate": return row.requestDate || "";
      case "driver": return getDriverDisplay(row.driver);
      case "activity": return row.activity?.code || "";
      case "schedule": return getScheduleDisplay(row.activity);
      case "notes": return row.notes || "";
      case "createAt": return row.createAt || "";
      case "status": return resolveStatus(row.flgStatus);
      default: return "";
    }
  };

  const items = [...rawItems].sort((a, b) => {
    const va = getSortValue(a, sortKey);
    const vb = getSortValue(b, sortKey);
    const cmp = va.localeCompare(vb, "pt-BR", { sensitivity: "base" });
    return sortDir === "asc" ? cmp : -cmp;
  });
  const totalPages = pagination?.TotalPages || 1;
  const totalCount = pagination?.TotalCount || 0;

  // Status mutation
  const [lastAction, setLastAction] = useState<"A" | "D" | null>(null);
  const statusMutation = useMutation({
    mutationFn: updateRequestStatus,
    onSuccess: () => {
      const actionLabel = lastAction === "A" ? "aprovada" : "negada";
      toast({ title: `Solicitação ${actionLabel} com sucesso!`, variant: "success" });
      setActionDialog(null);
      setLastAction(null);
      refetch();
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "error" });
    },
  });

  // Handlers
  const handleSearch = () => {
    if (!filters.startDate || !filters.endDate) {
      toast({
        title: "Período obrigatório",
        description: "Informe a data inicial e a data final.",
        variant: "error",
      });
      return;
    }
    const days = diffDays(filters.startDate, filters.endDate);
    if (days < 0) {
      toast({
        title: "Período inválido",
        description: "A data final deve ser maior ou igual à data inicial.",
        variant: "error",
      });
      return;
    }
    if (days > MAX_PERIOD_DAYS) {
      toast({
        title: "Período excedido",
        description: `O período máximo de consulta é de ${MAX_PERIOD_DAYS} dias.`,
        variant: "error",
      });
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

  const handleConfirmAction = () => {
    if (!actionDialog) return;
    const id = String(actionDialog.item.driverRequestId || actionDialog.item.id || "");
    setLastAction(actionDialog.action);
    statusMutation.mutate({
      driverRequestId: id,
      flgStatus: actionDialog.action,
    });
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };


  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      )
        pages.push(i);
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  // Status badge
  const renderStatus = (status?: string | null) => {
    const s = resolveStatus(status);
    const config = STATUS_MAP[s] || STATUS_MAP.PENDING;
    return (
      <Badge variant="outline" className={cn("text-xs", config.className)}>
        {config.label}
      </Badge>
    );
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 items-end">
            {/* 1. Data Inicial */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Data Inicial <span className="text-destructive">*</span>
              </Label>
              <DatePickerField
                value={filters.startDate}
                onChange={(v) => setFilters((f) => ({ ...f, startDate: v || "" }))}
                className="h-8 text-xs"
                hasError={!filters.startDate}
              />
            </div>
            {/* 2. Data Final */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Data Final <span className="text-destructive">*</span>
              </Label>
              <DatePickerField
                value={filters.endDate}
                onChange={(v) => setFilters((f) => ({ ...f, endDate: v || "" }))}
                className="h-8 text-xs"
                hasError={!filters.endDate}
              />
            </div>
            {/* 3. Motorista */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Motorista</Label>
              <LookupSearchField
                endpoint="Drivers"
                searchFilterParam="Filter1String"
                value={filters.driverId}
                onChange={(id) => setFilters((f) => ({ ...f, driverId: id }))}
                labelFn="codeName"
                placeholder="Motorista..."
                nullable
                modalVisibleColumns={["nickName", "integrationCode", "registration"]}
                columnLabels={{
                  nickName: "Apelido",
                  integrationCode: "Cód. Integração",
                  registration: "CPF",
                }}
              />
            </div>
            {/* 4. Atividade */}
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
            {/* 5. Grupo de Frota (Droplist) */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Grupo de Frota</Label>
              <Select
                value={filters.fleetGroupId || "__all__"}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, fleetGroupId: v === "__all__" ? "" : v }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="text-xs text-muted-foreground">
                    -- Todos --
                  </SelectItem>
                  {fleetGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id} className="text-xs">
                      {g.code} - {g.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* 6. Grupo de Localização (Droplist) */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Gr. Local</Label>
              <Select
                value={filters.locationGroupId || "__all__"}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, locationGroupId: v === "__all__" ? "" : v }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="text-xs text-muted-foreground">
                    -- Todos --
                  </SelectItem>
                  {locationGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id} className="text-xs">
                      {g.code} - {g.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* 7. Status */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Status</Label>
              <Select
                value={filters.flgStatus || "__all__"}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, flgStatus: v === "__all__" ? "" : v }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" className="text-xs text-muted-foreground">
                    -- Todos --
                  </SelectItem>
                  <SelectItem value="__pending__" className="text-xs">Pendente</SelectItem>
                  <SelectItem value="A" className="text-xs">Aprovado</SelectItem>
                  <SelectItem value="D" className="text-xs">Negado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={handleSearch}
              disabled={isLoading}
              className="h-7 gap-1.5 text-xs"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              {t("common.search")}
            </Button>
            {searched && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleClear}
                className="h-7 gap-1.5 text-xs"
              >
                <X className="h-3.5 w-3.5" />
                {t("common.clear")}
              </Button>
            )}
            <div className="flex-1" />
            {searched && items.length > 0 && (
              <ExportDropdown
                columns={exportColumns}
                title="Solicitações de Motoristas"
                fetchData={async () => items.map((row) => ({
                  requestDate: row.requestDate || "",
                  driver: getDriverDisplay(row.driver),
                  activity: row.activity?.code || "--",
                  schedule: getScheduleDisplay(row.activity),
                  notes: row.notes || "",
                  createAt: row.createAt || "",
                  status: resolveStatus(row.flgStatus),
                } as Record<string, unknown>))}
                filterDesc={[
                  `Período: ${formatDate(searchParams.startDate)} a ${formatDate(searchParams.endDate)}`,
                  searchParams.flgStatus ? `Status: ${STATUS_MAP[searchParams.flgStatus === "__pending__" ? "PENDING" : searchParams.flgStatus]?.label || searchParams.flgStatus}` : "",
                ].filter(Boolean)}
              />
            )}
          </div>

          {/* Results */}
          {searched && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
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
                <p className="text-sm text-muted-foreground py-4">
                  {t("common.noResults")}
                </p>
              )}
              {items.length > 0 && (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            {[
                              { key: "requestDate", label: "Data Solicitada" },
                              { key: "driver", label: "Motorista" },
                              { key: "activity", label: "Atividade" },
                              { key: "schedule", label: "Programação" },
                              { key: "notes", label: "Observação" },
                              { key: "createAt", label: "Data do Pedido" },
                              { key: "status", label: "Status" },
                            ].map((col) => (
                              <TableHead
                                key={col.key}
                                className="whitespace-nowrap font-medium h-8 px-3 text-xs cursor-pointer select-none hover:bg-muted/80"
                                onClick={() => handleSort(col.key)}
                              >
                                <span className="inline-flex items-center">
                                  {col.label}
                                  <SortIcon colKey={col.key} />
                                </span>
                              </TableHead>
                            ))}
                            <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs text-center w-24">
                              {t("common.actions")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((row, i) => {
                            const isPending = !row.flgStatus;
                            const driverTooltip = getDriverTooltip(row.driver);
                            return (
                              <TableRow
                                key={String(row.id || row.driverRequestId || i)}
                                className="hover:bg-muted/30 group h-6"
                              >
                                {/* Data Solicitada */}
                                <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">
                                  {formatDate(row.requestDate)}
                                </TableCell>
                                {/* Motorista with tooltip */}
                                <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-default">
                                        {getDriverDisplay(row.driver)}
                                      </span>
                                    </TooltipTrigger>
                                    {driverTooltip && (
                                      <TooltipContent side="top" className="max-w-xs">
                                        <pre className="text-xs whitespace-pre-wrap font-sans">
                                          {driverTooltip}
                                        </pre>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TableCell>
                                {/* Atividade */}
                                <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">
                                  {row.activity?.code || "--"}
                                </TableCell>
                                {/* Programação */}
                                <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">
                                  {getScheduleDisplay(row.activity)}
                                </TableCell>
                                {/* Observação */}
                                <TableCell className="text-xs py-0.5 px-3 max-w-[200px] truncate" title={row.notes || ""}>
                                  {row.notes || "--"}
                                </TableCell>
                                {/* Data do Pedido */}
                                <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">
                                  {formatDateTime(row.createAt)}
                                </TableCell>
                                {/* Status */}
                                <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">
                                  {renderStatus(row.flgStatus)}
                                </TableCell>
                                {/* Ações */}
                                <TableCell className="text-center text-xs py-0.5 px-3">
                                  {isPending && (
                                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                                        title="Aprovar"
                                        onClick={() => setActionDialog({ item: row, action: "A" })}
                                      >
                                        <CheckCircle2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/30"
                                        title="Negar"
                                        onClick={() => setActionDialog({ item: row, action: "D" })}
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
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
                        <span className="text-xs text-muted-foreground">
                          {t("common.rowsPerPage")}:
                        </span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={(v) => {
                            setPageSize(Number(v));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="h-7 w-16 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAGE_SIZE_OPTIONS.map((s) => (
                              <SelectItem key={s} value={String(s)} className="text-xs">
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground ml-2">
                          {totalCount} {t("common.records")}
                        </span>
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={!pagination?.HasPrevious}
                            onClick={() => setCurrentPage((p) => p - 1)}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </Button>
                          {getPageNumbers().map((p, i) =>
                            p === "ellipsis" ? (
                              <span key={`e${i}`} className="text-xs text-muted-foreground px-1">…</span>
                            ) : (
                              <Button
                                key={p}
                                variant={p === currentPage ? "default" : "outline"}
                                size="icon"
                                className="h-7 w-7 text-xs"
                                onClick={() => setCurrentPage(p)}
                              >
                                {p}
                              </Button>
                            ),
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={!pagination?.HasNext}
                            onClick={() => setCurrentPage((p) => p + 1)}
                          >
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

        {/* Confirmation dialog */}
        <AlertDialog
          open={actionDialog !== null}
          onOpenChange={() => setActionDialog(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionDialog?.action === "A" ? "Aprovar Solicitação" : "Negar Solicitação"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {actionDialog?.action === "A"
                  ? "Tem certeza que deseja aprovar esta solicitação de motorista?"
                  : "Tem certeza que deseja negar esta solicitação de motorista?"}
                {actionDialog?.item.driver && (
                  <span className="block mt-1 font-semibold text-foreground">
                    Motorista: {getDriverDisplay(actionDialog.item.driver)}
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmAction}
                className={cn(
                  actionDialog?.action === "A"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                )}
              >
                {statusMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : actionDialog?.action === "A" ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                {actionDialog?.action === "A" ? "Aprovar" : "Negar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

export default DriverRequestPage;
