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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LookupSearchField } from "@/components/LookupSearchField";
import { Search, Plus, Trash2, Clock, Package, Loader2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LocationFrequency {
  id?: string;
  locationId: string;
  locationCode?: string;
  locationName?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  loadingCapacity: number;
  unloadingCapacity: number;
}

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 0]; // Mon=1 ... Sat=6, Sun=0

const DEFAULT_TIME_SLOTS = [
  "00:00", "01:00", "02:00", "03:00", "04:00", "05:00",
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
];

export default function LocationFrequencyPage() {
  const { t } = useTranslation();
  usePageTitle(t("menu.locationFrequency"));

  const [locationId, setLocationId] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [locationName, setLocationName] = useState("");

  const [frequencies, setFrequencies] = useState<LocationFrequency[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [hasSearched, setHasSearched] = useState(false);

  // New slot form
  const [newStartTime, setNewStartTime] = useState("06:00");
  const [newEndTime, setNewEndTime] = useState("07:00");
  const [newLoadCap, setNewLoadCap] = useState(1);
  const [newUnloadCap, setNewUnloadCap] = useState(1);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<LocationFrequency | null>(null);

  const dayLabel = (dayNum: number) => {
    const idx = DAY_NUMBERS.indexOf(dayNum);
    if (idx === -1) return "";
    return t(`line.${DAY_KEYS[idx]}`);
  };

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
        const items = Array.isArray(data) ? data : data.items || data.data || [];
        setFrequencies(items.map((item: any) => ({
          id: item.id || item.locationFrequencyId,
          locationId: item.locationId,
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime?.substring(0, 5) || item.startTime,
          endTime: item.endTime?.substring(0, 5) || item.endTime,
          loadingCapacity: item.loadingCapacity ?? item.qtyLoading ?? 0,
          unloadingCapacity: item.unloadingCapacity ?? item.qtyUnloading ?? 0,
        })));
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
  };

  const dayFrequencies = frequencies
    .filter((f) => f.dayOfWeek === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const addSlot = async () => {
    if (!locationId) return;
    if (newStartTime >= newEndTime) {
      toast.error(t("locationFrequency.invalidTimeRange"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        locationId,
        dayOfWeek: selectedDay,
        startTime: newStartTime,
        endTime: newEndTime,
        loadingCapacity: newLoadCap,
        unloadingCapacity: newUnloadCap,
      };
      const res = await authFetch("/LocationFrequency", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(t("common.saveSuccess"));
        await fetchFrequencies();
      } else {
        toast.error(t("common.genericError"));
      }
    } catch {
      toast.error(t("common.genericError"));
    } finally {
      setSaving(false);
    }
  };

  const deleteSlot = async (item: LocationFrequency) => {
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

  const updateSlot = async (item: LocationFrequency) => {
    if (!item.id) return;
    setSaving(true);
    try {
      const res = await authFetch(`/LocationFrequency/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({
          id: item.id,
          locationId: item.locationId || locationId,
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          loadingCapacity: item.loadingCapacity,
          unloadingCapacity: item.unloadingCapacity,
        }),
      });
      if (res.ok) {
        toast.success(t("common.saveSuccess"));
      } else {
        toast.error(t("common.genericError"));
      }
    } catch {
      toast.error(t("common.genericError"));
    } finally {
      setSaving(false);
    }
  };

  // Summary: count slots per day
  const daySummary = DAY_NUMBERS.map((dayNum) => {
    const count = frequencies.filter((f) => f.dayOfWeek === dayNum).length;
    const totalLoad = frequencies
      .filter((f) => f.dayOfWeek === dayNum)
      .reduce((s, f) => s + f.loadingCapacity, 0);
    const totalUnload = frequencies
      .filter((f) => f.dayOfWeek === dayNum)
      .reduce((s, f) => s + f.unloadingCapacity, 0);
    return { dayNum, count, totalLoad, totalUnload };
  });

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">
            {t("menu.locationFrequency")}
          </h1>
        </div>
      </div>

      {/* Location selector */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-3">
              <Label className="text-xs mb-1 block">{t("menu.location")} <span className="text-destructive">✱</span></Label>
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
          {/* Toolbar */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={fetchFrequencies} disabled={!locationId || loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Search className="h-3.5 w-3.5 mr-1" />}
                {t("common.search")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                setLocationId("");
                setLocationCode("");
                setLocationName("");
                setFrequencies([]);
                setHasSearched(false);
              }}>
              <X className="h-3.5 w-3.5 mr-1" />{t("common.clear")}
              </Button>
            </div>
            <Button size="sm" onClick={fetchFrequencies} disabled={!locationId}>
              <Plus className="h-3.5 w-3.5 mr-1" />{t("common.new")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasSearched && locationId && (
        <>
          {/* Day tabs - visual summary */}
          <div className="flex gap-2 flex-wrap">
            {daySummary.map(({ dayNum, count, totalLoad, totalUnload }) => (
              <button
                key={dayNum}
                onClick={() => setSelectedDay(dayNum)}
                className={`flex flex-col items-center px-4 py-2 rounded-lg border transition-colors min-w-[90px] ${
                  selectedDay === dayNum
                    ? "border-primary bg-primary/10 text-primary"
                    : count > 0
                    ? "border-border bg-card text-foreground hover:bg-muted"
                    : "border-dashed border-muted-foreground/30 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <span className="text-sm font-medium">{dayLabel(dayNum)}</span>
                {count > 0 ? (
                  <div className="flex gap-2 mt-1">
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">
                      C:{totalLoad}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      D:{totalUnload}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-[10px] mt-1">—</span>
                )}
              </button>
            ))}
          </div>

          {/* Grid for selected day */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {dayLabel(selectedDay)} — {t("locationFrequency.timeSlots")}
                <Badge variant="outline" className="ml-auto">
                  {dayFrequencies.length} {dayFrequencies.length === 1 ? "faixa" : "faixas"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing slots */}
              {dayFrequencies.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">{t("locationFrequency.start")}</TableHead>
                        <TableHead className="w-[140px]">{t("locationFrequency.end")}</TableHead>
                        <TableHead className="w-[140px]">
                          <div className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            {t("locationFrequency.loading")}
                          </div>
                        </TableHead>
                        <TableHead className="w-[140px]">
                          <div className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            {t("locationFrequency.unloading")}
                          </div>
                        </TableHead>
                        <TableHead className="w-[100px] text-right">{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dayFrequencies.map((slot, idx) => (
                        <TableRow key={slot.id || idx} className={idx % 2 === 1 ? "bg-muted/30" : ""}>
                          <TableCell className="font-mono text-sm">{slot.startTime}</TableCell>
                          <TableCell className="font-mono text-sm">{slot.endTime}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              className="h-8 w-20"
                              value={slot.loadingCapacity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setFrequencies((prev) =>
                                  prev.map((f) =>
                                    f.id === slot.id ? { ...f, loadingCapacity: val } : f
                                  )
                                );
                              }}
                              onBlur={() => updateSlot({ ...slot, loadingCapacity: slot.loadingCapacity })}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              className="h-8 w-20"
                              value={slot.unloadingCapacity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setFrequencies((prev) =>
                                  prev.map((f) =>
                                    f.id === slot.id ? { ...f, unloadingCapacity: val } : f
                                  )
                                );
                              }}
                              onBlur={() => updateSlot({ ...slot, unloadingCapacity: slot.unloadingCapacity })}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(slot)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {t("locationFrequency.noSlots")}
                </div>
              )}

              {/* Add new slot */}
              <Separator />
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <Label className="text-xs">{t("locationFrequency.start")}</Label>
                  <Select value={newStartTime} onValueChange={setNewStartTime}>
                    <SelectTrigger className="w-[100px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_TIME_SLOTS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t("locationFrequency.end")}</Label>
                  <Select value={newEndTime} onValueChange={setNewEndTime}>
                    <SelectTrigger className="w-[100px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_TIME_SLOTS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t("locationFrequency.loading")}</Label>
                  <Input
                    type="number"
                    min={0}
                    className="h-8 w-20"
                    value={newLoadCap}
                    onChange={(e) => setNewLoadCap(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs">{t("locationFrequency.unloading")}</Label>
                  <Input
                    type="number"
                    min={0}
                    className="h-8 w-20"
                    value={newUnloadCap}
                    onChange={(e) => setNewUnloadCap(parseInt(e.target.value) || 0)}
                  />
                </div>
                <Button onClick={addSlot} disabled={saving} size="sm">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  {t("common.add")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Location search modal removed - using LookupSearchField with forceModal */}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.confirmDeleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteSlot(deleteTarget)}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
