import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ExportDropdown } from "@/components/ExportDropdown";
import { fetchAllForExport } from "@/lib/export-utils";
import { motion } from "framer-motion";
import {
  Search, Loader2, Check, X,
  Plus, Pencil, Trash2, Save, ClipboardList,
  ChevronLeft, ChevronRight,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FloatingPanel } from "@/components/FloatingPanel";
import { API_BASE } from "@/config/api";

// --- Types ---
interface ActivityType {
  id: string;
  code?: string;
  description?: string;
  function?: string;
  flgJourney?: boolean;
  flgPayroll?: boolean;
  color?: string;
  [k: string]: unknown;
}

interface ActivityItem {
  id?: string;
  code?: string;
  description?: string;
  activityTypeId?: string;
  activityType?: { code?: string; description?: string; color?: string } | null;
  activityTypeDescription?: string;
  start?: string;
  end?: string;
  flgActive?: boolean;
  flgMeal?: boolean;
  flgLunch?: boolean;
  flgRest?: boolean;
  flgRequest?: boolean;
  flgAllowTimeChange?: boolean | null;
  qtyMaxMinutes?: number | null;
  qtyBlockBefore?: number | null;
  qtyBlockAfter?: number | null;
  [k: string]: unknown;
}

// --- Mock flag (set to false when CORS is resolved) ---
const USE_MOCK = false;

// --- Mock Data ---
const MOCK_ACTIVITY_TYPES: ActivityType[] = [
  { id: "ff1618e4-c88b-484c-ba32-159fcc8f67b6", code: "FOLGA", description: "FOLGAS", color: "#00695C" },
  { id: "a2b3c4d5-e6f7-4890-ab12-cd34ef56gh78", code: "CURSO", description: "CURSOS E TREINAMENTOS", color: "#1565C0" },
  { id: "b3c4d5e6-f7a8-4901-bc23-de45fg67hi89", code: "MEDICO", description: "ATESTADO MÉDICO", color: "#C62828" },
  { id: "c4d5e6f7-a8b9-4012-cd34-ef56gh78ij90", code: "FERIAS", description: "FÉRIAS", color: "#F57F17" },
  { id: "d5e6f7a8-b9c0-4123-de45-fg67hi89jk01", code: "ADMIN", description: "ADMINISTRATIVO", color: "#6A1B9A" },
];

