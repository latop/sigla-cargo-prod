import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const FUNCTION_OPTIONS = ["AFASTADO", "FOLGA", "JORNADA", "TREINAMENTO"] as const;
import { useQuery, useMutation } from "@tanstack/react-query";
import { ExportDropdown } from "@/components/ExportDropdown";
import { fetchAllForExport } from "@/lib/export-utils";
import { motion } from "framer-motion";
import {
  Search, Loader2, Check, X,
  Plus, Pencil, Trash2, Save, Tag,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
interface ActivityTypeItem {
  id?: string;
  code?: string;
  description?: string;
  function?: string;
  flgJourney?: boolean;
  flgPayroll?: boolean;
  color?: string;
  [k: string]: unknown;
}

// --- Mock flag ---
const USE_MOCK = false;

const MOCK_ACTIVITY_TYPES: ActivityTypeItem[] = [
  { id: "ff1618e4-c88b-484c-ba32-159fcc8f67b6", code: "FOLGA", description: "FOLGAS", function: "FOLGA", flgJourney: false, flgPayroll: false, color: "#00695C" },
  { id: "a2b3c4d5-e6f7-4890-ab12-cd34ef56gh78", code: "CURSO", description: "CURSOS E TREINAMENTOS", function: "CURSO", flgJourney: false, flgPayroll: true, color: "#1565C0" },
  { id: "b3c4d5e6-f7a8-4901-bc23-de45fg67hi89", code: "MEDICO", description: "ATESTADO MÉDICO", function: "MEDICO", flgJourney: false, flgPayroll: false, color: "#C62828" },
  { id: "c4d5e6f7-a8b9-4012-cd34-ef56gh78ij90", code: "FERIAS", description: "FÉRIAS", function: "FERIAS", flgJourney: false, flgPayroll: true, color: "#F57F17" },
  { id: "d5e6f7a8-b9c0-4123-de45-fg67hi89jk01", code: "ADMIN", description: "ADMINISTRATIVO", function: "ADMIN", flgJourney: true, flgPayroll: false, color: "#6A1B9A" },
  { id: "e6f7a8b9-c0d1-4234-ef56-gh78ij90kl12", code: "VIAGEM", description: "VIAGEM DE SERVIÇO", function: "VIAGEM", flgJourney: true, flgPayroll: true, color: "#2E7D32" },
  { id: "f7a8b9c0-d1e2-4345-fg67-hi89jk01lm23", code: "PLANTAO", description: "PLANTÃO", function: "PLANTAO", flgJourney: true, flgPayroll: true, color: "#E65100" },
  { id: "a8b9c0d1-e2f3-4456-gh78-ij90kl12mn34", code: "TREINA", description: "TREINAMENTO PRÁTICO", function: "TREINA", flgJourney: false, flgPayroll: false, color: "#0277BD" },
];

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
  items: ActivityTypeItem[];
  pagination: PaginationMeta;
}

// --- API ---
const fetchActivityTypes = async (
  code: string,
  description: string,
  pageNumber: number,
  pageSize: number,
): Promise<PaginatedResult> => {
  if (USE_MOCK) {
    let items = [...MOCK_ACTIVITY_TYPES];
    if (code) items = items.filter((a) => a.code?.toLowerCase().includes(code.toLowerCase()));
    if (description) items = items.filter((a) => a.description?.toLowerCase().includes(description.toLowerCase()));
    return { items, pagination: { TotalCount: items.length, PageSize: pageSize, CurrentPage: 1, TotalPages: 1, HasNext: false, HasPrevious: false } };
  }
  const params = new URLSearchParams();
  if (code) params.append("Filter1String", code);
  if (description) params.append("Filter2String", description);
  params.append("PageNumber", String(pageNumber));
  params.append("PageSize", String(pageSize));
  const url = `${API_BASE}/ActivityType?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const items: ActivityTypeItem[] = await res.json();
  const paginationHeader = res.headers.get("x-pagination");
  const pagination: PaginationMeta = paginationHeader
    ? JSON.parse(paginationHeader)
    : { TotalCount: items.length, PageSize: pageSize, CurrentPage: pageNumber, TotalPages: 1, HasNext: false, HasPrevious: false };
  return { items, pagination };
};

const createActivityType = async (data: Partial<ActivityTypeItem>): Promise<ActivityTypeItem> => {
  if (USE_MOCK) return { ...data, id: crypto.randomUUID() } as ActivityTypeItem;
  const res = await fetch(`${API_BASE}/ActivityType`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const updateActivityType = async (data: Partial<ActivityTypeItem>): Promise<ActivityTypeItem> => {
  if (USE_MOCK) return data as ActivityTypeItem;
  const res = await fetch(`${API_BASE}/ActivityType`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const deleteActivityType = async (id: string): Promise<void> => {
  if (USE_MOCK) return;
  const res = await fetch(`${API_BASE}/ActivityType/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
};

