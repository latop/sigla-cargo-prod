import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ExportDropdown } from "@/components/ExportDropdown";
import { fetchAllForExport } from "@/lib/export-utils";
import { motion } from "framer-motion";
import {
  Search, Loader2, X, Plus, Pencil, Save,
  ChevronLeft, ChevronRight, ChevronDown, CalendarDays, Trash2,
  ArrowUp, ArrowDown, ArrowUpDown, MessageSquare, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FloatingPanel } from "@/components/FloatingPanel";
import { LookupSearchField } from "@/components/LookupSearchField";
import { LineSearchModal } from "@/components/LineSearchModal";
import { API_BASE } from "@/config/api";
import { DatePickerField } from "@/components/DatePickerField";

// --- Types ---
interface LookupItem {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  [k: string]: unknown;
}

interface DailyTripSection {
  id?: string;
  dailyTripId?: string;
  section?: number;
  locationOrigId?: string | null;
  locationOrig?: LookupItem | null;
  locationDestId?: string | null;
  locationDest?: LookupItem | null;
  startPlanned?: string | null;
  endPlanned?: string | null;
  startActual?: string | null;
  endActual?: string | null;
  startEstimated?: string | null;
  endEstimated?: string | null;
  truckId?: string | null;
  truck?: LookupItem | null;
  driverId?: string | null;
  driver?: LookupItem | null;
  flgStatus?: string | null;
  notes?: string | null;
  stopTypeId?: string | null;
  stopType?: LookupItem | null;
  locationGroupId?: string | null;
  locationGroup?: LookupItem | null;
  [k: string]: unknown;
}

interface DailyTripItem {
  id?: string;
  tripDate?: string | null;
  fleetGroupId?: string | null;
  fleetGroup?: LookupItem | null;
  tripNumber?: string | null;
  flgStatus?: string | null;
  notes?: string | null;
  lineId?: string | null;
  line?: LookupItem | null;
  dt?: string | null;
  sto?: string | null;
  locationOrigId?: string | null;
  locationOrig?: LookupItem | null;
  locationDestId?: string | null;
  locationDest?: LookupItem | null;
  startPlanned?: string | null;
  endPlanned?: string | null;
  startActual?: string | null;
  endActual?: string | null;
  startEstimated?: string | null;
  endEstimated?: string | null;
  tripTypeId?: string | null;
  tripType?: LookupItem | null;
  stopTypeId?: string | null;
  stopType?: LookupItem | null;
  companyId?: string | null;
  company?: LookupItem | null;
  justificationId?: string | null;
  justification?: LookupItem | null;
  locationGroupId?: string | null;
  locationGroup?: LookupItem | null;
  dailyTripSections?: DailyTripSection[];
  [k: string]: unknown;
}

// --- Helpers ---
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const plusDaysISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDate = (v?: string | null) => {
  if (!v) return "--";
  try {
    return new Date(v).toLocaleDateString("pt-BR");
  } catch { return "--"; }
};

