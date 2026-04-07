import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  FileText, Plus, Search, X, Upload, Trash2, Eye, Send,
  CheckCircle2, Clock, AlertTriangle, Users, Loader2,
  ChevronLeft, ChevronRight, Pencil, Download, FileUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { DatePickerField } from "@/components/DatePickerField";
import { FloatingPanel } from "@/components/FloatingPanel";
import { ExportDropdown } from "@/components/ExportDropdown";
import type { ExportColumn } from "@/lib/export-utils";

// --- Types ---
interface DriverDocument {
  id: string;
  name: string;
  description: string;
  required: boolean;
  issueDate: string;
  expiryDate: string | null;
  fileName: string | null;
  fileSize: number;
  sentCount: number;
  readCount: number;
  totalDrivers: number;
  status: "active" | "expired" | "expiring" | "draft";
  createdAt: string;
}

interface DocumentRecipient {
  id: string;
  documentId: string;
  driverId: string;
  driverName: string;
  driverRegistration: string;
  driverBase: string;
  sentAt: string | null;
  readAt: string | null;
  status: "pending" | "sent" | "read";
}

// --- Mock Data ---
const MOCK_DOCUMENTS: DriverDocument[] = [
  { id: "1", name: "Política de Segurança Viária", description: "Documento obrigatório sobre normas de segurança no trânsito", required: true, issueDate: "2026-03-01", expiryDate: "2026-09-01", fileName: "politica_seguranca_viaria_v3.pdf", fileSize: 2450000, sentCount: 142, readCount: 118, totalDrivers: 156, status: "active", createdAt: "2026-03-01" },
  { id: "2", name: "Manual de Operações - Atualização Q1", description: "Atualização trimestral do manual operacional", required: true, issueDate: "2026-03-15", expiryDate: null, fileName: "manual_operacoes_q1_2026.pdf", fileSize: 5120000, sentCount: 156, readCount: 89, totalDrivers: 156, status: "active", createdAt: "2026-03-15" },
  { id: "3", name: "Termo de Responsabilidade EPI", description: "Declaração de recebimento e uso de equipamentos de proteção", required: true, issueDate: "2026-01-10", expiryDate: "2027-01-10", fileName: "termo_epi_2026.pdf", fileSize: 890000, sentCount: 156, readCount: 156, totalDrivers: 156, status: "active", createdAt: "2026-01-10" },
  { id: "4", name: "Comunicado - Novo Sistema de Rastreamento", description: "Informativo sobre a implementação do novo sistema GPS", required: false, issueDate: "2026-03-20", expiryDate: null, fileName: "comunicado_rastreamento.pdf", fileSize: 340000, sentCount: 98, readCount: 45, totalDrivers: 156, status: "active", createdAt: "2026-03-20" },
  { id: "5", name: "Normas de Carga e Descarga", description: "Procedimento operacional padrão para carga e descarga", required: true, issueDate: "2025-08-15", expiryDate: "2026-02-15", fileName: "normas_carga_descarga.pdf", fileSize: 1780000, sentCount: 148, readCount: 148, totalDrivers: 156, status: "expired", createdAt: "2025-08-15" },
  { id: "6", name: "Treinamento Direção Defensiva 2026", description: "Material complementar ao treinamento presencial", required: false, issueDate: "2026-03-28", expiryDate: null, fileName: null, fileSize: 0, sentCount: 0, readCount: 0, totalDrivers: 156, status: "draft", createdAt: "2026-03-28" },
  { id: "7", name: "Protocolo COVID - Atualização", description: "Orientações sanitárias atualizadas", required: false, issueDate: "2026-02-01", expiryDate: "2026-04-15", fileName: "protocolo_covid_v5.pdf", fileSize: 450000, sentCount: 156, readCount: 130, totalDrivers: 156, status: "expiring", createdAt: "2026-02-01" },
];

