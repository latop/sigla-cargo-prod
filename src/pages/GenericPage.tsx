import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search, X, Loader2, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  Plus, Pencil, Trash2, Save, Check, Download, FileSpreadsheet, FileText,
  CalendarDays, Route, Link2, Truck, UserCheck, Users, Megaphone, UserMinus,
  FileUp, Sparkles, LayoutTemplate, Layers, Cpu, Container,
  Tag, ClipboardList, Zap, GitBranch, Building2, MapPin, Globe2,
  User, Car, FolderTree, Boxes, CircleDot,
  Scale, Milestone, Map, Waypoints, FileBarChart,
  Landmark, Flag, Clock, Timer, Navigation,
} from "lucide-react";
import { DatePickerField } from "@/components/DatePickerField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import { useToast } from "@/hooks/use-toast";
import { FloatingPanel } from "@/components/FloatingPanel";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/config/api";
import { entitySchemas, FieldSchema, FilterSchema, getLookupLabel } from "@/config/entitySchemas";
import { LookupSearchField } from "@/components/LookupSearchField";
import clientLogo from "@/assets/client-logo.png";
import siglaLogo from "@/assets/logo-sigla-cargo.png";

// --- Route maps (for non-schema pages) ---
const routeToKey: Record<string, string> = {
  "/daily-trip": "menu.dailyTrip",
  "/daily-trips-schedule": "menu.dailyTripsSchedule",
  "/departures-and-arrivals": "menu.departuresAndArrivals",
  "/vehicle-link": "menu.vehicleLink",
  "/drivers-request": "menu.driversRequest",
  "/drivers-schedule": "menu.driversSchedule",
  "/publish-journey": "menu.publishJourney",
  "/release-driver": "menu.releaseDriver",
  "/import-trips": "menu.importTrips",
  "/new-trip-optimization": "menu.newTripOptimization",
  "/planning-model": "menu.planningModel",
  "/scenarios": "menu.scenarios",
  "/trip-optimization": "menu.tripOptimization",
  "/vehicle-planning": "menu.vehiclePlanning",
  "/activity-truck": "menu.activityTruck",
  "/attribution": "menu.attribution",
  "/city": "menu.city",
  "/company": "menu.company",
  "/country": "menu.country",
  "/fleet-brand": "menu.fleetBrand",
  "/fleet-group": "menu.fleetGroup",
  "/fleet-model": "menu.fleetModel",
  "/fleet-type": "menu.fleetType",
  "/justification": "menu.justification",
  "/line": "menu.line",
  "/location-group": "menu.locationGroup",
  "/location-type": "menu.locationType",
  "/location": "menu.location",
  "/position": "menu.position",
  "/region": "menu.region",
  "/responsible-sector": "menu.responsibleSector",
  "/state": "menu.state",
  "/stop-type": "menu.stopType",
  "/regulation-rule": "menu.regulationRule",
  "/timezone-value": "menu.timezoneValue",
  "/timezone": "menu.timezone",
  "/trip-type": "menu.tripType",
  "/truck": "menu.truck",
};

const routeToEndpoint: Record<string, string> = {
  "/daily-trip": "DailyTrip",
  "/daily-trips-schedule": "DailyTripsSchedule",
  "/departures-and-arrivals": "DeparturesAndArrivals",
  "/vehicle-link": "VehicleLink",
  "/drivers-request": "DriversRequest",
  "/drivers-schedule": "DriversSchedule",
  "/publish-journey": "PublishJourney",
  "/release-driver": "ReleaseDriver",
  "/import-trips": "ImportTrips",
  "/new-trip-optimization": "NewTripOptimization",
  "/planning-model": "PlanningModel",
  "/scenarios": "Scenarios",
  "/trip-optimization": "TripOptimization",
  "/vehicle-planning": "VehiclePlanning",
  "/activity-truck": "ActivityTruck",
  "/attribution": "Attribution",
  "/city": "Cities",
  "/company": "Companies",
  "/country": "Countries",
  "/fleet-brand": "FleetBrand",
  "/fleet-group": "FleetGroup",
  "/fleet-model": "FleetModel",
  "/fleet-type": "FleetType",
  "/justification": "Justification",
  "/line": "Line",
  "/location-group": "LocationGroup",
  "/location-type": "LocationType",
  "/location": "Location",
  "/position": "Position",
  "/region": "Regions",
  "/responsible-sector": "ResponsibleSector",
  "/state": "States",
  "/stop-type": "StopType",
  "/regulation-rule": "RegulationRule",
  "/timezone-value": "TimezoneValue",
  "/timezone": "Timezone",
  "/trip-type": "TripType",
  "/truck": "Truck",
};

const routeToIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  "/daily-trip": CalendarDays, "/daily-trips-schedule": Route, "/vehicle-link": Link2,
  "/departures-and-arrivals": Truck, "/release-driver": UserMinus,
  "/drivers-request": UserCheck, "/drivers-schedule": Users, "/publish-journey": Megaphone,
  "/import-trips": FileUp, "/import-map": Map,
  "/new-trip-optimization": Sparkles, "/planning-model": LayoutTemplate, "/scenarios": Layers,
  "/trip-optimization": Cpu, "/vehicle-planning": Truck,
  "/activity-truck": Container, "/activity-type": Tag, "/activity": ClipboardList,
  "/attribution": GitBranch, "/city": Building2, "/company": Landmark, "/country": Globe2,
  "/driver": User, "/fleet-brand": Car, "/fleet-group": FolderTree, "/fleet-model": Boxes,
  "/fleet-type": CircleDot, "/justification": Scale, "/line": Milestone,
  "/location-group": Map, "/location-type": Waypoints, "/location": MapPin,
  "/position": Navigation, "/region": Flag, "/responsible-sector": Zap,
  "/state": Map, "/stop-type": CircleDot, "/regulation-rule": Scale, "/timezone-value": Timer,
  "/timezone": Clock, "/trip-type": Route, "/truck": Truck,
  "/reports": FileBarChart,
};

