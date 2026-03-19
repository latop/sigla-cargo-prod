import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Loader2, Save, X, Plus, Trash2, Eye, RotateCcw, ClipboardList, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { FloatingPanel } from "@/components/FloatingPanel";
import { LookupSearchField } from "@/components/LookupSearchField";
import { LineSearchModal } from "@/components/LineSearchModal";
import { ActivitySearchModal } from "@/components/ActivitySearchModal";
import { DailyTripSearchModal } from "@/components/DailyTripSearchModal";
import { API_BASE } from "@/config/api";

// --- Types ---
interface LookupItem {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  [k: string]: unknown;
}

interface TaskDriver {
  id?: string;
  idTask?: string;
  seq?: number;
  type?: string;
  dailyTripId?: string | null;
  dt?: string | null;
  demand?: string | null;
  sto?: string | null;
  lineId?: string | null;
  lineCode?: string | null;
  line?: LookupItem | null;
  locOrig?: string | null;
  locDest?: string | null;
  locationOrigCode?: string | null;
  locationDestCode?: string | null;
  startPlanned?: string | null;
  endPlanned?: string | null;
  startActual?: string | null;
  endActual?: string | null;
  activityId?: string | null;
  activity?: LookupItem | null;
  activityCode?: string | null;
  locationId?: string | null;
  location?: LookupItem | null;
  locationCode?: string | null;
  [k: string]: unknown;
}

interface CircuitData {
  id?: string;
  circuitJourneyId?: string;
  circuitCode?: string | null;
  status?: string | null;
  otmProcess?: string | null;
  published?: boolean | null;
  startDate?: string | null;
  endDate?: string | null;
  startPlanned?: string | null;
  endPlanned?: string | null;
  startActual?: string | null;
  endActual?: string | null;
  notes?: string | null;
  driverId?: string | null;
  driver?: LookupItem | null;
  nickName?: string | null;
  integrationCode?: string | null;
  driverBase?: string | null;
  locationGroupCode?: string | null;
  attributionCode?: string | null;
  fleetGroupCode?: string | null;
  fleetCode?: string | null;
  tasksDriver?: TaskDriver[];
  [k: string]: unknown;
}

