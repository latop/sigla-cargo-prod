import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ExportDropdown } from "@/components/ExportDropdown";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  Search, Loader2, X, Plus, Pencil, Trash2, Save,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DatePickerField } from "@/components/DatePickerField";
import { FloatingPanel } from "@/components/FloatingPanel";
import { API_BASE } from "@/config/api";
import { LookupSearchField } from "@/components/LookupSearchField";
import { authFetch } from "@/lib/auth-fetch";

/* ─── Types ─── */

interface VacationListItem {
  nickName: string;
  locationGroup: string;
  startVacation: string;
  endVacation: string;
  status: string;
}

interface VacationCrudItem {
  id?: string;
  driverId?: string;
  driver?: { id?: string; name?: string; lastName?: string; nickName?: string; registration?: string } | null;
  driverName?: string;
  startDate?: string | null;
  endDate?: string | null;
}

interface PaginationMeta {
  TotalCount: number;
  PageSize: number;
  CurrentPage: number;
  TotalPages: number;
  HasNext: boolean;
  HasPrevious: boolean;
}

/* ─── Status helpers ─── */

const statusStyleMap: Record<string, string> = {
  ativa: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  "em andamento": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  prevista: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  futura: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  future: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  encerrada: "bg-muted text-muted-foreground border-border",
  ended: "bg-muted text-muted-foreground border-border",
};

const translateStatus = (raw: string, t: (k: string) => string): string => {
  const lower = raw.toLowerCase();
  if (lower === "ativa" || lower === "em andamento" || lower === "active") return t("driverVacation.statusActive");
  if (lower === "prevista" || lower === "futura" || lower === "future") return t("driverVacation.statusFuture");
  if (lower === "encerrada" || lower === "ended") return t("driverVacation.statusEnded");
  return raw;
};

const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  const cls = statusStyleMap[status.toLowerCase()] || "bg-muted text-muted-foreground border-border";
  const label = translateStatus(status, t);
  return <Badge variant="outline" className={`text-[10px] font-medium uppercase ${cls}`}>{label}</Badge>;
};

const formatDate = (d?: string | null) => {
  if (!d) return "--";
  try { return format(parseISO(d), "dd/MM/yyyy"); } catch { return "--"; }
};

const getDriverName = (item: VacationCrudItem) => {
  if (item.driverName) return item.driverName;
  const d = item.driver;
  if (!d) return "--";
  return [d.nickName || d.name, d.lastName].filter(Boolean).join(" ") || "--";
};

/* ─── Page ─── */

