import { useState } from "react";
import { Plus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { DatePickerField } from "@/components/DatePickerField";
import { LineSearchModal } from "@/components/LineSearchModal";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/config/api";

interface LookupItem {
  id: string;
  code?: string;
  name?: string;
  [k: string]: unknown;
}

interface DailyTripSection {
  [k: string]: unknown;
}

interface DailyTripItem {
  [k: string]: unknown;
  dailyTripSections?: DailyTripSection[];
}

interface DailyTripDetailResponse {
  dailyTrip: DailyTripItem;
  dailyTripSections: DailyTripSection[];
  timeWorkedLastDay?: string | null;
  isRest?: boolean;
  nickName?: string;
}

interface NewTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTripGenerated: (data: Partial<DailyTripItem>) => void;
}

export function NewTripDialog({ open, onOpenChange, onTripGenerated }: NewTripDialogProps) {
  const { toast } = useToast();
  const [startPlanned, setStartPlanned] = useState("");
  const [lineId, setLineId] = useState("");
  const [lineLabel, setLineLabel] = useState("");
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [origLabel, setOrigLabel] = useState("");
  const [destLabel, setDestLabel] = useState("");
  const [origId, setOrigId] = useState("");
  const [destId, setDestId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLineSelect = (id: string, item: Record<string, unknown>) => {
    setLineId(id);
    setLineLabel((item.code as string) || "");
    const locationOrig = item.locationOrig as LookupItem | null;
    const locationDest = item.locationDest as LookupItem | null;
    if (locationOrig?.id) { setOrigId(locationOrig.id); setOrigLabel(locationOrig.code || ""); }
    if (locationDest?.id) { setDestId(locationDest.id); setDestLabel(locationDest.code || ""); }
  };

  const handleConfirm = async () => {
    if (!startPlanned || !lineId) {
      toast({ title: "Preencha o Início Previsto e selecione uma Linha.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const startTimeFormatted = startPlanned.replace("T", " ").substring(0, 16);
      const res = await fetch(`${API_BASE}/DailyTrip/getdailytripdetail?lineId=${lineId}&startTime=${encodeURIComponent(startTimeFormatted)}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const response: DailyTripDetailResponse = await res.json();

      const trip = response.dailyTrip;
      const sections = response.dailyTripSections || trip.dailyTripSections || [];
      const detail: DailyTripItem = {
        ...trip,
        dailyTripSections: sections.map((s) => {
          const { id, dailyTripId, ...rest } = s as any;
          return rest;
        }),
        tripNumber: "0",
        nickName: response.nickName ?? "",
        timeWorkedLastDay: response.timeWorkedLastDay ?? null,
        isRest: response.isRest ?? false,
      };
      delete detail.id;

      onTripGenerated(detail);
      onOpenChange(false);
      // Reset
      setStartPlanned("");
      setLineId("");
      setLineLabel("");
      setOrigLabel("");
      setDestLabel("");
      setOrigId("");
      setDestId("");
    } catch (err: any) {
      toast({ title: "Erro ao gerar viagem", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-display">Nova Viagem Diária</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Informe o início previsto e selecione a linha para gerar a viagem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Linha <span className="text-destructive">*</span></Label>
              <div className="flex gap-1">
                <Input
                  readOnly
                  value={lineLabel}
                  placeholder="Selecione uma linha..."
                  className="h-8 text-xs flex-1 cursor-pointer"
                  onClick={() => setLineModalOpen(true)}
                />
                <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setLineModalOpen(true)}>
                  <Search className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Origem da linha</Label>
                <Input readOnly value={origLabel} placeholder="—" className="h-8 text-xs bg-muted/50" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Destino da linha</Label>
                <Input readOnly value={destLabel} placeholder="—" className="h-8 text-xs bg-muted/50" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Início Previsto <span className="text-destructive">*</span></Label>
                <DatePickerField
                  value={startPlanned ? `${startPlanned}:00` : null}
                  onChange={(v) => setStartPlanned(v ? v.substring(0, 16) : "")}
                  includeTime
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button size="sm" className="h-8 text-xs gap-1" onClick={handleConfirm} disabled={loading || !startPlanned || !lineId}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Gerar Viagem
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <LineSearchModal
        open={lineModalOpen}
        onOpenChange={setLineModalOpen}
        onSelect={handleLineSelect}
        initialOrigId={origId}
        initialDestId={destId}
      />
    </>
  );
}
