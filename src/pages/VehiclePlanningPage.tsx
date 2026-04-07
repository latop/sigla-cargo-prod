import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search, Loader2, X, ChevronLeft, ChevronRight,
  ArrowUp, ArrowDown, ArrowUpDown, Plus, Pencil, Trash2, Truck, Cog,
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
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/auth-fetch";
import { DatePickerField } from "@/components/DatePickerField";
import { LookupSearchField } from "@/components/LookupSearchField";
import { ExportDropdown } from "@/components/ExportDropdown";
import { type ExportColumn } from "@/lib/export-utils";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

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
  // Handle "HH:mm:ss" or "HH:mm" string format
  if (/^\d{2}:\d{2}/.test(v)) return v.slice(0, 5);
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "--";
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch { return "--"; }
};

// --- Types ---
type Rec = Record<string, unknown>;

interface TruckAssignmentPlan {
  id?: string;
  truckId?: string;
  driverId?: string;
  truck?: { licensePlate?: string; fleetCode?: string; [k: string]: unknown } | null;
  driver?: { nickName?: string; integrationCode?: string; registration?: string; [k: string]: unknown } | null;
  startDate?: string | null;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
  freqMon?: number;
  freqTue?: number;
  freqWed?: number;
  freqThu?: number;
  freqFri?: number;
  freqSat?: number;
  freqSun?: number;
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
  dtRef: string;
  locationGroupId: string;
  fleetGroupId: string;
  licensePlate: string;
  fleetCode: string;
  driverId: string;
}