const MOCK_RECIPIENTS: DocumentRecipient[] = [
  { id: "r1", documentId: "1", driverId: "d1", driverName: "Carlos Silva", driverRegistration: "123.456.789-00", driverBase: "SP-01", sentAt: "2026-03-02T10:00:00", readAt: "2026-03-02T14:30:00", status: "read" },
  { id: "r2", documentId: "1", driverId: "d2", driverName: "José Santos", driverRegistration: "987.654.321-00", driverBase: "SP-01", sentAt: "2026-03-02T10:00:00", readAt: "2026-03-03T08:15:00", status: "read" },
  { id: "r3", documentId: "1", driverId: "d3", driverName: "Maria Oliveira", driverRegistration: "456.789.123-00", driverBase: "RJ-01", sentAt: "2026-03-02T10:00:00", readAt: null, status: "sent" },
  { id: "r4", documentId: "1", driverId: "d4", driverName: "Pedro Costa", driverRegistration: "321.654.987-00", driverBase: "RJ-01", sentAt: "2026-03-02T10:00:00", readAt: "2026-03-02T16:45:00", status: "read" },
  { id: "r5", documentId: "1", driverId: "d5", driverName: "Ana Pereira", driverRegistration: "789.123.456-00", driverBase: "MG-01", sentAt: null, readAt: null, status: "pending" },
  { id: "r6", documentId: "1", driverId: "d6", driverName: "Lucas Ferreira", driverRegistration: "654.987.321-00", driverBase: "MG-01", sentAt: "2026-03-02T10:00:00", readAt: null, status: "sent" },
  { id: "r7", documentId: "1", driverId: "d7", driverName: "Roberto Almeida", driverRegistration: "147.258.369-00", driverBase: "SP-02", sentAt: "2026-03-02T10:00:00", readAt: "2026-03-04T09:00:00", status: "read" },
  { id: "r8", documentId: "1", driverId: "d8", driverName: "Fernanda Lima", driverRegistration: "369.258.147-00", driverBase: "SP-02", sentAt: null, readAt: null, status: "pending" },
];

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  expiring: { label: "A Vencer", variant: "secondary" },
  expired: { label: "Vencido", variant: "destructive" },
  draft: { label: "Rascunho", variant: "outline" },
};

const RECIPIENT_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  sent: { label: "Enviado", variant: "secondary" },
  read: { label: "Lido", variant: "default" },
};

const exportColumns: ExportColumn[] = [
  { key: "name", label: "Nome do Documento" },
  { key: "required", label: "Obrigatório" },
  { key: "issueDate", label: "Emissão" },
  { key: "expiryDate", label: "Validade" },
  { key: "sentCount", label: "Enviados" },
  { key: "readCount", label: "Lidos" },
  { key: "status", label: "Status" },
];

