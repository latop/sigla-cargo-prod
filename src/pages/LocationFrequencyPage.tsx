import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { authFetch } from "@/lib/auth-fetch";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LookupSearchField } from "@/components/LookupSearchField";
import { DatePickerField } from "@/components/DatePickerField";
import { Search, Plus, Trash2, Clock, Package, Loader2, X, Pencil, Save } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* ── API data shape ── */
interface LocationFrequencyAPI {
  id?: string;
  locationId: string;
  startDate: string;
  endDate: string;
  freqMon: number;
  freqTue: number;
  freqWed: number;
  freqThu: number;
  freqFri: number;
  freqSat: number;
  freqSun: number;
  startOperationTime: string;
  endOperationTime: string;
  qtyOperations: number;
  movType: string;
}

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const FREQ_FIELDS = ["freqMon", "freqTue", "freqWed", "freqThu", "freqFri", "freqSat", "freqSun"] as const;

const MOV_TYPES = ["CARGA", "DESCARGA"] as const;

function parseTime(raw: string | null | undefined): string {
  if (!raw) return "00:00";
  const match = raw.match(/(\d{2}:\d{2})/);
  return match ? match[1] : "00:00";
}

function toApiTime(hhmm: string): string {
  return `1970-01-01T${hhmm}:00`;
}

function formatDate(raw: string | null | undefined): string {
  if (!raw) return "--";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("pt-BR");
}

/** Extract YYYY-MM-DD from ISO string */
function toInputDate(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.substring(0, 10);
}

function getActiveDays(item: LocationFrequencyAPI): boolean[] {
  return FREQ_FIELDS.map((f) => (item[f] ?? 0) > 0);
}

function todayStr(): string {
  return new Date().toISOString().substring(0, 10);
}

function buildPayload(
  locationId: string,
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
  movType: string,
  qtyOps: number,
  days: boolean[],
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    locationId,
    startDate: `${startDate}T00:00:00`,
    endDate: `${endDate}T00:00:00`,
    startOperationTime: toApiTime(startTime),
    endOperationTime: toApiTime(endTime),
    qtyOperations: qtyOps,
    movType,
  };
  FREQ_FIELDS.forEach((f, i) => {
    payload[f] = days[i] ? 1 : 0;
  });
  return payload;
}