const formatDateTime = (v?: string | null) => {
  if (!v) return "--";
  try {
    const d = new Date(v);
    return `${d.toLocaleDateString("pt-BR")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch { return "--"; }
};

const formatDateShort = (v?: string | null) => {
  if (!v) return "--";
  try {
    const d = new Date(v);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch { return "--"; }
};

const formatTimeOnly = (v?: string | null) => {
  if (!v) return "--";
  try {
    const d = new Date(v);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch { return "--"; }
};

type SortDirection = "asc" | "desc" | null;
interface SortConfig { key: string; direction: SortDirection; }

const toDateInput = (v?: string | null) => {
  if (!v) return "";
  try { return v.substring(0, 10); } catch { return ""; }
};

const toDateTimeInput = (v?: string | null) => {
  if (!v) return "";
  try { return v.substring(0, 16); } catch { return ""; }
};

const lookupCode = (obj?: LookupItem | null) => obj?.code || "--";

// Shared config for Location lookups (Origem/Destino)
const LOCATION_MODAL_COLUMNS = ["code", "name", "codeIntegration2"];
const LOCATION_COLUMN_LABELS: Record<string, string> = { code: "Código", name: "Nome", codeIntegration2: "Cód. Integração TMS" };

// Line lookup config removed — now handled by LineSearchModal

const statusLabel = (s?: string | null) => {
  if (s === "C") return "Cancelado";
  if (s === "N") return "Ativo";
  return "Todos";
};

const statusBadge = (s?: string | null) => {
  if (s === "C") return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">Cancelado</Badge>;
  if (s === "N") return <Badge variant="outline" className="bg-accent text-accent-foreground border-border text-xs">Ativo</Badge>;
  return <Badge variant="outline" className="text-xs">{s || "--"}</Badge>;
};

// --- API ---
const fetchLookup = async (endpoint: string): Promise<LookupItem[]> => {
  const res = await fetch(`${API_BASE}/${endpoint}?PageSize=999`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

interface DailyTripFilters {
  startTripDate: string;
  endTripDate: string;
  stoDt: string;
  locationOrigId: string;
  locationDestId: string;
  fleetGroupId: string;
  licensePlate: string;
  tripTypeId: string;
  companyId: string;
  flgStatus: string;
}

interface PaginationMeta {
  TotalCount: number;
  PageSize: number;
  CurrentPage: number;
  TotalPages: number;
  HasNext: boolean;
  HasPrevious: boolean;
}

const fetchDailyTrips = async (filters: DailyTripFilters, page: number, pageSize: number): Promise<{ items: DailyTripItem[]; pagination: PaginationMeta }> => {
  const params = new URLSearchParams();
  if (filters.startTripDate) params.append("Filter2String", filters.startTripDate);
  if (filters.endTripDate) params.append("Filter5String", filters.endTripDate);
  if (filters.stoDt) params.append("Filter1String", filters.stoDt);
  if (filters.locationOrigId && filters.locationOrigId !== "all") params.append("Filter2Id", filters.locationOrigId);
  if (filters.locationDestId && filters.locationDestId !== "all") params.append("Filter3Id", filters.locationDestId);
  if (filters.fleetGroupId && filters.fleetGroupId !== "all") params.append("Filter1Id", filters.fleetGroupId);
  if (filters.licensePlate) params.append("Filter4String", filters.licensePlate);
  if (filters.tripTypeId && filters.tripTypeId !== "all") params.append("Filter4Id", filters.tripTypeId);
  if (filters.companyId && filters.companyId !== "all") params.append("Filter5Id", filters.companyId);
  if (filters.flgStatus && filters.flgStatus !== "all") params.append("Filter3String", filters.flgStatus);
  params.append("PageNumber", String(page));
  params.append("PageSize", String(pageSize));
  const res = await fetch(`${API_BASE}/DailyTrip?${params.toString()}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const items: DailyTripItem[] = await res.json();
  const ph = res.headers.get("x-pagination");
  const pagination: PaginationMeta = ph ? JSON.parse(ph) : { TotalCount: items.length, PageSize: pageSize, CurrentPage: page, TotalPages: 1, HasNext: false, HasPrevious: false };
  return { items, pagination };
};

interface DailyTripDetailResponse {
  dailyTrip: DailyTripItem;
  dailyTripSections: DailyTripSection[];
  timeWorkedLastDay?: string | null;
  isRest?: boolean;
  nickName?: string;
}

const fetchDailyTripDetail = async (id: string): Promise<DailyTripDetailResponse> => {
  const res = await fetch(`${API_BASE}/DailyTrip/getdailytripdetail?dailyTripId=${id}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const createDailyTrip = async (data: Partial<DailyTripItem>): Promise<DailyTripItem> => {
  const res = await fetch(`${API_BASE}/DailyTrip`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const updateDailyTripFull = async (payload: { dailyTrip: Record<string, unknown>; dailyTripSections: Record<string, unknown>[] }): Promise<string> => {
  const res = await fetch(`${API_BASE}/DailyTrip/updatedailytrip`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const text = await res.text();
  return text;
};

const createDailyTripSection = async (data: Partial<DailyTripSection>): Promise<DailyTripSection> => {
  const res = await fetch(`${API_BASE}/DailyTripSection`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const updateDailyTripSection = async (data: Partial<DailyTripSection>): Promise<DailyTripSection> => {
  const res = await fetch(`${API_BASE}/DailyTripSection`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const deleteDailyTripSection = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/DailyTripSection/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
};

// --- Component ---
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const DailyTripPage = () => {
  const { t } = useTranslation();
  usePageTitle(t("menu.dailyTrip"), CalendarDays);
  const { toast } = useToast();
  

  // Filters
  const emptyFilters = (): DailyTripFilters => ({
    startTripDate: todayISO(),
    endTripDate: plusDaysISO(3),
    stoDt: "",
    locationOrigId: "",
    locationDestId: "",
    fleetGroupId: "",
    licensePlate: "",
    tripTypeId: "",
    companyId: "",
    flgStatus: "",
  });

  const [filters, setFilters] = useState<DailyTripFilters>(emptyFilters());
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [searched, setSearched] = useState(false);
  const [searchParams, setSearchParams] = useState<DailyTripFilters>(emptyFilters());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // CRUD
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<DailyTripItem | null>(null);
  const [formData, setFormData] = useState<Partial<DailyTripItem>>({});
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "startPlanned", direction: "asc" });
  const [originalSectionIds, setOriginalSectionIds] = useState<string[]>([]);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [justificationDialogOpen, setJustificationDialogOpen] = useState(false);
  const [sectionNotesIdx, setSectionNotesIdx] = useState<number | null>(null);
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [lineDisplayLabel, setLineDisplayLabel] = useState("");
  const [activeSectionTab, setActiveSectionTab] = useState("0");

  // New Trip preliminary dialog state
  const [newTripDialogOpen, setNewTripDialogOpen] = useState(false);
  const [newTripStartPlanned, setNewTripStartPlanned] = useState("");
  const [newTripLineId, setNewTripLineId] = useState("");
  const [newTripLineLabel, setNewTripLineLabel] = useState("");
  const [newTripLineModalOpen, setNewTripLineModalOpen] = useState(false);
  const [newTripOrigId, setNewTripOrigId] = useState("");
  const [newTripOrigLabel, setNewTripOrigLabel] = useState("");
  const [newTripDestId, setNewTripDestId] = useState("");
  const [newTripDestLabel, setNewTripDestLabel] = useState("");
  const [newTripLoading, setNewTripLoading] = useState(false);

  // Lookups
  const { data: fleetGroups } = useQuery<LookupItem[]>({ queryKey: ["fleet-groups"], queryFn: () => fetchLookup("FleetGroup") });
  const { data: tripTypes } = useQuery<LookupItem[]>({ queryKey: ["trip-types"], queryFn: () => fetchLookup("TripType") });
  const { data: companies } = useQuery<LookupItem[]>({ queryKey: ["companies"], queryFn: () => fetchLookup("Companies") });
  const { data: stopTypes } = useQuery<LookupItem[]>({ queryKey: ["stop-types"], queryFn: () => fetchLookup("StopType") });
  const { data: justifications } = useQuery<LookupItem[]>({ queryKey: ["justifications"], queryFn: () => fetchLookup("Justification") });
  const { data: locationGroups } = useQuery<LookupItem[]>({ queryKey: ["location-groups-dt"], queryFn: () => fetchLookup("LocationGroup") });
  
  const { data: trucks } = useQuery<LookupItem[]>({ queryKey: ["trucks"], queryFn: () => fetchLookup("Truck") });

  // List query
  const { data: result, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["daily-trips", searchParams, currentPage, pageSize],
    queryFn: () => fetchDailyTrips(searchParams, currentPage, pageSize),
    enabled: searched,
  });

  const rawItems = result?.items;
  const pagination = result?.pagination;

  // Client-side sorting
  const items = rawItems ? [...rawItems].sort((a, b) => {
    if (!sortConfig.direction || !sortConfig.key) return 0;
    const key = sortConfig.key;
    let valA: unknown = a[key];
    let valB: unknown = b[key];
    // For lookup fields, sort by code
    if (valA && typeof valA === "object" && "code" in (valA as object)) valA = (valA as LookupItem).code;
    if (valB && typeof valB === "object" && "code" in (valB as object)) valB = (valB as LookupItem).code;
    const strA = valA == null ? "" : String(valA);
    const strB = valB == null ? "" : String(valB);
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
  const totalPages = pagination?.TotalPages || 1;
  const totalCount = pagination?.TotalCount || 0;

  // Page numbers (same as GenericPage)
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

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (data: { trip: Partial<DailyTripItem>; sections: DailyTripSection[]; deletedSectionIds: string[] }) => {
      if (data.trip.id) {
        // UPDATE: send full payload to updatedailytrip
        const fullPayload = {
          dailyTrip: { ...data.trip, dailyTripSections: data.sections, tripNumber: data.trip.tripNumber ?? "0" },
          dailyTripSections: data.sections,
          timeWorkedLastDay: data.trip.timeWorkedLastDay ?? null,
          isRest: data.trip.isRest ?? false,
          nickName: data.trip.nickName ?? "",
        };
        return updateDailyTripFull(fullPayload);
      } else {
        // CREATE: POST master then sections individually
        const savedTrip = await createDailyTrip(data.trip);
        const tripId = savedTrip.id!;
        for (const section of data.sections) {
          await createDailyTripSection({ ...section, dailyTripId: tripId });
        }
        return savedTrip;
      }
    },
    onSuccess: () => {
      toast({ title: t("common.saveSuccess"), variant: "success" });
      closeForm();
      refetch();
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "error" });
    },
  });

  // Handlers
  const handleSearch = () => {
    if (!filters.startTripDate) {
      toast({ title: "Data de Início é obrigatória.", variant: "destructive" });
      return;
    }
    setSearchParams({ ...filters });
    setSearched(true);
    setCurrentPage(1);
    setFiltersOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const openCreate = () => {
    setNewTripStartPlanned("");
    setNewTripLineId("");
    setNewTripLineLabel("");
    setNewTripOrigId("");
    setNewTripOrigLabel("");
    setNewTripDestId("");
    setNewTripDestLabel("");
    setNewTripDialogOpen(true);
  };

  const handleNewTripLineSelect = (id: string, item: Record<string, unknown>) => {
    setNewTripLineId(id);
    setNewTripLineLabel((item.code as string) || "");
    // Pre-fill origin/dest from line
    const locationOrig = item.locationOrig as LookupItem | null;
    const locationDest = item.locationDest as LookupItem | null;
    if (locationOrig?.id) { setNewTripOrigId(locationOrig.id); setNewTripOrigLabel(locationOrig.code || ""); }
    if (locationDest?.id) { setNewTripDestId(locationDest.id); setNewTripDestLabel(locationDest.code || ""); }
  };

  const handleNewTripConfirm = async () => {
    if (!newTripStartPlanned || !newTripLineId) {
      toast({ title: "Preencha o Início Previsto e selecione uma Linha.", variant: "destructive" });
      return;
    }
    setNewTripLoading(true);
    try {
      // Format startTime as "YYYY-MM-DD HH:mm"
      const dtInput = newTripStartPlanned; // already in "YYYY-MM-DDThh:mm" format from datetime-local
      const startTimeFormatted = dtInput.replace("T", " ").substring(0, 16);

      const res = await fetch(`${API_BASE}/DailyTrip/getdailytripdetail?lineId=${newTripLineId}&startTime=${encodeURIComponent(startTimeFormatted)}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const response: DailyTripDetailResponse = await res.json();

      const trip = response.dailyTrip;
      const sections = response.dailyTripSections || trip.dailyTripSections || [];
      // Remove id so it's treated as a new record
      const detail: DailyTripItem = { ...trip, dailyTripSections: sections, tripNumber: "0" };
      delete detail.id;
      // Remove ids from sections too (new trip)
      const cleanSections = sections.map((s) => {
        const { id, dailyTripId, ...rest } = s;
        return rest;
      });
      detail.dailyTripSections = cleanSections;

      setFormData(detail);
      setEditingItem(null);
      setLineDisplayLabel(trip.line?.code ?? newTripLineLabel);
      setOriginalSectionIds([]);
      setFormErrors({});
      setNewTripDialogOpen(false);
      setIsCreating(true);
    } catch (err: any) {
      toast({ title: "Erro ao gerar viagem", description: err.message, variant: "error" });
    } finally {
      setNewTripLoading(false);
    }
  };

  const openEdit = async (item: DailyTripItem) => {
    if (!item.id) return;
    setLoadingDetail(true);
    try {
      const response = await fetchDailyTripDetail(item.id);
      const trip = response.dailyTrip;
      const sections = response.dailyTripSections || trip.dailyTripSections || [];
      const detail: DailyTripItem = { ...trip, dailyTripSections: sections, tripNumber: trip.tripNumber != null ? String(trip.tripNumber) : null, nickName: response.nickName ?? trip.nickName ?? "", timeWorkedLastDay: response.timeWorkedLastDay ?? null, isRest: response.isRest ?? false };
      setFormData(detail);
      setEditingItem(detail);
      setLineDisplayLabel(trip.line?.code ?? "");
      setOriginalSectionIds(sections.filter((s) => s.id).map((s) => s.id!));
      setIsCreating(true);
    } catch (err: any) {
      toast({ title: "Erro ao carregar detalhe", description: err.message, variant: "error" });
    } finally {
      setLoadingDetail(false);
    }
  };


  const closeForm = () => {
    setIsCreating(false);
    setEditingItem(null);
    setLineDisplayLabel("");
  };

  const updateForm = (field: string, value: unknown) => {
    setFormData((p) => ({ ...p, [field]: value === "" ? null : value }));
  };

  const handleSave = () => {
    const errors: Record<string, boolean> = {};
    if (!formData.tripDate) errors.tripDate = true;
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({ title: t("common.requiredFields"), variant: "destructive" });
      return;
    }
    setFormErrors({});

    // Build trip payload - strip nested objects
    const tripPayload: Record<string, unknown> = {
      tripDate: formData.tripDate,
      fleetGroupId: formData.fleetGroupId || null,
      tripNumber: formData.tripNumber ?? null,
      flgStatus: formData.flgStatus || "N",
      notes: formData.notes || null,
      lineId: formData.lineId || null,
      dt: formData.dt || null,
      sto: formData.sto || null,
      locationOrigId: formData.locationOrigId || null,
      locationDestId: formData.locationDestId || null,
      startPlanned: formData.startPlanned || null,
      endPlanned: formData.endPlanned || null,
      startActual: formData.startActual || null,
      endActual: formData.endActual || null,
      tripTypeId: formData.tripTypeId || null,
      companyId: formData.companyId || null,
      justificationId: formData.justificationId || null,
      justificationMessage: (formData as any).justificationMessage || null,
      locationGroupId: formData.locationGroupId || null,
      distanceplanned: formData.distanceplanned ?? null,
      distanceactual: formData.distanceactual ?? null,
    };
    if (formData.id) tripPayload.id = formData.id;

    // Build section payloads
    const sections = (formData.dailyTripSections || []).map((s) => ({
      ...(s.id ? { id: s.id } : {}),
      dailyTripId: s.dailyTripId || formData.id || undefined,
      section: s.section,
      locationOrigId: s.locationOrigId || null,
      locationDestId: s.locationDestId || null,
      startPlanned: s.startPlanned || null,
      endPlanned: s.endPlanned || null,
      startActual: s.startActual || null,
      endActual: s.endActual || null,
      startEstimated: s.startEstimated || null,
      endEstimated: s.endEstimated || null,
      truckId: s.truckId || null,
      driverId: s.driverId || null,
      flgStatus: s.flgStatus || null,
      notes: s.notes || null,
      stopTypeId: s.stopTypeId || null,
    }));

    // Detect deleted sections
    const currentSectionIds = (formData.dailyTripSections || []).filter((s) => s.id).map((s) => s.id!);
    const deletedSectionIds = originalSectionIds.filter((id) => !currentSectionIds.includes(id));

    saveMutation.mutate({
      trip: tripPayload as Partial<DailyTripItem>,
      sections: sections as DailyTripSection[],
      deletedSectionIds,
    });
  };

  // Section handlers
  const addSection = () => {
    const sections = formData.dailyTripSections || [];
    const nextSection = sections.length > 0 ? Math.max(...sections.map((s) => s.section || 0)) + 1 : 1;
    const newIndex = sections.length;
    setFormData((p) => ({
      ...p,
      dailyTripSections: [...(p.dailyTripSections || []), {
        id: undefined,
        section: nextSection,
        locationOrigId: null,
        locationDestId: null,
        startPlanned: null, endPlanned: null,
        startActual: null, endActual: null,
        startEstimated: null, endEstimated: null,
        truckId: null,
        driverId: null,
        flgStatus: "N",
        notes: null,
        stopTypeId: null,
      }],
    }));
    setActiveSectionTab(String(newIndex));
  };

  const removeSection = (index: number) => {
    setFormData((p) => {
      const newSections = (p.dailyTripSections || []).filter((_, i) => i !== index);
      // Renumber sections
      const renumbered = newSections.map((s, i) => ({ ...s, section: i + 1 }));
      return { ...p, dailyTripSections: renumbered };
    });
    // Adjust active tab
    const totalAfter = (formData.dailyTripSections || []).length - 1;
    const currentIdx = parseInt(activeSectionTab);
    if (totalAfter === 0) {
      setActiveSectionTab("0");
    } else if (currentIdx >= totalAfter) {
      setActiveSectionTab(String(totalAfter - 1));
    } else if (index < currentIdx) {
      setActiveSectionTab(String(currentIdx - 1));
    }
  };

  const updateSection = (index: number, field: string, value: unknown) => {
    setFormData((p) => ({
      ...p,
      dailyTripSections: (p.dailyTripSections || []).map((s, i) =>
        i === index ? { ...s, [field]: value === "" ? null : value } : s
      ),
    }));
  };

  const lookupLabel = (item: LookupItem) => {
    const parts: string[] = [];
    if (item.code) parts.push(item.code);
    if (item.description) parts.push(item.description);
    if (parts.length === 0 && item.name) parts.push(item.name);
    return parts.join(" - ") || item.id;
  };

  const panelTitle = editingItem
    ? `${t("common.edit")} ${t("menu.dailyTrip")}`
    : `Nova ${t("menu.dailyTrip")}`;

  return (
    <div className="space-y-4">
      {/* New Trip preliminary dialog */}
      <Dialog open={newTripDialogOpen} onOpenChange={setNewTripDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-display">Nova Viagem Diária</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Informe o início previsto e selecione a linha para gerar a viagem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Linha</Label>
              <div className="flex gap-1">
                <Input
                  readOnly
                  value={newTripLineLabel}
                  placeholder="Selecione uma linha..."
                  className="h-8 text-xs flex-1 cursor-pointer"
                  onClick={() => setNewTripLineModalOpen(true)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setNewTripLineModalOpen(true)}
                >
                  <Search className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Origem da linha</Label>
                <Input readOnly value={newTripOrigLabel} placeholder="—" className="h-8 text-xs bg-muted/50" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Destino da linha</Label>
                <Input readOnly value={newTripDestLabel} placeholder="—" className="h-8 text-xs bg-muted/50" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Início Previsto</Label>
                <DatePickerField
                  value={newTripStartPlanned ? `${newTripStartPlanned}:00` : null}
                  onChange={(v) => setNewTripStartPlanned(v ? v.substring(0, 16) : "")}
                  includeTime
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setNewTripDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={handleNewTripConfirm}
              disabled={newTripLoading || !newTripStartPlanned || !newTripLineId}
            >
              {newTripLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Gerar Viagem
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Line search modal for new trip dialog */}
      <LineSearchModal
        open={newTripLineModalOpen}
        onOpenChange={setNewTripLineModalOpen}
        onSelect={handleNewTripLineSelect}
        initialOrigId={newTripOrigId}
        initialDestId={newTripDestId}
      />

      {/* Loading detail overlay */}
      {loadingDetail && (
        <div className="fixed inset-0 bg-foreground/10 z-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Floating CRUD Panel */}
      {isCreating && (
        <FloatingPanel title={panelTitle} onClose={closeForm} width={1100}>
          <div className="space-y-3 pt-2">
            <input type="hidden" value={formData.tripNumber ?? ""} />
            {/* Master fields */}
            {/* Linha 1: Data da Viagem - DT - STO - Status - Transportadora - [Obs + Just buttons] */}
            <div className="grid grid-cols-6 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Data da Viagem *</Label>
                <DatePickerField
                  value={formData.tripDate}
                  onChange={(v) => updateForm("tripDate", v)}
                  hasError={formErrors.tripDate}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">DT</Label>
                <Input className="h-8 text-xs" value={formData.dt || ""} onChange={(e) => updateForm("dt", e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">STO</Label>
                <Input className="h-8 text-xs" value={formData.sto || ""} onChange={(e) => updateForm("sto", e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={formData.flgStatus || "N"} onValueChange={(v) => updateForm("flgStatus", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="N" className="text-xs">Ativo</SelectItem>
                    <SelectItem value="C" className="text-xs">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Transportadora</Label>
                <Select value={formData.companyId || ""} onValueChange={(v) => updateForm("companyId", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="..." /></SelectTrigger>
                  <SelectContent>
                    {companies?.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">{lookupLabel(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">&nbsp;</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant={formData.notes ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs gap-1 flex-1"
                    onClick={() => setNotesDialogOpen(true)}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Obs.
                  </Button>
                  <Button
                    type="button"
                    variant={formData.justificationId ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs gap-1 flex-1"
                    onClick={() => setJustificationDialogOpen(true)}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Just.
                  </Button>
                </div>
              </div>
            </div>

            {/* Linha 2: Origem - Destino - Linha - Grupo de Localidade - Grupo de Frota - Tipo de Viagem */}
            <div className="grid grid-cols-6 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Origem</Label>
                <LookupSearchField
                  endpoint="Location"
                  labelFn="codeOnly"
                  searchFilterParam="Filter1String"
                  value={formData.locationOrigId || ""}
                  onChange={(id) => updateForm("locationOrigId", id)}
                  placeholder="Origem..."
                  nullable
                  className="h-8 text-xs"
                  modalVisibleColumns={LOCATION_MODAL_COLUMNS}
                  columnLabels={LOCATION_COLUMN_LABELS}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Destino</Label>
                <LookupSearchField
                  endpoint="Location"
                  labelFn="codeOnly"
                  searchFilterParam="Filter1String"
                  value={formData.locationDestId || ""}
                  onChange={(id) => updateForm("locationDestId", id)}
                  placeholder="Destino..."
                  nullable
                  className="h-8 text-xs"
                  modalVisibleColumns={LOCATION_MODAL_COLUMNS}
                  columnLabels={LOCATION_COLUMN_LABELS}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Linha</Label>
                {formData.lineId && lineDisplayLabel ? (
                  <div className="flex items-center h-8 w-full rounded-md border border-input bg-background px-2 text-xs gap-1">
                    <span className="flex-1 truncate">{lineDisplayLabel}</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button type="button" onClick={() => { updateForm("lineId", null); setLineDisplayLabel(""); }} className="p-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                      <button type="button" onClick={() => setLineModalOpen(true)} className="p-0.5 hover:text-primary"><Search className="h-3 w-3" /></button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex items-center h-8 w-full rounded-md border border-input bg-background px-2 text-xs gap-1 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setLineModalOpen(true)}
                  >
                    <span className="flex-1 truncate text-muted-foreground">Linha...</span>
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </div>
                )}
                <LineSearchModal
                  open={lineModalOpen}
                  onOpenChange={setLineModalOpen}
                  onSelect={async (id, item) => {
                    updateForm("lineId", id);
                    setLineDisplayLabel(String(item.code ?? ""));
                    // Auto-fill fields from Line data
                    if (item.fleetGroupId) updateForm("fleetGroupId", String(item.fleetGroupId));
                    if (item.tripTypeId) updateForm("tripTypeId", String(item.tripTypeId));
                    // Auto-fill distance from Line
                    if (item.distance != null) updateForm("distanceplanned", Number(item.distance));
                    // Fetch LineSections and auto-populate sections
                    try {
                      const res = await fetch(`${API_BASE}/LineSection/linessectionbyline?lineId=${id}`);
                      if (res.ok) {
                        const lineSections: Record<string, unknown>[] = await res.json();
                        if (lineSections.length > 0) {
                          const newSections: DailyTripSection[] = lineSections.map((ls, idx) => ({
                            id: undefined,
                            section: idx + 1,
                            locationOrigId: (ls.locationOrigId as string) || null,
                            locationDestId: (ls.locationDestId as string) || null,
                            stopTypeId: (ls.stopTypeId as string) || null,
                            startPlanned: null, endPlanned: null,
                            startActual: null, endActual: null,
                            startEstimated: null, endEstimated: null,
                            truckId: null, driverId: null,
                            flgStatus: "N", notes: null,
                          }));
                          setFormData((p) => ({ ...p, dailyTripSections: newSections }));
                          setActiveSectionTab("0");
                        }
                      }
                    } catch { /* silently ignore */ }
                  }}
                  initialOrigId={formData.locationOrigId || undefined}
                  initialDestId={formData.locationDestId || undefined}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Grupo Localidade</Label>
                <Select value={formData.locationGroupId || ""} onValueChange={(v) => updateForm("locationGroupId", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="..." /></SelectTrigger>
                  <SelectContent>
                    {locationGroups?.map((lg) => (
                      <SelectItem key={lg.id} value={lg.id} className="text-xs">{lookupLabel(lg)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Grupo de Frota</Label>
                <Select value={formData.fleetGroupId || ""} onValueChange={(v) => updateForm("fleetGroupId", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="..." /></SelectTrigger>
                  <SelectContent>
                    {fleetGroups?.map((fg) => (
                      <SelectItem key={fg.id} value={fg.id} className="text-xs">{lookupLabel(fg)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Viagem</Label>
                <Select value={formData.tripTypeId || ""} onValueChange={(v) => updateForm("tripTypeId", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="..." /></SelectTrigger>
                  <SelectContent>
                    {tripTypes?.map((tt) => (
                      <SelectItem key={tt.id} value={tt.id} className="text-xs">{lookupLabel(tt)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha 3: Início Previsto - Fim Previsto - Início Realizado - Fim Realizado - Dist. Prevista - Dist. Realizada */}
            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr auto auto' }}>
              <div className="space-y-1">
                <Label className="text-xs">Início Previsto</Label>
                <DatePickerField value={formData.startPlanned} onChange={(v) => updateForm("startPlanned", v)} includeTime />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fim Previsto</Label>
                <DatePickerField value={formData.endPlanned} onChange={(v) => updateForm("endPlanned", v)} includeTime />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Início Realizado</Label>
                <DatePickerField value={formData.startActual} onChange={() => {}} includeTime disabled />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fim Realizado</Label>
                <DatePickerField value={formData.endActual} onChange={() => {}} includeTime disabled />
              </div>
              <div className="space-y-1" style={{ width: '100px' }}>
                <Label className="text-xs">Dist. Prev.</Label>
                <Input type="number" step="0.01" className="h-8 text-xs" value={String(formData.distanceplanned ?? "")} onChange={(e) => updateForm("distanceplanned", e.target.value ? parseFloat(e.target.value) : null)} />
              </div>
              <div className="space-y-1" style={{ width: '100px' }}>
                <Label className="text-xs">Dist. Real</Label>
                <Input type="number" step="0.01" className="h-8 text-xs" value={String(formData.distanceactual ?? "")} onChange={(e) => updateForm("distanceactual", e.target.value ? parseFloat(e.target.value) : null)} />
              </div>
            </div>

            {/* Dialogs for Notes and Justification */}
            <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-sm">Observações</DialogTitle>
                  <DialogDescription className="sr-only">Campo de observações da viagem</DialogDescription>
                </DialogHeader>
                <Textarea
                  className="text-xs min-h-[120px]"
                  value={formData.notes || ""}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  placeholder="Digite as observações..."
                />
                <div className="flex justify-end">
                  <Button size="sm" className="text-xs" onClick={() => setNotesDialogOpen(false)}>Fechar</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={justificationDialogOpen} onOpenChange={setJustificationDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-sm">Justificativa</DialogTitle>
                  <DialogDescription className="sr-only">Selecionar justificativa da viagem</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Justificativa</Label>
                    <Select value={formData.justificationId || ""} onValueChange={(v) => updateForm("justificationId", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {justifications?.map((j) => (
                          <SelectItem key={j.id} value={j.id} className="text-xs">{lookupLabel(j)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mensagem</Label>
                    <Textarea
                      className="text-xs min-h-[80px]"
                      value={(formData as any).justificationMessage || ""}
                      onChange={(e) => updateForm("justificationMessage", e.target.value)}
                      placeholder="Mensagem da justificativa..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  {formData.justificationId && (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => { updateForm("justificationId", null); updateForm("justificationMessage", null); }}>
                      Limpar
                    </Button>
                  )}
                  <Button size="sm" className="text-xs" onClick={() => setJustificationDialogOpen(false)}>Fechar</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* === DailyTripSections (Detail) === */}
            <Separator />
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Trechos da Viagem</Label>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addSection}>
                <Plus className="h-3.5 w-3.5" /> Adicionar Trecho
              </Button>
            </div>

            {(formData.dailyTripSections || []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Nenhum trecho cadastrado.</p>
            ) : (
              <div>
                <Tabs value={activeSectionTab} onValueChange={setActiveSectionTab}>
                  <TabsList className="mb-2">
                    {(formData.dailyTripSections || []).map((section, idx) => (
                      <TabsTrigger key={section.id || idx} value={String(idx)} className="text-xs">
                        Trecho {section.section || idx + 1}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {(formData.dailyTripSections || []).map((section, idx) => (
                    <TabsContent key={section.id || idx} value={String(idx)} className="mt-0">
                      <Card className="border-dashed">
                        <CardContent className="p-3 space-y-2">
                          {/* Row 1: Origem | Destino | Início Previsto | Fim Previsto | Veículo | Motorista */}
                          <div className="grid grid-cols-6 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Origem</Label>
                              <LookupSearchField
                                endpoint="Location"
                                labelFn="codeOnly"
                                searchFilterParam="Filter1String"
                                value={section.locationOrigId || ""}
                                onChange={(id) => updateSection(idx, "locationOrigId", id)}
                                placeholder="Origem..."
                                nullable
                                modalVisibleColumns={LOCATION_MODAL_COLUMNS}
                                columnLabels={LOCATION_COLUMN_LABELS}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Destino</Label>
                              <LookupSearchField
                                endpoint="Location"
                                labelFn="codeOnly"
                                searchFilterParam="Filter1String"
                                value={section.locationDestId || ""}
                                onChange={(id) => updateSection(idx, "locationDestId", id)}
                                placeholder="Destino..."
                                nullable
                                modalVisibleColumns={LOCATION_MODAL_COLUMNS}
                                columnLabels={LOCATION_COLUMN_LABELS}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Início Previsto</Label>
                              <DatePickerField value={section.startPlanned} onChange={(v) => updateSection(idx, "startPlanned", v)} includeTime />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Fim Previsto</Label>
                              <DatePickerField value={section.endPlanned} onChange={(v) => updateSection(idx, "endPlanned", v)} includeTime />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Veículo</Label>
                              <LookupSearchField
                                endpoint="Truck"
                                labelFn="codeName"
                                searchFilterParam="Filter1String"
                                value={section.truckId || ""}
                                onChange={(id) => updateSection(idx, "truckId", id)}
                                placeholder="Veículo..."
                                nullable
                                transformItem={(item) => ({ ...item, code: item.licensePlate as string || "", name: item.fleetCode as string || "" })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Motorista</Label>
                              <Input
                                value={String(formData.nickName || "")}
                                readOnly
                                disabled
                                placeholder="Motorista..."
                                className="bg-muted"
                              />
                            </div>
                          </div>
                          {/* Row 2: Início Estimado | Fim Estimado | Início Realizado | Fim Realizado | Tipo de Parada | Obs */}
                          <div className="grid grid-cols-6 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Início Estimado</Label>
                              <DatePickerField value={section.startEstimated} onChange={() => {}} includeTime disabled />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Fim Estimado</Label>
                              <DatePickerField value={section.endEstimated} onChange={() => {}} includeTime disabled />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Início Realizado</Label>
                              <DatePickerField value={section.startActual} onChange={() => {}} includeTime disabled />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Fim Realizado</Label>
                              <DatePickerField value={section.endActual} onChange={() => {}} includeTime disabled />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Tipo de Parada</Label>
                              <Input
                                value={section.stopType ? ((section.stopType as any).stopTypeCode || (section.stopType as any).code || "") : ""}
                                readOnly
                                disabled
                                placeholder="Parada..."
                                className="bg-muted"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">&nbsp;</Label>
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant={section.notes ? "default" : "outline"}
                                  size="sm"
                                  className="h-8 text-xs gap-1 flex-1"
                                  onClick={() => setSectionNotesIdx(idx)}
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  Obs.
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => removeSection(idx)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>

                {/* Section Notes Dialog */}
                <Dialog open={sectionNotesIdx !== null} onOpenChange={(open) => { if (!open) setSectionNotesIdx(null); }}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-sm">Observações do Trecho {sectionNotesIdx !== null ? ((formData.dailyTripSections || [])[sectionNotesIdx]?.section || sectionNotesIdx + 1) : ""}</DialogTitle>
                      <DialogDescription className="sr-only">Campo de observações do trecho</DialogDescription>
                    </DialogHeader>
                    {sectionNotesIdx !== null && (
                      <Textarea
                        className="text-xs min-h-[120px]"
                        value={(formData.dailyTripSections || [])[sectionNotesIdx]?.notes || ""}
                        onChange={(e) => updateSection(sectionNotesIdx, "notes", e.target.value)}
                        placeholder="Digite as observações do trecho..."
                      />
                    )}
                    <div className="flex justify-end">
                      <Button size="sm" className="text-xs" onClick={() => setSectionNotesIdx(null)}>Fechar</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <Button variant="outline" onClick={closeForm}>{t("common.cancel")}</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {t("common.save")}
              </Button>
            </div>
          </div>
        </FloatingPanel>
      )}

      {/* Filters */}
      <div className="grid grid-cols-5 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Data Início *</Label>
          <DatePickerField
            value={filters.startTripDate ? `${filters.startTripDate}T00:00:00` : null}
            onChange={(v) => {
              const startDate = v ? v.substring(0, 10) : "";
              setFilters((p) => {
                const updated = { ...p, startTripDate: startDate };
                if (startDate) {
                  const d = new Date(startDate + "T00:00:00");
                  d.setDate(d.getDate() + 5);
                  updated.endTripDate = d.toISOString().substring(0, 10);
                }
                return updated;
              });
            }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data Fim</Label>
          <DatePickerField
            value={filters.endTripDate ? `${filters.endTripDate}T00:00:00` : null}
            onChange={(v) => setFilters((p) => ({ ...p, endTripDate: v ? v.substring(0, 10) : "" }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">STO / DT</Label>
          <Input
            value={filters.stoDt}
            onChange={(e) => setFilters((p) => ({ ...p, stoDt: e.target.value.toUpperCase() }))}
            onKeyDown={handleKeyDown}
            placeholder="STO / DT..."
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Origem</Label>
          <LookupSearchField
            endpoint="Location"
            labelFn="codeOnly"
            searchFilterParam="Filter1String"
            value={filters.locationOrigId}
            onChange={(id) => setFilters((p) => ({ ...p, locationOrigId: id }))}
            placeholder="Origem..."
            nullable
            modalVisibleColumns={LOCATION_MODAL_COLUMNS}
            columnLabels={LOCATION_COLUMN_LABELS}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Destino</Label>
          <LookupSearchField
            endpoint="Location"
            labelFn="codeOnly"
            searchFilterParam="Filter1String"
            value={filters.locationDestId}
            onChange={(id) => setFilters((p) => ({ ...p, locationDestId: id }))}
            placeholder="Destino..."
            nullable
            modalVisibleColumns={LOCATION_MODAL_COLUMNS}
            columnLabels={LOCATION_COLUMN_LABELS}
          />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Grupo de Frota</Label>
          <Select value={filters.fleetGroupId} onValueChange={(v) => setFilters((p) => ({ ...p, fleetGroupId: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t("common.selectAll")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">{t("common.selectAll")}</SelectItem>
              {fleetGroups?.map((fg) => (
                <SelectItem key={fg.id} value={fg.id} className="text-xs">{lookupLabel(fg)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Veículo</Label>
          <Input
            value={filters.licensePlate}
            onChange={(e) => setFilters((p) => ({ ...p, licensePlate: e.target.value.toUpperCase() }))}
            onKeyDown={handleKeyDown}
            placeholder="Placa / Frota..."
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tipo de Viagem</Label>
          <Select value={filters.tripTypeId} onValueChange={(v) => setFilters((p) => ({ ...p, tripTypeId: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t("common.selectAll")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">{t("common.selectAll")}</SelectItem>
              {tripTypes?.map((tt) => (
                <SelectItem key={tt.id} value={tt.id} className="text-xs">{lookupLabel(tt)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Transportadora</Label>
          <Select value={filters.companyId} onValueChange={(v) => setFilters((p) => ({ ...p, companyId: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t("common.selectAll")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">{t("common.selectAll")}</SelectItem>
              {companies?.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">{lookupLabel(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={filters.flgStatus} onValueChange={(v) => setFilters((p) => ({ ...p, flgStatus: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t("common.selectAll")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos</SelectItem>
              <SelectItem value="N" className="text-xs">Ativo</SelectItem>
              <SelectItem value="C" className="text-xs">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={handleSearch} className="h-7 gap-1.5 text-xs">
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          {t("common.search")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => setFilters(emptyFilters())}
        >
          <X className="h-3.5 w-3.5" />
          {t("common.clear")}
        </Button>

        <div className="flex-1" />

        {searched && items && items.length > 0 && (
          <ExportDropdown
            fetchData={() => fetchAllForExport("DailyTrip", new URLSearchParams())}
            columns={[
              { key: "code", label: "Código" },
              { key: "startPlanned", label: "Início Planejado" },
              { key: "endPlanned", label: "Fim Planejado" },
            ]}
            title={t("menu.dailyTrip")}
          />
        )}
        <Button onClick={openCreate} size="sm" className="h-7 text-xs gap-1">
          <Plus className="h-3.5 w-3.5" />
          {t("common.new")}
        </Button>
      </div>

      {/* Results */}
      {searched && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-0">
              {isLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              {isError && (
                <p className="text-sm text-destructive py-4 px-4">{(error as Error)?.message || "Erro ao carregar dados."}</p>
              )}
              {items && items.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 px-4">{t("common.noResults")}</p>
              )}

              {items && items.length > 0 && (
                <>
                  <div className="overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          {[
                            { key: "tripDate", label: "Data" },
                            { key: "dt", label: "DT" },
                            { key: "sto", label: "STO" },
                            { key: "locationOrig", label: "Origem" },
                            { key: "locationDest", label: "Destino" },
                            { key: "startPlanned", label: "Início Prev." },
                            { key: "endPlanned", label: "Fim Prev." },
                            { key: "startActual", label: "Início Real" },
                            { key: "endActual", label: "Fim Real" },
                            { key: "fleetGroup", label: "Frota" },
                            { key: "tripType", label: "Tipo" },
                            { key: "company", label: "Transp." },
                            { key: "flgStatus", label: "Situação" },
                          ].map((col) => (
                            <TableHead
                              key={col.key}
                              className="whitespace-nowrap font-medium h-8 px-3 text-xs cursor-pointer select-none hover:bg-muted/70 transition-colors"
                              onClick={() => toggleSort(col.key)}
                            >
                              <div className="flex items-center">
                                {col.label}
                                <SortIcon colKey={col.key} />
                              </div>
                            </TableHead>
                          ))}
                          <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs text-center w-16">{t("common.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, i) => (
                          <TableRow key={item.id ?? i} className="hover:bg-muted/30 group h-6">
                            <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{formatDate(item.tripDate)}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{item.dt || "--"}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{item.sto || "--"}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{lookupCode(item.locationOrig)}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{lookupCode(item.locationDest)}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{formatDateShort(item.startPlanned)}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{formatDateShort(item.endPlanned)}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{formatTimeOnly(item.startActual)}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{formatTimeOnly(item.endActual)}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{lookupCode(item.fleetGroup)}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{lookupCode(item.tripType)}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{lookupCode(item.company)}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{statusBadge(item.flgStatus)}</TableCell>
                            <TableCell className="text-center text-xs py-0.5 px-3">
                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Server-side pagination */}
                  <div className="flex items-center justify-between border-t border-border px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t("common.rowsPerPage")}:</span>
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
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default DailyTripPage;