const MOCK_ACTIVITIES: ActivityItem[] = [
  { id: "0771a8d6-0fd5-4199-9e18-8362b634598d", code: "ABONADA", description: "FOLGA ABONADA", activityTypeId: "ff1618e4-c88b-484c-ba32-159fcc8f67b6", activityType: { code: "FOLGA", description: "FOLGAS", color: "#00695C" }, flgRequest: false, flgActive: true },
  { id: "1882b9c7-1ge6-5200-af29-9473c745609e", code: "COMPENSADA", description: "FOLGA COMPENSADA", activityTypeId: "ff1618e4-c88b-484c-ba32-159fcc8f67b6", activityType: { code: "FOLGA", description: "FOLGAS", color: "#00695C" }, flgRequest: true, flgActive: true },
  { id: "2993cad8-2hf7-6311-bg30-0584d856710f", code: "DSR", description: "DESCANSO SEMANAL REMUNERADO", activityTypeId: "ff1618e4-c88b-484c-ba32-159fcc8f67b6", activityType: { code: "FOLGA", description: "FOLGAS", color: "#00695C" }, flgRequest: false, flgActive: true },
  { id: "3004dbe9-3ig8-7422-ch41-1695e967821g", code: "INTEGRA", description: "CURSO DE INTEGRAÇÃO", activityTypeId: "a2b3c4d5-e6f7-4890-ab12-cd34ef56gh78", activityType: { code: "CURSO", description: "CURSOS E TREINAMENTOS", color: "#1565C0" }, flgRequest: true, flgActive: true },
  { id: "4115ecf0-4jh9-8533-di52-2706f078932h", code: "DIRECAO", description: "CURSO DIREÇÃO DEFENSIVA", activityTypeId: "a2b3c4d5-e6f7-4890-ab12-cd34ef56gh78", activityType: { code: "CURSO", description: "CURSOS E TREINAMENTOS", color: "#1565C0" }, flgRequest: false, flgActive: true },
  { id: "5226fd01-5ki0-9644-ej63-3817g189043i", code: "ATESTADO", description: "ATESTADO MÉDICO", activityTypeId: "b3c4d5e6-f7a8-4901-bc23-de45fg67hi89", activityType: { code: "MEDICO", description: "ATESTADO MÉDICO", color: "#C62828" }, flgRequest: true, flgActive: true },
  { id: "6337ge12-6lj1-0755-fk74-4928h290154j", code: "CONSULTA", description: "CONSULTA MÉDICA", activityTypeId: "b3c4d5e6-f7a8-4901-bc23-de45fg67hi89", activityType: { code: "MEDICO", description: "ATESTADO MÉDICO", color: "#C62828" }, flgRequest: true, flgActive: true },
  { id: "7448hf23-7mk2-1866-gl85-5039i301265k", code: "EXAME", description: "EXAME PERIÓDICO", activityTypeId: "b3c4d5e6-f7a8-4901-bc23-de45fg67hi89", activityType: { code: "MEDICO", description: "ATESTADO MÉDICO", color: "#C62828" }, flgRequest: false, flgActive: true },
  { id: "8559ig34-8nl3-2977-hm96-6140j412376l", code: "FERIAS", description: "FÉRIAS REGULARES", activityTypeId: "c4d5e6f7-a8b9-4012-cd34-ef56gh78ij90", activityType: { code: "FERIAS", description: "FÉRIAS", color: "#F57F17" }, flgRequest: false, flgActive: true },
  { id: "9660jh45-9om4-3088-in07-7251k523487m", code: "FERIASAB", description: "FÉRIAS ABONO PECUNIÁRIO", activityTypeId: "c4d5e6f7-a8b9-4012-cd34-ef56gh78ij90", activityType: { code: "FERIAS", description: "FÉRIAS", color: "#F57F17" }, flgRequest: false, flgActive: true },
  { id: "a771ki56-a0n5-4199-jo18-8362l634598n", code: "REUNIAO", description: "REUNIÃO ADMINISTRATIVA", activityTypeId: "d5e6f7a8-b9c0-4123-de45-fg67hi89jk01", activityType: { code: "ADMIN", description: "ADMINISTRATIVO", color: "#6A1B9A" }, flgRequest: false, flgActive: true },
  { id: "b882lj67-b1o6-5200-kp29-9473m745609o", code: "TREINAM", description: "TREINAMENTO INTERNO", activityTypeId: "a2b3c4d5-e6f7-4890-ab12-cd34ef56gh78", activityType: { code: "CURSO", description: "CURSOS E TREINAMENTOS", color: "#1565C0" }, flgRequest: true, flgActive: false },
  { id: "c993mk78-c2p7-6311-lq30-0584n856710p", code: "SUSPENSAO", description: "SUSPENSÃO DISCIPLINAR", activityTypeId: "d5e6f7a8-b9c0-4123-de45-fg67hi89jk01", activityType: { code: "ADMIN", description: "ADMINISTRATIVO", color: "#6A1B9A" }, flgRequest: false, flgActive: true },
  { id: "d004nl89-d3q8-7422-mr41-1695o967821q", code: "FALTA", description: "FALTA INJUSTIFICADA", activityTypeId: "d5e6f7a8-b9c0-4123-de45-fg67hi89jk01", activityType: { code: "ADMIN", description: "ADMINISTRATIVO", color: "#6A1B9A" }, flgRequest: false, flgActive: true },
  { id: "e115om90-e4r9-8533-ns52-2706p078932r", code: "LICENCA", description: "LICENÇA REMUNERADA", activityTypeId: "d5e6f7a8-b9c0-4123-de45-fg67hi89jk01", activityType: { code: "ADMIN", description: "ADMINISTRATIVO", color: "#6A1B9A" }, flgRequest: true, flgActive: true },
];