export default function LocationFrequencyPage() {
  const { t } = useTranslation();
  usePageTitle(t("menu.locationFrequency"));

  const [locationId, setLocationId] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [locationName, setLocationName] = useState("");

  const [frequencies, setFrequencies] = useState<LocationFrequencyAPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // New slot form
  const [newStartDate, setNewStartDate] = useState(todayStr());
  const [newEndDate, setNewEndDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [newMovType, setNewMovType] = useState<string>("DESCARGA");
  const [newQtyOps, setNewQtyOps] = useState(1);
  const [newDays, setNewDays] = useState<boolean[]>([true, true, true, true, true, true, false]);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editMovType, setEditMovType] = useState("DESCARGA");
  const [editQtyOps, setEditQtyOps] = useState(1);
  const [editDays, setEditDays] = useState<boolean[]>([true, true, true, true, true, false, false]);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<LocationFrequencyAPI | null>(null);

  const dayLabel = (idx: number) => t(`line.${DAY_KEYS[idx]}`);
  const dayLabelShort = (idx: number) => dayLabel(idx).substring(0, 3);

  const fetchFrequencies = useCallback(async () => {
    if (!locationId) {
      toast.error(t("locationFrequency.locationRequired"));
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await authFetch(`/LocationFrequency?LocationId=${locationId}&PageSize=500`);
      if (res.ok) {
        const data = await res.json();
        const items: LocationFrequencyAPI[] = Array.isArray(data) ? data : data.items || data.data || [];
        setFrequencies(items);
      } else {
        toast.error(t("common.genericError"));
      }
    } catch {
      toast.error(t("common.genericError"));
    } finally {
      setLoading(false);
    }
  }, [locationId, t]);

  const handleSelectLocation = (loc: any) => {
    setLocationId(loc.id || loc.locationId);
    setLocationCode(loc.code);
    setLocationName(loc.name || loc.description);
    setFrequencies([]);
    setHasSearched(false);
    setEditId(null);
  };

  const toggleNewDay = (idx: number) => {
    setNewDays((prev) => { const c = [...prev]; c[idx] = !c[idx]; return c; });
  };

  const toggleEditDay = (idx: number) => {
    setEditDays((prev) => { const c = [...prev]; c[idx] = !c[idx]; return c; });
  };

  /* ── CREATE ── */
  const addSlot = async () => {
    if (!locationId) return;
    if (!newDays.some(Boolean)) {
      toast.error(t("locationFrequency.selectAtLeastOneDay"));
      return;
    }
    if (!newStartDate || !newEndDate) {
      toast.error("Informe a vigência início e fim.");
      return;
    }
    if (newStartDate > newEndDate) {
      toast.error("Data início da vigência deve ser menor ou igual à data fim.");
      return;
    }
    if (!newStartTime || !newEndTime) {
      toast.error("Informe o horário de início e fim.");
      return;
    }
    if (newStartTime >= newEndTime) {
      toast.error("Horário de início deve ser menor que o horário de fim.");
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(locationId, newStartDate, newEndDate, newStartTime, newEndTime, newMovType, newQtyOps, newDays);
      const res = await authFetch("/LocationFrequency", { method: "POST", body: JSON.stringify(payload) });
      if (res.ok) {
        toast.success(t("common.saveSuccess"));
        await fetchFrequencies();
      } else {
        const errBody = await res.text();
        console.error("[LocationFrequency] POST error:", res.status, errBody);
        toast.error(t("common.genericError"));
      }
    } catch {
      toast.error(t("common.genericError"));
    } finally {
      setSaving(false);
    }
  };

  /* ── EDIT ── */
  const startEdit = (item: LocationFrequencyAPI) => {
    setEditId(item.id || null);
    setEditStartDate(toInputDate(item.startDate));
    setEditEndDate(toInputDate(item.endDate));
    setEditStartTime(parseTime(item.startOperationTime));
    setEditEndTime(parseTime(item.endOperationTime));
    setEditMovType(item.movType);
    setEditQtyOps(item.qtyOperations);
    setEditDays(getActiveDays(item));
  };

  const cancelEdit = () => setEditId(null);

  const saveEdit = async () => {
    if (!editId) return;
    if (!editDays.some(Boolean)) {
      toast.error(t("locationFrequency.selectAtLeastOneDay"));
      return;
    }
    if (!editStartDate || !editEndDate) {
      toast.error("Informe a vigência início e fim.");
      return;
    }
    if (editStartDate > editEndDate) {
      toast.error("Data início da vigência deve ser menor ou igual à data fim.");
      return;
    }
    if (!editStartTime || !editEndTime) {
      toast.error("Informe o horário de início e fim.");
      return;
    }
    if (editStartTime >= editEndTime) {
      toast.error("Horário de início deve ser menor que o horário de fim.");
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(locationId, editStartDate, editEndDate, editStartTime, editEndTime, editMovType, editQtyOps, editDays);
      const res = await authFetch(`/LocationFrequency/${editId}`, { method: "PUT", body: JSON.stringify(payload) });
      if (res.ok) {
        toast.success(t("common.saveSuccess"));
        setEditId(null);
        await fetchFrequencies();
      } else {
        const errBody = await res.text();
        console.error("[LocationFrequency] PUT error:", res.status, errBody);
        toast.error(t("common.genericError"));
      }
    } catch {
      toast.error(t("common.genericError"));
    } finally {
      setSaving(false);
    }
  };

  /* ── DELETE ── */
  const deleteItem = async (item: LocationFrequencyAPI) => {
    if (!item.id) return;
    setSaving(true);
    try {
      const res = await authFetch(`/LocationFrequency/${item.id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        toast.success(t("common.deleteSuccess"));
        setFrequencies((prev) => prev.filter((f) => f.id !== item.id));
      } else {
        toast.error(t("common.genericError"));
      }
    } catch {
      toast.error(t("common.genericError"));
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  };

  const sortedFrequencies = [...frequencies].sort((a, b) => {
    const sdA = a.startDate || "";
    const sdB = b.startDate || "";
    if (sdA !== sdB) return sdA.localeCompare(sdB);
    const stA = a.startOperationTime || "";
    const stB = b.startOperationTime || "";
    return stA.localeCompare(stB);
  });

  /* TimeInput is defined outside the component to avoid re-mount — see top of file */

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">
          {t("menu.locationFrequency")}
        </h1>
      </div>

      {/* Location selector */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-3">
              <Label className="text-xs mb-1 block whitespace-nowrap">
                {t("menu.location")} <span className="text-destructive">✱</span>
              </Label>
              <LookupSearchField
                endpoint="Location"
                value={locationId}
                onChange={(id, item) => {
                  if (id && item) {
                    handleSelectLocation(item);
                  } else {
                    setLocationId("");
                    setLocationCode("");
                    setLocationName("");
                    setFrequencies([]);
                    setHasSearched(false);
                  }
                }}
                nullable
                placeholder={t("locationFrequency.selectLocation")}
                initialLabel={locationCode ? `${locationCode} - ${locationName}` : undefined}
                forceModal
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={fetchFrequencies} disabled={!locationId || loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Search className="h-3.5 w-3.5 mr-1" />}
                {t("common.search")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                setLocationId(""); setLocationCode(""); setLocationName("");
                setFrequencies([]); setHasSearched(false); setEditId(null);
              }}>
                <X className="h-3.5 w-3.5 mr-1" />{t("common.clear")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasSearched && locationId && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t("locationFrequency.timeSlots")}
                <Badge variant="outline" className="ml-auto">
                  {frequencies.length} {frequencies.length === 1 ? t("locationFrequency.slot") : t("locationFrequency.slots")}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* ── ADD FORM (2 lines) ── */}
              <div className="space-y-2 rounded-md border border-dashed border-primary/30 p-3 bg-primary/5">
                <div className="flex items-end gap-2 flex-wrap">
                  <div>
                    <Label className="text-xs whitespace-nowrap">Vigência Início <span className="text-destructive">✱</span></Label>
                    <DatePickerField
                      value={newStartDate ? `${newStartDate}T00:00:00` : null}
                      onChange={(v) => setNewStartDate(v ? v.substring(0, 10) : "")}
                      className="w-[150px]"
                      inputClassName="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs whitespace-nowrap">Vigência Fim <span className="text-destructive">✱</span></Label>
                    <DatePickerField
                      value={newEndDate ? `${newEndDate}T00:00:00` : null}
                      onChange={(v) => setNewEndDate(v ? v.substring(0, 10) : "")}
                      className="w-[150px]"
                      inputClassName="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs whitespace-nowrap">Hr. Início <span className="text-destructive">✱</span></Label>
                    <input type="time" className="h-7 w-[90px] text-xs font-mono rounded-md border border-input bg-background px-2" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs whitespace-nowrap">Hr. Fim <span className="text-destructive">✱</span></Label>
                    <input type="time" className="h-7 w-[90px] text-xs font-mono rounded-md border border-input bg-background px-2" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs whitespace-nowrap">Tipo Mov.</Label>
                    <Select value={newMovType} onValueChange={setNewMovType}>
                      <SelectTrigger className="w-[110px] h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MOV_TYPES.map((mt) => <SelectItem key={mt} value={mt}>{mt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs whitespace-nowrap">Qtd. Op.</Label>
                    <Input type="number" min={0} className="h-7 w-16 text-xs" value={newQtyOps} onChange={(e) => setNewQtyOps(parseInt(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {DAY_KEYS.map((_, idx) => (
                    <label key={idx} className="flex items-center gap-1 cursor-pointer">
                      <Checkbox checked={newDays[idx]} onCheckedChange={() => toggleNewDay(idx)} className="h-3.5 w-3.5" />
                      <span className="text-xs">{dayLabelShort(idx)}</span>
                    </label>
                  ))}
                  <Button onClick={addSlot} disabled={saving || !newDays.some(Boolean)} size="sm" className="h-7 text-xs ml-auto">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                    {t("locationFrequency.addNewSlot")}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* ── TABLE ── */}
              {sortedFrequencies.length > 0 ? (
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs px-2">Vig. Início</TableHead>
                        <TableHead className="text-xs px-2">Vig. Fim</TableHead>
                        <TableHead className="text-xs px-2">Hr. Início</TableHead>
                        <TableHead className="text-xs px-2">Hr. Fim</TableHead>
                        <TableHead className="text-xs px-2">Tipo Mov.</TableHead>
                        <TableHead className="text-xs px-2">Qtd. Op.</TableHead>
                        <TableHead className="text-xs px-2">{t("locationFrequency.daysOfWeek")}</TableHead>
                        <TableHead className="text-xs px-2 text-right w-[80px]">{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedFrequencies.map((item, idx) => {
                        const isEditing = editId === item.id;
                        const activeDays = getActiveDays(item);

                        if (isEditing) {
                          return (
                            <TableRow key={item.id} className="bg-primary/5">
                              <TableCell className="px-2 py-1">
                                <DatePickerField
                                  value={editStartDate ? `${editStartDate}T00:00:00` : null}
                                  onChange={(v) => setEditStartDate(v ? v.substring(0, 10) : "")}
                                  className="w-[140px]"
                                  inputClassName="text-xs"
                                />
                              </TableCell>
                              <TableCell className="px-2 py-1">
                                <DatePickerField
                                  value={editEndDate ? `${editEndDate}T00:00:00` : null}
                                  onChange={(v) => setEditEndDate(v ? v.substring(0, 10) : "")}
                                  className="w-[140px]"
                                  inputClassName="text-xs"
                                />
                              </TableCell>
                              <TableCell className="px-2 py-1">
                                <input type="time" className="h-7 w-[90px] text-xs font-mono rounded-md border border-input bg-background px-2" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} />
                              </TableCell>
                              <TableCell className="px-2 py-1">
                                <input type="time" className="h-7 w-[90px] text-xs font-mono rounded-md border border-input bg-background px-2" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} />
                              </TableCell>
                              <TableCell className="px-2 py-1">
                                <Select value={editMovType} onValueChange={setEditMovType}>
                                  <SelectTrigger className="w-[100px] h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {MOV_TYPES.map((mt) => <SelectItem key={mt} value={mt}>{mt}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="px-2 py-1">
                                <Input type="number" min={0} className="h-7 w-14 text-xs" value={editQtyOps} onChange={(e) => setEditQtyOps(parseInt(e.target.value) || 0)} />
                              </TableCell>
                              <TableCell className="px-2 py-1">
                                <div className="flex gap-1 flex-wrap">
                                  {DAY_KEYS.map((_, dayIdx) => (
                                    <label key={dayIdx} className="cursor-pointer">
                                      <Badge
                                        variant={editDays[dayIdx] ? "default" : "outline"}
                                        className={`text-[10px] px-1.5 py-0 cursor-pointer ${!editDays[dayIdx] ? "opacity-40" : ""}`}
                                        onClick={() => toggleEditDay(dayIdx)}
                                      >
                                        {dayLabelShort(dayIdx)}
                                      </Badge>
                                    </label>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="px-2 py-1 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={saveEdit} disabled={saving}>
                                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return (
                          <TableRow key={item.id || idx} className={idx % 2 === 1 ? "bg-muted/30" : ""}>
                            <TableCell className="text-xs px-2 py-1">{formatDate(item.startDate)}</TableCell>
                            <TableCell className="text-xs px-2 py-1">{formatDate(item.endDate)}</TableCell>
                            <TableCell className="font-mono text-xs px-2 py-1">{parseTime(item.startOperationTime)}</TableCell>
                            <TableCell className="font-mono text-xs px-2 py-1">{parseTime(item.endOperationTime)}</TableCell>
                            <TableCell className="px-2 py-1">
                              <Badge variant={item.movType === "CARGA" ? "default" : "secondary"} className="text-[10px]">
                                {item.movType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs px-2 py-1">{item.qtyOperations}</TableCell>
                            <TableCell className="px-2 py-1">
                              <div className="flex gap-1 flex-wrap">
                                {DAY_KEYS.map((_, dayIdx) => (
                                  <Badge
                                    key={dayIdx}
                                    variant={activeDays[dayIdx] ? "default" : "outline"}
                                    className={`text-[10px] px-1.5 py-0 ${!activeDays[dayIdx] ? "opacity-30" : ""}`}
                                  >
                                    {dayLabelShort(dayIdx)}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="px-2 py-1 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(item)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(item)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {t("locationFrequency.noSlots")}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && t("locationFrequency.confirmDeleteSlot", {
                start: parseTime(deleteTarget.startOperationTime),
                end: parseTime(deleteTarget.endOperationTime),
                days: getActiveDays(deleteTarget).map((a, i) => a ? dayLabel(i) : null).filter(Boolean).join(", "),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteItem(deleteTarget)}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