type Rec = Record<string, unknown>;

// --- Color conversion helpers (decimal RGB ↔ hex) ---
const decimalToHex = (dec: number): string => {
  const hex = Math.abs(Math.round(dec)).toString(16).padStart(6, "0");
  return `#${hex}`;
};
const hexToDecimal = (hex: string): number => {
  return parseInt(hex.replace("#", ""), 16);
};

// --- Pagination types ---
interface PaginationMeta {
  TotalCount: number;
  PageSize: number;
  CurrentPage: number;
  TotalPages: number;
  HasNext: boolean;
  HasPrevious: boolean;
}

interface PaginatedResult {
  items: Rec[];
  pagination: PaginationMeta;
}

// --- API helpers ---
const apiFetchPaginated = async (
  endpoint: string,
  params: URLSearchParams,
  pageNumber: number,
  pageSize: number,
): Promise<PaginatedResult> => {
  params.set("PageNumber", String(pageNumber));
  params.set("PageSize", String(pageSize));
  const url = `${API_BASE}/${endpoint}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const items: Rec[] = await res.json();
  const paginationHeader = res.headers.get("x-pagination");
  const pagination: PaginationMeta = paginationHeader
    ? JSON.parse(paginationHeader)
    : { TotalCount: items.length, PageSize: pageSize, CurrentPage: pageNumber, TotalPages: 1, HasNext: false, HasPrevious: false };
  return { items, pagination };
};

const apiFetchAll = async (endpoint: string): Promise<Rec[]> => {
  const res = await fetch(`${API_BASE}/${endpoint}?PageSize=999`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [data];
};

const apiCreate = async (endpoint: string, data: Rec): Promise<Rec> => {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const apiUpdate = async (endpoint: string, data: Rec): Promise<Rec> => {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const apiDelete = async (endpoint: string, id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/${endpoint}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
};

// --- Helpers ---
const getCellDisplay = (row: Rec, field: FieldSchema, lookups: Record<string, Rec[]>, t?: (key: string) => string): string => {
  if (field.type === "select" && field.options) {
    const v = String(row[field.key] ?? "");
    const opt = field.options.find((o) => o.value === v);
    if (!opt) return String(row[field.key] ?? "--");
    const label = opt.label;
    return (t && label.includes(".")) ? t(label) : label;
  }
  if (field.type === "lookup") {
    const labelFn = field.tableLabelFn || field.lookupLabelFn || "codeDescription";
    const objKey = field.key.replace(/Id$/, "");
    const obj = row[objKey] as Rec | null | undefined;
    if (obj) {
      return getLookupLabel(obj, labelFn);
    }
    if (field.lookupEndpoint && lookups[field.lookupEndpoint]) {
      const found = lookups[field.lookupEndpoint].find((i) => i.id === row[field.key]);
      if (found) return getLookupLabel(found, labelFn);
    }
    return "--";
  }
  if (field.type === "datetime" || field.type === "date") {
    const v = row[field.key];
    if (!v) return "--";
    try {
      if (field.type === "date") {
        return new Date(String(v)).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
      }
      return new Date(String(v)).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return String(v);
    }
  }
  const v = row[field.key];
  if (v === null || v === undefined) return "--";
  return String(v);
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const GenericPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { toast } = useToast();

  // Capture the path at mount time so keep-alive tabs don't react to other tabs' navigation
  const [mountedPath] = useState(() => location.pathname);
  const currentPath = mountedPath;

  const schema = entitySchemas[currentPath];
  const titleKey = schema?.titleKey || routeToKey[currentPath] || "dashboard.title";
  const endpoint = schema?.endpoint || routeToEndpoint[currentPath] || "";

  usePageTitle(t(titleKey), routeToIcon[currentPath]);
  const hasSchemaFilters = !!(schema?.filters && schema.filters.length > 0);
  const isSimpleEntity = !!schema && !hasSchemaFilters;

  // Filters & pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [localFilter, setLocalFilter] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [searched, setSearched] = useState(false);
  const [searchSnapshot, setSearchSnapshot] = useState<Record<string, string>>({});
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isExporting, setIsExporting] = useState(false);

  // Sort state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // CRUD state
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<Rec | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Rec>({});
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  // Collect unique lookup endpoints from both fields and filters (exclude largeLookup)
  const lookupEndpoints = useMemo(() => {
    if (!schema) return [];
    const fieldEndpoints = schema.fields
      .filter((f) => f.type === "lookup" && f.lookupEndpoint && !f.largeLookup)
      .map((f) => f.lookupEndpoint!);
    const filterEndpoints = (schema.filters || [])
      .filter((f) => f.type === "lookup" && f.lookupEndpoint && !f.largeLookup)
      .map((f) => f.lookupEndpoint!);
    return [...new Set([...fieldEndpoints, ...filterEndpoints])];
  }, [schema]);

  // Build filter params from snapshot
  const buildFilterParams = (snapshot: Record<string, string>): URLSearchParams => {
    const params = new URLSearchParams();
    if (hasSchemaFilters && schema?.filters) {
      schema.filters.forEach((f) => {
        const val = snapshot[f.paramName];
        if (val && val.trim()) {
          params.append(f.paramName, val);
        }
      });
    }
    return params;
  };

  // Fetch main data with server-side pagination
  const { data: paginatedResult, isLoading, isError, error, refetch } = useQuery<PaginatedResult>({
    queryKey: ["generic", endpoint, JSON.stringify(searchSnapshot), pageNumber, pageSize, searchTrigger],
    queryFn: () => apiFetchPaginated(endpoint, buildFilterParams(searchSnapshot), pageNumber, pageSize),
    enabled: searched,
  });

  const rawItems = paginatedResult?.items || [];
  const pagination = paginatedResult?.pagination;

  // Local filtering for simple entities (after data is loaded)
  const filteredItems = useMemo(() => {
    if (!isSimpleEntity || !localFilter.trim()) return rawItems;
    const term = localFilter.toLowerCase();
    const visibleFields = schema?.fields.filter((f) => !f.hideInTable) || [];
    return rawItems.filter((row) =>
      visibleFields.some((f) => {
        if (f.type === "lookup") {
          const objKey = f.key.replace(/Id$/, "");
          const obj = row[objKey] as Rec | null | undefined;
          if (obj) {
            const label = getLookupLabel(obj, f.tableLabelFn || f.lookupLabelFn || "codeDescription");
            return label.toLowerCase().includes(term);
          }
        }
        const v = row[f.key];
        if (v === null || v === undefined) return false;
        return String(v).toLowerCase().includes(term);
      }),
    );
  }, [rawItems, localFilter, isSimpleEntity, schema]);

  // Sort items by column
  const items = useMemo(() => {
    if (!sortColumn) return filteredItems;
    const col = schema?.fields.find((f) => f.key === sortColumn);
    return [...filteredItems].sort((a, b) => {
      let valA: unknown;
      let valB: unknown;
      if (col?.nestedPath) {
        const parts = col.nestedPath.split(".");
        valA = parts.reduce((obj: unknown, k) => (obj as Rec)?.[k], a);
        valB = parts.reduce((obj: unknown, k) => (obj as Rec)?.[k], b);
      } else if (col?.displayOnly && col?.nestedPath) {
        const parts = col.nestedPath.split(".");
        valA = parts.reduce((obj: unknown, k) => (obj as Rec)?.[k], a);
        valB = parts.reduce((obj: unknown, k) => (obj as Rec)?.[k], b);
      } else {
        valA = a[sortColumn];
        valB = b[sortColumn];
      }
      if (valA === null || valA === undefined) valA = "";
      if (valB === null || valB === undefined) valB = "";
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      const numA = Number(valA);
      const numB = Number(valB);
      let cmp: number;
      if (!isNaN(numA) && !isNaN(numB) && String(valA) !== "" && String(valB) !== "") {
        cmp = numA - numB;
      } else {
        cmp = strA.localeCompare(strB, "pt-BR");
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredItems, sortColumn, sortDirection, schema]);
  const totalPages = pagination?.TotalPages || 1;
  const totalCount = pagination?.TotalCount || 0;

  // Fetch all lookups
  const { data: lookups = {} } = useQuery<Record<string, Rec[]>>({
    queryKey: ["lookups", ...lookupEndpoints],
    queryFn: async () => {
      const results: Record<string, Rec[]> = {};
      await Promise.all(
        lookupEndpoints.map(async (ep) => {
          try {
            const items = await apiFetchAll(ep);
            // Sort lookup items alphabetically by label
            items.sort((a, b) => {
              const labelA = getLookupLabel(a, "codeName").toLowerCase();
              const labelB = getLookupLabel(b, "codeName").toLowerCase();
              return labelA.localeCompare(labelB);
            });
            results[ep] = items;
          } catch {
            results[ep] = [];
          }
        }),
      );
      return results;
    },
    enabled: lookupEndpoints.length > 0,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (payload: Rec) =>
      payload.id ? apiUpdate(endpoint, payload) : apiCreate(endpoint, payload),
    onSuccess: () => {
      toast({ title: t("common.saveSuccess") || "Salvo com sucesso!", variant: "success" });
      closeForm();
      refetch();
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "error" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(endpoint, id),
    onSuccess: () => {
      toast({ title: t("common.deleteSuccess") || "Excluído com sucesso!", variant: "success" });
      setDeleteId(null);
      refetch();
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "error" });
    },
  });

  // Handlers
  const handleSearch = () => {
    // Validate minChars on string filters
    if (schema?.filters) {
      for (const filter of schema.filters) {
        if (filter.minChars && filter.type === "string") {
          const val = filterValues[filter.paramName] || "";
          if (val.length > 0 && val.length < filter.minChars) {
            toast({ title: `"${filter.label}" requer no mínimo ${filter.minChars} caracteres.`, variant: "destructive" });
            return;
          }
        }
      }
    }
    setSearchSnapshot({ ...filterValues });
    setSearchTrigger(prev => prev + 1);
    setSearched(true);
    setPageNumber(1);
  };

  const handleClear = () => {
    setSearchTerm("");
    setLocalFilter("");
    setFilterValues({});
    setSearchSnapshot({});
    setSearchTrigger(0);
    setSearched(false);
    setPageNumber(1);
  };

  // Export helpers
  const handleExport = async (format: "excel" | "pdf") => {
    if (!schema || !endpoint) return;
    setIsExporting(true);
    try {
      const params = buildFilterParams(searchSnapshot);
      params.set("PageSize", "99999");
      params.set("PageNumber", "1");
      const url = `${API_BASE}/${endpoint}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const allItems: Rec[] = await res.json();
      const visibleFields = schema.fields.filter((f) => !f.hideInTable);

      if (format === "excel") {
        const XLSX = await import("xlsx");
        const rows = allItems.map((row) =>
          Object.fromEntries(visibleFields.map((f) => [f.label, getCellDisplay(row, f, lookups, t)])),
        );
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t(titleKey));
        XLSX.writeFile(wb, `${t(titleKey)}.xlsx`);
      } else {
        const { default: jsPDF } = await import("jspdf");
        const autoTable = (await import("jspdf-autotable")).default;

        const headers = visibleFields.map((f) => f.label);
        const rows = allItems.map((row) => visibleFields.map((f) => getCellDisplay(row, f, lookups, t)));
        const title = t(titleKey);
        const now = new Date().toLocaleString("pt-BR");

        // Build filter description
        const filterDesc: string[] = [];
        if (hasSchemaFilters && schema.filters) {
          schema.filters.forEach((f) => {
            const val = searchSnapshot[f.paramName];
            if (val && val.trim()) {
              if (f.type === "lookup" && f.lookupEndpoint && lookups[f.lookupEndpoint]) {
                const found = lookups[f.lookupEndpoint].find((i) => String(i.id) === val);
                if (found) {
                  filterDesc.push(`${f.label}: ${getLookupLabel(found, f.lookupLabelFn || "codeDescription")}`);
                  return;
                }
              }
              filterDesc.push(`${f.label}: ${val}`);
            }
          });
        }

        // Helper to load image as base64
        const loadImageBase64 = (src: string): Promise<string> =>
          new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              canvas.getContext("2d")!.drawImage(img, 0, 0);
              resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = () => resolve("");
            img.src = src;
          });

        const [clientLogoB64, siglaLogoB64] = await Promise.all([
          loadImageBase64(clientLogo),
          loadImageBase64(siglaLogo),
        ]);

        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const addHeaderFooter = (pageNum: number, totalPages: number) => {
          // Header background
          doc.setFillColor(245, 245, 245);
          doc.rect(0, 0, pageWidth, 22, "F");
          doc.setDrawColor(200, 200, 200);
          doc.line(0, 22, pageWidth, 22);

          // Client logo (left)
          if (clientLogoB64) {
            try { doc.addImage(clientLogoB64, "PNG", 8, 3, 0, 16); } catch { /* skip */ }
          }
          // Title (center)
          doc.setFontSize(13);
          doc.setFont("helvetica", "bold");
          doc.text(title, pageWidth / 2, 10, { align: "center" });

          // Filters below title
          if (filterDesc.length > 0) {
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.text(filterDesc.join("  |  "), pageWidth / 2, 16, { align: "center" });
          }

          // SIGLA logo (right)
          if (siglaLogoB64) {
            try { doc.addImage(siglaLogoB64, "PNG", pageWidth - 50, 3, 40, 16); } catch { /* skip */ }
          }

          // Footer
          doc.setDrawColor(200, 200, 200);
          doc.line(8, pageHeight - 10, pageWidth - 8, pageHeight - 10);
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.text(`Emitido em: ${now}`, 8, pageHeight - 6);
          doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - 8, pageHeight - 6, { align: "right" });
        };

        // Generate table
        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: 25,
          margin: { top: 25, bottom: 15 },
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [41, 65, 122], textColor: 255, fontStyle: "bold", fontSize: 7 },
          alternateRowStyles: { fillColor: [248, 248, 248] },
          didDrawPage: () => {
            // Will add header/footer after all pages are drawn
          },
        });

        // Add header/footer to all pages
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          addHeaderFooter(i, totalPages);
        }

        doc.save(`${title}.pdf`);
      }
      toast({ title: `Exportação ${format === "excel" ? "Excel" : "PDF"} concluída!`, variant: "success" });
    } catch (err) {
      toast({ title: "Erro na exportação", description: (err as Error).message, variant: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFilterKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const openCreate = () => {
    const initial: Rec = {};
    schema?.fields.forEach((f) => {
      if (f.displayOnly) return;
      if (f.type === "boolean") initial[f.key] = false;
      else if (f.type === "number") initial[f.key] = null;
      else if (f.type === "color") initial[f.key] = "#000000";
      else initial[f.key] = "";
    });
    setFormData(initial);
    setFormErrors({});
    setEditingItem(null);
    setIsCreating(true);
  };

  const openEdit = (item: Rec) => {
    const initial: Rec = { id: item.id };
    schema?.fields.forEach((f) => {
      if (f.displayOnly) return;
      let val = item[f.key] ?? (f.type === "boolean" ? false : "");
      // Convert decimal RGB to hex for color fields
      if (f.type === "color" && f.colorFormat === "decimal" && typeof val === "number") {
        val = decimalToHex(val);
      }
      initial[f.key] = val;
    });
    setFormData(initial);
    setFormErrors({});
    setEditingItem(item);
    setIsCreating(true);
  };

  const closeForm = () => {
    setIsCreating(false);
    setEditingItem(null);
  };

  const handleSave = () => {
    if (!schema) return;
    const errors: Record<string, boolean> = {};
    schema.fields.forEach((f) => {
      if (!f.required || f.displayOnly) return;
      const v = formData[f.key];
      if (f.type === "string" || f.type === "color" || f.type === "lookup" || f.type === "datetime" || f.type === "date" || f.type === "select") {
        if (v == null || !String(v).trim()) errors[f.key] = true;
      }
      if (f.type === "number" && (v === null || v === undefined || v === "")) errors[f.key] = true;
    });
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({ title: t("common.requiredFields") || "Preencha os campos obrigatórios.", variant: "destructive" });
      return;
    }
    setFormErrors({});

    const payload: Rec = {};
    schema.fields.forEach((f) => {
      if (f.displayOnly) return;
      let val = formData[f.key];
      // Convert hex to decimal for color fields with decimal format
      if (f.type === "color" && f.colorFormat === "decimal" && typeof val === "string" && val.startsWith("#")) {
        val = hexToDecimal(val);
      }
      // Convert empty strings to null for non-required (nullable) fields
      if (!f.required && (val === "" || val === undefined)) {
        // For lookup (GUID) fields, omit entirely instead of sending null
        if (f.type === "lookup") return;
        payload[f.key] = null;
      } else {
        payload[f.key] = val;
      }
    });
    if (formData.id) payload.id = formData.id;
    saveMutation.mutate(payload);
  };

  const updateField = (key: string, value: unknown, item?: Record<string, unknown>) => {
    setFormData((p) => {
      const next = { ...p, [key]: value };
      // Auto-fill related fields when city is selected (company form)
      if (key === "cityId" && item && schema?.endpoint === "Companies") {
        if (item.stateId) next.stateId = item.stateId;
        if (item.countryId) next.countryId = item.countryId;
        // state may have regionId
        const state = item.state as Record<string, unknown> | null;
        if (state?.regionId) next.regionId = state.regionId;
      }
      return next;
    });
  };

  // Table columns
  const columns = useMemo(() => {
    if (schema) return schema.fields.filter((f) => !f.hideInTable);
    if (!items || items.length === 0) return [];
    return Object.keys(items[0])
      .filter((k) => {
        const val = items[0][k];
        return val === null || typeof val !== "object";
      })
      .map((k) => ({ key: k, label: k, type: "string" as const }));
  }, [schema, items]);

  // Page numbers
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (pageNumber > 3) pages.push("ellipsis");
      for (let i = Math.max(2, pageNumber - 1); i <= Math.min(totalPages - 1, pageNumber + 1); i++) pages.push(i);
      if (pageNumber < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  // Form title
  const panelTitle = schema
    ? editingItem
      ? `${t("common.edit")} ${t(titleKey)}`
      : `${schema.feminine ? "Nova" : "Novo"} ${t(titleKey)}`
    : "";

  const hasCustomLayout = schema?.fields.some((f) => f.formColSpan !== undefined);
  const regularFields = hasCustomLayout
    ? schema?.fields.filter((f) => f.type !== "boolean" && !f.displayOnly) || []
    : schema?.fields.filter((f) => f.type !== "boolean" && !f.displayOnly) || [];
  const booleanFields = hasCustomLayout
    ? schema?.fields.filter((f) => f.type === "boolean" && !f.formColSpan && !f.displayOnly) || []
    : schema?.fields.filter((f) => f.type === "boolean" && !f.displayOnly) || [];
  const inlineBooleanFields = hasCustomLayout
    ? schema?.fields.filter((f) => f.type === "boolean" && f.formColSpan && !f.displayOnly) || []
    : [];
  const allFormFields = hasCustomLayout
    ? schema?.fields.filter((f) => !f.displayOnly) || []
    : [];

  // --- Render form field ---
  const renderField = (field: FieldSchema) => {
    const errClass = formErrors[field.key] ? "border-destructive" : "";

    switch (field.type) {
      case "string": {
        // Plate mask: AAA-#A## (Mercosul)
        if (field.mask === "plate") {
          const applyPlateMask = (input: string): string => {
            const raw = input.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 7);
            if (raw.length <= 3) return raw.replace(/[^A-Z]/g, "");
            const letters = raw.slice(0, 3).replace(/[^A-Z]/g, "");
            const rest = raw.slice(3);
            if (rest.length === 0) return letters + "-";
            // Pattern: L L L - D L D D
            let masked = letters + "-";
            const pattern = [/\d/, /[A-Z]/, /\d/, /\d/];
            for (let i = 0; i < rest.length && i < 4; i++) {
              if (pattern[i].test(rest[i])) masked += rest[i];
              else break;
            }
            return masked;
          };
          return (
            <Input
              value={String(formData[field.key] ?? "")}
              onChange={(e) => updateField(field.key, applyPlateMask(e.target.value))}
              maxLength={8}
              placeholder="AAA-0A00"
              className={`h-8 text-xs ${errClass}`}
            />
          );
        }
        // Year mask: 4 digits only
        if (field.mask === "year") {
          return (
            <Input
              value={String(formData[field.key] ?? "")}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                updateField(field.key, digits || null);
              }}
              maxLength={4}
              placeholder="AAAA"
              className={`h-8 text-xs ${errClass}`}
            />
          );
        }
        return (
          <Input
            value={String(formData[field.key] ?? "")}
            onChange={(e) =>
              updateField(field.key, field.uppercase ? e.target.value.toUpperCase() : e.target.value)
            }
            maxLength={field.maxLength}
            placeholder={field.label}
            className={`h-8 text-xs ${errClass}`}
          />
        );
      }
      case "number":
        return (
          <Input
            type="number"
            value={formData[field.key] === null || formData[field.key] === undefined ? "" : String(formData[field.key])}
            onChange={(e) => updateField(field.key, e.target.value ? Number(e.target.value) : null)}
            placeholder={field.label}
            className={`h-8 text-xs ${errClass}`}
          />
        );
      case "color":
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={String(formData[field.key] || "#000000")}
              onChange={(e) => updateField(field.key, e.target.value)}
              className="h-8 w-12 rounded border border-input cursor-pointer"
            />
            <Input
              value={String(formData[field.key] || "")}
              onChange={(e) => updateField(field.key, e.target.value)}
              placeholder="#000000"
              className={`h-8 text-xs flex-1 ${errClass}`}
            />
          </div>
        );
      case "lookup": {
        if (field.largeLookup && field.lookupEndpoint) {
          return (
            <LookupSearchField
              endpoint={field.lookupEndpoint}
              labelFn={field.lookupLabelFn || "codeName"}
              searchFilterParam={field.searchFilterParam || "Filter1String"}
              value={formData[field.key] ? String(formData[field.key]) : ""}
              onChange={(id, item) => updateField(field.key, id || null, item)}
              placeholder={field.label}
              nullable={!!field.nullable}
              hasError={!!formErrors[field.key]}
            />
          );
        }
        const lookupItems = (field.lookupEndpoint && lookups[field.lookupEndpoint]) || [];
        return (
          <Select
            value={formData[field.key] ? String(formData[field.key]) : ""}
            onValueChange={(v) => updateField(field.key, v)}
          >
            <SelectTrigger className={`h-8 text-xs ${errClass}`}>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {field.nullable && (
                <SelectItem value="__none__" className="text-xs text-muted-foreground">
                  -- Nenhum --
                </SelectItem>
              )}
              {lookupItems.map((item) => (
                <SelectItem key={String(item.id)} value={String(item.id)} className="text-xs">
                  {getLookupLabel(item, field.lookupLabelFn || "codeDescription")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case "datetime":
        return (
          <DatePickerField
            value={formData[field.key] ? String(formData[field.key]) : null}
            onChange={(v) => updateField(field.key, v || "")}
            includeTime
            hasError={!!errClass}
          />
        );
      case "date":
        return (
          <DatePickerField
            value={formData[field.key] ? String(formData[field.key]) : null}
            onChange={(v) => updateField(field.key, v || "")}
            includeTime={false}
            hasError={!!errClass}
          />
        );
      case "select": {
        const opts = field.options || [];
        return (
          <Select
            value={formData[field.key] != null && formData[field.key] !== "" ? String(formData[field.key]) : ""}
            onValueChange={(v) => {
              const allNumeric = opts.every((o) => /^\d+$/.test(o.value));
              updateField(field.key, allNumeric ? Number(v) : v);
            }}
          >
            <SelectTrigger className={`h-8 text-xs ${errClass}`}>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {opts.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label.includes(".") ? t(o.label) : o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      default:
        return null;
    }
  };

  // --- Render filter field ---
  const renderFilterField = (filter: FilterSchema) => {
    if (filter.type === "lookup") {
      if (filter.largeLookup && filter.lookupEndpoint) {
        return (
          <LookupSearchField
            endpoint={filter.lookupEndpoint}
            labelFn={filter.lookupLabelFn || "codeName"}
            searchFilterParam={filter.searchFilterParam || "Filter1String"}
            value={filterValues[filter.paramName] || ""}
            onChange={(id, item) => {
              if (filter.sendName && item) {
                const name = (item.name as string) || "";
                setFilterValues((p) => ({ ...p, [filter.paramName]: name }));
              } else {
                setFilterValues((p) => ({ ...p, [filter.paramName]: id }));
              }
            }}
            placeholder={filter.label}
            nullable
            displayAsText={!!filter.sendName}
          />
        );
      }
      const filterItems = (filter.lookupEndpoint && lookups[filter.lookupEndpoint]) || [];
      return (
        <Select
          value={filterValues[filter.paramName] || ""}
          onValueChange={(v) =>
            setFilterValues((p) => ({ ...p, [filter.paramName]: v === "__all__" ? "" : v }))
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Todos..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs text-muted-foreground">
              -- Todos --
            </SelectItem>
            {filterItems.map((item) => (
              <SelectItem key={String(item.id)} value={String(item.id)} className="text-xs">
                {getLookupLabel(item, filter.lookupLabelFn || "codeDescription")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (filter.type === "bool") {
      const currentVal = filterValues[filter.paramName] || "";
      return (
        <div className="flex items-center gap-1 h-8">
          {[
            { value: "", label: "Todos" },
            { value: "true", label: "Sim" },
            { value: "false", label: "Não" },
          ].map((opt) => (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={currentVal === opt.value ? "default" : "outline"}
              className="h-7 px-3 text-xs flex-1"
              onClick={() =>
                setFilterValues((p) => ({ ...p, [filter.paramName]: opt.value }))
              }
            >
              {opt.label}
            </Button>
          ))}
        </div>
      );
    }
    if (filter.type === "select" && filter.options) {
      return (
        <Select
          value={filterValues[filter.paramName] || ""}
          onValueChange={(v) =>
            setFilterValues((p) => ({ ...p, [filter.paramName]: v === "__all__" ? "" : v }))
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Todos..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs text-muted-foreground">-- Todos --</SelectItem>
            {filter.options.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    const forceUpper = filter.uppercase !== false;
    return (
      <Input
        value={filterValues[filter.paramName] || ""}
        onChange={(e) =>
          setFilterValues((p) => ({ ...p, [filter.paramName]: forceUpper ? e.target.value.toUpperCase() : e.target.value }))
        }
        onKeyDown={handleFilterKeyDown}
        placeholder={`${filter.label}...`}
        className="h-8 text-xs"
      />
    );
  };

  // --- Render table cell ---
  const renderCell = (row: Rec, field: FieldSchema | { key: string; label: string; type: string }) => {
    // Handle displayOnly fields with nestedPath
    if ("nestedPath" in field && (field as FieldSchema).nestedPath) {
      const parts = (field as FieldSchema).nestedPath!.split(".");
      let val: unknown = row;
      for (const p of parts) {
        val = (val as Rec)?.[p];
      }
      return val != null ? String(val) : "--";
    }
    if ("lookupEndpoint" in field && field.type === "lookup") {
      return <span>{getCellDisplay(row, field as FieldSchema, lookups, t)}</span>;
    }
    if (field.type === "boolean") {
      const v = row[field.key];
      return v ? (
        <Check className="h-3.5 w-3.5 text-primary mx-auto" />
      ) : (
        <X className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto" />
      );
    }
    if (field.type === "color") {
      let c = row[field.key];
      // Convert decimal to hex for display
      if ("colorFormat" in field && (field as FieldSchema).colorFormat === "decimal" && typeof c === "number") {
        c = decimalToHex(c);
      }
      return (
        <span
          className="inline-block h-4 w-4 rounded-full border border-border mx-auto"
          style={{ backgroundColor: String(c || "#ccc") }}
          title={String(c || "")}
        />
      );
    }
    if (field.type === "datetime" || field.type === "date") {
      const v = row[field.key];
      if (!v) return "--";
      try {
        if (field.type === "date") {
          return new Date(String(v)).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
        }
        return new Date(String(v)).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
      } catch {
        return String(v);
      }
    }
    // Handle select fields with options
    if ("options" in field && (field as FieldSchema).options) {
      const v = String(row[field.key] ?? "");
      const opt = (field as FieldSchema).options!.find((o) => o.value === v);
      if (opt) {
        const label = opt.label;
        const displayLabel = (label.includes(".")) ? t(label) : label;
        const colorMap = (field as FieldSchema).badgeColorMap;
        if (colorMap) {
          const cls = colorMap[v] || "bg-muted text-muted-foreground border-border";
          return (
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase", cls)}>
              {displayLabel}
            </span>
          );
        }
        return displayLabel;
      }
    }
    const v = row[field.key];
    if (v === null || v === undefined) return "--";
    if (typeof v === "boolean") return v ? "✓" : "✗";
    return String(v);
  };

  return (
    <div className="space-y-4">
      {/* Floating CRUD Form */}
      {schema && isCreating && (
        <FloatingPanel title={panelTitle} onClose={closeForm} width={schema.formWidth || 560}>
          <div className="space-y-2 pt-2">
            {hasCustomLayout ? (
              <div className="grid grid-cols-6 gap-2">
                {allFormFields.map((f) => {
                  const span = f.formColSpan || 2;
                  if (f.type === "boolean") {
                    return (
                      <div key={f.key} className="space-y-1.5" style={{ gridColumn: `span ${span}` }}>
                        <Label className="text-xs">{f.label.includes(".") ? t(f.label) : f.label}</Label>
                        <div className="pt-0.5">
                          <Switch
                            checked={!!formData[f.key]}
                            onCheckedChange={(v) => updateField(f.key, v)}
                          />
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={f.key} className="space-y-1" style={{ gridColumn: `span ${f.formColSpan || (f.type === "color" ? 6 : span)}` }}>
                      <Label className="text-xs">
                        {f.label.includes(".") ? t(f.label) : f.label} {f.required && <span className="text-destructive">*</span>}
                      </Label>
                      {renderField(f)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {regularFields.map((f) => {
                    const span = f.formColSpan === 0.5 ? 1 : (f.formColSpan || 2);
                    return (
                      <div key={f.key} className="space-y-1" style={{ gridColumn: `span ${f.type === "color" ? 4 : span}` }}>
                        <Label className="text-xs">
                          {f.label} {f.required && <span className="text-destructive">*</span>}
                        </Label>
                        {renderField(f)}
                      </div>
                    );
                  })}
                </div>
                {booleanFields.length > 0 && (
                  <div className={`grid gap-2 ${booleanFields.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {booleanFields.map((f) => (
                      <div key={f.key} className="flex items-center justify-between rounded-md border px-2 py-1.5">
                        <Label className="text-xs">{f.label.includes(".") ? t(f.label) : f.label}</Label>
                        <Switch
                          checked={!!formData[f.key]}
                          onCheckedChange={(v) => updateField(f.key, v)}
                          className="scale-75"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={closeForm}>
                {t("common.cancel")}
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                )}
                {t("common.save")}
              </Button>
            </div>
          </div>
        </FloatingPanel>
      )}

      {/* Schema filters (above toolbar buttons) */}
      {hasSchemaFilters && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 items-end">
          {(() => {
            const filters = schema!.filters!;
            const elements: React.ReactNode[] = [];
            let i = 0;
            while (i < filters.length) {
              const filter = filters[i];
              // Group adjacent colSpan=0.5 filters into one cell
              if (filter.colSpan === 0.5 && i + 1 < filters.length && filters[i + 1].colSpan === 0.5) {
                const filter2 = filters[i + 1];
                elements.push(
                  <div key={filter.paramName + "-group"} className="flex gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <Label className="text-xs">{filter.label}</Label>
                      {renderFilterField(filter)}
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <Label className="text-xs">{filter2.label}</Label>
                      {renderFilterField(filter2)}
                    </div>
                  </div>
                );
                i += 2;
              } else {
                elements.push(
                  <div
                    key={filter.paramName}
                    className="space-y-1"
                    style={filter.colSpan && filter.colSpan >= 1 ? { gridColumn: `span ${filter.colSpan}` } : undefined}
                  >
                    <Label className="text-xs">{filter.label}</Label>
                    {renderFilterField(filter)}
                  </div>
                );
                i++;
              }
            }
            return elements;
          })()}
        </div>
      )}

      {/* Toolbar: all in one line */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Left side */}
        {searched && rawItems.length > 0 && isSimpleEntity && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filtrar resultados..."
              className="h-7 pl-8 text-xs w-52"
              value={localFilter}
              onChange={(e) => setLocalFilter(e.target.value)}
            />
            {localFilter && (
              <button
                onClick={() => setLocalFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        )}
        <Button size="sm" onClick={handleSearch} disabled={isLoading} className="h-7 gap-1.5 text-xs">
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          {t("common.search")}
        </Button>
        {(hasSchemaFilters || searched) && (
          <Button size="sm" variant="outline" onClick={handleClear} className="h-7 gap-1.5 text-xs">
            <X className="h-3.5 w-3.5" />
            {t("common.clear")}
          </Button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side */}
        {searched && rawItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={isExporting}>
                {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("excel")} className="text-xs gap-2">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Exportar Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")} className="text-xs gap-2">
                <FileText className="h-3.5 w-3.5" />
                Exportar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {schema && (
          <Button onClick={openCreate} size="sm" className="h-7 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" />
            {t("common.new")}
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
            <p className="text-sm text-destructive py-4">{(error as Error)?.message || "Erro ao carregar dados."}</p>
          )}
          {rawItems.length === 0 && !isLoading && !isError && (
            <p className="text-sm text-muted-foreground py-4">{t("common.noResults")}</p>
          )}
          {rawItems.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        {columns.map((col) => {
                          const isSorted = sortColumn === col.key;
                          const SortIcon = isSorted ? (sortDirection === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                          const isCenter = col.type === "boolean" || col.type === "color";
                          return (
                            <TableHead
                              key={col.key}
                              className={`whitespace-nowrap font-medium h-8 px-3 text-xs cursor-pointer select-none hover:bg-muted/80 transition-colors ${
                                isCenter ? "text-center" : ""
                              }`}
                              onClick={() => {
                                if (sortColumn === col.key) {
                                  if (sortDirection === "desc") {
                                    setSortColumn(null);
                                    setSortDirection("asc");
                                  } else {
                                    setSortDirection("desc");
                                  }
                                } else {
                                  setSortColumn(col.key);
                                  setSortDirection("asc");
                                }
                              }}
                            >
                              <div className={`flex items-center gap-1 ${isCenter ? "justify-center" : ""}`}>
                                {col.label.includes(".") ? t(col.label) : col.label}
                                <SortIcon className={`h-3 w-3 ${isSorted ? "text-foreground" : "text-muted-foreground/50"}`} />
                              </div>
                            </TableHead>
                          );
                        })}
                        {schema && (
                          <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs text-center w-24">
                            {t("common.actions")}
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 && localFilter && (
                        <TableRow>
                          <TableCell colSpan={columns.length + (schema ? 1 : 0)} className="text-center text-xs text-muted-foreground py-4">
                            Nenhum resultado para "{localFilter}"
                          </TableCell>
                        </TableRow>
                      )}
                      {items.map((row, i) => (
                        <TableRow key={String(row.id ?? i)} className="hover:bg-muted/30 group h-6">
                          {columns.map((col) => (
                            <TableCell
                              key={col.key}
                              className={`whitespace-nowrap text-xs py-0.5 px-3 ${
                                col.type === "boolean" || col.type === "color" ? "text-center" : ""
                              }`}
                            >
                              {renderCell(row, col)}
                            </TableCell>
                          ))}
                          {schema && (
                            <TableCell className="text-center text-xs py-0.5 px-3">
                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => row.id && setDeleteId(String(row.id))}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-border px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t("common.rowsPerPage")}:</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => {
                        setPageSize(Number(v));
                        setPageNumber(1);
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
                        onClick={() => setPageNumber((p) => p - 1)}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      {getPageNumbers().map((p, i) =>
                        p === "ellipsis" ? (
                          <span key={`e${i}`} className="text-xs text-muted-foreground px-1">…</span>
                        ) : (
                          <Button
                            key={p}
                            variant={p === pageNumber ? "default" : "outline"}
                            size="icon"
                            className="h-7 w-7 text-xs"
                            onClick={() => setPageNumber(p)}
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
                        onClick={() => setPageNumber((p) => p + 1)}
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

      {/* Delete confirmation */}
      {schema && (() => {
        const deleteItem = deleteId ? items.find((i) => String(i.id) === deleteId) : null;
        let deleteCode = "";
        if (deleteItem) {
          // Build label from the record's own identifiers
          const parts: string[] = [];
          // Primary identifiers: licensePlate, code, name, description
          if (deleteItem.licensePlate) parts.push(String(deleteItem.licensePlate));
           if (deleteItem.stopTypeCode) parts.push(String(deleteItem.stopTypeCode));
           if (deleteItem.ruleCode) parts.push(String(deleteItem.ruleCode));
          if (deleteItem.code) parts.push(String(deleteItem.code));
          if (deleteItem.name && !deleteItem.code) parts.push(String(deleteItem.name));
          if (deleteItem.description && !deleteItem.code && !deleteItem.name) parts.push(String(deleteItem.description));

          // If no primary identifiers, try nested paths or fallback
          if (parts.length === 0) {
            const nestedFields = schema.fields.filter((f) => f.nestedPath);
            nestedFields.forEach((f) => {
              const pathParts = f.nestedPath!.split(".");
              let val: unknown = deleteItem;
              for (const p of pathParts) val = (val as Rec)?.[p];
              if (val) parts.push(String(val));
            });
            const startField = schema.fields.find((f) => f.key === "start");
            if (startField && deleteItem.start) {
              try {
                parts.push(new Date(String(deleteItem.start)).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }));
              } catch { parts.push(String(deleteItem.start)); }
            }
          }

          deleteCode = parts.length > 0 ? parts.join(" - ") : String(deleteItem.id || "");
        }
        return (
          <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("common.confirmDeleteDesc")}
                  {deleteCode && (
                    <span className="block mt-1 font-semibold text-foreground">
                      {deleteCode}
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  {t("common.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      })()}
    </div>
  );
};

export default GenericPage;