const formatDT = (v?: string | null) => {
  if (!v) return "--";
  try {
    const d = new Date(v);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch { return "--"; }
};

const toDatetimeLocal = (v?: string | null) => {
  if (!v) return "";
  try {
    const d = new Date(v);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch { return ""; }
};

const statusLabels: Record<string, string> = {
  P: "Previsto",
  A: "Em andamento",
  E: "Executado",
};

const statusColors: Record<string, string> = {
  P: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  A: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  E: "bg-muted text-muted-foreground",
};

interface CircuitEditPanelProps {
  circuitId?: string;
  onClose: () => void;
  onSaved?: () => void;
}

export function CircuitEditPanel({ circuitId, onClose, onSaved }: CircuitEditPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isCreateMode = !circuitId;

  const [formData, setFormData] = useState<CircuitData>({});
  const [tasks, setTasks] = useState<TaskDriver[]>([]);
  const [loading, setLoading] = useState(!isCreateMode);
  const [saving, setSaving] = useState(false);
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [lineModalTaskIdx, setLineModalTaskIdx] = useState<number | null>(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityModalTaskIdx, setActivityModalTaskIdx] = useState<number | null>(null);
  const [dailyTripModalOpen, setDailyTripModalOpen] = useState(false);
  const [dailyTripModalTaskIdx, setDailyTripModalTaskIdx] = useState<number | null>(null);

  const [deleteTaskIdx, setDeleteTaskIdx] = useState<number | null>(null);
  const [createReturnIdx, setCreateReturnIdx] = useState<number | null>(null);

  // Load circuit data
  useEffect(() => {
    if (isCreateMode) {
      setFormData({});
      setTasks([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/gantt/GetCircuit?circuitId=${circuitId}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data: CircuitData = await res.json();
        if (cancelled) return;

        const mapped: CircuitData = {
          ...data,
          id: data.circuitJourneyId || data.id,
          startPlanned: data.startDate || data.startPlanned,
          endPlanned: data.endDate || data.endPlanned,
        };

        const rawTasks = (data.tasksDriver || []).map((t) => {
          const taskType = t.type === "TRIP" || t.type === "Trip" || (!t.activityId && !t.activityCode && (t.lineId || t.lineCode))
            ? "Trip" : "Activity";
          return {
            ...t,
            id: t.idTask || t.id,
            type: taskType,
            sto: t.demand || t.sto || null,
            lineCode: t.lineCode || t.line?.code || null,
            locationOrigCode: t.locOrig || t.locationOrigCode || null,
            locationDestCode: t.locDest || t.locationDestCode || null,
          };
        }).sort((a, b) => (a.seq ?? 999) - (b.seq ?? 999));

        setFormData(mapped);
        setTasks(rawTasks);
      } catch (err: any) {
        toast({ title: "Erro ao carregar circuito", description: err.message, variant: "destructive" });
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [circuitId]);

  const updateForm = (field: string, value: unknown) => {
    setFormData((p) => ({ ...p, [field]: value === "" ? null : value }));
  };

  const updateTask = (idx: number, field: string, value: unknown) => {
    setTasks((prev) => prev.map((t, i) => i === idx ? { ...t, [field]: value === "" ? null : value } : t));
  };

  const updateTaskMulti = (idx: number, updates: Record<string, unknown>) => {
    setTasks((prev) => prev.map((t, i) => {
      if (i !== idx) return t;
      const cleaned = Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, v === "" ? null : v]));
      return { ...t, ...cleaned };
    }));
  };

  const addTrip = () => {
    setTasks((prev) => [...prev, { type: "Trip", dt: null, sto: null, demand: null, dailyTripId: null, lineId: null, startPlanned: null, endPlanned: null }]);
  };

  const addActivity = () => {
    setTasks((prev) => [...prev, { type: "Activity", activityCode: null, locationCode: null, startPlanned: null, endPlanned: null, startActual: null, endActual: null }]);
  };

  const removeTask = (idx: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== idx));
    setDeleteTaskIdx(null);
  };

  const handleCreateReturn = (idx: number) => {
    const task = tasks[idx];
    if (!task) return;
    setTasks((prev) => [
      ...prev,
      {
        type: "Trip",
        dt: null,
        sto: null,
        lineId: null,
        locationOrigCode: task.locationDestCode,
        locationDestCode: task.locationOrigCode,
        startPlanned: task.endPlanned,
        endPlanned: null,
      },
    ]);
    setCreateReturnIdx(null);
    toast({ title: "Retorno criado", description: "Viagem de retorno adicionada ao final da lista." });
  };

  const handleSave = async () => {
    if (isCreateMode && !formData.driverId) {
      toast({ title: "Campo obrigatório", description: "Selecione um motorista.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        circuitJourneyId: formData.id || formData.circuitJourneyId,
        driverId: formData.driverId,
        notes: formData.notes,
        tasksDriver: tasks.map((t, i) => {
          const isActivity = t.type === "Activity" || !!(t.activityId || t.activityCode);
          return {
            idTask: t.idTask || t.id || null,
            seq: t.seq ?? i + 1,
            demand: t.sto || t.demand || null,
            dailyTripId: t.dailyTripId || null,
            lineId: t.lineId || null,
            lineCode: t.lineCode || null,
            locOrig: t.locationOrigCode || t.locOrig || null,
            locDest: t.locationDestCode || t.locDest || null,
            startPlanned: t.startPlanned || null,
            endPlanned: t.endPlanned || null,
            startActual: isActivity ? (t.startPlanned || null) : (t.startActual || null),
            endActual: isActivity ? (t.endPlanned || null) : (t.endActual || null),
            activityId: t.activityId || null,
            activityCode: t.activityCode || null,
          };
        }),
      };
      const res = await fetch(`${API_BASE}/gantt/UpdateCircuit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Erro na API: ${res.status}`);
      const text = await res.text();
      if (text.toLowerCase().includes("ok") || res.ok) {
        toast({ title: "Salvo com sucesso" });
        onSaved?.();
        onClose();
      } else {
        throw new Error(text || "Erro desconhecido");
      }
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openLineModal = (idx: number) => {
    setLineModalTaskIdx(idx);
    setLineModalOpen(true);
  };

  if (loading) {
    return (
      <FloatingPanel title="Carregando..." onClose={onClose} width={1100}>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </FloatingPanel>
    );
  }

  const panelTitle = isCreateMode ? "Novo Circuito" : "Editar Circuito";

  const categorizedTasks = tasks.map((t, i) => {
    const taskType = t.type || (t.activityId || t.activityCode ? "Activity" : "Trip");
    return { ...t, _type: taskType, _idx: i };
  });

  return (
    <>
      <FloatingPanel title={panelTitle} onClose={onClose} width={1100}>
        <div className="flex flex-col h-[85vh] pt-1 gap-1">
          {/* Motorista (editável) + GPID */}
          <div className="grid grid-cols-6 gap-1.5">
            <div className="col-span-3">
              <Label className="text-[10px]">Motorista {isCreateMode && <span className="text-destructive">*</span>}</Label>
              <LookupSearchField
                endpoint="Drivers"
                labelFn="codeName"
                searchFilterParam="Filter1String"
                value={formData.driverId || ""}
                onChange={(id, item) => {
                  updateForm("driverId", id);
                  if (item) {
                    updateForm("nickName", item.nickName || "");
                    updateForm("integrationCode", item.integrationCode || "");
                    const bases = item.driverBases as any[];
                    const attrs = item.driverAttributions as any[];
                    const fleets = item.driverFleets as any[];
                    updateForm("locationGroupCode", bases?.[0]?.locationGroup?.code || "");
                    updateForm("attributionCode", attrs?.[0]?.attribution?.code || "");
                    updateForm("fleetGroupCode", fleets?.[0]?.fleetGroup?.code || "");
                  }
                }}
                placeholder="Buscar por nome de escala..."
                initialLabel={formData.nickName || ""}
                extraParams={{ IsActive: "1" }}
                transformItem={(item) => ({
                  ...item,
                  code: (item.nickName as string) || "",
                  name: "",
                })}
                modalVisibleColumns={["nickName", "integrationCode", "isActive"]}
                columnLabels={{ nickName: "Nome de Escala", integrationCode: "Cód. Integração", isActive: "Ativo" }}
                className="h-7 text-[11px]"
              />
            </div>
            <div>
              <Label className="text-[10px]">GPID</Label>
              <LookupSearchField
                endpoint="Drivers"
                labelFn="codeOnly"
                searchFilterParam="Filter2String"
                value={formData.driverId || ""}
                onChange={(id, item) => {
                  updateForm("driverId", id);
                  if (item) {
                    updateForm("nickName", item.nickName || "");
                    updateForm("integrationCode", item.integrationCode || "");
                    const bases = item.driverBases as any[];
                    const attrs = item.driverAttributions as any[];
                    const fleets = item.driverFleets as any[];
                    updateForm("locationGroupCode", bases?.[0]?.locationGroup?.code || "");
                    updateForm("attributionCode", attrs?.[0]?.attribution?.code || "");
                    updateForm("fleetGroupCode", fleets?.[0]?.fleetGroup?.code || "");
                  }
                }}
                placeholder="Buscar por cód. integração..."
                initialLabel={formData.integrationCode || ""}
                extraParams={{ IsActive: "1" }}
                transformItem={(item) => ({
                  ...item,
                  code: (item.integrationCode as string) || "",
                  name: "",
                })}
                modalVisibleColumns={["integrationCode", "nickName", "isActive"]}
                columnLabels={{ nickName: "Nome de Escala", integrationCode: "Cód. Integração", isActive: "Ativo" }}
                className="h-7 text-[11px]"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-[10px]">Observações</Label>
              <Textarea
                className="text-xs h-7 min-h-[28px] resize-none py-1"
                value={formData.notes || ""}
                onChange={(e) => updateForm("notes", e.target.value)}
                placeholder="Notas do circuito..."
              />
            </div>
          </div>

          {/* Badges informativos em faixa única */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-0.5">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Cód. Circuito:</span>
              <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium">{formData.circuitCode || "--"}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Status:</span>
              <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${statusColors[formData.status || ""] || "bg-muted text-muted-foreground"}`}>{statusLabels[formData.status || ""] || formData.status || "--"}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Publicado:</span>
              <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${formData.published ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                {formData.published ? "Sim" : "Não"}
              </span>
            </div>
            <span className="text-muted-foreground/30">|</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Iní. Plan.:</span>
              <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium">{formatDT(formData.startPlanned)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Fim Plan.:</span>
              <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium">{formatDT(formData.endPlanned)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Iní. Real.:</span>
              <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium">{formatDT(formData.startActual)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Fim Real.:</span>
              <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium">{formatDT(formData.endActual)}</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 space-y-1">
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Detalhamento</h4>
            <div className="overflow-auto flex-1 border rounded-md">
              <Table>
                <TableHeader>
                   <TableRow className="bg-muted/30">
                     <TableHead className="h-8 text-xs px-1 w-8">Seq</TableHead>
                     <TableHead className="h-8 text-xs px-1 min-w-[150px]">DT/STO / Atividade</TableHead>
                     <TableHead className="h-8 text-xs px-1">Linha</TableHead>
                     <TableHead className="h-8 text-xs px-1">Origem</TableHead>
                     <TableHead className="h-8 text-xs px-1">Destino</TableHead>
                     <TableHead className="h-8 text-xs px-1 min-w-[115px]">Iní. Plan.</TableHead>
                     <TableHead className="h-8 text-xs px-1 min-w-[115px]">Fim Plan.</TableHead>
                     <TableHead className="h-8 text-xs px-1 whitespace-nowrap">Iní. Real.</TableHead>
                     <TableHead className="h-8 text-xs px-1 whitespace-nowrap">Fim Real.</TableHead>
                     <TableHead className="h-8 text-xs px-1 text-center w-16">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categorizedTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-xs text-muted-foreground py-4">
                        Nenhum item no circuito.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categorizedTasks.map((task) => {
                      const isTrip = task._type === "Trip";
                      const hasDailyTrip = isTrip && !!task.dailyTripId;
                      const canEditPlanned = !isTrip || !hasDailyTrip;
                      return (
                        <TableRow key={task._idx} className={isTrip ? "" : "bg-accent/20"}>
                          <TableCell className="h-8 text-xs px-1 py-0.5 text-center">
                            {task.seq ?? task._idx + 1}
                          </TableCell>
                          <TableCell className="h-8 text-xs px-1 py-0.5">
                            {isTrip ? (
                              <Button
                                variant="ghost"
                                className="h-7 text-xs px-1 w-full justify-start font-normal gap-1"
                                onClick={() => {
                                  setDailyTripModalTaskIdx(task._idx);
                                  setDailyTripModalOpen(true);
                                }}
                              >
                                <Search className="h-3 w-3 shrink-0 text-muted-foreground" />
                                {[task.dt, task.sto].filter(Boolean).join(" / ") || task.demand || <span className="text-muted-foreground">Buscar DT/STO...</span>}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                className="h-7 text-xs px-1 w-full justify-start font-normal gap-1"
                                onClick={() => {
                                  setActivityModalTaskIdx(task._idx);
                                  setActivityModalOpen(true);
                                }}
                              >
                                <Search className="h-3 w-3 shrink-0 text-muted-foreground" />
                                {task.activityCode || <span className="text-muted-foreground">Selecionar atividade...</span>}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="h-8 text-xs px-1 py-0.5">
                            {isTrip ? (
                              hasDailyTrip ? (
                                <span className="text-foreground">{task.lineCode || "--"}</span>
                              ) : (
                                <Button
                                  variant="ghost"
                                  className="h-7 text-xs px-1 w-full justify-start font-normal gap-1"
                                  onClick={() => openLineModal(task._idx)}
                                >
                                  <Search className="h-3 w-3 shrink-0 text-muted-foreground" />
                                  {task.lineCode || <span className="text-muted-foreground">Selecionar...</span>}
                                </Button>
                              )
                            ) : <span className="text-muted-foreground">--</span>}
                          </TableCell>
                          <TableCell className="h-8 text-xs px-1 py-0.5 whitespace-nowrap">
                            {task.locationOrigCode || task.locOrig || "--"}
                          </TableCell>
                          <TableCell className="h-8 text-xs px-1 py-0.5 whitespace-nowrap">
                            {task.locationDestCode || task.locDest || "--"}
                          </TableCell>
                          <TableCell className="h-8 text-xs px-1 py-0.5">
                            {canEditPlanned ? (
                              <Input
                                type="datetime-local"
                                className="h-6 text-[9px] px-0 w-[110px]"
                                value={toDatetimeLocal(task.startPlanned)}
                                onChange={(e) => {
                                  updateTask(task._idx, "startPlanned", e.target.value || null);
                                  if (!isTrip) updateTask(task._idx, "startActual", e.target.value || null);
                                }}
                              />
                            ) : (
                              <span className="whitespace-nowrap">{formatDT(task.startPlanned)}</span>
                            )}
                          </TableCell>
                          <TableCell className="h-8 text-xs px-1 py-0.5">
                            {canEditPlanned ? (
                              <Input
                                type="datetime-local"
                                className="h-6 text-[9px] px-0 w-[110px]"
                                value={toDatetimeLocal(task.endPlanned)}
                                onChange={(e) => {
                                  updateTask(task._idx, "endPlanned", e.target.value || null);
                                  if (!isTrip) updateTask(task._idx, "endActual", e.target.value || null);
                                }}
                              />
                            ) : (
                              <span className="whitespace-nowrap">{formatDT(task.endPlanned)}</span>
                            )}
                          </TableCell>
                          <TableCell className="h-8 text-xs px-1 py-0.5 whitespace-nowrap">
                            {formatDT(!isTrip ? task.startPlanned : task.startActual)}
                          </TableCell>
                          <TableCell className="h-8 text-xs px-1 py-0.5 whitespace-nowrap">
                            {formatDT(!isTrip ? task.endPlanned : task.endActual)}
                          </TableCell>
                          <TableCell className="h-7 px-1.5 py-0.5">
                            <div className="flex gap-0.5 justify-center">
                              {isTrip && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" title="Detalhe">
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" title="Criar Retorno" onClick={() => setCreateReturnIdx(task._idx)}>
                                    <RotateCcw className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="Excluir" onClick={() => setDeleteTaskIdx(task._idx)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between pt-1.5 border-t border-border">
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={addActivity}>
                <Plus className="h-3 w-3" /> Atividade
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={addTrip}>
                <Plus className="h-3 w-3" /> Viagem
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1">
                <ClipboardList className="h-3 w-3" /> Ver Jornadas
              </Button>
            </div>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={onClose}>
                <X className="h-3 w-3" /> Cancelar
              </Button>
              <Button size="sm" className="h-7 text-[11px] gap-1" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </FloatingPanel>

      {/* Line search modal */}
      <LineSearchModal
        open={lineModalOpen}
        onOpenChange={setLineModalOpen}
        onSelect={(id, item) => {
          if (lineModalTaskIdx !== null) {
            updateTaskMulti(lineModalTaskIdx, {
              lineId: id,
              lineCode: item.code || "",
              locationOrigCode: item.locationOrigCode || ((item.locationOrig as any)?.code) || "",
              locationDestCode: item.locationDestCode || ((item.locationDest as any)?.code) || "",
            });
          }
          setLineModalOpen(false);
        }}
      />

      {/* Activity search modal */}
      <ActivitySearchModal
        open={activityModalOpen}
        onOpenChange={setActivityModalOpen}
        onSelect={(id, item) => {
          if (activityModalTaskIdx !== null) {
            // Build today's date + activity default times
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
            const extractHHMM = (v: unknown) => {
              if (!v) return null;
              const m = String(v).match(/T(\d{2}:\d{2})/);
              return m ? m[1] : null;
            };
            const startHHMM = extractHHMM(item.start);
            const endHHMM = extractHHMM(item.end);
            const startVal = startHHMM ? `${todayStr}T${startHHMM}:00` : null;
            const endVal = endHHMM ? `${todayStr}T${endHHMM}:00` : null;
            updateTaskMulti(activityModalTaskIdx, {
              activityId: id,
              activityCode: item.code || "",
              startPlanned: startVal,
              endPlanned: endVal,
              startActual: startVal,
              endActual: endVal,
            });
          }
          setActivityModalOpen(false);
        }}
      />

      {/* DailyTrip search modal */}
      <DailyTripSearchModal
        open={dailyTripModalOpen}
        onOpenChange={setDailyTripModalOpen}
        onSelect={(id, item) => {
          if (dailyTripModalTaskIdx !== null) {
            const locationOrig = item.locationOrig as Record<string, unknown> | null;
            const locationDest = item.locationDest as Record<string, unknown> | null;
            const line = item.line as Record<string, unknown> | null;
            updateTaskMulti(dailyTripModalTaskIdx, {
              dailyTripId: id,
              demand: item.demand || item.sto || "",
              dt: item.dt || item.dailyTripCode || "",
              sto: item.sto || item.demand || "",
              lineId: item.lineId || "",
              lineCode: item.lineCode || line?.code || "",
              locationOrigCode: item.locationOrigCode || locationOrig?.code || "",
              locationDestCode: item.locationDestCode || locationDest?.code || "",
              startPlanned: item.startPlanned || "",
              endPlanned: item.endPlanned || "",
              startActual: item.startActual || "",
              endActual: item.endActual || "",
            });
          }
          setDailyTripModalOpen(false);
        }}
      />

      <AlertDialog open={deleteTaskIdx !== null} onOpenChange={(open) => !open && setDeleteTaskIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este item do circuito?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTaskIdx !== null && removeTask(deleteTaskIdx)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create return confirm */}
      <AlertDialog open={createReturnIdx !== null} onOpenChange={(open) => !open && setCreateReturnIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Criar Retorno</AlertDialogTitle>
            <AlertDialogDescription>Deseja criar uma viagem de retorno a partir desta viagem?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => createReturnIdx !== null && handleCreateReturn(createReturnIdx)}>Criar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