// --- Component ---
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const ActivityTypePage = () => {
  const { t } = useTranslation();
  usePageTitle(t("menu.activityType"), Tag);
  const { toast } = useToast();

  // Filter
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [searched, setSearched] = useState(false);
  const [searchParams, setSearchParams] = useState({ code: "", description: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // CRUD
  const [editingItem, setEditingItem] = useState<ActivityTypeItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ActivityTypeItem>>({
    code: "", description: "", function: "", color: "#000000", flgJourney: false, flgPayroll: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  // Queries
  const { data: paginatedResult, isLoading, isError, error, refetch } = useQuery<PaginatedResult>({
    queryKey: ["activity-types-list", searchParams.code, searchParams.description, currentPage, pageSize],
    queryFn: () => fetchActivityTypes(searchParams.code, searchParams.description, currentPage, pageSize),
    enabled: searched,
  });

  const items = paginatedResult?.items || [];
  const pagination = paginatedResult?.pagination;
  const totalPages = pagination?.TotalPages || 1;
  const totalCount = pagination?.TotalCount || 0;

  const saveMutation = useMutation({
    mutationFn: (data: Partial<ActivityTypeItem>) =>
      data.id ? updateActivityType(data) : createActivityType(data),
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
    mutationFn: deleteActivityType,
    onSuccess: () => {
      toast({ title: t("common.deleteSuccess"), variant: "success" });
      setDeleteId(null);
      refetch();
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "error" });
    },
  });

  // Handlers
  const handleSearch = () => {
    setSearchParams({ code, description });
    setSearched(true);
    setCurrentPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const openCreate = () => {
    setFormData({ code: "", description: "", function: "", color: "#000000", flgJourney: false, flgPayroll: false });
    setFormErrors({});
    setEditingItem(null);
    setIsCreating(true);
  };

  const openEdit = (item: ActivityTypeItem) => {
    setFormData({
      id: item.id,
      code: item.code || "",
      description: item.description || "",
      function: item.function || "",
      color: item.color || "#000000",
      flgJourney: item.flgJourney ?? false,
      flgPayroll: item.flgPayroll ?? false,
    });
    setEditingItem(item);
    setIsCreating(true);
  };

  const closeForm = () => {
    setIsCreating(false);
    setEditingItem(null);
  };

  const handleSave = () => {
    const errors: Record<string, boolean> = {};
    if (!formData.code?.trim()) errors.code = true;
    if (!formData.description?.trim()) errors.description = true;
    if (!formData.function?.trim()) errors.function = true;
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({ title: t("common.requiredFields"), variant: "destructive" });
      return;
    }
    setFormErrors({});
    const payload: Record<string, unknown> = {
      code: formData.code,
      description: formData.description,
      function: formData.function,
      color: formData.color,
      flgJourney: formData.flgJourney,
      flgPayroll: formData.flgPayroll,
    };
    if (formData.id) payload.id = formData.id;
    saveMutation.mutate(payload as Partial<ActivityTypeItem>);
  };

  const panelTitle = editingItem
    ? `${t("common.edit")} ${t("menu.activityType")}`
    : `Novo ${t("menu.activityType")}`;

  return (
    <div className="space-y-4">
      {/* Floating CRUD Panel */}
      {isCreating && (
        <FloatingPanel title={panelTitle} onClose={closeForm} width={500}>
          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("common.code")} *</Label>
                <Input
                  value={formData.code || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  maxLength={10}
                  placeholder="Código"
                  className={`h-8 text-xs ${formErrors.code ? "border-destructive" : ""}`}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("common.function")} *</Label>
                <Select
                  value={formData.function || ""}
                  onValueChange={(v) => setFormData((p) => ({ ...p, function: v }))}
                >
                  <SelectTrigger className={`h-8 text-xs ${formErrors.function ? "border-destructive" : ""}`}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {FUNCTION_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t("common.description")} *</Label>
              <Input
                value={formData.description || ""}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value.toUpperCase() }))}
                maxLength={100}
                placeholder="Descrição"
                className={`h-8 text-xs ${formErrors.description ? "border-destructive" : ""}`}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t("common.color")}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.color || "#000000"}
                  onChange={(e) => setFormData((p) => ({ ...p, color: e.target.value }))}
                  className="h-8 w-12 rounded border border-input cursor-pointer"
                />
                <Input
                  value={formData.color || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, color: e.target.value }))}
                  placeholder="#000000"
                  className="h-8 text-xs flex-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between rounded-md border px-2 py-1.5">
                <Label className="text-xs">{t("common.journey")}</Label>
                <Switch
                  checked={formData.flgJourney ?? false}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, flgJourney: v }))}
                  className="scale-75"
                />
              </div>
              <div className="flex items-center justify-between rounded-md border px-2 py-1.5">
                <Label className="text-xs">{t("common.payroll")}</Label>
                <Switch
                  checked={formData.flgPayroll ?? false}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, flgPayroll: v }))}
                  className="scale-75"
                />
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 items-end">
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
          <Label className="text-xs">{t("common.description")}</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="Descrição..."
            className="h-8 text-xs"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={handleSearch} size="sm" className="h-8 gap-1.5 text-xs">
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          {t("common.search")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => {
            setCode("");
            setDescription("");
          }}
        >
          <X className="h-3.5 w-3.5" />
          {t("common.clear")}
        </Button>
        <div className="flex-1" />
        {searched && items.length > 0 && (
          <ExportDropdown
            fetchData={() => {
              const p = new URLSearchParams();
              if (searchParams.code) p.set("Filter1String", searchParams.code);
              if (searchParams.description) p.set("Filter2String", searchParams.description);
              return fetchAllForExport("ActivityType", p);
            }}
            columns={[
              { key: "code", label: "Código" },
              { key: "description", label: "Descrição" },
              { key: "function", label: "Função" },
              { key: "flgJourney", label: "Jornada", format: (v) => v ? "Sim" : "Não" },
              { key: "flgPayroll", label: "Folha", format: (v) => v ? "Sim" : "Não" },
            ]}
            title={t("menu.activityType")}
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

              {items.length === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground py-4">{t("common.noResults")}</p>
              )}

              {items.length > 0 && (
                <>
                    <div className="overflow-auto rounded-md border">
                      <Table>
                        <TableHeader>
                         <TableRow className="bg-muted/50">
                            <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs">{t("common.code")}</TableHead>
                            <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs">{t("common.description")}</TableHead>
                            <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs">{t("common.function")}</TableHead>
                            <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs text-center">{t("common.color")}</TableHead>
                            <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs text-center">{t("common.journey")}</TableHead>
                            <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs text-center">{t("common.payroll")}</TableHead>
                            <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs text-center w-24">{t("common.actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item, i) => (
                            <TableRow key={item.id ?? i} className="hover:bg-muted/30 group h-6">
                              <TableCell className="whitespace-nowrap text-xs py-0.5 px-3 font-medium">{item.code || "--"}</TableCell>
                              <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{item.description || "--"}</TableCell>
                              <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{item.function || "--"}</TableCell>
                              <TableCell className="text-center text-xs py-0.5 px-3">
                                <span
                                  className="inline-block h-4 w-4 rounded-full border border-border mx-auto"
                                  style={{ backgroundColor: item.color || "#ccc" }}
                                  title={item.color || ""}
                                />
                              </TableCell>
                              <TableCell className="text-center text-xs py-0.5 px-3">
                                {item.flgJourney ? (
                                  <Check className="h-3.5 w-3.5 text-primary mx-auto" />
                                ) : (
                                  <X className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto" />
                                )}
                              </TableCell>
                              <TableCell className="text-center text-xs py-0.5 px-3">
                                {item.flgPayroll ? (
                                  <Check className="h-3.5 w-3.5 text-primary mx-auto" />
                                ) : (
                                  <X className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto" />
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
                    <div className="flex items-center justify-between border-t border-border px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{t("common.rowsPerPage")}:</span>
                        <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
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
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                            .map((page, idx, arr) => (
                              <span key={page} className="flex items-center">
                                {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-xs text-muted-foreground">…</span>}
                                <Button variant={currentPage === page ? "default" : "outline"} size="icon" className="h-7 w-7 text-xs" onClick={() => setCurrentPage(page)}>
                                  {page}
                                </Button>
                              </span>
                            ))}
                          <Button variant="outline" size="icon" className="h-7 w-7" disabled={!pagination?.HasNext} onClick={() => setCurrentPage((p) => p + 1)}>
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

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.confirmDeleteDesc")}</AlertDialogDescription>
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

export default ActivityTypePage;