export default function DriverVacationPage() {
  const { t } = useTranslation();
  usePageTitle(t("menu.driverVacation"));
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters
  const [filterDriverId, setFilterDriverId] = useState("");
  const [filterDriverLabel, setFilterDriverLabel] = useState("");
  const [filterLocationGroupId, setFilterLocationGroupId] = useState("");
  const [filterRefDate, setFilterRefDate] = useState<string | null>(
    () => `${format(new Date(), "yyyy-MM-dd")}T00:00:00`
  );
  const [searched, setSearched] = useState(false);

  // Pagination (client-side since /getvacations returns flat array)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Panel
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VacationCrudItem | null>(null);
  const [formDriverId, setFormDriverId] = useState("");
  const [formStartDate, setFormStartDate] = useState<string | null>(null);
  const [formEndDate, setFormEndDate] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<VacationCrudItem | null>(null);

  // Sorting
  const [sortKey, setSortKey] = useState<string>("startVacation");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // LocationGroup dropdown data
  const { data: locationGroups } = useQuery({
    queryKey: ["vacation-location-groups"],
    queryFn: async () => {
      const res = await authFetch("/LocationGroup?PageSize=999");
      if (!res.ok) return [];
      const data = await res.json();
      return (data as { id: string; code: string; description: string }[]).map(g => ({
        id: g.id,
        code: g.code,
        description: g.description,
      }));
    },
    staleTime: 10 * 60 * 1000,
  });

  // Main query using new endpoint
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["driver-vacations-list", searched, filterRefDate, filterDriverId, filterLocationGroupId],
    queryFn: async () => {
      const dtRef = filterRefDate ? filterRefDate.split("T")[0] : format(new Date(), "yyyy-MM-dd");
      const params = new URLSearchParams({ dtRef });
      if (filterDriverId) params.set("DriverId", filterDriverId);
      if (filterLocationGroupId) params.set("LocationGroupId", filterLocationGroupId);

      const res = await fetch(`${API_BASE}/getvacations?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao buscar férias");
      const items: VacationListItem[] = await res.json();
      return items;
    },
    enabled: searched,
  });

  // Client-side pagination
  const allItems = data || [];

  const sortedItems = [...allItems].sort((a, b) => {
    let va = "", vb = "";
    if (sortKey === "nickName") { va = a.nickName || ""; vb = b.nickName || ""; }
    else if (sortKey === "locationGroup") { va = a.locationGroup || ""; vb = b.locationGroup || ""; }
    else if (sortKey === "startVacation") { va = a.startVacation || ""; vb = b.startVacation || ""; }
    else if (sortKey === "endVacation") { va = a.endVacation || ""; vb = b.endVacation || ""; }
    else if (sortKey === "status") { va = a.status || ""; vb = b.status || ""; }
    const cmp = va.localeCompare(vb);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalCount = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pagedItems = sortedItems.slice((page - 1) * pageSize, page * pageSize);

  // CRUD mutations (still use /DriversVacation)
  const saveMutation = useMutation({
    mutationFn: async (item: VacationCrudItem) => {
      const isEdit = !!item.id;
      const res = await fetch(
        `${API_BASE}/DriversVacation${isEdit ? `/${item.id}` : ""}`,
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
      toast({ title: "Erro ao salvar férias.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/DriversVacation/${id}`, { method: "DELETE" });
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
    setFilterDriverId(""); setFilterDriverLabel(""); setFilterLocationGroupId("");
    setFilterRefDate(`${format(new Date(), "yyyy-MM-dd")}T00:00:00`);
    setSearched(false);
  };

  const openNew = () => {
    setEditingItem(null);
    setFormDriverId("");
    setFormStartDate(null);
    setFormEndDate(null);
    setPanelOpen(true);
  };

  const closePanelFn = () => { setPanelOpen(false); setEditingItem(null); };

  const handleSave = async () => {
    if (!formDriverId || !formStartDate || !formEndDate) {
      toast({ title: t("common.requiredFields"), variant: "destructive" });
      return;
    }

    const newStart = parseISO(formStartDate);
    const newEnd = parseISO(formEndDate);
    if (newStart > newEnd) {
      toast({ title: t("driverVacation.startAfterEnd"), variant: "destructive" });
      return;
    }




    saveMutation.mutate({
      ...(editingItem?.id ? { id: editingItem.id } : {}),
      driverId: formDriverId,
      startDate: formStartDate,
      endDate: formEndDate,
    });
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: string }) => sortKey === col ? <span className="ml-1 text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span> : null;

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">
                {t("driverVacation.referenceDate")} <span className="text-destructive">*</span>
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
                  if (item) setFilterDriverLabel(getDriverName(item as unknown as VacationCrudItem));
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
            <div className="space-y-1">
              <Label className="text-xs">{t("driverVacation.driverBase")}</Label>
              <Select value={filterLocationGroupId || "__all__"} onValueChange={(v) => setFilterLocationGroupId(v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={t("common.selectAll")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("common.selectAll")}</SelectItem>
                  {(locationGroups || []).map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.code} - {g.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  title={t("menu.driverVacation")}
                  columns={[
                    { key: "nickName", label: t("menu.driver") },
                    { key: "locationGroup", label: t("driverVacation.driverBase") },
                    { key: "startVacation", label: t("driver.startDate") },
                    { key: "endVacation", label: t("driver.endDate") },
                    { key: "status", label: "Status" },
                  ]}
                  fetchData={async () =>
                    sortedItems.map(i => ({
                      nickName: i.nickName,
                      locationGroup: i.locationGroup,
                      startVacation: formatDate(i.startVacation),
                      endVacation: formatDate(i.endVacation),
                      status: i.status?.toUpperCase(),
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
                    <TableHead className="h-9 text-xs px-3 cursor-pointer select-none" onClick={() => handleSort("nickName")}>
                      {t("menu.driver")} <SortIcon col="nickName" />
                    </TableHead>
                    <TableHead className="h-9 text-xs px-3 w-[120px] cursor-pointer select-none" onClick={() => handleSort("locationGroup")}>
                      {t("driverVacation.driverBase")} <SortIcon col="locationGroup" />
                    </TableHead>
                    <TableHead className="h-9 text-xs px-3 w-[120px] cursor-pointer select-none" onClick={() => handleSort("startVacation")}>
                      {t("driver.startDate")} <SortIcon col="startVacation" />
                    </TableHead>
                    <TableHead className="h-9 text-xs px-3 w-[120px] cursor-pointer select-none" onClick={() => handleSort("endVacation")}>
                      {t("driver.endDate")} <SortIcon col="endVacation" />
                    </TableHead>
                    <TableHead className="h-9 text-xs px-3 w-[110px] cursor-pointer select-none" onClick={() => handleSort("status")}>
                      Status <SortIcon col="status" />
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
                        key={idx}
                        className={idx % 2 === 0 ? "bg-muted/30" : ""}
                      >
                        <TableCell className="text-xs px-3 py-1.5">{item.nickName}</TableCell>
                        <TableCell className="text-xs px-3 py-1.5">{item.locationGroup}</TableCell>
                        <TableCell className="text-xs px-3 py-1.5">{formatDate(item.startVacation)}</TableCell>
                        <TableCell className="text-xs px-3 py-1.5">{formatDate(item.endVacation)}</TableCell>
                        <TableCell className="text-xs px-3 py-1.5"><StatusBadge status={item.status} /></TableCell>
                        <TableCell className="text-xs px-3 py-1.5 text-center">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => {
                              // For delete we need to find by driver + dates via the old endpoint
                              // For now, show toast that individual management uses the CRUD panel
                              toast({ title: t("driverVacation.useNewForManagement"), variant: "default" });
                            }}>
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

      {/* FloatingPanel for new */}
      {panelOpen && (
        <FloatingPanel
          title={editingItem ? t("driverVacation.editTitle") : t("driverVacation.newTitle")}
          onClose={closePanelFn}
          width={500}
        >
          <div className="space-y-4 py-2">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">
                  {t("driver.startDate")} <span className="text-destructive">*</span>
                </Label>
                <DatePickerField value={formStartDate} onChange={setFormStartDate} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  {t("driver.endDate")} <span className="text-destructive">*</span>
                </Label>
                <DatePickerField value={formEndDate} onChange={setFormEndDate} />
              </div>
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

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.confirmDeleteDesc")}
            </AlertDialogDescription>
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
