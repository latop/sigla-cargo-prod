import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ExportDropdown } from "@/components/ExportDropdown";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  Search, Loader2, X, Plus, Pencil, Trash2, Save,
  ChevronLeft, ChevronRight, AlertTriangle, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DatePickerField } from "@/components/DatePickerField";
import { FloatingPanel } from "@/components/FloatingPanel";
import { API_BASE } from "@/config/api";
import { LookupSearchField } from "@/components/LookupSearchField";

/* ─── Types ─── */

interface OccurrenceListItem {
  id?: string;
  driverId?: string;
  dtOccurrence?: string;
  description?: string;
  responsible?: string;
  warningFlag?: boolean;
  driver?: {
    id?: string;
    name?: string;
    lastName?: string;
    nickName?: string;
    registration?: string;
    integrationCode?: string;
  } | null;
  nickName?: string;
  driverName?: string;
}

interface PaginationMeta {
  TotalCount: number;
  PageSize: number;
  CurrentPage: number;
  TotalPages: number;
  HasNext: boolean;
  HasPrevious: boolean;
}

/* ─── Helpers ─── */

const formatDate = (d?: string | null) => {
  if (!d) return "--";
  try { return format(parseISO(d), "dd/MM/yyyy"); } catch { return "--"; }
};

const getDriverName = (item: OccurrenceListItem) => {
  if (item.nickName) return item.nickName;
  if (item.driverName) return item.driverName;
  const d = item.driver;
  if (!d) return "--";
  return [d.nickName || d.name, d.lastName].filter(Boolean).join(" ") || "--";
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* ─── Page ─── */

export default function DriverOccurrencePage() {
  const { t } = useTranslation();
  usePageTitle(t("menu.driverOccurrence"), AlertTriangle);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters
  const [filterDriverId, setFilterDriverId] = useState("");
  const [filterDriverLabel, setFilterDriverLabel] = useState("");
  const [filterRefDate, setFilterRefDate] = useState<string | null>(
    () => `${todayISO()}T00:00:00`
  );
  const [searched, setSearched] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Panel
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OccurrenceListItem | null>(null);
  const [formDriverId, setFormDriverId] = useState("");
  const [formDtOccurrence, setFormDtOccurrence] = useState<string | null>(`${todayISO()}T00:00:00`);
  const [formDescription, setFormDescription] = useState("");
  const [formResponsible, setFormResponsible] = useState("");
  const [formWarningFlag, setFormWarningFlag] = useState(true);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<OccurrenceListItem | null>(null);

  // Description detail dialog
  const [descDialogOpen, setDescDialogOpen] = useState(false);
  const [descDialogContent, setDescDialogContent] = useState({ driver: "", description: "" });

  // Sorting
  const [sortKey, setSortKey] = useState<string>("dtOccurrence");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Main query
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["driver-occurrences-list", searched, filterRefDate, filterDriverId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterRefDate) params.set("dtRef", filterRefDate.split("T")[0]);
      if (filterDriverId) params.set("DriverId", filterDriverId);

      const res = await fetch(`${API_BASE}/DriversOccurrence?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao buscar ocorrências");
      const items: OccurrenceListItem[] = await res.json();
      return items;
    },
    enabled: searched,
  });

  const allItems = data || [];

  const sortedItems = [...allItems].sort((a, b) => {
    let va = "", vb = "";
    if (sortKey === "dtOccurrence") { va = a.dtOccurrence || ""; vb = b.dtOccurrence || ""; }
    else if (sortKey === "driver") { va = getDriverName(a); vb = getDriverName(b); }
    else if (sortKey === "responsible") { va = a.responsible || ""; vb = b.responsible || ""; }
    else if (sortKey === "warningFlag") { va = a.warningFlag ? "1" : "0"; vb = b.warningFlag ? "1" : "0"; }
    const cmp = va.localeCompare(vb);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalCount = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pagedItems = sortedItems.slice((page - 1) * pageSize, page * pageSize);

  // CRUD mutations
  const saveMutation = useMutation({
    mutationFn: async (item: Partial<OccurrenceListItem>) => {
      const isEdit = !!item.id;
      const res = await fetch(
        `${API_BASE}/DriversOccurrence${isEdit ? `/${item.id}` : ""}`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        }
      );
      if (!res.ok) throw new Error("Erro ao salvar");
      return res;
    },
    onSuccess: () => {
      toast({ title: t("common.saveSuccess") });
      refetch();
      closePanelFn();
    },
    onError: () => {
      toast({ title: t("driverOccurrence.saveError"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/DriversOccurrence/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => {
      toast({ title: t("common.deleteSuccess") });
      refetch();
      setDeleteTarget(null);
    },
  });

  const handleSearch = () => { setPage(1); setSearched(true); setTimeout(() => refetch(), 50); };
  const handleClear = () => {
    setFilterDriverId(""); setFilterDriverLabel("");
    setFilterRefDate(`${todayISO()}T00:00:00`);
    setSearched(false);
  };

  const openNew = () => {
    setEditingItem(null);
    setFormDriverId("");
    setFormDtOccurrence(`${todayISO()}T00:00:00`);
    setFormDescription("");
    setFormResponsible("");
    setFormWarningFlag(true);
    setPanelOpen(true);
  };

  const closePanelFn = () => { setPanelOpen(false); setEditingItem(null); };

  const handleSave = async () => {
    if (!formDriverId || !formDtOccurrence) {
      toast({ title: t("common.requiredFields"), variant: "destructive" });
      return;
    }

    saveMutation.mutate({
      ...(editingItem?.id ? { id: editingItem.id } : {}),
      driverId: formDriverId,
      dtOccurrence: formDtOccurrence,
      description: formDescription,
      responsible: formResponsible,
      warningFlag: formWarningFlag,
    });
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: string }) => sortKey === col ? <span className="ml-1 text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span> : null;

  const openDescDialog = (item: OccurrenceListItem) => {
    setDescDialogContent({ driver: getDriverName(item), description: item.description || "--" });
    setDescDialogOpen(true);
  };

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">
                {t("driverOccurrence.referenceDate")} <span className="text-destructive">*</span>
              </Label>
              <DatePickerField value={filterRefDate} onChange={setFilterRefDate} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("menu.driver")}</Label>
              <LookupSearchField
                endpoint="Drivers"
                value={filterDriverId}
                onChange={(id, item) => {
                  setFilterDriverId(id);
                  if (item) setFilterDriverLabel(getDriverName(item as unknown as OccurrenceListItem));
                }}
                placeholder={t("menu.driver")}
                nullable
                forceModal
                modalVisibleColumns={["nickName", "integrationCode", "registration"]}
                columnLabels={{
                  nickName: t("driver.nickName"),
                  integrationCode: t("driver.integrationCode"),
                  registration: t("driver.registration"),
                }}
                className="h-8"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button size="sm" className="h-8 text-xs gap-1" onClick={handleSearch} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                {t("common.search")}
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleClear}>
                <X className="h-3.5 w-3.5" /> {t("common.clear")}
              </Button>
            </div>
            <div className="flex gap-2">
              {allItems.length > 0 && (
                <ExportDropdown
                  title={t("menu.driverOccurrence")}
                  columns={[
                    { key: "dtOccurrence", label: t("driverOccurrence.date") },
                    { key: "driver", label: t("menu.driver") },
                    { key: "responsible", label: t("driverOccurrence.responsible") },
                    { key: "description", label: t("common.description") },
                    { key: "warningFlag", label: t("driverOccurrence.warning") },
                  ]}
                  fetchData={async () =>
                    sortedItems.map(i => ({
                      dtOccurrence: formatDate(i.dtOccurrence),
                      driver: getDriverName(i),
                      responsible: i.responsible || "--",
                      description: i.description || "--",
                      warningFlag: i.warningFlag ? t("common.yes") : t("common.no"),
                    }))
                  }
                />
              )}
              <Button size="sm" className="h-8 text-xs gap-1" onClick={openNew}>
                <Plus className="h-3.5 w-3.5" /> {t("common.new")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {searched && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-9 text-xs px-3 w-[120px] cursor-pointer select-none" onClick={() => handleSort("dtOccurrence")}>
                      {t("driverOccurrence.date")} <SortIcon col="dtOccurrence" />
                    </TableHead>
                    <TableHead className="h-9 text-xs px-3 cursor-pointer select-none" onClick={() => handleSort("driver")}>
                      {t("menu.driver")} <SortIcon col="driver" />
                    </TableHead>
                    <TableHead className="h-9 text-xs px-3 cursor-pointer select-none" onClick={() => handleSort("responsible")}>
                      {t("driverOccurrence.responsible")} <SortIcon col="responsible" />
                    </TableHead>
                    <TableHead className="h-9 text-xs px-3 w-[300px]">
                      {t("common.description")}
                    </TableHead>
                    <TableHead className="h-9 text-xs px-3 w-[80px] cursor-pointer select-none text-center" onClick={() => handleSort("warningFlag")}>
                      {t("driverOccurrence.warning")} <SortIcon col="warningFlag" />
                    </TableHead>
                    <TableHead className="h-9 text-xs px-3 w-[80px] text-center">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : pagedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                        {t("common.noResults")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedItems.map((item, idx) => (
                      <TableRow
                        key={item.id || idx}
                        className={idx % 2 === 0 ? "bg-muted/30" : ""}
                      >
                        <TableCell className="text-xs px-3 py-1.5">{formatDate(item.dtOccurrence)}</TableCell>
                        <TableCell className="text-xs px-3 py-1.5">{getDriverName(item)}</TableCell>
                        <TableCell className="text-xs px-3 py-1.5">{item.responsible || "--"}</TableCell>
                        <TableCell className="text-xs px-3 py-1.5">
                          <div className="flex items-center gap-1">
                            <span className="truncate max-w-[220px]">{item.description || "--"}</span>
                            {item.description && (
                              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => openDescDialog(item)}>
                                <Eye className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs px-3 py-1.5 text-center">
                          {item.warningFlag ? (
                            <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                              {t("common.yes")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px]">
                              {t("common.no")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs px-3 py-1.5 text-center">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteTarget(item)}>
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
            <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>{totalCount} {t("common.records")}</span>
                <span className="text-muted-foreground/60">|</span>
                <span>{t("common.rowsPerPage")}:</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-6 w-[60px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map(s => (
                      <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span>{t("common.page")} {page} {t("common.of")} {totalPages}</span>
                <Button variant="outline" size="icon" className="h-6 w-6" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="icon" className="h-6 w-6" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FloatingPanel for new occurrence */}
      {panelOpen && (
        <FloatingPanel
          title={editingItem ? t("driverOccurrence.editTitle") : t("driverOccurrence.newTitle")}
          onClose={closePanelFn}
          width={600}
        >
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">
                  {t("driverOccurrence.date")} <span className="text-destructive">*</span>
                </Label>
                <DatePickerField value={formDtOccurrence} onChange={setFormDtOccurrence} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  {t("menu.driver")} <span className="text-destructive">*</span>
                </Label>
                <LookupSearchField
                  endpoint="Drivers"
                  value={formDriverId}
                  onChange={(id) => setFormDriverId(id)}
                  placeholder={t("menu.driver")}
                  nullable
                  forceModal
                  forceActiveOnly
                  modalVisibleColumns={["nickName", "integrationCode", "registration"]}
                  columnLabels={{
                    nickName: t("driver.nickName"),
                    integrationCode: t("driver.integrationCode"),
                    registration: t("driver.registration"),
                  }}
                  className="h-8"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t("driverOccurrence.responsible")}</Label>
              <Input
                value={formResponsible}
                onChange={(e) => setFormResponsible(e.target.value.toUpperCase())}
                placeholder={t("driverOccurrence.responsible")}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t("common.description")}</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t("driverOccurrence.descriptionPlaceholder")}
                className="min-h-[120px] text-xs"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-2">
              <Label className="text-xs">{t("driverOccurrence.warning")}</Label>
              <Switch checked={formWarningFlag} onCheckedChange={setFormWarningFlag} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={closePanelFn}>
                {t("common.cancel")}
              </Button>
              <Button size="sm" className="h-8 text-xs gap-1" onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {t("common.save")}
              </Button>
            </div>
          </div>
        </FloatingPanel>
      )}

      {/* Description detail dialog */}
      <Dialog open={descDialogOpen} onOpenChange={setDescDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">{t("driverOccurrence.descriptionDetail")}</DialogTitle>
            <DialogDescription className="text-xs">{descDialogContent.driver}</DialogDescription>
          </DialogHeader>
          <div className="text-sm whitespace-pre-wrap border rounded-md p-3 bg-muted/30 max-h-[400px] overflow-auto">
            {descDialogContent.description}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.confirmDeleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget?.id && deleteMutation.mutate(deleteTarget.id)}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