// --- API ---
const fetchActivityTypes = async (): Promise<ActivityType[]> => {
  if (USE_MOCK) return MOCK_ACTIVITY_TYPES;
  const res = await fetch(`${API_BASE}/ActivityType`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

interface PaginationMeta {
  TotalCount: number;
  PageSize: number;
  CurrentPage: number;
  TotalPages: number;
  HasNext: boolean;
  HasPrevious: boolean;
}

interface PaginatedResult {
  items: ActivityItem[];
  pagination: PaginationMeta;
}

const fetchActivities = async (
  code: string,
  activityTypeId: string,
  flgRequest: string,
  flgActive: string,
  pageNumber: number,
  pageSize: number,
): Promise<PaginatedResult> => {
  if (USE_MOCK) {
    let items = [...MOCK_ACTIVITIES];
    if (code) items = items.filter((a) => a.code?.toLowerCase().includes(code.toLowerCase()) || a.description?.toLowerCase().includes(code.toLowerCase()));
    if (activityTypeId && activityTypeId !== "all") items = items.filter((a) => a.activityTypeId === activityTypeId);
    return { items, pagination: { TotalCount: items.length, PageSize: pageSize, CurrentPage: 1, TotalPages: 1, HasNext: false, HasPrevious: false } };
  }
  const params = new URLSearchParams();
  if (code) params.append("Filter1String", code);
  if (activityTypeId && activityTypeId !== "all") params.append("Filter1Id", activityTypeId);
  if (flgRequest && flgRequest !== "all") params.append("Filter1Bool", flgRequest);
  if (flgActive && flgActive !== "all") params.append("Filter2Bool", flgActive);
  params.append("PageNumber", String(pageNumber));
  params.append("PageSize", String(pageSize));
  const url = `${API_BASE}/Activity?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const items: ActivityItem[] = await res.json();
  const paginationHeader = res.headers.get("x-pagination");
  const pagination: PaginationMeta = paginationHeader
    ? JSON.parse(paginationHeader)
    : { TotalCount: items.length, PageSize: pageSize, CurrentPage: pageNumber, TotalPages: 1, HasNext: false, HasPrevious: false };
  return { items, pagination };
};

const createActivity = async (data: Partial<ActivityItem>): Promise<ActivityItem> => {
  if (USE_MOCK) return { ...data, id: crypto.randomUUID() } as ActivityItem;
  const res = await fetch(`${API_BASE}/Activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const updateActivity = async (data: Partial<ActivityItem>): Promise<ActivityItem> => {
  if (USE_MOCK) return data as ActivityItem;
  const res = await fetch(`${API_BASE}/Activity`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const deleteActivity = async (id: string): Promise<void> => {
  if (USE_MOCK) return;
  const res = await fetch(`${API_BASE}/Activity/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
};

// --- Component ---
const ActivityPage = () => {
  const { t } = useTranslation();
  usePageTitle(t("menu.activity"), ClipboardList);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter state
  const [code, setCode] = useState("");
  const [activityTypeId, setActivityTypeId] = useState("");
  const [flgRequest, setFlgRequest] = useState("");
  const [flgActive, setFlgActive] = useState("");
  const [searched, setSearched] = useState(false);
  const [searchParams, setSearchParams] = useState({ code: "", activityTypeId: "", flgRequest: "", flgActive: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // CRUD state
  const [editingItem, setEditingItem] = useState<ActivityItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<ActivityItem>>({
    code: "",
    description: "",
    activityTypeId: undefined,
    flgRequest: false,
    flgActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  // Queries
  const { data: activityTypes, isLoading: loadingTypes } = useQuery<ActivityType[]>({
    queryKey: ["activity-types"],
    queryFn: fetchActivityTypes,
  });

  const { data: result, isLoading, isError, error, refetch } = useQuery<PaginatedResult>({
    queryKey: ["activities", searchParams.code, searchParams.activityTypeId, searchParams.flgRequest, searchParams.flgActive, currentPage, pageSize],
    queryFn: () => fetchActivities(searchParams.code, searchParams.activityTypeId, searchParams.flgRequest, searchParams.flgActive, currentPage, pageSize),
    enabled: searched,
  });

  const activities = result?.items;
  const pagination = result?.pagination;

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data: Partial<ActivityItem>) =>
      data.id ? updateActivity(data) : createActivity(data),
    onSuccess: () => {
      toast({ title: t("common.saveSuccess") || "Salvo com sucesso!", variant: "success" });
      closeForm();
      refetch();
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteActivity,
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
    setSearchParams({ code, activityTypeId, flgRequest, flgActive });
    setSearched(true);
    setCurrentPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const openCreate = () => {
    setFormData({
      code: "", description: "", activityTypeId: undefined,
      start: "1970-01-01T08:00:00", end: "1970-01-01T17:00:00",
      flgActive: true, flgMeal: false, flgLunch: false, flgRest: false,
      flgRequest: false, flgAllowTimeChange: null,
      qtyMaxMinutes: null, qtyBlockBefore: null, qtyBlockAfter: null,
    });
    setFormErrors({});
    setEditingItem(null);
    setIsCreating(true);
  };

  const openEdit = (item: ActivityItem) => {
    setFormData({
      id: item.id,
      code: item.code || "",
      description: item.description || "",
      activityTypeId: item.activityTypeId,
      start: item.start || "1970-01-01T08:00:00",
      end: item.end || "1970-01-01T17:00:00",
      flgActive: item.flgActive ?? true,
      flgMeal: item.flgMeal ?? false,
      flgLunch: item.flgLunch ?? false,
      flgRest: item.flgRest ?? false,
      flgRequest: item.flgRequest ?? false,
      flgAllowTimeChange: item.flgAllowTimeChange ?? null,
      qtyMaxMinutes: item.qtyMaxMinutes ?? null,
      qtyBlockBefore: item.qtyBlockBefore ?? null,
      qtyBlockAfter: item.qtyBlockAfter ?? null,
    });
    setEditingItem(item);
    setIsCreating(true);
  };

  const closeForm = () => {
    setIsCreating(false);
    setEditingItem(null);
  };

  const handleSave = () => {
    // Validate required fields
    const errors: Record<string, boolean> = {};
    if (!formData.code?.trim()) errors.code = true;
    if (!formData.description?.trim()) errors.description = true;
    if (!formData.activityTypeId) errors.activityTypeId = true;
    if (!formData.start) errors.start = true;
    if (!formData.end) errors.end = true;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({ title: t("common.requiredFields") || "Preencha os campos obrigatórios.", variant: "destructive" });
      return;
    }
    setFormErrors({});

    const payload: Record<string, unknown> = {
      code: formData.code,
      description: formData.description,
      activityTypeId: formData.activityTypeId,
      start: formData.start,
      end: formData.end,
      flgActive: formData.flgActive,
      flgMeal: formData.flgMeal,
      flgLunch: formData.flgLunch,
      flgRest: formData.flgRest,
      flgRequest: formData.flgRequest,
      flgAllowTimeChange: formData.flgAllowTimeChange,
      qtyMaxMinutes: formData.qtyMaxMinutes,
      qtyBlockBefore: formData.qtyBlockBefore,
      qtyBlockAfter: formData.qtyBlockAfter,
    };
    if (formData.id) payload.id = formData.id;
    saveMutation.mutate(payload as Partial<ActivityItem>);
  };

  const getActivityTypeName = (item: ActivityItem): string => {
    if (item.activityType?.description) return item.activityType.description;
    if (item.activityTypeDescription) return item.activityTypeDescription;
    if (item.activityTypeId && activityTypes) {
      const found = activityTypes.find((at) => at.id === item.activityTypeId);
      if (found) return found.description || String(found.id);
    }
    return "--";
  };

  const panelTitle = editingItem
    ? `${t("common.edit")} ${t("menu.activity")}`
    : `Nova ${t("menu.activity")}`;

  // Reorder: Header → Form (inline) → Filters → Results
  return (
    <div className="space-y-4">

      {/* Floating CRUD Panel */}
      {isCreating && (
        <FloatingPanel title={panelTitle} onClose={closeForm} width={560}>
          <div className="space-y-2 pt-2">
            {/* Row 1: Code + Activity Type */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("common.code")} <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.code || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  maxLength={10}
                  placeholder="Código"
                  className={`h-8 text-xs ${formErrors.code ? "border-destructive" : ""}`}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("menu.activityType")} <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.activityTypeId ? String(formData.activityTypeId) : ""}
                  onValueChange={(v) => setFormData((p) => ({ ...p, activityTypeId: v }))}
                >
                  <SelectTrigger className={`h-8 text-xs ${formErrors.activityTypeId ? "border-destructive" : ""}`}>
                    <SelectValue placeholder={t("common.selectAll")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes?.map((at) => (
                      <SelectItem key={at.id} value={String(at.id)} className="text-xs">
                        {at.description || at.code || String(at.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Description */}
            <div className="space-y-1">
              <Label className="text-xs">{t("common.description")} <span className="text-destructive">*</span></Label>
              <Input
                value={formData.description || ""}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value.toUpperCase() }))}
                maxLength={100}
                placeholder="Descrição"
                className={`h-8 text-xs ${formErrors.description ? "border-destructive" : ""}`}
              />
            </div>

            {/* Row 3: Start, End, Max Minutes, Block Before, Block After */}
            <div className="grid grid-cols-5 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("activity.start", "Início")} <span className="text-destructive">*</span></Label>
                <Input
                  type="time"
                  value={formData.start ? formData.start.substring(11, 16) : "08:00"}
                  onChange={(e) => setFormData((p) => ({ ...p, start: `1970-01-01T${e.target.value}:00` }))}
                  className={`h-8 text-xs ${formErrors.start ? "border-destructive" : ""}`}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("activity.end", "Fim")} <span className="text-destructive">*</span></Label>
                <Input
                  type="time"
                  value={formData.end ? formData.end.substring(11, 16) : "17:00"}
                  onChange={(e) => setFormData((p) => ({ ...p, end: `1970-01-01T${e.target.value}:00` }))}
                  className={`h-8 text-xs ${formErrors.end ? "border-destructive" : ""}`}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("activity.qtyMaxMinutes", "Máx. Min.")}</Label>
                <Input
                  type="number"
                  value={formData.qtyMaxMinutes ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, qtyMaxMinutes: e.target.value ? Number(e.target.value) : null }))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("activity.qtyBlockBefore", "Bloq. Antes")}</Label>
                <Input
                  type="number"
                  value={formData.qtyBlockBefore ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, qtyBlockBefore: e.target.value ? Number(e.target.value) : null }))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("activity.qtyBlockAfter", "Bloq. Depois")}</Label>
                <Input
                  type="number"
                  value={formData.qtyBlockAfter ?? ""}
                  onChange={(e) => setFormData((p) => ({ ...p, qtyBlockAfter: e.target.value ? Number(e.target.value) : null }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Row 5: Boolean switches */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center justify-between rounded-md border px-2 py-1.5">
                <Label className="text-xs">{t("common.active")}</Label>
                <Switch checked={formData.flgActive ?? true} onCheckedChange={(v) => setFormData((p) => ({ ...p, flgActive: v }))} className="scale-75" />
              </div>
              <div className="flex items-center justify-between rounded-md border px-2 py-1.5">
                <Label className="text-xs">{t("common.request")}</Label>
                <Switch checked={formData.flgRequest ?? false} onCheckedChange={(v) => setFormData((p) => ({ ...p, flgRequest: v }))} className="scale-75" />
              </div>
              <div className="flex items-center justify-between rounded-md border px-2 py-1.5">
                <Label className="text-xs">{t("activity.meal", "Refeição")}</Label>
                <Switch checked={formData.flgMeal ?? false} onCheckedChange={(v) => setFormData((p) => ({ ...p, flgMeal: v }))} className="scale-75" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center justify-between rounded-md border px-2 py-1.5">
                <Label className="text-xs">{t("activity.lunch", "Almoço")}</Label>
                <Switch checked={formData.flgLunch ?? false} onCheckedChange={(v) => setFormData((p) => ({ ...p, flgLunch: v }))} className="scale-75" />
              </div>
              <div className="flex items-center justify-between rounded-md border px-2 py-1.5">
                <Label className="text-xs">{t("activity.rest", "Descanso")}</Label>
                <Switch checked={formData.flgRest ?? false} onCheckedChange={(v) => setFormData((p) => ({ ...p, flgRest: v }))} className="scale-75" />
              </div>
              <div className="flex items-center justify-between rounded-md border px-2 py-1.5">
                <Label className="text-xs">{t("activity.allowTimeChange", "Alt. Horário")}</Label>
                <Switch checked={formData.flgAllowTimeChange ?? false} onCheckedChange={(v) => setFormData((p) => ({ ...p, flgAllowTimeChange: v }))} className="scale-75" />
              </div>
            </div>

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

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">{t("common.code")}</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="Código..."
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("menu.activityType")}</Label>
          <Select value={activityTypeId} onValueChange={setActivityTypeId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={loadingTypes ? t("common.loading") : t("common.selectAll")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">{t("common.selectAll")}</SelectItem>
              {activityTypes?.map((at) => (
                <SelectItem key={at.id} value={String(at.id)} className="text-xs">
                  {at.description || at.code || String(at.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("common.request")}</Label>
          <Select value={flgRequest} onValueChange={setFlgRequest}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t("common.selectAll")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">{t("common.selectAll")}</SelectItem>
              <SelectItem value="true" className="text-xs">{t("common.yes")}</SelectItem>
              <SelectItem value="false" className="text-xs">{t("common.no")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("common.active")}</Label>
          <Select value={flgActive} onValueChange={setFlgActive}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t("common.selectAll")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">{t("common.selectAll")}</SelectItem>
              <SelectItem value="true" className="text-xs">{t("common.yes")}</SelectItem>
              <SelectItem value="false" className="text-xs">{t("common.no")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={handleSearch} size="sm" className="h-7 gap-1.5 text-xs">
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          {t("common.search")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => {
            setCode("");
            setActivityTypeId("");
            setFlgRequest("");
            setFlgActive("");
          }}
        >
          <X className="h-3.5 w-3.5" />
          {t("common.clear")}
        </Button>

        <div className="flex-1" />

        {searched && activities && activities.length > 0 && (
          <ExportDropdown
            fetchData={() => {
              const p = new URLSearchParams();
              if (searchParams.code) p.set("Filter1String", searchParams.code);
              if (searchParams.activityTypeId) p.set("Filter1Id", searchParams.activityTypeId);
              if (searchParams.flgRequest) p.set("Filter1Bool", searchParams.flgRequest);
              if (searchParams.flgActive) p.set("Filter2Bool", searchParams.flgActive);
              return fetchAllForExport("Activity", p);
            }}
            columns={[
              { key: "code", label: "Código" },
              { key: "description", label: "Descrição" },
              { key: "activityType", label: "Tipo Atividade", format: (_, row) => {
                const at = row.activityType as Record<string, string> | null;
                return at ? `${at.code || ""} - ${at.description || ""}` : "--";
              }},
              { key: "start", label: "Início" },
              { key: "end", label: "Fim" },
            ]}
            title={t("menu.activity")}
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
                <p className="text-sm text-destructive py-4">
                  {(error as Error)?.message || "Erro ao carregar dados."}
                </p>
              )}

              {activities && activities.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">{t("common.noResults")}</p>
              )}

              {activities && activities.length > 0 && (
                  <>
                    <div className="overflow-auto rounded-md border">
                      <Table>
                        <TableHeader>
                         <TableRow className="bg-muted/50">
                            <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs">{t("common.code")}</TableHead>
                            <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs">{t("common.description")}</TableHead>
                            <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs">{t("menu.activityType")}</TableHead>
                            <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs text-center">{t("activity.start")}</TableHead>
                            <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs text-center">{t("activity.end")}</TableHead>
                            <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs text-center">{t("common.active")}</TableHead>
                            <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs text-center w-24">{t("common.actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activities.map((item, i) => (
                            <TableRow key={item.id ?? i} className="hover:bg-muted/30 group h-6">
                              <TableCell className="whitespace-nowrap text-xs py-0.5 px-3 font-medium">{item.code || "--"}</TableCell>
                              <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{item.description || "--"}</TableCell>
                              <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{getActivityTypeName(item)}</TableCell>
                              <TableCell className="text-center text-xs py-0.5 px-3">
                                {item.start ? item.start.substring(11, 16) : "--"}
                              </TableCell>
                              <TableCell className="text-center text-xs py-0.5 px-3">
                                {item.end ? item.end.substring(11, 16) : "--"}
                              </TableCell>
                              <TableCell className="text-center text-xs py-0.5 px-3">
                                {item.flgActive ? (
                                  <Badge variant="outline" className="bg-accent text-accent-foreground border-border text-xs">{t("common.active")}</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">{t("common.inactive")}</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center text-xs py-0.5 px-3">
                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => item.id && setDeleteId(item.id)}
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

                    {/* Server-side Pagination */}
                    {pagination && pagination.TotalPages > 0 && (
                      <div className="flex items-center justify-between border-t border-border px-4 py-2">
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
                  </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}


      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete") || "Confirmar exclusão"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.confirmDeleteDesc") || "Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita."}
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
    </div>
  );
};

export default ActivityPage;
