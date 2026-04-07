import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ExportDropdown } from "@/components/ExportDropdown";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  Search, Loader2, X, Plus, Pencil, Trash2, Save,
  ChevronLeft, ChevronRight, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { DatePickerField } from "@/components/DatePickerField";
import { FloatingPanel } from "@/components/FloatingPanel";
import { authFetch } from "@/lib/auth-fetch";
import { API_BASE } from "@/config/api";

/* ─── Types ─── */

interface Scenario {
  id: string;
  code: string;
  description: string;
  startDate: string;
  endDate: string;
  isDated: boolean;
  isDefault: boolean;
  createAt: string;
  updateAt: string | null;
  userIdCreate: string | null;
  userIdUpdate: string | null;
}

interface PaginationMeta {
  TotalCount: number;
  PageSize: number;
  CurrentPage: number;
  TotalPages: number;
  HasNext: boolean;
  HasPrevious: boolean;
}

/* ─── Component ─── */

export default function ScenarioPage() {
  const { t } = useTranslation();
  usePageTitle(t("scenario.title"), Layers);

  const { toast: showToast } = useToast();
  const queryClient = useQueryClient();

  // Filters
  const [filterCode, setFilterCode] = useState("");
  const [filterDescription, setFilterDescription] = useState("");
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  // Pagination
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Edit state
  const [editingItem, setEditingItem] = useState<Partial<Scenario> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Scenario | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<string>("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Query
  const { data: queryData, isLoading } = useQuery({
    queryKey: ["scenarios", searchTrigger, pageNumber, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterCode.trim()) params.set("Filter1String", filterCode.trim());
      if (filterDescription.trim()) params.set("Filter2String", filterDescription.trim());
      params.set("PageSize", String(pageSize));
      params.set("PageNumber", String(pageNumber));

      const res = await authFetch(`/Scenario?${params.toString()}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const items: Scenario[] = await res.json();
      const pHeader = res.headers.get("x-pagination");
      const pagination: PaginationMeta = pHeader
        ? JSON.parse(pHeader)
        : { TotalCount: items.length, PageSize: pageSize, CurrentPage: pageNumber, TotalPages: 1, HasNext: false, HasPrevious: false };
      return { items, pagination };
    },
    enabled: hasSearched,
  });

  const scenarios = queryData?.items || [];
  const pagination = queryData?.pagination;

  // Sorted data
  const sortedData = useMemo(() => {
    const sorted = [...scenarios];
    sorted.sort((a, b) => {
      const aVal = String((a as unknown as Record<string, unknown>)[sortField] ?? "").toLowerCase();
      const bVal = String((b as unknown as Record<string, unknown>)[sortField] ?? "").toLowerCase();
      return sortDir === "asc" ? aVal.localeCompare(bVal, "pt-BR") : bVal.localeCompare(aVal, "pt-BR");
    });
    return sorted;
  }, [scenarios, sortField, sortDir]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortIndicator = (field: string) =>
    sortField === field ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (item: Partial<Scenario>) => {
      const isUpdate = !!item.id;
      const payload = {
        code: item.code,
        description: item.description,
        startDate: item.startDate,
        endDate: item.endDate,
        isDated: item.isDated ?? false,
        isDefault: item.isDefault ?? false,
        ...(isUpdate ? { id: item.id } : {}),
      };
      const res = await authFetch(`/Scenario${isUpdate ? `/${item.id}` : ""}`, {
        method: isUpdate ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `Erro ${res.status}`);
      }
      return res;
    },
    onSuccess: () => {
      showToast({ title: t("common.success"), description: isNew ? t("scenario.created") : t("scenario.updated") });
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
    },
    onError: (err: Error) => {
      showToast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/Scenario/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
    },
    onSuccess: () => {
      showToast({ title: t("common.success"), description: t("scenario.deleted") });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["scenarios"] });
    },
    onError: (err: Error) => {
      showToast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  // Handlers
  const handleSearch = useCallback(() => {
    setPageNumber(1);
    setHasSearched(true);
    setSearchTrigger(s => s + 1);
  }, []);

  const handleClear = useCallback(() => {
    setFilterCode("");
    setFilterDescription("");
    setHasSearched(false);
    setPageNumber(1);
  }, []);

  const handleNew = useCallback(() => {
    setIsNew(true);
    setEditingItem({
      code: "",
      description: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
      isDated: false,
      isDefault: false,
    });
  }, []);

  const handleEdit = useCallback((item: Scenario) => {
    setIsNew(false);
    setEditingItem({ ...item });
  }, []);

  const handleSave = useCallback(() => {
    if (!editingItem) return;
    if (!editingItem.code?.trim() || !editingItem.description?.trim()) {
      showToast({ title: t("common.error"), description: t("scenario.requiredFields"), variant: "destructive" });
      return;
    }
    if (editingItem.startDate && editingItem.endDate && editingItem.startDate > editingItem.endDate) {
      showToast({ title: t("common.error"), description: t("common.startAfterEnd"), variant: "destructive" });
      return;
    }
    saveMutation.mutate(editingItem);
  }, [editingItem, saveMutation, showToast, t]);

  const handleDelete = useCallback(() => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
  }, [deleteTarget, deleteMutation]);

  const fmtDate = (iso: string | null | undefined) => {
    if (!iso) return "—";
    try { return format(parseISO(iso), "dd/MM/yyyy"); } catch { return "—"; }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">{t("scenario.code")}</Label>
              <Input
                className="h-9"
                value={filterCode}
                onChange={e => setFilterCode(e.target.value.toUpperCase())}
                placeholder={t("scenario.codePlaceholder")}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="col-span-4">
              <Label className="text-xs">{t("scenario.description")}</Label>
              <Input
                className="h-9"
                value={filterDescription}
                onChange={e => setFilterDescription(e.target.value.toUpperCase())}
                placeholder={t("scenario.descriptionPlaceholder")}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSearch} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                {t("common.search")}
              </Button>
              <Button size="sm" variant="outline" onClick={handleClear}><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex items-center gap-2">
              <ExportDropdown
                fetchData={async () => {
                  const params = new URLSearchParams();
                  if (filterCode.trim()) params.set("Filter1String", filterCode.trim());
                  if (filterDescription.trim()) params.set("Filter2String", filterDescription.trim());
                  params.set("PageSize", "9999");
                  const res = await authFetch(`/Scenario?${params.toString()}`);
                  if (!res.ok) return [];
                  return (await res.json()) as Record<string, unknown>[];
                }}
                columns={[
                  { key: "code", label: t("scenario.code") },
                  { key: "description", label: t("scenario.description") },
                  { key: "startDate", label: t("scenario.startDate") },
                  { key: "endDate", label: t("scenario.endDate") },
                  { key: "isDated", label: t("scenario.isDated") },
                  { key: "isDefault", label: t("scenario.isDefault") },
                ]}
                title={t("scenario.title")}
              />
              <Button size="sm" onClick={handleNew}><Plus className="h-4 w-4 mr-1" />{t("common.new")}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {hasSearched && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("code")}>
                      {t("scenario.code")}{sortIndicator("code")}
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("description")}>
                      {t("scenario.description")}{sortIndicator("description")}
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("startDate")}>
                      {t("scenario.startDate")}{sortIndicator("startDate")}
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("endDate")}>
                      {t("scenario.endDate")}{sortIndicator("endDate")}
                    </TableHead>
                    <TableHead className="text-center">{t("scenario.isDated")}</TableHead>
                    <TableHead className="text-center">{t("scenario.isDefault")}</TableHead>
                    <TableHead className="w-[80px]">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : sortedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {t("common.noResults")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedData.map((item, idx) => (
                      <TableRow
                        key={item.id}
                        className={idx % 2 === 0 ? "" : "bg-muted/30"}
                        onDoubleClick={() => handleEdit(item)}
                      >
                        <TableCell className="font-mono text-sm">{item.code}</TableCell>
                        <TableCell className="text-sm">{item.description}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{fmtDate(item.startDate)}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{fmtDate(item.endDate)}</TableCell>
                        <TableCell className="text-center">
                          {item.isDated && <Badge variant="outline" className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-xs">{t("common.yes")}</Badge>}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.isDefault && <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">{t("common.yes")}</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(item)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && pagination.TotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <span className="text-sm text-muted-foreground">
                    {pagination.TotalCount} {t("common.records")}
                  </span>
                  <div className="flex items-center gap-2">
                    <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPageNumber(1); setSearchTrigger(s => s + 1); }}>
                      <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[10, 20, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="outline" className="h-8 w-8" disabled={!pagination.HasPrevious} onClick={() => { setPageNumber(p => p - 1); setSearchTrigger(s => s + 1); }}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">{pagination.CurrentPage}/{pagination.TotalPages}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8" disabled={!pagination.HasNext} onClick={() => { setPageNumber(p => p + 1); setSearchTrigger(s => s + 1); }}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Edit/New Panel */}
      {editingItem && (
        <FloatingPanel
          title={isNew ? t("scenario.newScenario") : t("scenario.editScenario")}
          onClose={() => setEditingItem(null)}
          width={580}
        >
          <div className="space-y-4 py-2">
            {/* Code & Description */}
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">{t("scenario.code")} <span className="text-destructive">*</span></Label>
                <Input
                  className="h-9"
                  value={editingItem.code || ""}
                  onChange={e => setEditingItem(prev => prev ? { ...prev, code: e.target.value.toUpperCase() } : null)}
                  maxLength={20}
                />
              </div>
              <div className="col-span-4">
                <Label className="text-xs">{t("scenario.description")} <span className="text-destructive">*</span></Label>
                <Input
                  className="h-9"
                  value={editingItem.description || ""}
                  onChange={e => setEditingItem(prev => prev ? { ...prev, description: e.target.value.toUpperCase() } : null)}
                  maxLength={100}
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-3">
                <Label className="text-xs">{t("scenario.startDate")}</Label>
                <DatePickerField
                  value={editingItem.startDate || null}
                  onChange={v => setEditingItem(prev => prev ? { ...prev, startDate: v || undefined } : null)}
                />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">{t("scenario.endDate")}</Label>
                <DatePickerField
                  value={editingItem.endDate || null}
                  onChange={v => setEditingItem(prev => prev ? { ...prev, endDate: v || undefined } : null)}
                />
              </div>
            </div>

            {/* Booleans */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={editingItem.isDated ?? false}
                  onCheckedChange={v => setEditingItem(prev => prev ? { ...prev, isDated: !!v } : null)}
                />
                <Label className="text-sm">{t("scenario.isDated")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={editingItem.isDefault ?? false}
                  onCheckedChange={v => setEditingItem(prev => prev ? { ...prev, isDefault: !!v } : null)}
                />
                <Label className="text-sm">{t("scenario.isDefault")}</Label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingItem(null)}>{t("common.cancel")}</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                {t("common.save")}
              </Button>
            </div>
          </div>
        </FloatingPanel>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("scenario.deleteConfirm", { code: deleteTarget?.code })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
