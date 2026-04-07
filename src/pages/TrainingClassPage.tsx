import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search, Loader2, X, Plus, Pencil, Trash2, Save,
  ChevronLeft, ChevronRight, GraduationCap, UserPlus, Check, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { DatePickerField } from "@/components/DatePickerField";
import { FloatingPanel } from "@/components/FloatingPanel";
import { ActivitySearchModal } from "@/components/ActivitySearchModal";
import { LocationSearchModal } from "@/components/LocationSearchModal";
import { CourseSearchModal } from "@/components/CourseSearchModal";
import { DriverSearchModal } from "@/components/DriverSearchModal";
import { API_BASE } from "@/config/api";
import { ExportDropdown } from "@/components/ExportDropdown";
import type { ExportColumn } from "@/lib/export-utils";

// --- Types ---
interface TrainingClass {
  id?: string;
  name?: string;
  description?: string;
  startTraining?: string | null;
  endTraining?: string | null;
  instructor?: string;
  activityId?: string;
  activity?: { id?: string; code?: string; description?: string } | null;
  locationId?: string;
  location?: { id?: string; code?: string; name?: string } | null;
  courseId?: string;
  course?: { id?: string; code?: string; description?: string } | null;
  startValidity?: string | null;
  endValidity?: string | null;
  trainingClassDrivers?: TrainingClassDriver[];
  [k: string]: unknown;
}

interface TrainingClassDriver {
  id?: string;
  trainingClassId?: string;
  driverId?: string;
  driver?: { id?: string; name?: string; lastName?: string; nickName?: string; registration?: string; integrationCode?: string } | null;
  trainingClassStatus?: number; // 0 = SEM AVALIAÇÃO, 1 = APROVADO, 2 = REPROVADO
  [k: string]: unknown;
}

interface DriverCourseAssignment {
  driverId: string;
  courseId: string;
  startValidity: string;
  endValidity: string;
}


// --- Status helpers ---
const STATUS_MAP: Record<number, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  0: { label: "Sem Avaliação", variant: "secondary" },
  1: { label: "Aprovado", variant: "default" },
  2: { label: "Reprovado", variant: "destructive" },
};

const exportColumns: ExportColumn[] = [
  { key: "name", label: "Nome" },
  { key: "description", label: "Descrição" },
  { key: "instructor", label: "Instrutor" },
  { key: "startTraining", label: "Início Treinamento" },
  { key: "endTraining", label: "Fim Treinamento" },
  { key: "activity", label: "Atividade" },
  { key: "location", label: "Localidade" },
  { key: "course", label: "Curso" },
  { key: "driverCount", label: "Motoristas" },
];

