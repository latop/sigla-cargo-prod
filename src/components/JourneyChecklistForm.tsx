import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ChevronDown, ClipboardCopy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/config/api";
import { DatePickerField } from "@/components/DatePickerField";
import { LookupSearchField } from "@/components/LookupSearchField";
import { FloatingPanel } from "@/components/FloatingPanel";
import { cn } from "@/lib/utils";

interface JourneyReleaseItem {
  saida?: string | null;
  entrega?: string | null;
  demanda?: string | null;
  dt?: string | null;
  destino?: string | null;
  motoristaPlan?: string | null;
  veiculoPlan?: string | null;
  motoristaLiberado?: string | null;
  veiculoLiberado?: string | null;
  dtLiberacao?: string | null;
  dtCheckList?: string | null;
  dailyTripSectionId?: string | null;
  mdfe?: string | null;
  cte?: string | null;
  notes?: string | null;
  presentationDate?: string | null;
  issueDate?: string | null;
  issueResponsible?: string | null;
  palletInvoice?: string | null;
  productInvoice?: string | null;
  isReturnLoaded?: string | null;
  licensePlateTrailer?: string | null;
  justificationCode?: string | null;
  [k: string]: unknown;
}

interface JustificationOption {
  id: string;
  code: string;
  description: string;
}

interface JourneyChecklistFormProps {
  item: JourneyReleaseItem;
  onClose: () => void;
  onSaved: () => void;
}

const formatDisplayDateTime = (v?: string | null): string => {
  if (!v) return "--";
  try {
    let d = new Date(v);
    if (isNaN(d.getTime())) {
      const parts = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?$/);
      if (parts) {
        const [, day, month, year, hour = "0", min = "0"] = parts;
        d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min));
      }
    }
    if (isNaN(d.getTime())) return "--";
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch { return "--"; }
};

const nowISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
};