interface DropdownOption {
  id: string;
  code?: string;
  description?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const FREQ_KEYS = ["freqMon", "freqTue", "freqWed", "freqThu", "freqFri", "freqSat", "freqSun"] as const;

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

const fetchPlans = async (
  filters: Filters, pageNumber: number, pageSize: number
): Promise<{ items: TruckAssignmentPlan[]; pagination: PaginationMeta }> => {
  const params = new URLSearchParams();
  params.append("Filter1String", filters.dtRef.slice(0, 10));
  if (filters.locationGroupId) params.append("Filter1Id", filters.locationGroupId);
  if (filters.fleetGroupId) params.append("Filter2Id", filters.fleetGroupId);
  if (filters.licensePlate) params.append("Filter2String", filters.licensePlate);
  if (filters.fleetCode) params.append("Filter3String", filters.fleetCode);
  if (filters.driverId) params.append("Filter3Id", filters.driverId);
  params.append("PageNumber", String(pageNumber));
  params.append("PageSize", String(pageSize));
  const res = await authFetch(`/TruckAssignmentPlan?${params.toString()}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const items: TruckAssignmentPlan[] = await res.json();
  const ph = res.headers.get("x-pagination");
  const pagination: PaginationMeta = ph
    ? JSON.parse(ph)
    : { TotalCount: items.length, PageSize: pageSize, CurrentPage: pageNumber, TotalPages: 1, HasNext: false, HasPrevious: false };
  return { items, pagination };
};

const deletePlan = async (id: string): Promise<void> => {
  const res = await authFetch(`/TruckAssignmentPlan/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
};

const savePlan = async (data: Rec, isEdit: boolean): Promise<void> => {
  const res = await authFetch(`/TruckAssignmentPlan`, {
    method: isEdit ? "PUT" : "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
};

const generateAssignments = async (payload: {
  startDate: string; endDate: string; locationGroupCode: string; fleetGroupCode: string;
}): Promise<string> => {
  const res = await authFetch(`/TruckAssignment/generatetruckassignments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const text = await res.text();
  return text;
};

// --- Time mask helper ---
const applyTimeMask = (input: string): string => {
  const digits = input.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
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

// --- Component ---
const VehiclePlanningPage = () => {
  const { t } = useTranslation();
  usePageTitle(t("menu.vehiclePlanning"), Truck);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const freqLabels: Record<string, string> = {
    freqMon: t("vehiclePlanning.mon"),
    freqTue: t("vehiclePlanning.tue"),
    freqWed: t("vehiclePlanning.wed"),
    freqThu: t("vehiclePlanning.thu"),
    freqFri: t("vehiclePlanning.fri"),
    freqSat: t("vehiclePlanning.sat"),
    freqSun: t("vehiclePlanning.sun"),
  };

  const emptyFilters = (): Filters => ({
    dtRef: todayISO(),
    locationGroupId: "",
    fleetGroupId: "",
    licensePlate: "",
    fleetCode: "",
    driverId: "",
  });

  const [filters, setFilters] = useState<Filters>(emptyFilters());
  const [searched, setSearched] = useState(false);
  const [searchParams, setSearchParams] = useState<Filters>(emptyFilters());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Dropdowns
  const { data: locationGroups = [] } = useQuery({
    queryKey: ["dd-loc-groups-vp"],
    queryFn: () => fetchDropdownOptions("LocationGroup"),
    staleTime: 10 * 60 * 1000,
  });
  const { data: fleetGroups = [] } = useQuery({
    queryKey: ["dd-fleet-groups-vp"],
    queryFn: () => fetchDropdownOptions("FleetGroup"),
    staleTime: 10 * 60 * 1000,
  });

  // Data query
  const { data: queryData, isLoading, refetch } = useQuery({
    queryKey: ["truck-assignment-plans", searchParams, currentPage, pageSize],
    queryFn: () => fetchPlans(searchParams, currentPage, pageSize),
    enabled: searched,
  });

  const rawItems = queryData?.items || [];
  const pagination = queryData?.pagination;
  const totalPages = pagination?.TotalPages || 1;
  const totalCount = pagination?.TotalCount || 0;

  // Sort
  const getSortVal = (row: TruckAssignmentPlan, key: string): string => {
    if (key === "vehicle") return `${row.truck?.licensePlate || ""} ${row.truck?.fleetCode || ""}`;
    if (key === "driver") return `${row.driver?.nickName || ""} ${row.driver?.integrationCode || ""}`;
    if (key === "startDate") return row.startDate || "";
    if (key === "startTime") return row.startTime || "";
    if (key === "endDate") return row.endDate || "";
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
    if (!filters.dtRef) {
      toast({ title: t("common.requiredFields"), description: t("vehiclePlanning.dtRefRequired"), variant: "error" });
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
    mutationFn: (id: string) => deletePlan(id),
    onSuccess: () => {
      toast({ title: t("common.deleteSuccess"), variant: "success" });
      refetch();
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "error" }),
  });

  // Edit/Create modal
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<TruckAssignmentPlan | null>(null);
  const emptyForm = () => ({
    truckId: "", driverId: "", startDate: "", startTime: "00:00", endDate: "", endTime: "00:00",
    freqMon: 1, freqTue: 1, freqWed: 1, freqThu: 1, freqFri: 1, freqSat: 0, freqSun: 0,
  });
  const [form, setForm] = useState(emptyForm());
  const [formLabels, setFormLabels] = useState({ truck: "", driver: "" });

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormLabels({ truck: "", driver: "" });
    setFormOpen(true);
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

  const openEdit = (item: TruckAssignmentPlan) => {
    setEditItem(item);
    setForm({
      truckId: item.truckId || "",
      driverId: item.driverId || "",
      startDate: item.startDate ? item.startDate.slice(0, 10) : "",
      startTime: extractHHmm(item.startTime),
      endDate: item.endDate ? item.endDate.slice(0, 10) : "",
      endTime: extractHHmm(item.endTime),
      freqMon: item.freqMon ?? 1,
      freqTue: item.freqTue ?? 1,
      freqWed: item.freqWed ?? 1,
      freqThu: item.freqThu ?? 1,
      freqFri: item.freqFri ?? 1,
      freqSat: item.freqSat ?? 0,
      freqSun: item.freqSun ?? 0,
    });
    setFormLabels({
      truck: [item.truck?.licensePlate, item.truck?.fleetCode].filter(Boolean).join(" - "),
      driver: [item.driver?.nickName, item.driver?.integrationCode].filter(Boolean).join(" - "),
    });
    setFormOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: (payload: Rec) => savePlan(payload, !!editItem),
    onSuccess: () => {
      toast({ title: t("common.saveSuccess"), variant: "success" });
      setFormOpen(false);
      refetch();
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "error" }),
  });

  const handleSave = () => {
    if (!form.truckId || !form.driverId || !form.startDate || !form.endDate) {
      toast({ title: t("common.requiredFields"), variant: "error" });
      return;
    }
    if (form.startDate > form.endDate) {
      toast({ title: t("driverVacation.startAfterEnd"), variant: "destructive" });
      return;
    }
    const payload: Rec = {
      ...(editItem?.id ? { id: editItem.id } : {}),
      truckId: form.truckId,
      driverId: form.driverId,
      startDate: form.startDate,
      startTime: form.startTime + ":00",
      endDate: form.endDate,
      endTime: form.endTime + ":00",
      freqMon: form.freqMon,
      freqTue: form.freqTue,
      freqWed: form.freqWed,
      freqThu: form.freqThu,
      freqFri: form.freqFri,
      freqSat: form.freqSat,
      freqSun: form.freqSun,
    };
    saveMut.mutate(payload);
  };

  // Generate modal
  const [genOpen, setGenOpen] = useState(false);
  const [genForm, setGenForm] = useState({ startDate: "", endDate: "", locationGroupCode: "", fleetGroupCode: "" });

  const genMut = useMutation({
    mutationFn: generateAssignments,
    onSuccess: (msg) => {
      toast({ title: t("vehiclePlanning.generateSuccess"), description: msg || "OK", variant: "success" });
      setGenOpen(false);
      if (searched) refetch();
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "error" }),
  });

  const handleGenerate = () => {
    if (!genForm.startDate || !genForm.endDate || !genForm.locationGroupCode) {
      toast({ title: t("common.requiredFields"), variant: "error" });
      return;
    }
    if (genForm.startDate > genForm.endDate) {
      toast({ title: t("driverVacation.startAfterEnd"), variant: "destructive" });
      return;
    }
    genMut.mutate({
      startDate: `${genForm.startDate}T00:00:00.000Z`,
      endDate: `${genForm.endDate}T23:59:59.000Z`,
      locationGroupCode: genForm.locationGroupCode,
      fleetGroupCode: genForm.fleetGroupCode || "",
    });
  };

  // Export
  const exportColumns: ExportColumn[] = [
    { key: "vehicle", label: t("vehiclePlanning.vehicle") },
    { key: "driver", label: t("vehiclePlanning.driver") },
    { key: "startDate", label: t("vehiclePlanning.startDate"), format: (v) => formatDate(v as string) },
    { key: "startTime", label: t("vehiclePlanning.startTime"), format: (v) => formatTime(v as string) },
    { key: "endDate", label: t("vehiclePlanning.endDate"), format: (v) => formatDate(v as string) },
    { key: "endTime", label: t("vehiclePlanning.endTime"), format: (v) => formatTime(v as string) },
  ];

  const fetchExportData = async (): Promise<Rec[]> => {
    const { items: all } = await fetchPlans(searchParams, 1, 9999);
    return all.map((r) => ({
      vehicle: `${r.truck?.licensePlate || ""} / ${r.truck?.fleetCode || ""}`,
      driver: `${r.driver?.nickName || ""} / ${r.driver?.integrationCode || ""}`,
      startDate: r.startDate,
      startTime: r.startTime,
      endDate: r.endDate,
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 items-end">
          {/* 1. Data Referência */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              {t("common.referenceDate")} <span className="text-destructive">*</span>
            </Label>
            <DatePickerField
              value={filters.dtRef}
              onChange={(v) => setFilters(f => ({ ...f, dtRef: v || "" }))}
              className="h-8 text-xs"
              hasError={!filters.dtRef}
            />
          </div>
          {/* 2. Grupo de Localidade */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              {t("menu.locationGroup")}
            </Label>
            <Select
              value={filters.locationGroupId || "__all__"}
              onValueChange={(v) => setFilters(f => ({ ...f, locationGroupId: v === "__all__" ? "" : v }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t("common.selectAll")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("common.selectAll")}</SelectItem>
                {locationGroups.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* 3. Grupo de Frota */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">{t("menu.fleetGroup")}</Label>
            <Select
              value={filters.fleetGroupId || "__all__"}
              onValueChange={(v) => setFilters(f => ({ ...f, fleetGroupId: v === "__all__" ? "" : v }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t("common.selectAll")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("common.selectAll")}</SelectItem>
                {fleetGroups.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* 4. Placa */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">{t("vehiclePlanning.licensePlate")}</Label>
            <LookupSearchField
              endpoint="Truck"
              searchFilterParam="Filter1String"
              value={filters.licensePlate}
              onChange={(id, item) => {
                setFilters(f => ({
                  ...f,
                  licensePlate: item ? String(item.licensePlate || "") : "",
                }));
              }}
              placeholder={t("vehiclePlanning.licensePlate")}
              displayAsText
              modalVisibleColumns={["licensePlate", "fleetCode"]}
              columnLabels={{ licensePlate: "Placa", fleetCode: "Cód. Frota" }}
              className="h-8 text-xs"
              nullable
            />
          </div>
          {/* 5. Cód. Frota */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">{t("vehiclePlanning.fleetCode")}</Label>
            <LookupSearchField
              endpoint="Truck"
              searchFilterParam="Filter2String"
              value={filters.fleetCode}
              onChange={(id, item) => {
                setFilters(f => ({
                  ...f,
                  fleetCode: item ? String(item.fleetCode || "") : "",
                }));
              }}
              placeholder={t("vehiclePlanning.fleetCode")}
              displayAsText
              modalVisibleColumns={["licensePlate", "fleetCode"]}
              columnLabels={{ licensePlate: "Placa", fleetCode: "Cód. Frota" }}
              className="h-8 text-xs"
              nullable
            />
          </div>
          {/* 6. Motorista */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">{t("menu.driver")}</Label>
            <LookupSearchField
              endpoint="Drivers"
              searchFilterParam="Filter1String"
              value={filters.driverId}
              onChange={(id) => setFilters(f => ({ ...f, driverId: id }))}
              placeholder={t("menu.driver")}
              modalVisibleColumns={["nickName", "integrationCode", "registration"]}
              columnLabels={{ nickName: t("driver.nickName"), integrationCode: t("driver.integrationCode"), registration: t("driver.registration") }}
              className="h-8 text-xs"
              nullable
            />
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
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
              setGenForm({ startDate: "", endDate: "", locationGroupCode: "", fleetGroupCode: "" });
              setGenOpen(true);
            }}>
              <Cog className="h-3.5 w-3.5" />
              {t("vehiclePlanning.generate")}
            </Button>
            {searched && items.length > 0 && (
              <ExportDropdown fetchData={fetchExportData} columns={exportColumns} title={t("menu.vehiclePlanning")} />
            )}
            <Button size="sm" className="h-7 text-xs gap-1" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> {t("common.new")}
            </Button>
          </div>
        </div>

        {/* Table */}
        {searched && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
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
                      {t("vehiclePlanning.startDate")} <SortIcon colKey="startDate" />
                    </TableHead>
                    <TableHead className="h-8 text-xs px-2 whitespace-nowrap">
                      {t("vehiclePlanning.startTime")}
                    </TableHead>
                    <TableHead className="h-8 text-xs px-2 cursor-pointer whitespace-nowrap" onClick={() => handleSort("endDate")}>
                      {t("vehiclePlanning.endDate")} <SortIcon colKey="endDate" />
                    </TableHead>
                    <TableHead className="h-8 text-xs px-2 whitespace-nowrap">
                      {t("vehiclePlanning.endTime")}
                    </TableHead>
                    {FREQ_KEYS.map(fk => (
                      <TableHead key={fk} className="h-8 text-xs px-1 text-center whitespace-nowrap">
                        {freqLabels[fk]}
                      </TableHead>
                    ))}
                    <TableHead className="h-8 text-xs px-2 text-right whitespace-nowrap">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center text-xs text-muted-foreground py-8">
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
                        <TableCell className="h-7 text-xs px-2 py-1">{formatDate(row.endDate)}</TableCell>
                        <TableCell className="h-7 text-xs px-2 py-1">{formatTime(row.endTime)}</TableCell>
                        {FREQ_KEYS.map(fk => (
                          <TableCell key={fk} className="h-7 text-xs px-1 py-1 text-center">
                            {(row as Rec)[fk] === 1 ? <Check className="h-3.5 w-3.5 mx-auto text-emerald-600" /> : ""}
                          </TableCell>
                        ))}
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
              {editItem ? t("common.edit") : t("common.new")} — {t("menu.vehiclePlanning")}
            </DialogTitle>
            <DialogDescription className="sr-only">Formulário de planejamento de veículo</DialogDescription>
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
                  const mapped = item ? mapTruckLookupItem(item) : null;
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
                  const mapped = item ? mapDriverLookupItem(item) : null;
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
            {/* Start Date */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("vehiclePlanning.startDate")} <span className="text-destructive">*</span></Label>
              <DatePickerField
                value={form.startDate}
                onChange={(v) => setForm(f => ({ ...f, startDate: v || "" }))}
                className="h-8 text-xs"
                hasError={!form.startDate}
              />
            </div>
            {/* Start Time */}
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
            {/* End Date */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("vehiclePlanning.endDate")} <span className="text-destructive">*</span></Label>
              <DatePickerField
                value={form.endDate}
                onChange={(v) => setForm(f => ({ ...f, endDate: v || "" }))}
                className="h-8 text-xs"
                hasError={!form.endDate}
              />
            </div>
            {/* End Time */}
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
            {/* Frequency */}
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-medium">{t("vehiclePlanning.frequency")}</Label>
              <div className="flex gap-1">
                {FREQ_KEYS.map(fk => {
                  const active = (form as any)[fk] === 1;
                  return (
                    <Button
                      key={fk}
                      type="button"
                      variant={active ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-[10px] px-2 min-w-[36px]"
                      onClick={() => setForm(f => ({ ...f, [fk]: active ? 0 : 1 }))}
                    >
                      {freqLabels[fk]}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>{t("common.cancel")}</Button>
            <Button size="sm" onClick={handleSave} disabled={saveMut.isPending}>
              {saveMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{t("vehiclePlanning.generate")}</DialogTitle>
            <DialogDescription className="sr-only">Gerar planejamento de veículos</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("vehiclePlanning.startDate")} <span className="text-destructive">*</span></Label>
              <DatePickerField
                value={genForm.startDate}
                onChange={(v) => setGenForm(f => ({ ...f, startDate: v || "" }))}
                className="h-8 text-xs"
                hasError={!genForm.startDate}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("vehiclePlanning.endDate")} <span className="text-destructive">*</span></Label>
              <DatePickerField
                value={genForm.endDate}
                onChange={(v) => setGenForm(f => ({ ...f, endDate: v || "" }))}
                className="h-8 text-xs"
                hasError={!genForm.endDate}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("menu.locationGroup")} <span className="text-destructive">*</span></Label>
              <Select
                value={genForm.locationGroupCode || "__none__"}
                onValueChange={(v) => setGenForm(f => ({ ...f, locationGroupCode: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger className={cn("h-8 text-xs", !genForm.locationGroupCode && "border-destructive")}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecione...</SelectItem>
                  {locationGroups.map(g => (
                    <SelectItem key={g.id} value={g.code || g.id}>{g.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">{t("menu.fleetGroup")}</Label>
              <Select
                value={genForm.fleetGroupCode || "__none__"}
                onValueChange={(v) => setGenForm(f => ({ ...f, fleetGroupCode: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={t("common.selectAll")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("common.selectAll")}</SelectItem>
                  {fleetGroups.map(g => (
                    <SelectItem key={g.id} value={g.code || g.id}>{g.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setGenOpen(false)}>{t("common.cancel")}</Button>
            <Button size="sm" onClick={handleGenerate} disabled={genMut.isPending}>
              {genMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {t("vehiclePlanning.generate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VehiclePlanningPage;