const fetchTrainingClasses = async (filters: { name: string }, page: number, pageSize: number) => {
  const params = new URLSearchParams();
  if (filters.name) params.append("Filter1String", filters.name);
  params.set("PageNumber", String(page));
  params.set("PageSize", String(pageSize));
  const res = await fetch(`${API_BASE}/TrainingClass?${params.toString()}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const items: TrainingClass[] = await res.json();
  const ph = res.headers.get("x-pagination");
  const pagination = ph ? JSON.parse(ph) : { TotalCount: items.length, PageSize: pageSize, CurrentPage: page, TotalPages: 1, HasNext: false, HasPrevious: false };

  // Fetch all TrainingClassDrivers to compute driver counts per class
  const driversRes = await fetch(`${API_BASE}/TrainingClassDrivers?PageSize=9999`);
  const allDrivers: TrainingClassDriver[] = driversRes.ok ? await driversRes.json() : [];

  // Attach driver count per class by matching trainingClassId
  const enrichedItems = items.map((item) => ({
    ...item,
    trainingClassDrivers: allDrivers.filter(
      (d) => String(d.trainingClassId) === String(item.id)
    ),
  }));

  return { items: enrichedItems, pagination };
};

const createTrainingClass = async (data: Partial<TrainingClass>): Promise<TrainingClass> => {
  const res = await fetch(`${API_BASE}/TrainingClass`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const updateTrainingClass = async (data: Partial<TrainingClass>): Promise<TrainingClass> => {
  const res = await fetch(`${API_BASE}/TrainingClass`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const deleteTrainingClass = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/TrainingClass/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
};

// Driver management within a class
const addDriverToClass = async (trainingClassId: string, driverId: string): Promise<TrainingClassDriver> => {
  const payload = { trainingClassId, driverId, trainingClassStatus: 0 };
  const res = await fetch(`${API_BASE}/TrainingClassDrivers`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const updateDriverStatus = async (trainingClassId: string, driverEntryId: string, status: number): Promise<void> => {
  const res = await fetch(`${API_BASE}/TrainingClassDrivers`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: driverEntryId, trainingClassId, trainingClassStatus: status }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
};

const removeDriverFromClass = async (_trainingClassId: string, driverEntryId: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/TrainingClassDrivers/${driverEntryId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
};

const assignCourseToDriver = async (data: DriverCourseAssignment): Promise<void> => {
  const res = await fetch(`${API_BASE}/Drivers/${data.driverId}/Courses`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ driverId: data.driverId, courseId: data.courseId, startValidity: data.startValidity, endValidity: data.endValidity }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
};

// --- Helpers ---
const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return "--";
  try { return new Date(dateStr).toLocaleDateString("pt-BR"); } catch { return "--"; }
};

const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// --- Page sizes ---
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// --- Component ---
const TrainingClassPage = () => {
  const { t } = useTranslation();
  usePageTitle(t("menu.trainingClass"), GraduationCap);
  const { toast } = useToast();

  // --- List state ---
  const [filters, setFilters] = useState({ name: "" });
  const [searched, setSearched] = useState(false);
  const [searchParams, setSearchParams] = useState({ name: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // --- Panel state ---
  const [panelMode, setPanelMode] = useState<"closed" | "new" | "edit">("closed");
  const [selectedClass, setSelectedClass] = useState<TrainingClass | null>(null);
  const [form, setForm] = useState<Partial<TrainingClass>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // --- Course assignment state (confirmation dialog for status change) ---
  const [statusChangeEntry, setStatusChangeEntry] = useState<{ entry: TrainingClassDriver; newStatus: number } | null>(null);

  // --- Course label ---
  const [courseLabel, setCourseLabel] = useState("");

  // --- Activity search modal state ---
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityLabel, setActivityLabel] = useState("");

  // --- Location search modal state ---
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationLabel, setLocationLabel] = useState("");

  // --- Course search modal state ---
  const [courseModalOpen, setCourseModalOpen] = useState(false);

  // --- Driver search modal state ---
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [selectedDriverToAdd, setSelectedDriverToAdd] = useState<{ id: string; label: string } | null>(null);

  // --- Query ---
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["trainingClasses", searchParams, currentPage, pageSize],
    queryFn: () => fetchTrainingClasses(searchParams, currentPage, pageSize),
    enabled: searched,
  });


  // --- Mutations ---
  const createMut = useMutation({
    mutationFn: createTrainingClass,
    onSuccess: (created) => {
      toast({ title: t("common.success"), description: t("trainingClass.createSuccess") });
      // After creating, switch to edit mode with the new record to allow adding drivers
      setSelectedClass(created);
      setForm(created);
      setPanelMode("edit");
      refetch();
    },
    onError: () => toast({ title: t("common.error"), description: t("common.genericError"), variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: updateTrainingClass,
    onSuccess: (updated) => {
      toast({ title: t("common.success"), description: t("trainingClass.updateSuccess") });
      setSelectedClass(updated);
      setForm(updated);
      refetch();
    },
    onError: () => toast({ title: t("common.error"), description: t("common.genericError"), variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteTrainingClass,
    onSuccess: () => {
      toast({ title: t("common.success"), description: t("trainingClass.deleteSuccess") });
      setDeleteId(null);
      refetch();
    },
    onError: () => toast({ title: t("common.error"), description: t("common.genericError"), variant: "destructive" }),
  });

  // --- Handlers ---
  const handleSearch = () => {
    setSearchParams({ ...filters });
    setCurrentPage(1);
    setSearched(true);
  };

  const handleClear = () => {
    setFilters({ name: "" });
    setSearchParams({ name: "" });
    setSearched(false);
  };

  const openNew = () => {
    setSelectedClass(null);
    setForm({ name: "", description: "", startTraining: `${todayISO()}T00:00:00`, endTraining: null, instructor: "", activityId: "", locationId: "", courseId: "", startValidity: `${todayISO()}T00:00:00`, endValidity: null });
    setActivityLabel("");
    setLocationLabel("");
    setCourseLabel("");
    setPanelMode("new");
  };

  const openEdit = async (item: TrainingClass) => {
    setSelectedClass(item);
    setForm({ ...item });

    // Resolve activity label
    const act = item.activity;
    if (act?.code) {
      setActivityLabel(`${act.code} - ${act.description || ""}`);
    } else if (item.activityId) {
      try {
        const res = await fetch(`${API_BASE}/Activity/${item.activityId}`);
        if (res.ok) {
          const a = await res.json();
          setActivityLabel(`${a.code || ""} - ${a.description || ""}`);
        } else setActivityLabel("");
      } catch { setActivityLabel(""); }
    } else setActivityLabel("");

    // Resolve location label
    const loc = item.location;
    if (loc?.code) {
      setLocationLabel(`${loc.code} - ${(loc as any).name || ""}`);
    } else if (item.locationId) {
      try {
        const res = await fetch(`${API_BASE}/Location/${item.locationId}`);
        if (res.ok) {
          const l = await res.json();
          setLocationLabel(`${l.code || ""} - ${l.name || ""}`);
        } else setLocationLabel("");
      } catch { setLocationLabel(""); }
    } else setLocationLabel("");

    // Resolve course label
    const crs = item.course;
    if (crs?.code) {
      setCourseLabel(`${crs.code} - ${crs.description || ""}`);
    } else if (item.courseId) {
      try {
        const res = await fetch(`${API_BASE}/Course/${item.courseId}`);
        if (res.ok) {
          const c = await res.json();
          setCourseLabel(`${c.code || ""} - ${c.description || ""}`);
        } else setCourseLabel("");
      } catch { setCourseLabel(""); }
    } else setCourseLabel("");

    setPanelMode("edit");
  };

  const handleSave = () => {
    if (!form.name?.trim()) {
      toast({ title: t("common.error"), description: t("trainingClass.nameRequired"), variant: "destructive" });
      return;
    }
    if (!form.startTraining) {
      toast({ title: t("common.error"), description: t("trainingClass.startRequired"), variant: "destructive" });
      return;
    }
    if (!form.endTraining) {
      toast({ title: t("common.error"), description: t("trainingClass.endRequired"), variant: "destructive" });
      return;
    }
    if (form.startTraining && form.endTraining && form.startTraining > form.endTraining) {
      toast({ title: t("common.error"), description: t("common.startAfterEnd"), variant: "destructive" });
      return;
    }
    if (!form.instructor?.trim()) {
      toast({ title: t("common.error"), description: t("trainingClass.instructorRequired"), variant: "destructive" });
      return;
    }
    if (!form.activityId) {
      toast({ title: t("common.error"), description: t("trainingClass.activityRequired"), variant: "destructive" });
      return;
    }
    if (!form.locationId) {
      toast({ title: t("common.error"), description: t("trainingClass.locationRequired"), variant: "destructive" });
      return;
    }
    if (!form.courseId) {
      toast({ title: t("common.error"), description: t("trainingClass.courseRequired"), variant: "destructive" });
      return;
    }
    if (!form.startValidity) {
      toast({ title: t("common.error"), description: t("trainingClass.startValidityRequired"), variant: "destructive" });
      return;
    }
    if (!form.endValidity) {
      toast({ title: t("common.error"), description: t("trainingClass.endValidityRequired"), variant: "destructive" });
      return;
    }

    if (panelMode === "new") {
      createMut.mutate(form);
    } else {
      updateMut.mutate(form);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    // First remove all drivers linked to this class
    const classToDelete = items.find((c) => c.id === deleteId);
    const classDrivers = classToDelete?.trainingClassDrivers || [];
    try {
      for (const d of classDrivers) {
        if (d.id) await removeDriverFromClass(deleteId, d.id);
      }
    } catch { /* best effort */ }
    deleteMut.mutate(deleteId);
  };

  // Refresh selected class detail from API (fetch drivers separately)
  const refreshSelectedClass = useCallback(async (id: string) => {
    try {
      const [classRes, driversRes] = await Promise.all([
        fetch(`${API_BASE}/TrainingClass/${id}`),
        fetch(`${API_BASE}/TrainingClassDrivers?TrainingClassId=${id}&PageSize=200`),
      ]);
      if (classRes.ok) {
        const updated = await classRes.json();
        const drivers = driversRes.ok ? await driversRes.json() : [];
        updated.trainingClassDrivers = Array.isArray(drivers) ? drivers : [];
        setSelectedClass(updated);
        setForm(updated);
      }
    } catch { /* ignore */ }
  }, []);

  // --- Driver management handlers ---
  const handleAddDriver = useCallback(async (driverId: string) => {
    if (!selectedClass?.id) return;
    try {
      await addDriverToClass(selectedClass.id, driverId);
      toast({ title: t("common.success"), description: t("trainingClass.driverAdded") });
      refetch();
      refreshSelectedClass(selectedClass.id);
    } catch {
      toast({ title: t("common.error"), description: t("common.genericError"), variant: "destructive" });
    }
  }, [selectedClass, toast, t, refetch, refreshSelectedClass]);

  const handleUpdateStatus = useCallback(async (entry: TrainingClassDriver, newStatus: number) => {
    if (!selectedClass?.id || !entry.id) return;
    try {
      await updateDriverStatus(selectedClass.id, entry.id, newStatus);
      toast({ title: t("common.success"), description: t("trainingClass.statusUpdated") });
      refreshSelectedClass(selectedClass.id);
    } catch {
      toast({ title: t("common.error"), description: t("common.genericError"), variant: "destructive" });
    }
  }, [selectedClass, toast, t, refreshSelectedClass]);

  const handleRemoveDriver = useCallback(async (entryId: string) => {
    if (!selectedClass?.id) return;
    try {
      await removeDriverFromClass(selectedClass.id, entryId);
      toast({ title: t("common.success"), description: t("trainingClass.driverRemoved") });
      refreshSelectedClass(selectedClass.id);
      refetch();
    } catch {
      toast({ title: t("common.error"), description: t("common.genericError"), variant: "destructive" });
    }
  }, [selectedClass, toast, t, refetch, refreshSelectedClass]);

  const handleConfirmStatusChange = useCallback(async () => {
    if (!statusChangeEntry || !selectedClass?.id) return;
    const { entry, newStatus } = statusChangeEntry;
    try {
      await updateDriverStatus(selectedClass.id, entry.id!, newStatus);
      // If approved, auto-assign course from header
      if (newStatus === 1 && form.courseId && entry.driverId) {
        try {
          await assignCourseToDriver({
            driverId: entry.driverId,
            courseId: form.courseId,
            startValidity: form.startValidity || `${todayISO()}T00:00:00`,
            endValidity: form.endValidity || form.startValidity || `${todayISO()}T00:00:00`,
          });
        } catch { /* course assignment is best-effort */ }
      }
      toast({ title: t("common.success"), description: t("trainingClass.statusUpdated") });
      refreshSelectedClass(selectedClass.id);
    } catch {
      toast({ title: t("common.error"), description: t("common.genericError"), variant: "destructive" });
    } finally {
      setStatusChangeEntry(null);
    }
  }, [statusChangeEntry, selectedClass, form.courseId, form.startValidity, form.endValidity, toast, t, refreshSelectedClass]);

  const items = data?.items || [];
  const pagination = data?.pagination;
  const isSaved = panelMode === "edit" && !!selectedClass?.id;
  const drivers = selectedClass?.trainingClassDrivers || [];

  const driverDisplayName = (d: TrainingClassDriver) => {
    const driver = d.driver;
    if (!driver) return d.driverId || "--";
    return driver.nickName || driver.name || "--";
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-3 space-y-1">
              <Label className="text-xs text-muted-foreground">{t("trainingClass.name")} <span className="text-destructive">*</span></Label>
              <Input
                className="h-9 text-xs uppercase"
                placeholder={t("trainingClass.name")}
                value={filters.name}
                onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value.toUpperCase() }))}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
          </div>
          {/* Toolbar */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSearch}>
                <Search className="h-3.5 w-3.5 mr-1" />{t("common.search")}
              </Button>
              <Button size="sm" variant="outline" onClick={handleClear}>
                <X className="h-3.5 w-3.5 mr-1" />{t("common.clear")}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <ExportDropdown
                title={t("menu.trainingClass")}
                columns={exportColumns}
                fetchData={async () => {
                  const res = await fetch(`${API_BASE}/TrainingClass?PageSize=99999`);
                  if (!res.ok) throw new Error("Export error");
                  const items: TrainingClass[] = await res.json();
                  return items.map((item) => ({
                    name: item.name || "",
                    description: item.description || "",
                    instructor: item.instructor || "",
                    startTraining: item.startTraining ? new Date(item.startTraining).toLocaleDateString("pt-BR") : "",
                    endTraining: item.endTraining ? new Date(item.endTraining).toLocaleDateString("pt-BR") : "",
                    activity: item.activity?.code || "",
                    location: item.location?.code || "",
                    course: item.course?.code || "",
                    driverCount: String(item.trainingClassDrivers?.length ?? 0),
                  }));
                }}
                filterDesc={filters.name ? [`Nome: ${filters.name}`] : []}
              />
              <Button size="sm" onClick={openNew}>
                <Plus className="h-3.5 w-3.5 mr-1" />{t("common.new")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {searched && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t("common.noResults")}</p>
              ) : (
                <>
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs">{t("trainingClass.name")}</TableHead>
                          <TableHead className="text-xs">{t("trainingClass.description")}</TableHead>
                          <TableHead className="text-xs w-[130px]">{t("trainingClass.startTraining")}</TableHead>
                          <TableHead className="text-xs w-[130px]">{t("trainingClass.endTraining")}</TableHead>
                          <TableHead className="text-xs w-[100px] text-center">{t("trainingClass.driverCount")}</TableHead>
                          <TableHead className="text-xs w-[100px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow
                            key={item.id}
                            className="cursor-pointer hover:bg-muted/30"
                            onClick={() => openEdit(item)}
                          >
                            <TableCell className="text-xs font-medium">{item.name || "--"}</TableCell>
                            <TableCell className="text-xs">{item.description || "--"}</TableCell>
                            <TableCell className="text-xs">{formatDate(item.startTraining)}</TableCell>
                            <TableCell className="text-xs">{formatDate(item.endTraining)}</TableCell>
                            <TableCell className="text-xs text-center">
                              <Badge variant="secondary">{item.trainingClassDrivers?.length ?? 0}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(item.id!)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Pagination */}
                  {pagination && (
                    <div className="flex items-center justify-between px-4 py-2 border-t">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{pagination.TotalCount} {t("common.results")}</span>
                        <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                          <SelectTrigger className="h-7 w-[70px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PAGE_SIZE_OPTIONS.map((s) => <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!pagination.HasPrevious} onClick={() => setCurrentPage((p) => p - 1)}>
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs text-muted-foreground">{pagination.CurrentPage} / {pagination.TotalPages}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!pagination.HasNext} onClick={() => setCurrentPage((p) => p + 1)}>
                          <ChevronRight className="h-3.5 w-3.5" />
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

      {/* MaxDetail Panel — form + drivers in one panel */}
      {panelMode !== "closed" && (
        <FloatingPanel
          title={panelMode === "new" ? t("trainingClass.newTitle") : t("trainingClass.editTitle")}
          onClose={() => { setPanelMode("closed"); setForm({}); setSelectedClass(null); }}
          width={900}
        >
          <div className="space-y-4 p-1">
            {/* Header form */}
            <div className="grid grid-cols-6 gap-3">
              {/* Line 1: Nome | Descrição | Instrutor */}
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{t("trainingClass.name")} <span className="text-destructive">*</span></Label>
                <Input className="h-9 text-xs uppercase" value={form.name || ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.toUpperCase() }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{t("trainingClass.description")}</Label>
                <Input className="h-9 text-xs uppercase" value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.toUpperCase() }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{t("trainingClass.instructor")} <span className="text-destructive">*</span></Label>
                <Input className="h-9 text-xs uppercase" value={form.instructor || ""} onChange={(e) => setForm((f) => ({ ...f, instructor: e.target.value.toUpperCase() }))} />
              </div>

              {/* Line 2: Atividade (2col) | Localidade (2col) | Início Treinamento (1col) | Fim Treinamento (1col) */}
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{t("trainingClass.activity")} <span className="text-destructive">*</span></Label>
                <Button
                  variant="outline"
                  className="w-full h-9 text-xs justify-start font-normal truncate gap-1"
                  onClick={() => setActivityModalOpen(true)}
                >
                  <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{activityLabel || form.activityId || `${t("common.search")}...`}</span>
                </Button>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{t("trainingClass.location")} <span className="text-destructive">*</span></Label>
                <Button
                  variant="outline"
                  className="w-full h-9 text-xs justify-start font-normal truncate gap-1"
                  onClick={() => setLocationModalOpen(true)}
                >
                  <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{locationLabel || form.locationId || `${t("common.search")}...`}</span>
                </Button>
              </div>
              <div className="col-span-1 space-y-1">
                <Label className="text-xs whitespace-nowrap">{t("trainingClass.startTraining")} <span className="text-destructive">*</span></Label>
                <DatePickerField value={form.startTraining || null} onChange={(v) => setForm((f) => ({ ...f, startTraining: v }))} className="h-9" />
              </div>
              <div className="col-span-1 space-y-1">
                <Label className="text-xs whitespace-nowrap">{t("trainingClass.endTraining")} <span className="text-destructive">*</span></Label>
                <DatePickerField value={form.endTraining || null} onChange={(v) => setForm((f) => ({ ...f, endTraining: v }))} className="h-9" />
              </div>

              {/* Line 3: Curso (2col with search) | Início Validade (2col) | Fim Validade (2col) */}
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{t("trainingClass.course")} <span className="text-destructive">*</span></Label>
                <Button
                  variant="outline"
                  className="w-full h-9 text-xs justify-start font-normal truncate gap-1"
                  onClick={() => setCourseModalOpen(true)}
                >
                  <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{courseLabel || form.courseId || `${t("common.search")}...`}</span>
                </Button>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{t("trainingClass.startValidity")} <span className="text-destructive">*</span></Label>
                <DatePickerField value={form.startValidity || null} onChange={(v) => setForm((f) => ({ ...f, startValidity: v }))} className="h-9" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{t("trainingClass.endValidity")} <span className="text-destructive">*</span></Label>
                <DatePickerField value={form.endValidity || null} onChange={(v) => setForm((f) => ({ ...f, endValidity: v }))} className="h-9" />
              </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
                {(createMut.isPending || updateMut.isPending) ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                {t("common.save")}
              </Button>
            </div>

            {/* Drivers section — always visible */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-foreground">{t("trainingClass.drivers")} ({drivers.length})</h3>
                {isSaved && (
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      className="h-9 text-xs justify-start font-normal truncate gap-1 min-w-[200px]"
                      onClick={() => setDriverModalOpen(true)}
                    >
                      <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{selectedDriverToAdd?.label || `${t("trainingClass.searchDriver")}...`}</span>
                    </Button>
                    <Button
                      size="sm"
                      disabled={!selectedDriverToAdd}
                      onClick={() => {
                        if (selectedDriverToAdd) {
                          handleAddDriver(selectedDriverToAdd.id);
                          setSelectedDriverToAdd(null);
                        }
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />{t("common.add")}
                    </Button>
                  </div>
                )}
              </div>

              {!isSaved ? (
                <p className="text-xs text-muted-foreground py-4 text-center italic">{t("trainingClass.saveFirst")}</p>
              ) : drivers.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">{t("trainingClass.noDriversYet")}</p>
              ) : (
                <div className="overflow-auto rounded-md border max-h-[40vh]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">{t("driver.nickName")}</TableHead>
                        <TableHead className="text-xs w-[130px]">{t("driver.integrationCode")}</TableHead>
                        <TableHead className="text-xs w-[160px]">{t("trainingClass.status")}</TableHead>
                        <TableHead className="text-xs w-[150px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drivers.map((entry, i) => {
                        const statusInfo = STATUS_MAP[entry.trainingClassStatus ?? 0] || STATUS_MAP[0];
                        return (
                          <TableRow key={entry.id || i} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                            <TableCell className="text-xs">{driverDisplayName(entry)}</TableCell>
                            <TableCell className="text-xs">{entry.driver?.integrationCode || "--"}</TableCell>
                            <TableCell className="text-xs">
                              <Select
                                value={String(entry.trainingClassStatus ?? 0)}
                                onValueChange={(v) => {
                                  const newStatus = Number(v);
                                  if (newStatus !== (entry.trainingClassStatus ?? 0)) {
                                    setStatusChangeEntry({ entry, newStatus });
                                  }
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs w-[140px]">
                                  <Badge variant={statusInfo.variant} className="text-[10px]">{statusInfo.label}</Badge>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0" className="text-xs">Sem Avaliação</SelectItem>
                                  <SelectItem value="1" className="text-xs">Aprovado</SelectItem>
                                  <SelectItem value="2" className="text-xs">Reprovado</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-xs">
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => entry.id && handleRemoveDriver(entry.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </FloatingPanel>
      )}

      {/* Status change confirmation dialog */}
      <AlertDialog open={!!statusChangeEntry} onOpenChange={(open) => { if (!open) setStatusChangeEntry(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">{t("trainingClass.confirmStatusTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {statusChangeEntry && t("trainingClass.confirmStatusDesc", {
                driver: driverDisplayName(statusChangeEntry.entry),
                status: STATUS_MAP[statusChangeEntry.newStatus]?.label || "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="text-xs" onClick={handleConfirmStatusChange}>
              <Check className="h-3.5 w-3.5 mr-1" />{t("trainingClass.confirmAssign")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.confirmDeleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activity search modal */}
      <ActivitySearchModal
        open={activityModalOpen}
        onOpenChange={setActivityModalOpen}
        onSelect={(id, item) => {
          setForm((f) => ({ ...f, activityId: id }));
          const code = item.code ? String(item.code) : "";
          const desc = item.description ? String(item.description) : "";
          setActivityLabel(code && desc ? `${code} - ${desc}` : code || desc || id);
        }}
      />

      {/* Location search modal */}
      <LocationSearchModal
        open={locationModalOpen}
        onOpenChange={setLocationModalOpen}
        filterOperationOnly
        onSelect={(id, item) => {
          setForm((f) => ({ ...f, locationId: id }));
          const code = item.code ? String(item.code) : "";
          const name = item.name ? String(item.name) : "";
          setLocationLabel(code && name ? `${code} - ${name}` : code || name || id);
        }}
      />

      {/* Course search modal */}
      <CourseSearchModal
        open={courseModalOpen}
        onOpenChange={setCourseModalOpen}
        onSelect={(id, item) => {
          setForm((f) => ({ ...f, courseId: id }));
          const code = item.code ? String(item.code) : "";
          const desc = item.description ? String(item.description) : "";
          setCourseLabel(code && desc ? `${code} - ${desc}` : code || desc || id);
        }}
      />

      {/* Driver search modal */}
      <DriverSearchModal
        open={driverModalOpen}
        onOpenChange={setDriverModalOpen}
        forceActiveOnly
        onSelect={(id, item) => {
          const nick = item.nickName ? String(item.nickName) : "";
          const name = item.name ? String(item.name) : "";
          const label = nick || name || id;
          setSelectedDriverToAdd({ id, label });
        }}
      />
    </div>
  );
};

export default TrainingClassPage;