function formatFileSize(bytes: number) {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateBR(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

export default function DriverDocumentsPage() {
  const { t } = useTranslation();
  usePageTitle(t("menu.driverDocuments"));

  // State
  const [documents, setDocuments] = useState<DriverDocument[]>(MOCK_DOCUMENTS);
  const [filterName, setFilterName] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRequired, setFilterRequired] = useState("all");
  const [searched, setSearched] = useState(false);

  // Panel
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"new" | "edit" | "view">("new");
  const [selectedDoc, setSelectedDoc] = useState<DriverDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriverDocument | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formRequired, setFormRequired] = useState(false);
  const [formIssueDate, setFormIssueDate] = useState<string | null>(null);
  const [formExpiryDate, setFormExpiryDate] = useState<string | null>(null);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formFileName, setFormFileName] = useState<string | null>(null);

  // Recipients tab
  const [recipientFilter, setRecipientFilter] = useState("all");

  // Send dialog
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendTarget, setSendTarget] = useState<"all" | "base">("all");
  const [sendBase, setSendBase] = useState("");

  // Filtered list
  const filteredDocs = useMemo(() => {
    if (!searched) return [];
    return documents.filter((d) => {
      if (filterName && !d.name.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterStatus !== "all" && d.status !== filterStatus) return false;
      if (filterRequired === "yes" && !d.required) return false;
      if (filterRequired === "no" && d.required) return false;
      return true;
    });
  }, [documents, filterName, filterStatus, filterRequired, searched]);

  // KPIs
  const totalDocs = documents.length;
  const activeDocs = documents.filter((d) => d.status === "active").length;
  const expiringDocs = documents.filter((d) => d.status === "expiring").length;
  const avgReadRate = documents.filter((d) => d.sentCount > 0).length > 0
    ? Math.round(documents.filter((d) => d.sentCount > 0).reduce((s, d) => s + (d.readCount / d.sentCount) * 100, 0) / documents.filter((d) => d.sentCount > 0).length)
    : 0;

  const kpis = [
    { label: "Total de Documentos", value: totalDocs, icon: FileText, color: "text-blue-500" },
    { label: "Ativos", value: activeDocs, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "A Vencer (30 dias)", value: expiringDocs, icon: Clock, color: "text-orange-500" },
    { label: "Taxa Média de Leitura", value: `${avgReadRate}%`, icon: Eye, color: "text-primary" },
  ];

  // Recipients for selected doc
  const recipients = useMemo(() => {
    if (!selectedDoc) return [];
    const all = MOCK_RECIPIENTS.filter((r) => r.documentId === selectedDoc.id);
    if (recipientFilter === "all") return all;
    return all.filter((r) => r.status === recipientFilter);
  }, [selectedDoc, recipientFilter]);

  const handleSearch = () => setSearched(true);
  const handleClear = () => {
    setFilterName("");
    setFilterStatus("all");
    setFilterRequired("all");
    setSearched(false);
  };

  const resetForm = () => {
    setFormName("");
    setFormDesc("");
    setFormRequired(false);
    setFormIssueDate(null);
    setFormExpiryDate(null);
    setFormFile(null);
    setFormFileName(null);
  };

  const openNew = () => {
    resetForm();
    setSelectedDoc(null);
    setPanelMode("new");
    setPanelOpen(true);
  };

  const openEdit = (doc: DriverDocument) => {
    setSelectedDoc(doc);
    setFormName(doc.name);
    setFormDesc(doc.description);
    setFormRequired(doc.required);
    setFormIssueDate(doc.issueDate);
    setFormExpiryDate(doc.expiryDate);
    setFormFileName(doc.fileName);
    setFormFile(null);
    setPanelMode("edit");
    setPanelOpen(true);
  };

  const openView = (doc: DriverDocument) => {
    setSelectedDoc(doc);
    setRecipientFilter("all");
    setPanelMode("view");
    setPanelOpen(true);
  };

  const handleSave = () => {
    if (!formName || !formIssueDate) {
      toast.error(t("common.requiredFields"));
      return;
    }
    if (panelMode === "new") {
      const newDoc: DriverDocument = {
        id: String(Date.now()),
        name: formName,
        description: formDesc,
        required: formRequired,
        issueDate: formIssueDate,
        expiryDate: formExpiryDate,
        fileName: formFile?.name || formFileName,
        fileSize: formFile?.size || 0,
        sentCount: 0,
        readCount: 0,
        totalDrivers: 156,
        status: "draft",
        createdAt: new Date().toISOString().split("T")[0],
      };
      setDocuments((prev) => [newDoc, ...prev]);
      toast.success(t("common.saveSuccess"));
    } else if (panelMode === "edit" && selectedDoc) {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === selectedDoc.id
            ? {
                ...d,
                name: formName,
                description: formDesc,
                required: formRequired,
                issueDate: formIssueDate!,
                expiryDate: formExpiryDate,
                fileName: formFile?.name || formFileName,
                fileSize: formFile?.size || d.fileSize,
              }
            : d
        )
      );
      toast.success(t("common.saveSuccess"));
    }
    setPanelOpen(false);
  };

  const handleDelete = (doc: DriverDocument) => {
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    setDeleteTarget(null);
    toast.success(t("common.deleteSuccess"));
  };

  const handleSend = () => {
    if (selectedDoc) {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === selectedDoc.id
            ? { ...d, sentCount: d.totalDrivers, status: "active" as const }
            : d
        )
      );
      toast.success("Documento enviado para os motoristas!");
    }
    setShowSendDialog(false);
  };

  const readPercent = (doc: DriverDocument) =>
    doc.sentCount > 0 ? Math.round((doc.readCount / doc.sentCount) * 100) : 0;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">{t("menu.driverDocuments")}</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className={`rounded-lg p-2 bg-muted ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Nome do Documento</Label>
              <Input
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Pesquisar por nome..."
                className="h-8 text-xs"
              />
            </div>
            <div className="col-span-1">
              <Label className="text-xs mb-1 block">{t("common.status")}</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.selectAll")}</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="expiring">A Vencer</SelectItem>
                  <SelectItem value="expired">Vencido</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Label className="text-xs mb-1 block">Obrigatório</Label>
              <Select value={filterRequired} onValueChange={setFilterRequired}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.selectAll")}</SelectItem>
                  <SelectItem value="yes">{t("common.yes")}</SelectItem>
                  <SelectItem value="no">{t("common.no")}</SelectItem>
                </SelectContent>
              </Select>
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
              {searched && filteredDocs.length > 0 && (
                <ExportDropdown
                  title="Documentos do Motorista"
                  columns={exportColumns}
                  fetchData={async () =>
                    filteredDocs.map((d) => ({
                      name: d.name,
                      required: d.required ? "Sim" : "Não",
                      issueDate: formatDateBR(d.issueDate),
                      expiryDate: formatDateBR(d.expiryDate),
                      sentCount: String(d.sentCount),
                      readCount: String(d.readCount),
                      status: STATUS_MAP[d.status]?.label || d.status,
                    }))
                  }
                />
              )}
              <Button size="sm" onClick={openNew}>
                <Plus className="h-3.5 w-3.5 mr-1" />{t("common.new")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {searched && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <Card>
            <CardContent className="p-0">
              {filteredDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t("common.noResults")}</p>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs w-[80px] text-center">Obrig.</TableHead>
                        <TableHead className="text-xs w-[100px]">Emissão</TableHead>
                        <TableHead className="text-xs w-[100px]">Validade</TableHead>
                        <TableHead className="text-xs w-[100px]">Arquivo</TableHead>
                        <TableHead className="text-xs w-[90px] text-center">Enviados</TableHead>
                        <TableHead className="text-xs w-[90px] text-center">Leitura</TableHead>
                        <TableHead className="text-xs w-[90px]">{t("common.status")}</TableHead>
                        <TableHead className="text-xs w-[120px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocs.map((doc, idx) => (
                        <TableRow
                          key={doc.id}
                          className={`${idx % 2 === 1 ? "bg-muted/30" : ""} cursor-pointer hover:bg-muted/50`}
                          onClick={() => openView(doc)}
                        >
                          <TableCell className="text-xs font-medium">{doc.name}</TableCell>
                          <TableCell className="text-xs text-center">
                            {doc.required ? (
                              <Badge variant="destructive" className="text-[10px] px-1.5">Sim</Badge>
                            ) : (
                              <span className="text-muted-foreground">Não</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{formatDateBR(doc.issueDate)}</TableCell>
                          <TableCell className="text-xs">{formatDateBR(doc.expiryDate)}</TableCell>
                          <TableCell className="text-xs">
                            {doc.fileName ? (
                              <span className="text-primary truncate max-w-[100px] block" title={doc.fileName}>
                                {formatFileSize(doc.fileSize)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-center font-mono">
                            {doc.sentCount}/{doc.totalDrivers}
                          </TableCell>
                          <TableCell className="text-xs text-center">
                            {doc.sentCount > 0 ? (
                              <Badge
                                variant={readPercent(doc) >= 80 ? "default" : readPercent(doc) >= 50 ? "secondary" : "destructive"}
                                className="text-[10px] px-1.5"
                              >
                                {readPercent(doc)}%
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_MAP[doc.status]?.variant || "outline"} className="text-[10px]">
                              {STATUS_MAP[doc.status]?.label || doc.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(doc)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-primary"
                                onClick={() => {
                                  setSelectedDoc(doc);
                                  setShowSendDialog(true);
                                }}
                                disabled={!doc.fileName}
                                title={!doc.fileName ? "Anexe um arquivo primeiro" : "Enviar para motoristas"}
                              >
                                <Send className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => setDeleteTarget(doc)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Panel: New / Edit */}
      {panelOpen && (panelMode === "new" || panelMode === "edit") && (
        <FloatingPanel
          title={panelMode === "new" ? "Novo Documento" : "Editar Documento"}
          onClose={() => setPanelOpen(false)}
          width={700}
        >
          <div className="flex justify-end gap-2 px-4 pt-2">
            <Button variant="outline" size="sm" onClick={() => setPanelOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button size="sm" onClick={handleSave}>
              <FileUp className="h-3.5 w-3.5 mr-1" />{t("common.save")}
            </Button>
          </div>
          <div className="space-y-4 p-4 pt-2">
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-4">
                <Label className="text-xs">
                  Nome do Documento <span className="text-destructive">✱</span>
                </Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value.toUpperCase())} className="h-8 text-xs" />
              </div>
              <div className="col-span-2 flex items-end gap-2">
                <div className="flex items-center gap-2">
                  <Switch checked={formRequired} onCheckedChange={setFormRequired} />
                  <Label className="text-xs">Obrigatório</Label>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs">Descrição</Label>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="h-8 text-xs" placeholder="Descreva o conteúdo do documento..." />
            </div>

            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">
                  Data de Emissão <span className="text-destructive">✱</span>
                </Label>
                <DatePickerField value={formIssueDate} onChange={setFormIssueDate} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Data de Validade</Label>
                <DatePickerField value={formExpiryDate} onChange={setFormExpiryDate} />
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-xs mb-2 block">Arquivo</Label>
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                {formFile || formFileName ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">
                        {formFile?.name || formFileName}
                      </p>
                      {formFile && (
                        <p className="text-xs text-muted-foreground">{formatFileSize(formFile.size)}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => {
                        setFormFile(null);
                        setFormFileName(null);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Clique para selecionar ou arraste o arquivo aqui
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">PDF, DOC, DOCX, XLS (máx. 20MB)</p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormFile(file);
                          setFormFileName(file.name);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </FloatingPanel>
      )}

      {/* Panel: View Details + Recipients */}
      {panelOpen && panelMode === "view" && selectedDoc && (
        <FloatingPanel
          title={selectedDoc.name}
          onClose={() => setPanelOpen(false)}
          width={900}
        >
          <div className="flex justify-end gap-2 px-4 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSendDialog(true)}
              disabled={!selectedDoc.fileName}
            >
              <Send className="h-3.5 w-3.5 mr-1" /> Enviar
            </Button>
            <Button size="sm" variant="outline" onClick={() => openEdit(selectedDoc)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> {t("common.edit")}
            </Button>
          </div>
          <div className="space-y-4 p-4 pt-2">
            {/* Document info summary */}
            <div className="grid grid-cols-6 gap-3 text-xs">
              <div className="col-span-3">
                <span className="text-muted-foreground">Descrição:</span>
                <p className="font-medium mt-0.5">{selectedDoc.description || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Obrigatório:</span>
                <p className="font-medium mt-0.5">
                  {selectedDoc.required ? (
                    <Badge variant="destructive" className="text-[10px]">Sim</Badge>
                  ) : "Não"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Emissão:</span>
                <p className="font-medium mt-0.5">{formatDateBR(selectedDoc.issueDate)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Validade:</span>
                <p className="font-medium mt-0.5">{formatDateBR(selectedDoc.expiryDate)}</p>
              </div>
            </div>

            {selectedDoc.fileName && (
              <div className="flex items-center gap-2 p-2 rounded bg-muted/50 text-xs">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-medium">{selectedDoc.fileName}</span>
                <span className="text-muted-foreground">({formatFileSize(selectedDoc.fileSize)})</span>
                <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs gap-1">
                  <Download className="h-3 w-3" /> Baixar
                </Button>
              </div>
            )}

            <Separator />

            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Progresso de Leitura</span>
                <span className="font-medium">
                  {selectedDoc.readCount}/{selectedDoc.sentCount} lidos ({readPercent(selectedDoc)}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${readPercent(selectedDoc)}%` }}
                />
              </div>
            </div>

            {/* Recipients table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> Motoristas
                </h3>
                <div className="flex items-center gap-1">
                  {(["all", "read", "sent", "pending"] as const).map((f) => (
                    <Button
                      key={f}
                      variant={recipientFilter === f ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setRecipientFilter(f)}
                    >
                      {f === "all" ? "Todos" : RECIPIENT_STATUS[f]?.label || f}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="rounded-md border max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Motorista</TableHead>
                      <TableHead className="text-xs w-[130px]">CPF</TableHead>
                      <TableHead className="text-xs w-[80px]">Base</TableHead>
                      <TableHead className="text-xs w-[130px]">Enviado em</TableHead>
                      <TableHead className="text-xs w-[130px]">Lido em</TableHead>
                      <TableHead className="text-xs w-[80px]">{t("common.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-4">
                          Nenhum registro encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      recipients.map((r, idx) => (
                        <TableRow key={r.id} className={idx % 2 === 1 ? "bg-muted/30" : ""}>
                          <TableCell className="text-xs">{r.driverName}</TableCell>
                          <TableCell className="text-xs font-mono">{r.driverRegistration}</TableCell>
                          <TableCell className="text-xs">{r.driverBase}</TableCell>
                          <TableCell className="text-xs">
                            {r.sentAt ? formatDateBR(r.sentAt.split("T")[0]) : "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.readAt ? formatDateBR(r.readAt.split("T")[0]) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={RECIPIENT_STATUS[r.status]?.variant || "outline"}
                              className="text-[10px]"
                            >
                              {RECIPIENT_STATUS[r.status]?.label || r.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </FloatingPanel>
      )}

      {/* Send Dialog */}
      <AlertDialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione para quem deseja enviar o documento "{selectedDoc?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3">
              <Button
                variant={sendTarget === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSendTarget("all")}
                className="flex-1"
              >
                <Users className="h-3.5 w-3.5 mr-1" /> Todos os Motoristas
              </Button>
              <Button
                variant={sendTarget === "base" ? "default" : "outline"}
                size="sm"
                onClick={() => setSendTarget("base")}
                className="flex-1"
              >
                <FileText className="h-3.5 w-3.5 mr-1" /> Por Base
              </Button>
            </div>
            {sendTarget === "base" && (
              <div>
                <Label className="text-xs">Base de Motorista</Label>
                <Select value={sendBase} onValueChange={setSendBase}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione a base..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SP-01">SP-01</SelectItem>
                    <SelectItem value="SP-02">SP-02</SelectItem>
                    <SelectItem value="RJ-01">RJ-01</SelectItem>
                    <SelectItem value="MG-01">MG-01</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend}>
              <Send className="h-3.5 w-3.5 mr-1" /> Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.confirmDeleteDesc")} ({deleteTarget?.name})
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
