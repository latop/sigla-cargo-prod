import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search, Loader2, X, ChevronLeft, ChevronRight,
  ArrowUp, ArrowDown, ArrowUpDown, Plus, Pencil, Trash2, Truck,
} from "lucide-react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/auth-fetch";
import { DatePickerField } from "@/components/DatePickerField";
import { LookupSearchField } from "@/components/LookupSearchField";
import { ExportDropdown } from "@/components/ExportDropdown";
import { type ExportColumn } from "@/lib/export-utils";
import { cn } from "@/lib/utils";

// --- Helpers ---
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDate = (v?: string | null) => {
  if (!v) return "--";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "--";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return "--"; }
};

const formatTime = (v?: string | null) => {
  if (!v) return "--";
  if (/^\d{2}:\d{2}/.test(v)) return v.slice(0, 5);
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "--";
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch { return "--"; }
};

const applyTimeMask = (input: string): string => {
  const digits = input.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

type Rec = Record<string, unknown>;

interface TruckAssignment {
  id?: string;
  truckId?: string;
  driverId?: string;
  truck?: { licensePlate?: string; fleetCode?: string; [k: string]: unknown } | null;
  driver?: { nickName?: string; integrationCode?: string; registration?: string; [k: string]: unknown } | null;
  startDate?: string | null;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
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
  locationGroupCode: string;
  fleetDescription: string;
}

interface DropdownOption {
  id: string;
  code?: string;
  description?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// --- API ---
const fetchDropdownOptions = async (endpoint: string): Promise<DropdownOption[]> => {
  const res = await authFetch(`/${endpoint}?PageSize=999&PageNumber=1`);
  if (!res.ok) return [];
  const data = await res.json();
  const items = Array.isArray(data) ? data : [];
  return items
    .map((item: Rec) => ({
      id: String(item.id || ""),
      code: String(item.code || ""),
      description: String(item.description || item.name || ""),
    }))
    .sort((a, b) => (a.code || "").localeCompare(b.code || ""));
};

const fetchAssignments = async (
  filters: Filters, pageNumber: number, pageSize: number
): Promise<{ items: TruckAssignment[]; pagination: PaginationMeta }> => {
  const params = new URLSearchParams();
  params.append("startDate", filters.startDate.slice(0, 10));
  params.append("endDate", filters.endDate.slice(0, 10));
  if (filters.locationGroupCode) params.append("locationGroupCode", filters.locationGroupCode);
  if (filters.fleetDescription) params.append("fleetDescription", filters.fleetDescription);
  params.append("PageNumber", String(pageNumber));
  params.append("PageSize", String(pageSize));
  const res = await authFetch(`/TruckAssignment/gettruckassignment?${params.toString()}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const items: TruckAssignment[] = await res.json();
  const ph = res.headers.get("x-pagination");
  const pagination: PaginationMeta = ph
    ? JSON.parse(ph)
    : { TotalCount: items.length, PageSize: pageSize, CurrentPage: pageNumber, TotalPages: 1, HasNext: false, HasPrevious: false };
  return { items, pagination };
};

const deleteAssignment = async (id: string): Promise<void> => {
  const res = await authFetch(`/TruckAssignment/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
};

const saveAssignment = async (data: Rec, isEdit: boolean): Promise<void> => {
  const res = await authFetch(`/TruckAssignment`, {
    method: isEdit ? "PUT" : "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
};

const asRec = (v: unknown): Rec => (v && typeof v === "object" ? (v as Rec) : {});
const asText = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

const mapTruckLookupItem = (item: Rec): Rec => {
  const nested = asRec(item.truck);
  return {
    ...item,
    code: asText(item.licensePlate || nested.licensePlate || item.code),
    name: asText(item.fleetCode || nested.fleetCode || item.name),
  };
};

const mapDriverLookupItem = (item: Rec): Rec => {
  const nested = asRec(item.driver);
  return {
    ...item,
    code: asText(item.nickName || nested.nickName || item.code || item.name),
    name: asText(item.integrationCode || nested.integrationCode || item.registration || item.description),
  };
};

const extractHHmm = (v?: string | null): string => {
  if (!v) return "00:00";
  if (/^\d{2}:\d{2}/.test(v)) return v.slice(0, 5);
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "00:00";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch { return "00:00"; }
};

// --- Gantt helpers ---
const GANTT_HOURS = Array.from({ length: 24 }, (_, i) => i);
const GANTT_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500",
  "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-teal-500",
];

interface GanttBar {
  label: string;
  subLabel: string;
  startMin: number;
  endMin: number;
  color: string;
}

const timeToMinutes = (timeStr?: string | null): number => {
  const hhmm = extractHHmm(timeStr);
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

// --- Component ---
const DailyVehicleAssignmentPage = () => {
  const { t } = useTranslation();
  usePageTitle(t("menu.dailyVehicleAssignment"), Truck);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const emptyFilters = (): Filters => ({
    startDate: todayISO(),
    endDate: todayISO(),
    locationGroupCode: "",
    fleetDescription: "",
  });

  const [filters, setFilters] = useState<Filters>(emptyFilters());
  const [searched, setSearched] = useState(false);
  const [searchParams, setSearchParams] = useState<Filters>(emptyFilters());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [activeTab, setActiveTab] = useState("list");

  // Dropdowns
  const { data: locationGroups = [] } = useQuery({
    queryKey: ["dd-loc-groups-dva"],
    queryFn: () => fetchDropdownOptions("LocationGroup"),
    staleTime: 10 * 60 * 1000,
  });
  const { data: fleetGroups = [] } = useQuery({
    queryKey: ["dd-fleet-groups-dva"],
    queryFn: () => fetchDropdownOptions("FleetGroup"),
    staleTime: 10 * 60 * 1000,
  });

  // Data query
  const { data: queryData, isLoading, refetch } = useQuery({
    queryKey: ["truck-assignments", searchParams, currentPage, pageSize],
    queryFn: () => fetchAssignments(searchParams, currentPage, pageSize),
    enabled: searched,
  });

  // Gantt needs all data
  const { data: ganttData } = useQuery({
    queryKey: ["truck-assignments-gantt", searchParams],
    queryFn: () => fetchAssignments(searchParams, 1, 9999),
    enabled: searched && activeTab !== "list",
  });

  const rawItems = queryData?.items || [];
  const pagination = queryData?.pagination;
  const totalPages = pagination?.TotalPages || 1;
  const totalCount = pagination?.TotalCount || 0;
  const ganttItems = ganttData?.items || rawItems;

  // Sort
  const getSortVal = (row: TruckAssignment, key: string): string => {
    if (key === "vehicle") return `${row.truck?.licensePlate || ""} ${row.truck?.fleetCode || ""}`;
    if (key === "driver") return `${row.driver?.nickName || ""} ${row.driver?.integrationCode || ""}`;
    if (key === "startDate") return row.startDate || "";
    if (key === "startTime") return row.startTime || "";
    if (key === "endTime") return row.endTime || "";
    return "";
  };

  const items = sortKey
    ? [...rawItems].sort((a, b) => {
        const va = getSortVal(a, sortKey);
        const vb = getSortVal(b, sortKey);
        const cmp = va.localeCompare(vb, "pt-BR", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      })
    : rawItems;

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Search
  const handleSearch = () => {
    if (!filters.startDate || !filters.endDate) {
      toast({ title: t("common.requiredFields"), description: t("dailyVehicleAssignment.datesRequired"), variant: "error" });
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

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAssignment(id),
    onSuccess: () => {
      toast({ title: t("common.deleteSuccess"), variant: "success" });
      refetch();
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "error" }),
  });

  // Edit/Create modal
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<TruckAssignment | null>(null);
  const emptyForm = () => ({
    truckId: "", driverId: "", refDate: "", startTime: "00:00", endTime: "23:59",
  });
  const [form, setForm] = useState(emptyForm());
  const [formLabels, setFormLabels] = useState({ truck: "", driver: "" });

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormLabels({ truck: "", driver: "" });
    setFormOpen(true);
  };

  const openEdit = (item: TruckAssignment) => {
    setEditItem(item);
    setForm({
      truckId: item.truckId || "",
      driverId: item.driverId || "",
      refDate: item.startDate ? item.startDate.slice(0, 10) : "",
      startTime: extractHHmm(item.startTime),
      endTime: extractHHmm(item.endTime),
    });
    setFormLabels({
      truck: [item.truck?.licensePlate, item.truck?.fleetCode].filter(Boolean).join(" - "),
      driver: [item.driver?.nickName, item.driver?.integrationCode].filter(Boolean).join(" - "),
    });
    setFormOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: (payload: Rec) => saveAssignment(payload, !!editItem),
    onSuccess: () => {
      toast({ title: t("common.saveSuccess"), variant: "success" });
      setFormOpen(false);
      refetch();
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "error" }),
  });

  const handleSave = () => {
    if (!form.truckId || !form.driverId || !form.refDate) {
      toast({ title: t("common.requiredFields"), variant: "error" });
      return;
    }
    const payload: Rec = {
      ...(editItem?.id ? { id: editItem.id } : {}),
      truckId: form.truckId,
      driverId: form.driverId,
      startDate: form.refDate,
      startTime: form.startTime + ":00",
      endDate: form.refDate,
      endTime: form.endTime + ":00",
    };
    saveMut.mutate(payload);
  };

  // Export
  const exportColumns: ExportColumn[] = [
    { key: "vehicle", label: t("vehiclePlanning.vehicle") },
    { key: "driver", label: t("vehiclePlanning.driver") },
    { key: "refDate", label: t("common.referenceDate"), format: (v) => formatDate(v as string) },
    { key: "startTime", label: t("vehiclePlanning.startTime"), format: (v) => formatTime(v as string) },
    { key: "endTime", label: t("vehiclePlanning.endTime"), format: (v) => formatTime(v as string) },
  ];

  const fetchExportData = async (): Promise<Rec[]> => {
    const { items: all } = await fetchAssignments(searchParams, 1, 9999);
    return all.map((r) => ({
      vehicle: `${r.truck?.licensePlate || ""} / ${r.truck?.fleetCode || ""}`,
      driver: `${r.driver?.nickName || ""} / ${r.driver?.integrationCode || ""}`,
      refDate: r.startDate,
      startTime: r.startTime,
      endTime: r.endTime,
    }));
  };

  // Pagination
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

  // --- Gantt data builders ---
  const vehicleGanttData = useMemo(() => {
    const map = new Map<string, { label: string; bars: GanttBar[] }>();
    ganttItems.forEach((item, idx) => {
      const vKey = item.truckId || `v-${idx}`;
      const vLabel = `${item.truck?.licensePlate || "?"} / ${item.truck?.fleetCode || ""}`;
      if (!map.has(vKey)) map.set(vKey, { label: vLabel, bars: [] });
      const entry = map.get(vKey)!;
      entry.bars.push({
        label: item.driver?.nickName || "?",
        subLabel: item.driver?.integrationCode || "",
        startMin: timeToMinutes(item.startTime),
        endMin: timeToMinutes(item.endTime) || 1440,
        color: GANTT_COLORS[entry.bars.length % GANTT_COLORS.length],
      });
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [ganttItems]);

  const driverGanttData = useMemo(() => {
    const map = new Map<string, { label: string; bars: GanttBar[] }>();
    ganttItems.forEach((item, idx) => {
      const dKey = item.driverId || `d-${idx}`;
      const dLabel = `${item.driver?.nickName || "?"} / ${item.driver?.integrationCode || ""}`;
      if (!map.has(dKey)) map.set(dKey, { label: dLabel, bars: [] });
      const entry = map.get(dKey)!;
      entry.bars.push({
        label: item.truck?.licensePlate || "?",
        subLabel: item.truck?.fleetCode || "",
        startMin: timeToMinutes(item.startTime),
        endMin: timeToMinutes(item.endTime) || 1440,
        color: GANTT_COLORS[entry.bars.length % GANTT_COLORS.length],
      });
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [ganttItems]);

  // --- Gantt renderer ---
  const renderGantt = (data: { label: string; bars: GanttBar[] }[], emptyMsg: string) => (
    <div className="border rounded-md overflow-auto">
      <div className="min-w-[900px]">
        {/* Header */}
        <div className="flex border-b bg-muted/30 sticky top-0 z-10">
          <div className="w-48 shrink-0 px-2 py-1.5 text-xs font-medium border-r sticky left-0 bg-muted/30">
            {emptyMsg === "vehicle" ? t("vehiclePlanning.vehicle") : t("vehiclePlanning.driver")}
          </div>
          <div className="flex-1 flex">
            {GANTT_HOURS.map(h => (
              <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground border-r py-1.5 min-w-[30px]">
                {String(h).padStart(2, "0")}
              </div>
            ))}
          </div>
        </div>
        {/* Rows */}
        {data.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8">{t("common.noResults")}</div>
        ) : (
          data.map((row, rIdx) => (
            <div key={rIdx} className="flex border-b hover:bg-muted/20 transition-colors">
              <div className="w-48 shrink-0 px-2 py-1 text-xs border-r flex items-center sticky left-0 bg-background">
                <span className="truncate">{row.label}</span>
              </div>
              <div className="flex-1 relative h-8">
                {/* Grid lines */}
                {GANTT_HOURS.map(h => (
                  <div key={h} className="absolute top-0 bottom-0 border-r border-dashed border-muted-foreground/10"
                    style={{ left: `${(h / 24) * 100}%` }} />
                ))}
                {/* Bars */}
                {row.bars.map((bar, bIdx) => {
                  const left = (bar.startMin / 1440) * 100;
                  const width = Math.max(((bar.endMin - bar.startMin) / 1440) * 100, 0.5);
                  return (
                    <TooltipProvider key={bIdx}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn("absolute top-1 bottom-1 rounded-sm text-white text-[9px] flex items-center px-1 overflow-hidden cursor-default", bar.color)}
                            style={{ left: `${left}%`, width: `${width}%` }}
                          >
                            <span className="truncate">{bar.label}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          <p className="font-medium">{bar.label} {bar.subLabel && `- ${bar.subLabel}`}</p>
                          <p>{`${String(Math.floor(bar.startMin / 60)).padStart(2, "0")}:${String(bar.startMin % 60).padStart(2, "0")} — ${String(Math.floor(bar.endMin / 60)).padStart(2, "0")}:${String(bar.endMin % 60).padStart(2, "0")}`}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              {t("vehiclePlanning.startDate")} <span className="text-destructive">*</span>
            </Label>
            <DatePickerField
              value={filters.startDate}
              onChange={(v) => setFilters(f => ({ ...f, startDate: v || "" }))}
              className="h-8 text-xs"
              hasError={!filters.startDate}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              {t("vehiclePlanning.endDate")} <span className="text-destructive">*</span>
            </Label>
            <DatePickerField
              value={filters.endDate}
              onChange={(v) => setFilters(f => ({ ...f, endDate: v || "" }))}
              className="h-8 text-xs"
              hasError={!filters.endDate}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">{t("menu.locationGroup")}</Label>
            <Select
              value={filters.locationGroupCode || "__all__"}
              onValueChange={(v) => setFilters(f => ({ ...f, locationGroupCode: v === "__all__" ? "" : v }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t("common.selectAll")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("common.selectAll")}</SelectItem>
                {locationGroups.map(g => (
                  <SelectItem key={g.id} value={g.code || g.id}>{g.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">{t("menu.fleetGroup")}</Label>
            <Select
              value={filters.fleetDescription || "__all__"}
              onValueChange={(v) => setFilters(f => ({ ...f, fleetDescription: v === "__all__" ? "" : v }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t("common.selectAll")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("common.selectAll")}</SelectItem>
                {fleetGroups.map(g => (
                  <SelectItem key={g.id} value={g.code || g.id}>{g.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSearch} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              {t("common.search")}
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleClear}>
              <X className="h-3.5 w-3.5" /> {t("common.clear")}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {searched && items.length > 0 && (
              <ExportDropdown fetchData={fetchExportData} columns={exportColumns} title={t("menu.dailyVehicleAssignment")} />
            )}
            <Button size="sm" className="h-7 text-xs gap-1" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> {t("common.new")}
            </Button>
          </div>
        </div>

        {/* Tabs: List / Gantt Vehicle / Gantt Driver */}
        {searched && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-8">
                <TabsTrigger value="list" className="text-xs h-7">{t("dailyVehicleAssignment.tabList")}</TabsTrigger>
                <TabsTrigger value="gantt-vehicle" className="text-xs h-7">{t("dailyVehicleAssignment.tabGanttVehicle")}</TabsTrigger>
                <TabsTrigger value="gantt-driver" className="text-xs h-7">{t("dailyVehicleAssignment.tabGanttDriver")}</TabsTrigger>
              </TabsList>

              {/* LIST */}
              <TabsContent value="list">
                <div className="border rounded-md overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-8 text-xs px-2 cursor-pointer whitespace-nowrap" onClick={() => handleSort("vehicle")}>
                          {t("vehiclePlanning.vehicle")} <SortIcon colKey="vehicle" />
                        </TableHead>
                        <TableHead className="h-8 text-xs px-2 cursor-pointer whitespace-nowrap" onClick={() => handleSort("driver")}>
                          {t("vehiclePlanning.driver")} <SortIcon colKey="driver" />
                        </TableHead>
                        <TableHead className="h-8 text-xs px-2 cursor-pointer whitespace-nowrap" onClick={() => handleSort("startDate")}>
                          {t("common.referenceDate")} <SortIcon colKey="startDate" />
                        </TableHead>
                        <TableHead className="h-8 text-xs px-2 whitespace-nowrap">
                          {t("vehiclePlanning.startTime")}
                        </TableHead>
                        <TableHead className="h-8 text-xs px-2 whitespace-nowrap">
                          {t("vehiclePlanning.endTime")}
                        </TableHead>
                        <TableHead className="h-8 text-xs px-2 text-right whitespace-nowrap">{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                            {t("common.noResults")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((row) => (
                          <TableRow key={String(row.id)}>
                            <TableCell className="h-7 text-xs px-2 py-1 whitespace-nowrap">
                              {row.truck?.licensePlate || "--"} / {row.truck?.fleetCode || "--"}
                            </TableCell>
                            <TableCell className="h-7 text-xs px-2 py-1 whitespace-nowrap">
                              {row.driver?.nickName || "--"} / {row.driver?.integrationCode || "--"}
                            </TableCell>
                            <TableCell className="h-7 text-xs px-2 py-1">{formatDate(row.startDate)}</TableCell>
                            <TableCell className="h-7 text-xs px-2 py-1">{formatTime(row.startTime)}</TableCell>
                            <TableCell className="h-7 text-xs px-2 py-1">{formatTime(row.endTime)}</TableCell>
                            <TableCell className="h-7 text-xs px-2 py-1 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(row)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteId(String(row.id))}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination && totalPages > 0 && (
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{totalCount} {t("common.records")}</span>
                      <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setCurrentPage(1); }}>
                        <SelectTrigger className="h-7 w-[70px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAGE_SIZE_OPTIONS.map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <span>{t("common.rowsPerPage")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      {getPageNumbers().map((p, i) =>
                        p === "ellipsis" ? (
                          <span key={`e${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                        ) : (
                          <Button key={p} variant={currentPage === p ? "default" : "outline"} size="icon" className="h-7 w-7 text-xs" onClick={() => setCurrentPage(p)}>
                            {p}
                          </Button>
                        )
                      )}
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* GANTT VEHICLE */}
              <TabsContent value="gantt-vehicle">
                {renderGantt(vehicleGanttData, "vehicle")}
              </TabsContent>

              {/* GANTT DRIVER */}
              <TabsContent value="gantt-driver">
                {renderGantt(driverGanttData, "driver")}
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.confirmDeleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) { deleteMut.mutate(deleteId); setDeleteId(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editItem ? t("common.edit") : t("common.new")} — {t("menu.dailyVehicleAssignment")}
            </DialogTitle>
            <DialogDescription className="sr-only">Formulário de planejamento diário de veículo</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {/* Veículo */}
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-medium">{t("vehiclePlanning.vehicle")} <span className="text-destructive">*</span></Label>
              <LookupSearchField
                endpoint="Truck"
                searchFilterParam="Filter1String"
                value={form.truckId}
                onChange={(id, item) => {
                  setForm(f => ({ ...f, truckId: id }));
                  const mapped = item ? mapTruckLookupItem(item as Rec) : null;
                  setFormLabels(l => ({
                    ...l,
                    truck: mapped ? [mapped.code, mapped.name].filter(Boolean).join(" - ") : "",
                  }));
                }}
                placeholder={t("vehiclePlanning.vehicle")}
                modalVisibleColumns={["licensePlate", "fleetCode"]}
                columnLabels={{ licensePlate: "Placa", fleetCode: "Cód. Frota" }}
                labelFn="codeName"
                initialLabel={formLabels.truck}
                transformItem={mapTruckLookupItem}
                className="h-8 text-xs"
                nullable
                hasError={!form.truckId}
              />
            </div>
            {/* Motorista */}
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-medium">{t("vehiclePlanning.driver")} <span className="text-destructive">*</span></Label>
              <LookupSearchField
                endpoint="Drivers"
                searchFilterParam="Filter1String"
                value={form.driverId}
                onChange={(id, item) => {
                  setForm(f => ({ ...f, driverId: id }));
                  const mapped = item ? mapDriverLookupItem(item as Rec) : null;
                  setFormLabels(l => ({
                    ...l,
                    driver: mapped ? [mapped.code, mapped.name].filter(Boolean).join(" - ") : "",
                  }));
                }}
                placeholder={t("menu.driver")}
                modalVisibleColumns={["nickName", "integrationCode", "registration"]}
                columnLabels={{ nickName: t("driver.nickName"), integrationCode: t("driver.integrationCode"), registration: t("driver.registration") }}
                labelFn="codeName"
                initialLabel={formLabels.driver}
                transformItem={mapDriverLookupItem}
                className="h-8 text-xs"
                nullable
                hasError={!form.driverId}
                forceActiveOnly
              />
            </div>
            {/* Data Referência */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("common.referenceDate")} <span className="text-destructive">*</span></Label>
              <DatePickerField
                value={form.refDate}
                onChange={(v) => setForm(f => ({ ...f, refDate: v || "" }))}
                className="h-8 text-xs"
                hasError={!form.refDate}
              />
            </div>
            {/* Hora Início */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("vehiclePlanning.startTime")}</Label>
              <Input
                value={form.startTime}
                onChange={(e) => setForm(f => ({ ...f, startTime: applyTimeMask(e.target.value) }))}
                placeholder="hh:mm"
                className="h-8 text-xs"
                maxLength={5}
              />
            </div>
            {/* Hora Fim */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("vehiclePlanning.endTime")}</Label>
              <Input
                value={form.endTime}
                onChange={(e) => setForm(f => ({ ...f, endTime: applyTimeMask(e.target.value) }))}
                placeholder="hh:mm"
                className="h-8 text-xs"
                maxLength={5}
              />
            </div>
          </div>
          <DialogFooter className="mt-3">
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>{t("common.cancel")}</Button>
            <Button size="sm" onClick={handleSave} disabled={saveMut.isPending}>
              {saveMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailyVehicleAssignmentPage;
