import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ExportDropdown } from "@/components/ExportDropdown";
import { fetchAllForExport } from "@/lib/export-utils";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  Search, Loader2, X, Plus, Pencil, Save, Copy,
  ChevronLeft, ChevronRight,
  ArrowUp, ArrowDown, ArrowUpDown, Trash2, CalendarIcon, Milestone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { DatePickerField } from "@/components/DatePickerField";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FloatingPanel } from "@/components/FloatingPanel";
import { LookupSearchField } from "@/components/LookupSearchField";
import { API_BASE } from "@/config/api";
import { cn } from "@/lib/utils";

// --- Types ---
interface LookupItem {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  [k: string]: unknown;
}

interface StopTypeItem {
  id: string;
  stopTypeCode?: string;
  description?: string;
  stopTime?: number | null;
  [k: string]: unknown;
}

interface LineSection {
  id?: string;
  lineId?: string;
  section?: number;
  locationOrigId?: string | null;
  locationOrig?: LookupItem | null;
  locationDestId?: string | null;
  locationDest?: LookupItem | null;
  /** API value in minutes */
  duration?: number | null;
  /** UI-only masked text (hh:mm) to allow partial typing */
  durationText?: string | null;
  stopTypeId?: string | null;
  stopType?: StopTypeItem | null;
  logisticHub?: boolean | null;
  locationGroupId?: string | null;
  locationGroup?: LookupItem | null;
  distance?: number | null;
  notes?: string | null;
  [k: string]: unknown;
}

interface LineItem {
  id?: string;
  code?: string | null;
  description?: string | null;
  locationOrigId?: string | null;
  locationOrig?: LookupItem | null;
  locationDestId?: string | null;
  locationDest?: LookupItem | null;
  fleetGroupId?: string | null;
  fleetGroup?: LookupItem | null;
  tripTypeId?: string | null;
  tripType?: LookupItem | null;
  distance?: number | null;
  cost?: number | null;
  overtimeAllowed?: number | null;
  /** UI-only masked text (hh:mm) to allow partial typing */
  overtimeText?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  freqMon?: number | null;
  freqTue?: number | null;
  freqWed?: number | null;
  freqThu?: number | null;
  freqFri?: number | null;
  freqSat?: number | null;
  freqSun?: number | null;
  qtdLineSections?: number;
  lineSections?: LineSection[];
  [k: string]: unknown;
}

// --- Helpers ---
type SortDirection = "asc" | "desc" | null;
interface SortConfig { key: string; direction: SortDirection; }

const lookupCode = (obj?: LookupItem | null) => obj?.code || "--";

// Days of week config
const DAYS_OF_WEEK = [
  { key: "freqMon", labelKey: "line.mon" },
  { key: "freqTue", labelKey: "line.tue" },
  { key: "freqWed", labelKey: "line.wed" },
  { key: "freqThu", labelKey: "line.thu" },
  { key: "freqFri", labelKey: "line.fri" },
  { key: "freqSat", labelKey: "line.sat" },
  { key: "freqSun", labelKey: "line.sun" },
] as const;