const applyPlateMask = (input: string): string => {
  const clean = input.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 7);
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3)}`;
};

const fetchJustifications = async (): Promise<JustificationOption[]> => {
  const res = await fetch(`${API_BASE}/Justification?PageSize=200`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const items: Record<string, unknown>[] = await res.json();
  return items.map((item) => ({
    id: String(item.id || ""),
    code: String(item.code || ""),
    description: String(item.description || ""),
  }));
};

export function JourneyChecklistForm({ item, onClose, onSaved }: JourneyChecklistFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [extraOpen, setExtraOpen] = useState(true);
  const isAlreadyReleased = !!item.dtLiberacao;

  const [motoristaLiberado, setMotoristaLiberado] = useState(item.motoristaLiberado || "");
  const [motoristaLiberadoLabel, setMotoristaLiberadoLabel] = useState(item.motoristaLiberado || "");
  const [veiculoLiberado, setVeiculoLiberado] = useState(item.veiculoLiberado || "");
  const [veiculoLiberadoLabel, setVeiculoLiberadoLabel] = useState(item.veiculoLiberado || "");
  const [dtCheckList, setDtCheckList] = useState<string | null>(item.dtCheckList || nowISO());
  const [presentationDate, setPresentationDate] = useState<string | null>(item.presentationDate || null);
  const [justificationCode, setJustificationCode] = useState(item.justificationCode || "");
  const [notes, setNotes] = useState(item.notes || "");

  const [mdfe, setMdfe] = useState(item.mdfe || "");
  const [cte, setCte] = useState(item.cte || "");
  const [productInvoice, setProductInvoice] = useState(item.productInvoice || "");
  const [palletInvoice, setPalletInvoice] = useState(item.palletInvoice || "");
  const [isReturnLoaded, setIsReturnLoaded] = useState(item.isReturnLoaded || "False");
  const [licensePlateTrailer, setLicensePlateTrailer] = useState(item.licensePlateTrailer || "");
  const [issueDate, setIssueDate] = useState<string | null>(item.issueDate || null);
  const [issueResponsible, setIssueResponsible] = useState(item.issueResponsible || "");

  const { data: justifications = [] } = useQuery({
    queryKey: ["justifications"],
    queryFn: fetchJustifications,
    staleTime: 5 * 60 * 1000,
  });

  const handleSave = async () => {
    if (!motoristaLiberado) {
      toast({ title: "Campo obrigatório", description: "Informe o Motorista Liberado.", variant: "error" });
      return;
    }
    if (!veiculoLiberado) {
      toast({ title: "Campo obrigatório", description: "Informe o Veículo Liberado.", variant: "error" });
      return;
    }
    if (!dtCheckList) {
      toast({ title: "Campo obrigatório", description: "Informe a Data do Check.", variant: "error" });
      return;
    }

    const payload = {
      saida: item.saida || null,
      entrega: item.entrega || null,
      destino: item.destino || null,
      demanda: item.demanda || null,
      dt: item.dt || null,
      motoristaPlan: item.motoristaPlan || null,
      veiculoPlan: item.veiculoPlan || null,
      motoristaLiberado: motoristaLiberado || null,
      veiculoLiberado: veiculoLiberado || null,
      dtCheckList: dtCheckList || null,
      dtLiberacao: null,
      dailyTripSectionId: item.dailyTripSectionId || null,
      mdfe: mdfe || null,
      cte: cte || null,
      notes: notes || null,
      presentationDate: presentationDate || null,
      issueDate: issueDate || null,
      issueResponsible: issueResponsible || null,
      palletInvoice: palletInvoice || null,
      productInvoice: productInvoice || null,
      isReturnLoaded: isReturnLoaded || null,
      licensePlateTrailer: licensePlateTrailer || null,
      justificationCode: justificationCode || null,
    };

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/Journey/ReleaseDriverCheck`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseText = await res.text();
      if (!res.ok || (responseText && responseText.trim().toLowerCase() !== "ok")) {
        throw new Error(responseText || `Erro ao salvar: ${res.status}`);
      }
      toast({ title: "Sucesso", description: "Checklist salvo com sucesso." });
      onSaved();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const fieldLabel = "text-sm font-medium text-muted-foreground";
  const fieldValue = "text-sm text-foreground select-text";

  return (
    <FloatingPanel title="Checklist da Viagem" onClose={onClose} width={920}>
      <div className="space-y-3">
        {isAlreadyReleased && (
          <div className="border border-accent rounded-md p-2 bg-accent/10 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-accent-foreground" />
            <span className="text-xs text-accent-foreground font-medium">
              Esta viagem já foi liberada. Os dados não podem ser editados.
            </span>
          </div>
        )}

        {/* Planned data - read only */}
        <div className="border border-primary/20 rounded-md p-3 bg-primary/5">
          <div className="grid grid-cols-4 gap-x-4 gap-y-1.5">
            <div className="flex gap-1">
              <span className={fieldLabel}>Saída:</span>
              <span className={fieldValue}>{formatDisplayDateTime(item.saida)}</span>
            </div>
            <div className="flex gap-1">
              <span className={fieldLabel}>Entrega:</span>
              <span className={fieldValue}>{formatDisplayDateTime(item.entrega)}</span>
            </div>
            <div className="flex gap-1">
              <span className={fieldLabel}>Motorista Plan.:</span>
              <span className={fieldValue}>{item.motoristaPlan || "--"}</span>
            </div>
            <div className="flex gap-1">
              <span className={fieldLabel}>Veículo Plan.:</span>
              <span className={fieldValue}>{item.veiculoPlan || "--"}</span>
            </div>
            <div className="flex gap-1">
              <span className={fieldLabel}>Destino:</span>
              <span className={fieldValue}>{item.destino || "--"}</span>
            </div>
            <div className="flex gap-1">
              <span className={fieldLabel}>DT:</span>
              <span className={fieldValue}>{item.dt || "--"}</span>
            </div>
            <div className="flex gap-1">
              <span className={fieldLabel}>STO:</span>
              <span className={fieldValue}>{item.demanda || "--"}</span>
            </div>
          </div>
        </div>

        {/* Execution fields */}
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between min-h-[22px]">
                <Label className="text-xs">Motorista Liberado <span className="text-destructive">*</span></Label>
                {!isAlreadyReleased && item.motoristaPlan && (
                  <button
                    type="button"
                    title="Copiar Motorista Planejado"
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-primary text-[10px] font-medium"
                    onClick={() => {
                      setMotoristaLiberado(item.motoristaPlan!);
                      setMotoristaLiberadoLabel(item.motoristaPlan!);
                      toast({ title: "Motorista planejado copiado", variant: "success" });
                    }}
                  >
                    <ClipboardCopy className="h-3 w-3" />
                    Cópia
                  </button>
                )}
              </div>
              {isAlreadyReleased ? (
                <Input className="h-8 text-xs" value={motoristaLiberado} disabled />
              ) : (
                <LookupSearchField
                  endpoint="Drivers"
                  searchFilterParam="Filter1String"
                  value={motoristaLiberado}
                  onChange={(id, item) => {
                    const nick = item?.nickName as string || item?.name as string || "";
                    setMotoristaLiberado(nick);
                    setMotoristaLiberadoLabel(nick);
                  }}
                  placeholder="Motorista"
                   className="h-8 text-xs"
                   nullable
                   forceActiveOnly
                  displayAsText
                   modalVisibleColumns={["nickName", "integrationCode", "registration"]}
                   columnLabels={{ nickName: t("driver.nickName"), integrationCode: t("driver.integrationCode"), registration: t("driver.registration") }}
                  transformItem={(item) => ({
                    ...item,
                    id: item.id as string,
                    code: "",
                    name: `${item.nickName || ""} - ${item.integrationCode || ""}`,
                  })}
                  initialLabel={motoristaLiberadoLabel}
                />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between min-h-[22px]">
                <Label className="text-xs">Veículo Liberado <span className="text-destructive">*</span></Label>
                {!isAlreadyReleased && item.veiculoPlan && (
                  <button
                    type="button"
                    title="Copiar Veículo Planejado"
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-primary text-[10px] font-medium"
                    onClick={() => {
                      setVeiculoLiberado(item.veiculoPlan!);
                      setVeiculoLiberadoLabel(item.veiculoPlan!);
                      toast({ title: "Veículo planejado copiado", variant: "success" });
                    }}
                  >
                    <ClipboardCopy className="h-3 w-3" />
                    Cópia
                  </button>
                )}
              </div>
              {isAlreadyReleased ? (
                <Input className="h-8 text-xs" value={veiculoLiberado} disabled />
              ) : (
                <LookupSearchField
                  endpoint="Truck"
                  searchFilterParam="Filter1String"
                  value={veiculoLiberado}
                  onChange={(id, item) => {
                    const plate = item?.licensePlate as string || item?.fleetCode as string || "";
                    setVeiculoLiberado(plate);
                    setVeiculoLiberadoLabel(plate);
                  }}
                  placeholder="Placa ou Frota"
                  className="h-8 text-xs"
                  nullable
                  displayAsText
                  modalVisibleColumns={["licensePlate", "fleetCode"]}
                  columnLabels={{ licensePlate: "Placa", fleetCode: "Cód. Frota" }}
                  transformItem={(item) => ({
                    ...item,
                    id: item.id as string,
                    code: "",
                    name: `${item.licensePlate || ""} - ${item.fleetCode || ""}`,
                  })}
                  initialLabel={veiculoLiberadoLabel}
                />
              )}
            </div>
            <div className="space-y-1">
              <div className="min-h-[22px] flex items-center">
                <Label className="text-xs">Apresentação do Motorista</Label>
              </div>
              <DatePickerField
                value={presentationDate}
                onChange={setPresentationDate}
                includeTime
                disabled={isAlreadyReleased}
              />
            </div>
            <div className="space-y-1">
              <div className="min-h-[22px] flex items-center">
                <Label className="text-xs">Data do Check <span className="text-destructive">*</span></Label>
              </div>
              <DatePickerField
                value={dtCheckList}
                onChange={setDtCheckList}
                includeTime
                hasError={!dtCheckList}
                disabled={isAlreadyReleased}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Justificativa</Label>
              <Select value={justificationCode} onValueChange={setJustificationCode} disabled={isAlreadyReleased}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">Nenhuma</SelectItem>
                  {justifications.map((j) => (
                    <SelectItem key={j.id} value={j.code} className="text-xs">
                      {j.code} - {j.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Textarea
                className="text-xs min-h-[40px] h-[40px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações..."
                disabled={isAlreadyReleased}
              />
            </div>
          </div>
        </div>

        {/* Additional fields - expandable */}
        <Collapsible open={extraOpen} onOpenChange={setExtraOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 w-full justify-start">
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", extraOpen ? "" : "-rotate-90")} />
              Informações Adicionais
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">MDFE</Label>
                <Input className="h-8 text-xs" value={mdfe} onChange={(e) => setMdfe(e.target.value)} disabled={isAlreadyReleased} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CTE</Label>
                <Input className="h-8 text-xs" value={cte} onChange={(e) => setCte(e.target.value)} disabled={isAlreadyReleased} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nota do Produto</Label>
                <Input className="h-8 text-xs" value={productInvoice} onChange={(e) => setProductInvoice(e.target.value)} disabled={isAlreadyReleased} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nota do Pallet</Label>
                <Input className="h-8 text-xs" value={palletInvoice} onChange={(e) => setPalletInvoice(e.target.value)} disabled={isAlreadyReleased} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Saída Carregada</Label>
                <Select value={isReturnLoaded} onValueChange={setIsReturnLoaded} disabled={isAlreadyReleased}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="False" className="text-xs">Não</SelectItem>
                    <SelectItem value="True" className="text-xs">Sim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Placa da Carreta</Label>
                <Input
                  className="h-8 text-xs"
                  value={licensePlateTrailer}
                  onChange={(e) => setLicensePlateTrailer(applyPlateMask(e.target.value))}
                  placeholder="AAA-#A##"
                  maxLength={8}
                  disabled={isAlreadyReleased}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Emissão MDFE</Label>
                <DatePickerField value={issueDate} onChange={setIssueDate} disabled={isAlreadyReleased} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Responsável Emissão MDFE</Label>
                <Input className="h-8 text-xs" value={issueResponsible} onChange={(e) => setIssueResponsible(e.target.value)} disabled={isAlreadyReleased} />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            {isAlreadyReleased ? "Fechar" : "Cancelar"}
          </Button>
          {!isAlreadyReleased && (
            <Button size="sm" className="h-8 text-xs gap-1" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar Checklist
            </Button>
          )}
        </div>
      </div>
    </FloatingPanel>
  );
}
