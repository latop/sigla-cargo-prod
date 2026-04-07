import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Loader2, Save, X, Plus, Trash2, Search,
  MessageSquare, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FloatingPanel } from "@/components/FloatingPanel";
import { LookupSearchField } from "@/components/LookupSearchField";
import { LineSearchModal } from "@/components/LineSearchModal";
import { DatePickerField } from "@/components/DatePickerField";
import { API_BASE } from "@/config/api";

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
  distanceplanned?: number | null;
  distanceactual?: number | null;
  [k: string]: unknown;
}

interface DailyTripDetailResponse {
  dailyTrip: DailyTripItem;
  dailyTripSections: DailyTripSection[];
  timeWorkedLastDay?: string | null;
  isRest?: boolean;
  nickName?: string;
}

// --- API ---
const fetchLookup = async (endpoint: string): Promise<LookupItem[]> => {
  const res = await fetch(`${API_BASE}/${endpoint}?PageSize=999`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const fetchDailyTripDetail = async (id: string): Promise<DailyTripDetailResponse> => {
  const res = await fetch(`${API_BASE}/DailyTrip/getdailytripdetail?dailyTripId=${id}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const updateDailyTripFull = async (payload: { dailyTrip: Record<string, unknown>; dailyTripSections: Record<string, unknown>[] }): Promise<string> => {
  const res = await fetch(`${API_BASE}/DailyTrip/updatedailytrip`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.text();
};

const createDailyTrip = async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const res = await fetch(`${API_BASE}/DailyTrip`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const createDailyTripSection = async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const res = await fetch(`${API_BASE}/DailyTripSection`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const LOCATION_MODAL_COLUMNS = ["code", "name", "codeIntegration2"];
const LOCATION_COLUMN_LABELS: Record<string, string> = { code: "Código", name: "Nome", codeIntegration2: "Cód. Integração TMS" };

interface DailyTripEditPanelProps {
  /** Trip ID for edit mode */
  tripId?: string;
  /** Initial data for create mode (no tripId) */
  initialData?: Record<string, unknown>;
  onClose: () => void;
  onSaved?: () => void;
}

export function DailyTripEditPanel({ tripId, initialData, onClose, onSaved }: DailyTripEditPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isCreateMode = !tripId && !!initialData;

  const [formData, setFormData] = useState<Partial<DailyTripItem>>({});
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(!isCreateMode);
  const [originalSectionIds, setOriginalSectionIds] = useState<string[]>([]);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [justificationDialogOpen, setJustificationDialogOpen] = useState(false);
  const [sectionNotesIdx, setSectionNotesIdx] = useState<number | null>(null);
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [lineDisplayLabel, setLineDisplayLabel] = useState("");
  const [activeSectionTab, setActiveSectionTab] = useState("0");

  // Lookups
  const { data: fleetGroups } = useQuery<LookupItem[]>({ queryKey: ["fleet-groups"], queryFn: () => fetchLookup("FleetGroup") });
  const { data: tripTypes } = useQuery<LookupItem[]>({ queryKey: ["trip-types"], queryFn: () => fetchLookup("TripType") });
  const { data: companies } = useQuery<LookupItem[]>({ queryKey: ["companies"], queryFn: () => fetchLookup("Companies") });
  const { data: justifications } = useQuery<LookupItem[]>({ queryKey: ["justifications"], queryFn: () => fetchLookup("Justification") });
  const { data: locationGroups } = useQuery<LookupItem[]>({ queryKey: ["location-groups-dt"], queryFn: () => fetchLookup("LocationGroup") });

  // Load trip detail (edit mode)
  useEffect(() => {
    if (isCreateMode) {
      // Create mode: use initialData
      const data = initialData as Partial<DailyTripItem>;
      setFormData(data);
      setLineDisplayLabel(data.line?.code ?? "");
      setOriginalSectionIds([]);
      setLoading(false);
      return;
    }
    if (!tripId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const response = await fetchDailyTripDetail(tripId);
        if (cancelled) return;
        const trip = response.dailyTrip;
        const sections = response.dailyTripSections || trip.dailyTripSections || [];
        setFormData({
          ...trip,
          dailyTripSections: sections,
          tripNumber: trip.tripNumber != null ? String(trip.tripNumber) : null,
          nickName: response.nickName ?? (trip as any).nickName ?? "",
          timeWorkedLastDay: response.timeWorkedLastDay ?? null,
          isRest: response.isRest ?? false,
        });
        setLineDisplayLabel(trip.line?.code ?? "");
        setOriginalSectionIds(sections.filter((s) => s.id).map((s) => s.id!));
      } catch (err: any) {
        toast({ title: "Erro ao carregar detalhe", description: err.message, variant: "destructive" });
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tripId]);

  const lookupLabel = (item: LookupItem) => {
    const parts: string[] = [];
    if (item.code) parts.push(item.code);
    if (item.description) parts.push(item.description);
    if (parts.length === 0 && item.name) parts.push(item.name);
    return parts.join(" - ") || item.id;
  };

  const updateForm = (field: string, value: unknown) => {
    setFormData((p) => ({ ...p, [field]: value === "" ? null : value }));
  };

  const updateSection = (index: number, field: string, value: unknown) => {
    setFormData((p) => ({
      ...p,
      dailyTripSections: (p.dailyTripSections || []).map((s, i) =>
        i === index ? { ...s, [field]: value === "" ? null : value } : s
      ),
    }));
  };

  const addSection = () => {
    const sections = formData.dailyTripSections || [];
    const nextSection = sections.length > 0 ? Math.max(...sections.map((s) => s.section || 0)) + 1 : 1;
    const newIndex = sections.length;
    setFormData((p) => ({
      ...p,
      dailyTripSections: [...(p.dailyTripSections || []), {
        id: undefined, section: nextSection,
        locationOrigId: null, locationDestId: null,
        startPlanned: null, endPlanned: null,
        startActual: null, endActual: null,
        startEstimated: null, endEstimated: null,
        truckId: null, driverId: null,
        flgStatus: "N", notes: null, stopTypeId: null,
      }],
    }));
    setActiveSectionTab(String(newIndex));
  };

  const removeSection = (index: number) => {
    setFormData((p) => {
      const newSections = (p.dailyTripSections || []).filter((_, i) => i !== index);
      return { ...p, dailyTripSections: newSections.map((s, i) => ({ ...s, section: i + 1 })) };
    });
    const totalAfter = (formData.dailyTripSections || []).length - 1;
    const currentIdx = parseInt(activeSectionTab);
    if (totalAfter === 0) setActiveSectionTab("0");
    else if (currentIdx >= totalAfter) setActiveSectionTab(String(totalAfter - 1));
    else if (index < currentIdx) setActiveSectionTab(String(currentIdx - 1));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
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

      if (isCreateMode) {
        // CREATE: POST master then sections
        const savedTrip = await createDailyTrip(tripPayload);
        const newTripId = savedTrip.id as string;
        for (const section of sections) {
          await createDailyTripSection({ ...section, dailyTripId: newTripId });
        }
        return savedTrip;
      } else {
        // UPDATE
        tripPayload.id = formData.id;
        const fullPayload = {
          dailyTrip: { ...tripPayload, dailyTripSections: sections, tripNumber: tripPayload.tripNumber ?? "0" },
          dailyTripSections: sections,
          timeWorkedLastDay: formData.timeWorkedLastDay ?? null,
          isRest: formData.isRest ?? false,
          nickName: formData.nickName ?? "",
        };
        return updateDailyTripFull(fullPayload);
      }
    },
    onSuccess: () => {
      toast({ title: t("common.saveSuccess"), variant: "success" });
      onSaved?.();
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    const errors: Record<string, boolean> = {};
    if (!formData.tripDate) errors.tripDate = true;
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({ title: t("common.requiredFields"), variant: "destructive" });
      return;
    }
    setFormErrors({});
    saveMutation.mutate();
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

  const panelTitle = isCreateMode
    ? `Nova ${t("menu.dailyTrip")}`
    : `${t("common.edit")} ${t("menu.dailyTrip")}`;

  return (
    <>
      <FloatingPanel title={panelTitle} onClose={onClose} width={1100}>
        <div className="space-y-3 pt-2">
          <input type="hidden" value={formData.tripNumber ?? ""} />

          {/* Row 1 */}
          <div className="grid grid-cols-6 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Data da Viagem <span className="text-destructive">*</span></Label>
              <DatePickerField value={formData.tripDate} onChange={(v) => updateForm("tripDate", v)} hasError={formErrors.tripDate} />
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
                <Button type="button" variant={formData.notes ? "default" : "outline"} size="sm" className="h-8 text-xs gap-1 flex-1" onClick={() => setNotesDialogOpen(true)}>
                  <MessageSquare className="h-3.5 w-3.5" /> Obs.
                </Button>
                <Button type="button" variant={formData.justificationId ? "default" : "outline"} size="sm" className="h-8 text-xs gap-1 flex-1" onClick={() => setJustificationDialogOpen(true)}>
                  <AlertTriangle className="h-3.5 w-3.5" /> Just.
                </Button>
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-6 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Origem</Label>
              <LookupSearchField endpoint="Location" labelFn="codeOnly" searchFilterParam="Filter1String" value={formData.locationOrigId || ""} onChange={(id) => updateForm("locationOrigId", id)} placeholder="Origem..." nullable modalVisibleColumns={LOCATION_MODAL_COLUMNS} columnLabels={LOCATION_COLUMN_LABELS} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Destino</Label>
              <LookupSearchField endpoint="Location" labelFn="codeOnly" searchFilterParam="Filter1String" value={formData.locationDestId || ""} onChange={(id) => updateForm("locationDestId", id)} placeholder="Destino..." nullable modalVisibleColumns={LOCATION_MODAL_COLUMNS} columnLabels={LOCATION_COLUMN_LABELS} />
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
                <div className="flex items-center h-8 w-full rounded-md border border-input bg-background px-2 text-xs gap-1 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setLineModalOpen(true)}>
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
                  if (item.fleetGroupId) updateForm("fleetGroupId", String(item.fleetGroupId));
                  if (item.tripTypeId) updateForm("tripTypeId", String(item.tripTypeId));
                  if (item.distance != null) updateForm("distanceplanned", Number(item.distance));
                  try {
                    const res = await fetch(`${API_BASE}/LineSection/linessectionbyline?lineId=${id}`);
                    if (res.ok) {
                      const lineSections: Record<string, unknown>[] = await res.json();
                      if (lineSections.length > 0) {
                        const newSections: DailyTripSection[] = lineSections.map((ls, idx) => ({
                          id: undefined, section: idx + 1,
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

          {/* Row 3 */}
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

          {/* Notes Dialog */}
          <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-sm">Observações</DialogTitle>
                <DialogDescription className="sr-only">Campo de observações da viagem</DialogDescription>
              </DialogHeader>
              <Textarea className="text-xs min-h-[120px]" value={formData.notes || ""} onChange={(e) => updateForm("notes", e.target.value)} placeholder="Digite as observações..." />
              <div className="flex justify-end">
                <Button size="sm" className="text-xs" onClick={() => setNotesDialogOpen(false)}>Fechar</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Justification Dialog */}
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
                  <Textarea className="text-xs min-h-[80px]" value={(formData as any).justificationMessage || ""} onChange={(e) => updateForm("justificationMessage", e.target.value)} placeholder="Mensagem da justificativa..." />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                {formData.justificationId && (
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => { updateForm("justificationId", null); updateForm("justificationMessage", null); }}>Limpar</Button>
                )}
                <Button size="sm" className="text-xs" onClick={() => setJustificationDialogOpen(false)}>Fechar</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Sections */}
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
                        <div className="grid grid-cols-6 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Origem</Label>
                            <LookupSearchField endpoint="Location" labelFn="codeOnly" searchFilterParam="Filter1String" value={section.locationOrigId || ""} onChange={(id) => updateSection(idx, "locationOrigId", id)} placeholder="Origem..." nullable modalVisibleColumns={LOCATION_MODAL_COLUMNS} columnLabels={LOCATION_COLUMN_LABELS} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Destino</Label>
                            <LookupSearchField endpoint="Location" labelFn="codeOnly" searchFilterParam="Filter1String" value={section.locationDestId || ""} onChange={(id) => updateSection(idx, "locationDestId", id)} placeholder="Destino..." nullable modalVisibleColumns={LOCATION_MODAL_COLUMNS} columnLabels={LOCATION_COLUMN_LABELS} />
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
                            <LookupSearchField endpoint="Truck" labelFn="codeName" searchFilterParam="Filter1String" value={section.truckId || ""} onChange={(id) => updateSection(idx, "truckId", id)} placeholder="Veículo..." nullable transformItem={(item) => ({ ...item, code: item.licensePlate as string || "", name: item.fleetCode as string || "" })} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Motorista</Label>
                            <Input value={String(formData.nickName || "")} readOnly disabled placeholder="Motorista..." className="bg-muted" />
                          </div>
                        </div>
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
                            <Input value={section.stopType ? ((section.stopType as any).stopTypeCode || (section.stopType as any).code || "") : ""} readOnly disabled placeholder="Parada..." className="bg-muted" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">&nbsp;</Label>
                            <div className="flex gap-1">
                              <Button type="button" variant={section.notes ? "default" : "outline"} size="sm" className="h-8 text-xs gap-1 flex-1" onClick={() => setSectionNotesIdx(idx)}>
                                <MessageSquare className="h-3.5 w-3.5" /> Obs.
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeSection(idx)}>
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

              <Dialog open={sectionNotesIdx !== null} onOpenChange={(open) => { if (!open) setSectionNotesIdx(null); }}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-sm">Observações do Trecho {sectionNotesIdx !== null ? ((formData.dailyTripSections || [])[sectionNotesIdx]?.section || sectionNotesIdx + 1) : ""}</DialogTitle>
                    <DialogDescription className="sr-only">Campo de observações do trecho</DialogDescription>
                  </DialogHeader>
                  {sectionNotesIdx !== null && (
                    <Textarea className="text-xs min-h-[120px]" value={(formData.dailyTripSections || [])[sectionNotesIdx]?.notes || ""} onChange={(e) => updateSection(sectionNotesIdx, "notes", e.target.value)} placeholder="Digite as observações do trecho..." />
                  )}
                  <div className="flex justify-end">
                    <Button size="sm" className="text-xs" onClick={() => setSectionNotesIdx(null)}>Fechar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {t("common.save")}
            </Button>
          </div>
        </div>
      </FloatingPanel>
    </>
  );
}
