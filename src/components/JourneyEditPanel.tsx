import { useState, useEffect } from "react";
import { Loader2, Save, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { FloatingPanel } from "@/components/FloatingPanel";
import { LookupSearchField } from "@/components/LookupSearchField";
import { DatePickerField } from "@/components/DatePickerField";
import { authFetch } from "@/lib/auth-fetch";

interface JourneyEditPanelProps {
  journeyId?: string;
  onClose: () => void;
  onSaved?: () => void;
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

export function JourneyEditPanel({ journeyId, onClose, onSaved }: JourneyEditPanelProps) {
  const { toast } = useToast();
  const isCreateMode = !journeyId;

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(!isCreateMode);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isCreateMode) {
      setFormData({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await authFetch(`/Journey/${journeyId}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setFormData({
          ...data,
          id: data.journeyId || data.id,
          driverNickName: data.driver?.nickName || data.driverNickName || data.nickName || "",
          driverIntegrationCode: data.driver?.integrationCode || data.driverIntegrationCode || "",
          circuitCode: data.circuitDriver?.circuitCode || data.circuitCode || "",
        });
      } catch (err: any) {
        toast({ title: "Erro ao carregar jornada", description: err.message, variant: "destructive" });
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [journeyId]);

  const updateForm = (field: string, value: unknown) => {
    setFormData((p) => ({ ...p, [field]: value === "" ? null : value }));
  };

  const handleSave = async () => {
    if (isCreateMode && !formData.driverId) {
      toast({ title: "Campo obrigatório", description: "Selecione um motorista.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const method = isCreateMode ? "POST" : "PUT";
      const url = isCreateMode ? "/Journey" : `/Journey/${journeyId}`;
      const res = await authFetch(url, {
        method,
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      toast({ title: isCreateMode ? "Jornada criada com sucesso." : "Jornada atualizada com sucesso." });
      onSaved?.();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await authFetch(`/Journey/${journeyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      toast({ title: "Jornada excluída com sucesso." });
      setDeleteConfirm(false);
      onSaved?.();
    } catch {
      toast({ title: "Erro ao excluir jornada.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <FloatingPanel title="Carregando..." onClose={onClose} width={1300}>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </FloatingPanel>
    );
  }

  const panelTitle = isCreateMode ? "Nova Jornada" : "Editar Jornada";

  return (
    <>
      <FloatingPanel title={panelTitle} onClose={onClose} width={1300} maxHeight="50vh">
        <div className="flex flex-col h-[50vh] pt-1 gap-3">
          {/* Driver fields */}
          <div className="grid grid-cols-6 gap-2">
            <div className="col-span-2">
              <Label className="text-[10px]">Motorista {isCreateMode && <span className="text-destructive">*</span>}</Label>
              <LookupSearchField
                endpoint="Drivers"
                labelFn="codeName"
                searchFilterParam="Filter1String"
                value={(formData.driverId as string) || ""}
                onChange={(id, item) => {
                  updateForm("driverId", id);
                  if (item) {
                    updateForm("driverNickName", item.nickName || "");
                    updateForm("driverIntegrationCode", item.integrationCode || "");
                  }
                }}
                placeholder="Buscar motorista..."
                initialLabel={(formData.driverNickName as string) || ""}
                forceActiveOnly
                transformItem={(item) => ({
                  ...item,
                  code: (item.nickName as string) || "",
                  name: (item.integrationCode as string) || "",
                })}
                modalVisibleColumns={["nickName", "integrationCode"]}
                columnLabels={{ nickName: "Nome de Escala", integrationCode: "GPID" }}
                className="h-7 text-[11px]"
              />
            </div>
            <div>
              <Label className="text-[10px]">GPID</Label>
              <Input className="h-7 text-[11px]" value={(formData.driverIntegrationCode as string) || ""} disabled />
            </div>
            <div>
              <Label className="text-[10px]">Circuito</Label>
              <LookupSearchField
                endpoint="CircuitDriver"
                labelFn="codeOnly"
                searchFilterParam="Filter1String"
                value={(formData.circuitJourneyId as string) || ""}
                onChange={(id, item) => {
                  updateForm("circuitJourneyId", id);
                  if (item) updateForm("circuitCode", item.circuitCode || item.code || "");
                }}
                placeholder="Buscar circuito..."
                initialLabel={(formData.circuitCode as string) || ""}
                transformItem={(item) => ({
                  ...item,
                  code: (item.circuitCode as string) || (item.code as string) || "",
                  name: (item.nickName as string) || "",
                })}
                modalVisibleColumns={["circuitCode", "nickName"]}
                columnLabels={{ circuitCode: "Circuito", nickName: "Motorista" }}
                className="h-7 text-[11px]"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-[10px]">Observações</Label>
              <Textarea
                className="text-xs h-7 min-h-[28px] resize-none py-1"
                value={(formData.notes as string) || ""}
                onChange={(e) => updateForm("notes", e.target.value)}
                placeholder="Notas..."
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <Label className="text-[10px]">Início Planejado</Label>
              <Input
                type="datetime-local"
                className="h-7 text-[11px]"
                value={toDatetimeLocal(formData.startPlanned as string || formData.startDate as string)}
                onChange={(e) => updateForm("startPlanned", e.target.value || null)}
              />
            </div>
            <div>
              <Label className="text-[10px]">Fim Planejado</Label>
              <Input
                type="datetime-local"
                className="h-7 text-[11px]"
                value={toDatetimeLocal(formData.endPlanned as string || formData.endDate as string)}
                onChange={(e) => updateForm("endPlanned", e.target.value || null)}
              />
            </div>
            <div>
              <Label className="text-[10px]">Início Real</Label>
              <Input
                type="datetime-local"
                className="h-7 text-[11px]"
                value={toDatetimeLocal(formData.startActual as string)}
                onChange={(e) => updateForm("startActual", e.target.value || null)}
              />
            </div>
            <div>
              <Label className="text-[10px]">Fim Real</Label>
              <Input
                type="datetime-local"
                className="h-7 text-[11px]"
                value={toDatetimeLocal(formData.endActual as string)}
                onChange={(e) => updateForm("endActual", e.target.value || null)}
              />
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-border pt-2 pb-1">
            <div>
              {!isCreateMode && (
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setDeleteConfirm(true)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
                Cancelar
              </Button>
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </FloatingPanel>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta jornada?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