// Duration helpers: API sends minutes, display as hh:mm
const minutesToHhmm = (minutes?: number | null): string => {
  if (minutes == null || isNaN(minutes)) return "";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const hhmmToMinutes = (hhmm: string): number | null => {
  if (!hhmm || !hhmm.includes(":")) return null;
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

// Mask input to hh:mm format
const applyHhmmMask = (raw: string): string => {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

// --- API ---
const fetchLookup = async (endpoint: string): Promise<LookupItem[]> => {
  const res = await fetch(`${API_BASE}/${endpoint}?PageSize=999`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};


interface LineFilters {
  code: string;
  locationOrigId: string;
  locationDestId: string;
  fleetGroupId: string;
  tripTypeId: string;
}

interface PaginationMeta {
  TotalCount: number;
  PageSize: number;
  CurrentPage: number;
  TotalPages: number;
  HasNext: boolean;
  HasPrevious: boolean;
}

const fetchLines = async (
  filters: LineFilters,
  page: number,
  pageSize: number
): Promise<{ items: LineItem[]; pagination: PaginationMeta }> => {
  const params = new URLSearchParams();
  if (filters.code) params.append("Filter1String", filters.code);
  if (filters.locationOrigId && filters.locationOrigId !== "all") params.append("Filter1Id", filters.locationOrigId);
  if (filters.locationDestId && filters.locationDestId !== "all") params.append("Filter2Id", filters.locationDestId);
  if (filters.fleetGroupId && filters.fleetGroupId !== "all") params.append("Filter3Id", filters.fleetGroupId);
  if (filters.tripTypeId && filters.tripTypeId !== "all") params.append("Filter4Id", filters.tripTypeId);
  params.append("PageNumber", String(page));
  params.append("PageSize", String(pageSize));

  const res = await fetch(`${API_BASE}/Line?${params.toString()}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const data = (await res.json()) as unknown;

  // API pode retornar uma lista "wrapper": [{ line: {...}, qtdLineSections: n }]
  const items: LineItem[] = Array.isArray(data)
    ? (data as any[]).map((row) => {
        if (row && typeof row === "object" && "line" in row && row.line) {
          const line = row.line as LineItem;
          return {
            ...line,
            qtdLineSections: (row.qtdLineSections ?? row.qtdlinesections ?? 0) as number,
          };
        }
        return row as LineItem;
      })
    : [];

  const ph = res.headers.get("x-pagination");
  const pagination: PaginationMeta = ph
    ? JSON.parse(ph)
    : {
        TotalCount: items.length,
        PageSize: pageSize,
        CurrentPage: page,
        TotalPages: 1,
        HasNext: false,
        HasPrevious: false,
      };

  return { items, pagination };
};

interface LineDetailResponse {
  line: LineItem;
  lineSections: LineSection[];
}

const fetchLineDetail = async (id: string): Promise<LineDetailResponse> => {
  const res = await fetch(`${API_BASE}/returnline/${id}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const updateLine = async (payload: { line: Record<string, unknown>; lineSections: Record<string, unknown>[] }): Promise<string> => {
  const res = await fetch(`${API_BASE}/updateline`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const text = await res.text();
  return text;
};

const deleteLine = async (id: string): Promise<string> => {
  const res = await fetch(`${API_BASE}/deleteline/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const text = await res.text();
  return text;
};

// Date helpers
const isoToDate = (iso?: string | null): Date | undefined => {
  if (!iso) return undefined;
  try { return parseISO(iso); } catch { return undefined; }
};

const dateToIso = (d?: Date): string | null => {
  if (!d) return null;
  return d.toISOString();
};

// --- Component ---
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const LinePage = () => {
  const { t } = useTranslation();
  usePageTitle(t("menu.line"), Milestone);
  const { toast } = useToast();

  // Filters
  const emptyFilters = (): LineFilters => ({
    code: "",
    locationOrigId: "",
    locationDestId: "",
    fleetGroupId: "",
    tripTypeId: "",
  });

  const [filters, setFilters] = useState<LineFilters>(emptyFilters());
  const [searched, setSearched] = useState(false);
  const [searchParams, setSearchParams] = useState<LineFilters>(emptyFilters());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // CRUD
  const [editingItem, setEditingItem] = useState<LineItem | null>(null);
  const [formData, setFormData] = useState<Partial<LineItem>>({});
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "code", direction: "asc" });
  const [activeSectionTab, setActiveSectionTab] = useState("0");
  const [deleteTarget, setDeleteTarget] = useState<LineItem | null>(null);
  const [copyTarget, setCopyTarget] = useState<LineItem | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);

  // Lookup items for auto-generation
  const [selectedOrig, setSelectedOrig] = useState<LookupItem | null>(null);
  const [selectedDest, setSelectedDest] = useState<LookupItem | null>(null);
  const [selectedFleetGroup, setSelectedFleetGroup] = useState<LookupItem | null>(null);
  const [selectedTripType, setSelectedTripType] = useState<LookupItem | null>(null);
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [descManuallyEdited, setDescManuallyEdited] = useState(false);

  // Lookups
  const { data: fleetGroups } = useQuery<LookupItem[]>({ queryKey: ["fleet-groups"], queryFn: () => fetchLookup("FleetGroup") });
  const { data: tripTypes } = useQuery<LookupItem[]>({ queryKey: ["trip-types"], queryFn: () => fetchLookup("TripType") });
  const { data: stopTypes } = useQuery<StopTypeItem[]>({ queryKey: ["stop-types"], queryFn: () => fetchLookup("StopType") as Promise<StopTypeItem[]> });
  const { data: locationGroups } = useQuery<LookupItem[]>({ queryKey: ["location-groups"], queryFn: () => fetchLookup("LocationGroup") });

  // List query
  const { data: result, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["lines", searchParams, currentPage, pageSize],
    queryFn: () => fetchLines(searchParams, currentPage, pageSize),
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

  // Page numbers
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

  // Auto-generate code and description
  useEffect(() => {
    if (!selectedOrig || !selectedDest || !selectedFleetGroup || !selectedTripType) return;

    if (!codeManuallyEdited) {
      const origCode2 = (selectedOrig.codeIntegration2 as string) || (selectedOrig.code as string) || "";
      const destCode2 = (selectedDest.codeIntegration2 as string) || (selectedDest.code as string) || "";
      const fgCode = (selectedFleetGroup.code as string) || "";
      const ttCode = (selectedTripType.code as string) || "";
      const generatedCode = [origCode2, destCode2, fgCode, ttCode].filter(Boolean).join("-");
      setFormData((p) => ({ ...p, code: generatedCode }));
    }

    if (!descManuallyEdited) {
      const origCode = (selectedOrig.code as string) || "";
      const destCode = (selectedDest.code as string) || "";
      const fgDesc = (selectedFleetGroup.description as string) || "";
      const ttDesc = (selectedTripType.description as string) || "";
      const generatedDesc = `${origCode}->${destCode} (${fgDesc}-${ttDesc})`;
      setFormData((p) => ({ ...p, description: generatedDesc }));
    }
  }, [selectedOrig, selectedDest, selectedFleetGroup, selectedTripType, codeManuallyEdited, descManuallyEdited]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (data: { line: Record<string, unknown>; sections: LineSection[] }) => {
      return updateLine({ line: data.line, lineSections: data.sections });
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLine(id),
    onSuccess: () => {
      toast({ title: t("common.deleteSuccess"), variant: "success" });
      setDeleteTarget(null);
      refetch();
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "error" });
    },
  });

  // Copy line handler
  const handleCopyLine = async () => {
    if (!copyTarget?.id) return;
    setCopyLoading(true);
    try {
      const res = await fetch(`${API_BASE}/copyline/${copyTarget.id}`, { method: "POST" });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const response = await res.json();
      setCopyTarget(null);
      toast({ title: t("line.copySuccess"), variant: "success" });
      // Refresh list
      await refetch();
      // Use the response directly — no need to call returnline again
      const line = response.line;
      const sectionsRaw = response.lineSections || [];
      const sections = sectionsRaw.map((s: any) => ({
        ...s,
        durationText: minutesToHhmm(s.duration as number | null),
      }));
      const detail: LineItem = {
        ...line,
        lineSections: sections,
        overtimeText: minutesToHhmm(line.overtimeAllowed as number | null),
      };
      setFormData(detail);
      setEditingItem(detail);
      setActiveSectionTab("0");
      setSelectedOrig((detail.locationOrig as LookupItem) || null);
      setSelectedDest((detail.locationDest as LookupItem) || null);
      setSelectedFleetGroup((detail.fleetGroup as LookupItem) || null);
      setSelectedTripType((detail.tripType as LookupItem) || null);
      setCodeManuallyEdited(!!detail.code);
      setDescManuallyEdited(!!detail.description);
    } catch (err: any) {
      toast({ title: t("line.copyError"), description: err.message, variant: "error" });
    } finally {
      setCopyLoading(false);
    }
  };

  // Handlers
  const handleSearch = () => {
    setSearchParams({ ...filters });
    setSearched(true);
    setCurrentPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const resetFormMeta = () => {
    setSelectedOrig(null);
    setSelectedDest(null);
    setSelectedFleetGroup(null);
    setSelectedTripType(null);
    setCodeManuallyEdited(false);
    setDescManuallyEdited(false);
    setFormErrors({});
  };

  const openNew = () => {
    setFormData({ lineSections: [], freqMon: 1, freqTue: 1, freqWed: 1, freqThu: 1, freqFri: 1, freqSat: 0, freqSun: 0 });
    setEditingItem({} as LineItem);
    setActiveSectionTab("0");
    resetFormMeta();
  };

  const openEdit = async (item: LineItem) => {
    if (!item.id) return;
    setLoadingDetail(true);
    try {
      const response = await fetchLineDetail(item.id);
      const line = response.line;
      const sectionsRaw = response.lineSections || [];
      const sections = sectionsRaw.map((s) => ({
        ...s,
        durationText: minutesToHhmm(s.duration as number | null),
      }));
      const detail: LineItem = {
        ...line,
        lineSections: sections,
        overtimeText: minutesToHhmm(line.overtimeAllowed as number | null),
      };
      setFormData(detail);
      setEditingItem(detail);
      setActiveSectionTab("0");
      // Restore selected lookup items for auto-generation
      setSelectedOrig((detail.locationOrig as LookupItem) || null);
      setSelectedDest((detail.locationDest as LookupItem) || null);
      setSelectedFleetGroup((detail.fleetGroup as LookupItem) || null);
      setSelectedTripType((detail.tripType as LookupItem) || null);
      // In edit mode, treat existing code/desc as manually set
      setCodeManuallyEdited(!!detail.code);
      setDescManuallyEdited(!!detail.description);
    } catch (err: any) {
      toast({ title: "Erro ao carregar detalhe", description: err.message, variant: "error" });
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeForm = () => {
    setEditingItem(null);
    setFormData({});
    resetFormMeta();
  };

  const updateForm = (field: string, value: unknown) => {
    setFormData((p) => ({ ...p, [field]: value === "" ? null : value }));
  };

  const handleSave = () => {
    const errors: Record<string, boolean> = {};
    if (!formData.code) errors.code = true;
    if (!formData.locationOrigId) errors.locationOrigId = true;
    if (!formData.locationDestId) errors.locationDestId = true;
    if (!formData.fleetGroupId) errors.fleetGroupId = true;
    if (!formData.tripTypeId) errors.tripTypeId = true;
    if (formData.cost == null) errors.cost = true;
    if (formData.overtimeAllowed == null) errors.overtimeAllowed = true;
    if (!formData.startDate) errors.startDate = true;
    if (!formData.endDate) errors.endDate = true;
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({ title: t("common.requiredFields"), variant: "destructive" });
      return;
    }
    setFormErrors({});

    // Build line payload - strip nested objects
    const linePayload: Record<string, unknown> = {
      code: formData.code,
      description: formData.description || null,
      locationOrigId: formData.locationOrigId || null,
      locationDestId: formData.locationDestId || null,
      fleetGroupId: formData.fleetGroupId || null,
      tripTypeId: formData.tripTypeId || null,
      distance: formData.distance ?? 0,
      cost: formData.cost ?? 0,
      overtimeAllowed: formData.overtimeAllowed ?? 0,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      freqMon: formData.freqMon ?? 0,
      freqTue: formData.freqTue ?? 0,
      freqWed: formData.freqWed ?? 0,
      freqThu: formData.freqThu ?? 0,
      freqFri: formData.freqFri ?? 0,
      freqSat: formData.freqSat ?? 0,
      freqSun: formData.freqSun ?? 0,
    };
    linePayload.id = formData.id || "00000000-0000-0000-0000-000000000000";

    // Build section payloads
    const sections = (formData.lineSections || []).map((s) => ({
      ...(s.id ? { id: s.id } : {}),
      lineId: s.lineId || formData.id || undefined,
      section: s.section,
      locationOrigId: s.locationOrigId || null,
      locationDestId: s.locationDestId || null,
      duration: s.duration ?? null,
      stopTypeId: s.stopTypeId || null,
      logisticHub: s.logisticHub ?? false,
      locationGroupId: s.locationGroupId || null,
      distance: s.distance ?? null,
      notes: s.notes || null,
    }));

    saveMutation.mutate({
      line: linePayload,
      sections: sections as LineSection[],
    });
  };

  // Section handlers
  const addSection = () => {
    const sections = formData.lineSections || [];
    const nextSection = sections.length > 0 ? Math.max(...sections.map((s) => s.section || 0)) + 1 : 1;
    const newIndex = sections.length;
    setFormData((p) => ({
      ...p,
      lineSections: [...(p.lineSections || []), {
        id: undefined,
        section: nextSection,
        locationOrigId: null,
        locationDestId: null,
        duration: null,
        durationText: "",
        stopTypeId: null,
        logisticHub: false,
        locationGroupId: null,
        distance: null,
        notes: null,
      }],
    }));
    setActiveSectionTab(String(newIndex));
  };

  const removeSection = (index: number) => {
    setFormData((p) => {
      const newSections = (p.lineSections || []).filter((_, i) => i !== index);
      // Renumber sections
      const renumbered = newSections.map((s, i) => ({ ...s, section: i + 1 }));
      return { ...p, lineSections: renumbered };
    });
    // Adjust active tab
    const totalAfter = (formData.lineSections || []).length - 1;
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
      lineSections: (p.lineSections || []).map((s, i) =>
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

  const isNew = !formData.id;
  const panelTitle = isNew ? t("line.newLine") : t("line.editLine");

  const LOCATION_MODAL_COLUMNS = ["code", "name", "codeIntegration2"];
  const LOCATION_COLUMN_LABELS: Record<string, string> = { code: "Código", name: "Nome", codeIntegration2: "Cód. Integração TMS" };

  // Date helpers for the form
  const startDateObj = isoToDate(formData.startDate as string | null);
  const endDateObj = isoToDate(formData.endDate as string | null);

  return (
    <div className="space-y-4">
      {/* Loading detail overlay */}
      {loadingDetail && (
        <div className="fixed inset-0 bg-foreground/10 z-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Floating CRUD Panel */}
      {editingItem && (
        <FloatingPanel title={panelTitle} onClose={closeForm} width={1100}>
          <div className="space-y-3 pt-2">
            {/* ── Linha 1: Código + Descrição (auto-gerado) ── */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-4 space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{t("common.code")} <span className="text-destructive">*</span></Label>
                  <button
                    type="button"
                    title={codeManuallyEdited ? "Usar sugestão automática" : "Editar manualmente"}
                    className={cn(
                      "p-0.5 rounded transition-colors",
                      codeManuallyEdited
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary"
                    )}
                    onClick={() => setCodeManuallyEdited((v) => !v)}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
                <Input
                  className={cn(
                    "h-8 text-xs",
                    formErrors.code && "border-destructive",
                    !codeManuallyEdited && "bg-muted/40 text-muted-foreground"
                  )}
                  value={formData.code || ""}
                  readOnly={!codeManuallyEdited}
                  onChange={(e) => {
                    if (codeManuallyEdited) updateForm("code", e.target.value.toUpperCase());
                  }}
                  placeholder="Auto-preenchido..."
                />
              </div>
              <div className="col-span-8 space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{t("common.description")}</Label>
                  <button
                    type="button"
                    title={descManuallyEdited ? "Usar sugestão automática" : "Editar manualmente"}
                    className={cn(
                      "p-0.5 rounded transition-colors",
                      descManuallyEdited
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary"
                    )}
                    onClick={() => setDescManuallyEdited((v) => !v)}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
                <Input
                  className={cn(
                    "h-8 text-xs",
                    !descManuallyEdited && "bg-muted/40 text-muted-foreground"
                  )}
                  value={formData.description || ""}
                  readOnly={!descManuallyEdited}
                  onChange={(e) => {
                    if (descManuallyEdited) updateForm("description", e.target.value);
                  }}
                  placeholder="Auto-preenchido..."
                />
              </div>
            </div>

            {/* ── Linha 2: Origem + Destino + Grupo Frota + Tipo Viagem ── */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-3 space-y-1">
                <Label className="text-xs">{t("line.origin")} <span className="text-destructive">*</span></Label>
                <LookupSearchField
                  endpoint="Location"
                  labelFn="codeOnly"
                  searchFilterParam="Filter1String"
                  value={formData.locationOrigId || ""}
                  onChange={(id, item) => {
                    updateForm("locationOrigId", id);
                    setSelectedOrig(item as LookupItem || null);
                  }}
                  placeholder="Origem..."
                  nullable
                  hasError={!!formErrors.locationOrigId}
                  className="h-8 text-xs"
                  modalVisibleColumns={LOCATION_MODAL_COLUMNS}
                  columnLabels={LOCATION_COLUMN_LABELS}
                />
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-xs">{t("line.destination")} <span className="text-destructive">*</span></Label>
                <LookupSearchField
                  endpoint="Location"
                  labelFn="codeOnly"
                  searchFilterParam="Filter1String"
                  value={formData.locationDestId || ""}
                  onChange={(id, item) => {
                    updateForm("locationDestId", id);
                    setSelectedDest(item as LookupItem || null);
                  }}
                  placeholder="Destino..."
                  nullable
                  hasError={!!formErrors.locationDestId}
                  className="h-8 text-xs"
                  modalVisibleColumns={LOCATION_MODAL_COLUMNS}
                  columnLabels={LOCATION_COLUMN_LABELS}
                />
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-xs">{t("line.fleetGroup")} <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.fleetGroupId || ""}
                  onValueChange={(v) => {
                    updateForm("fleetGroupId", v);
                    const fg = fleetGroups?.find((f) => f.id === v) || null;
                    setSelectedFleetGroup(fg);
                  }}
                  >
                    <SelectTrigger className={cn("h-8 text-xs", formErrors.fleetGroupId && "border-destructive")}><SelectValue placeholder="..." /></SelectTrigger>
                  <SelectContent>
                    {fleetGroups?.map((fg) => (
                      <SelectItem key={fg.id} value={fg.id} className="text-xs">{lookupLabel(fg)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-xs">{t("line.tripType")} <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.tripTypeId || ""}
                  onValueChange={(v) => {
                    updateForm("tripTypeId", v);
                    const tt = tripTypes?.find((t) => t.id === v) || null;
                    setSelectedTripType(tt);
                  }}
                >
                    <SelectTrigger className={cn("h-8 text-xs", formErrors.tripTypeId && "border-destructive")}><SelectValue placeholder="..." /></SelectTrigger>
                  <SelectContent>
                    {tripTypes?.map((tt) => (
                      <SelectItem key={tt.id} value={tt.id} className="text-xs">{lookupLabel(tt)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Linha 3: Distância + Custo + H.Extra + Datas + Dias da Semana ── */}
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{t("line.distance")}</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  className="h-8 text-xs"
                  value={formData.distance != null ? String(formData.distance) : ""}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    updateForm("distance", e.target.value !== "" && val >= 0 ? val : null);
                  }}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{t("line.cost")} <span className="text-destructive">*</span></Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className={cn("h-8 text-xs", formErrors.cost && "border-destructive")}
                  placeholder="0,00"
                  value={
                    formData.cost != null
                      ? String(formData.cost).replace(".", ",")
                      : ""
                  }
                  onChange={(e) => {
                    let raw = e.target.value.replace(/[^0-9.,]/g, "");
                    raw = raw.replace(",", ".");
                    const parts = raw.split(".");
                    if (parts.length > 2) raw = parts[0] + "." + parts.slice(1).join("");
                    if (parts[1] !== undefined) raw = parts[0] + "." + parts[1].slice(0, 2);
                    const num = raw === "" || raw === "." ? null : parseFloat(raw);
                    updateForm("cost", num);
                  }}
                />
              </div>
              <div className="col-span-1 space-y-1">
                <Label className="text-xs">{t("line.overtime")} <span className="text-destructive">*</span></Label>
                <Input
                  className={cn("h-8 text-xs", formErrors.overtimeAllowed && "border-destructive")}
                  placeholder="hh:mm"
                  value={formData.overtimeText ?? ""}
                  onChange={(e) => {
                    const masked = applyHhmmMask(e.target.value);
                    updateForm("overtimeText", masked);
                    if (masked.length === 5) {
                      updateForm("overtimeAllowed", hhmmToMinutes(masked));
                    }
                  }}
                  onBlur={() => {
                    updateForm("overtimeText", minutesToHhmm(formData.overtimeAllowed));
                  }}
                  maxLength={5}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{t("line.startDate")} <span className="text-destructive">*</span></Label>
                <DatePickerField
                  value={formData.startDate}
                  onChange={(v) => updateForm("startDate", v)}
                  hasError={!!formErrors.startDate}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{t("line.endDate")} <span className="text-destructive">*</span></Label>
                <DatePickerField
                  value={formData.endDate}
                  onChange={(v) => updateForm("endDate", v)}
                  hasError={!!formErrors.endDate}
                />
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-xs">{t("line.daysOfWeek")}</Label>
                <div className="flex items-center gap-1 h-8">
                  {DAYS_OF_WEEK.map(({ key, labelKey }) => {
                    const active = (formData[key] as number) === 1;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateForm(key, active ? 0 : 1)}
                        className={cn(
                          "h-7 min-w-[32px] px-1.5 rounded text-xs font-medium border transition-colors",
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-input hover:border-primary/50"
                        )}
                      >
                        {t(labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* === LineSections (Detail) === */}
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-semibold">{t("line.sections")}</Label>
                {/* Total duration display */}
                {(formData.lineSections || []).length > 0 && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {t("line.totalTime")}: {minutesToHhmm(
                      (formData.lineSections || []).reduce((sum, s) => {
                        const dur = (s.duration as number) || 0;
                        const stopTime = s.stopType?.stopTime || stopTypes?.find(st => st.id === s.stopTypeId)?.stopTime || 0;
                        return sum + dur + (stopTime || 0);
                      }, 0)
                    ) || "00:00"}
                  </Badge>
                )}
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addSection}>
                <Plus className="h-3.5 w-3.5" /> {t("line.addSection")}
              </Button>
            </div>

            {(formData.lineSections || []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">{t("line.noSections")}</p>
            ) : (
              <div>
                <Tabs value={activeSectionTab} onValueChange={setActiveSectionTab}>
                  <TabsList className="mb-2">
                    {(formData.lineSections || []).map((section, idx) => (
                      <TabsTrigger key={section.id || idx} value={String(idx)} className="text-xs">
                        {t("line.section")} {section.section || idx + 1}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {(formData.lineSections || []).map((section, idx) => {
                    const selectedStopType = section.stopType || stopTypes?.find(st => st.id === section.stopTypeId);
                    return (
                      <TabsContent key={section.id || idx} value={String(idx)} className="mt-0">
                        <Card className="border-dashed">
                          <CardContent className="p-3 space-y-2">
                            {/* Row: Origem | Destino | Duração | Tipo Parada | StopTime | Hub Log | Grupo Loc | [Delete] */}
                            <div className="grid grid-cols-12 gap-2 items-end">
                              <div className="space-y-1 col-span-2">
                                <Label className="text-xs">{t("line.origin")} <span className="text-destructive">*</span></Label>
                                <LookupSearchField
                                  endpoint="Location"
                                  labelFn="codeOnly"
                                  searchFilterParam="Filter1String"
                                  value={section.locationOrigId || ""}
                                  onChange={(id) => updateSection(idx, "locationOrigId", id)}
                                  placeholder="Origem..."
                                  nullable
                                  className="h-8 text-xs"
                                  modalVisibleColumns={LOCATION_MODAL_COLUMNS}
                                  columnLabels={LOCATION_COLUMN_LABELS}
                                  initialLabel={(section.locationOrig as LookupItem)?.code || undefined}
                                />
                              </div>
                              <div className="space-y-1 col-span-2">
                                <Label className="text-xs">{t("line.destination")} <span className="text-destructive">*</span></Label>
                                <LookupSearchField
                                  endpoint="Location"
                                  labelFn="codeOnly"
                                  searchFilterParam="Filter1String"
                                  value={section.locationDestId || ""}
                                  onChange={(id) => updateSection(idx, "locationDestId", id)}
                                  placeholder="Destino..."
                                  nullable
                                  className="h-8 text-xs"
                                  modalVisibleColumns={LOCATION_MODAL_COLUMNS}
                                  columnLabels={LOCATION_COLUMN_LABELS}
                                  initialLabel={(section.locationDest as LookupItem)?.code || undefined}
                                />
                              </div>
                              <div className="space-y-1 col-span-1">
                                <Label className="text-xs">{t("line.duration")}</Label>
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="hh:mm"
                                  value={(section.durationText ?? "") as string}
                                  onChange={(e) => {
                                    const masked = applyHhmmMask(e.target.value);
                                    updateSection(idx, "durationText", masked);
                                    if (masked.length === 0) {
                                      updateSection(idx, "duration", null);
                                    } else if (masked.length === 5) {
                                      updateSection(idx, "duration", hhmmToMinutes(masked));
                                    }
                                  }}
                                  onBlur={() => {
                                    // If user never completed hh:mm, restore last valid value
                                    if (!section.durationText) {
                                      updateSection(idx, "durationText", minutesToHhmm(section.duration as number | null));
                                    }
                                  }}
                                  maxLength={5}
                                />
                              </div>
                              <div className="space-y-1 col-span-2">
                                <Label className="text-xs">{t("line.stopType")} <span className="text-destructive">*</span></Label>
                                <Select
                                  value={section.stopTypeId || ""}
                                  onValueChange={(v) => updateSection(idx, "stopTypeId", v || null)}
                                >
                                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="..." /></SelectTrigger>
                                  <SelectContent>
                                    {stopTypes?.map((st) => (
                                      <SelectItem key={st.id} value={st.id} className="text-xs">
                                        {st.stopTypeCode} - {st.description}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1 col-span-1">
                                <Label className="text-xs">{t("line.stopTime")}</Label>
                                <Input
                                  className="h-8 text-xs bg-muted/40 text-muted-foreground"
                                  value={minutesToHhmm(selectedStopType?.stopTime as number | null) || "--"}
                                  readOnly
                                />
                              </div>
                              <div className="space-y-1 col-span-1">
                                <Label className="text-xs">{t("line.logisticHub")}</Label>
                                <div className="flex items-center h-8">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newVal = !section.logisticHub;
                                      // Clear locationGroupId when disabling hub
                                      setFormData((p) => ({
                                        ...p,
                                        lineSections: (p.lineSections || []).map((s, i) =>
                                          i === idx
                                            ? { ...s, logisticHub: newVal, locationGroupId: newVal ? s.locationGroupId : null }
                                            : s
                                        ),
                                      }));
                                    }}
                                    className={cn(
                                      "h-7 px-3 rounded text-xs font-medium border transition-colors w-full",
                                      section.logisticHub
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background text-muted-foreground border-input hover:border-primary/50"
                                    )}
                                  >
                                    {section.logisticHub ? t("common.yes") : t("common.no")}
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-1 col-span-2">
                                <Label className={cn("text-xs", !section.logisticHub && "text-muted-foreground/50")}>
                                  {t("line.locationGroup")}
                                </Label>
                                <Select
                                  value={section.locationGroupId || ""}
                                  onValueChange={(v) => updateSection(idx, "locationGroupId", v || null)}
                                  disabled={!section.logisticHub}
                                >
                                  <SelectTrigger className={cn("h-8 text-xs", !section.logisticHub && "opacity-50 cursor-not-allowed")}>
                                    <SelectValue placeholder={section.logisticHub ? "..." : t("line.hubDisabled")} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {locationGroups?.map((lg) => (
                                      <SelectItem key={lg.id} value={lg.id} className="text-xs">
                                        {lg.code} - {lg.description}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-1 flex items-end justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                                  onClick={() => removeSection(idx)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </div>
            )}

            {/* Save/Cancel */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={closeForm}>
                <X className="h-3.5 w-3.5" /> {t("common.cancel")}
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {t("common.save")}
              </Button>
            </div>
          </div>
        </FloatingPanel>
      )}

      {/* Filter fields */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">{t("common.code")}</Label>
          <Input
            placeholder={t("common.search")}
            className="h-8 text-xs"
            value={filters.code}
            onChange={(e) => setFilters((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("line.origin")}</Label>
          <LookupSearchField
            endpoint="Location"
            labelFn="codeOnly"
            searchFilterParam="Filter1String"
            value={filters.locationOrigId}
            onChange={(id) => setFilters((p) => ({ ...p, locationOrigId: id }))}
            placeholder={t("line.allOrigins")}
            nullable
            className="h-8 text-xs"
            modalVisibleColumns={LOCATION_MODAL_COLUMNS}
            columnLabels={LOCATION_COLUMN_LABELS}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("line.destination")}</Label>
          <LookupSearchField
            endpoint="Location"
            labelFn="codeOnly"
            searchFilterParam="Filter1String"
            value={filters.locationDestId}
            onChange={(id) => setFilters((p) => ({ ...p, locationDestId: id }))}
            placeholder={t("line.allDestinations")}
            nullable
            className="h-8 text-xs"
            modalVisibleColumns={LOCATION_MODAL_COLUMNS}
            columnLabels={LOCATION_COLUMN_LABELS}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("line.fleetGroup")}</Label>
          <Select value={filters.fleetGroupId} onValueChange={(v) => setFilters((p) => ({ ...p, fleetGroupId: v === "__all__" ? "" : v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t("line.allFleetGroups")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-xs text-muted-foreground">-- {t("common.selectAll")} --</SelectItem>
              {fleetGroups?.map((fg) => (
                <SelectItem key={fg.id} value={fg.id} className="text-xs">{lookupLabel(fg)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("line.tripType")}</Label>
          <Select value={filters.tripTypeId} onValueChange={(v) => setFilters((p) => ({ ...p, tripTypeId: v === "__all__" ? "" : v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t("line.allTripTypes")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-xs text-muted-foreground">-- {t("common.selectAll")} --</SelectItem>
              {tripTypes?.map((tt) => (
                <SelectItem key={tt.id} value={tt.id} className="text-xs">{lookupLabel(tt)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={handleSearch} disabled={isLoading} className="h-7 gap-1.5 text-xs">
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          {t("common.search")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setFilters(emptyFilters());
            setSearched(false);
          }}
          className="h-7 gap-1.5 text-xs"
        >
          <X className="h-3.5 w-3.5" /> {t("common.clear")}
        </Button>

        <div className="flex-1" />

        {searched && items && items.length > 0 && (
          <ExportDropdown
            fetchData={() => fetchAllForExport("Line", new URLSearchParams())}
            columns={[
              { key: "code", label: "Código" },
              { key: "origin", label: "Origem", format: (_, row) => {
                const o = row.locationOrig as Record<string, string> | null;
                return o ? `${o.code || ""}` : "--";
              }},
              { key: "destination", label: "Destino", format: (_, row) => {
                const d = row.locationDest as Record<string, string> | null;
                return d ? `${d.code || ""}` : "--";
              }},
              { key: "distance", label: "Distância" },
            ]}
            title={t("menu.line")}
          />
        )}
        <Button size="sm" onClick={openNew} className="h-7 text-xs gap-1">
          <Plus className="h-3.5 w-3.5" /> {t("common.new")}
        </Button>
      </div>

      {/* Results */}
      {searched && (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : isError ? (
              <div className="text-center py-12">
                <p className="text-destructive text-sm">{t("common.loadError")}: {error.message}</p>
              </div>
            ) : !items || items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">{t("common.noResults")}</p>
              </div>
            ) : (
              <>
                <div className="overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs cursor-pointer select-none" onClick={() => toggleSort("code")}>
                        <div className="flex items-center">{t("common.code")}<SortIcon colKey="code" /></div>
                      </TableHead>
                      <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs cursor-pointer select-none" onClick={() => toggleSort("locationOrig")}>
                        <div className="flex items-center">{t("line.origin")}<SortIcon colKey="locationOrig" /></div>
                      </TableHead>
                      <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs cursor-pointer select-none" onClick={() => toggleSort("locationDest")}>
                        <div className="flex items-center">{t("line.destination")}<SortIcon colKey="locationDest" /></div>
                      </TableHead>
                      <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs cursor-pointer select-none w-[100px]" onClick={() => toggleSort("fleetGroup")}>
                        <div className="flex items-center">{t("line.fleetGroup")}<SortIcon colKey="fleetGroup" /></div>
                      </TableHead>
                      <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs cursor-pointer select-none w-[100px]" onClick={() => toggleSort("tripType")}>
                        <div className="flex items-center">{t("line.tripType")}<SortIcon colKey="tripType" /></div>
                      </TableHead>
                      <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs cursor-pointer select-none w-[80px]" onClick={() => toggleSort("distance")}>
                        <div className="flex items-center">{t("line.distance")}<SortIcon colKey="distance" /></div>
                      </TableHead>
                      <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs cursor-pointer select-none w-[80px]" onClick={() => toggleSort("qtdLineSections")}>
                        <div className="flex items-center">{t("line.qtdSections")}<SortIcon colKey="qtdLineSections" /></div>
                      </TableHead>
                      <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs text-center w-24">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30 group h-6">
                        <TableCell className="whitespace-nowrap text-xs py-0.5 px-3 font-medium">{item.code || "--"}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{lookupCode(item.locationOrig)}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{lookupCode(item.locationDest)}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{lookupCode(item.fleetGroup)}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{lookupCode(item.tripType)}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{item.distance?.toFixed(2) || "--"}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{item.qtdLineSections || 0}</TableCell>
                        <TableCell className="text-center text-xs py-0.5 px-3">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title={t("line.copyLine")}
                              onClick={() => setCopyTarget(item)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
      )}


      {/* Copy confirmation dialog */}
      <AlertDialog open={!!copyTarget} onOpenChange={(open) => { if (!open && !copyLoading) setCopyTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("line.confirmCopy")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("line.confirmCopyDesc")}
              <br />
              <strong>{copyTarget?.code || ""}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={copyLoading}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={copyLoading}
              onClick={(e) => {
                e.preventDefault();
                handleCopyLine();
              }}
            >
              {copyLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("line.copyConfirmButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.confirmDeleteDesc")}
              <br />
              <strong>{deleteTarget?.code || ""}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget?.id) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default LinePage;