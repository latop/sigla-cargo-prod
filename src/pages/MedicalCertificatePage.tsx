import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { ExportDropdown } from "@/components/ExportDropdown";
import { motion } from "framer-motion";
import { format, differenceInDays, parseISO, addDays } from "date-fns";
import {
  Search, X, Plus, Pencil, Trash2, Save, Upload, FileText, Eye,
  ChevronLeft, ChevronRight, ShieldAlert, Activity, Clock, Users,
  AlertTriangle, CheckCircle2, Ban, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DatePickerField } from "@/components/DatePickerField";
import { FloatingPanel } from "@/components/FloatingPanel";
import { LookupSearchField } from "@/components/LookupSearchField";

/* ─── Types ─── */

type CertificateStatus = "active" | "expired" | "pending" | "inss";
type CertificateType = "certificate" | "declaration" | "report";
type ApprovalStatus = "pending" | "approved" | "rejected";

interface MedicalCertificate {
  id: string;
  driverId: string;
  driverName: string;
  driverNickName: string;
  base: string;
  type: CertificateType;
  cid: string;
  cidDescription: string;
  doctorName: string;
  doctorCRM: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: CertificateStatus;
  approvalStatus: ApprovalStatus;
  blockSchedule: boolean;
  isINSS: boolean;
  inssStartDate?: string;
  inssExpertiseDate?: string;
  inssReturnDate?: string;
  fileName?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

/* ─── Mock Data ─── */

const mockCertificates: MedicalCertificate[] = [
  {
    id: "1", driverId: "d1", driverName: "Carlos Alberto Silva", driverNickName: "CARLOS.S",
    base: "São Paulo", type: "certificate", cid: "M54.5", cidDescription: "Dor lombar baixa",
    doctorName: "Dr. Ricardo Mendes", doctorCRM: "CRM-SP 123456",
    startDate: "2026-03-25", endDate: "2026-04-10", totalDays: 16,
    status: "active", approvalStatus: "approved", blockSchedule: true,
    isINSS: true, inssStartDate: "2026-04-09", inssExpertiseDate: "2026-04-20", inssReturnDate: undefined,
    fileName: "atestado_carlos_25032026.pdf", notes: "Afastamento por lombalgia. Encaminhado ao INSS após 15 dias.",
    createdAt: "2026-03-25", createdBy: "Ana Paula",
  },
  {
    id: "2", driverId: "d2", driverName: "José Roberto Santos", driverNickName: "JOSE.R",
    base: "Campinas", type: "certificate", cid: "J06.9", cidDescription: "Infecção respiratória aguda",
    doctorName: "Dra. Fernanda Costa", doctorCRM: "CRM-SP 654321",
    startDate: "2026-03-28", endDate: "2026-04-01", totalDays: 4,
    status: "active", approvalStatus: "approved", blockSchedule: true,
    isINSS: false, fileName: "atestado_jose_28032026.pdf", notes: "",
    createdAt: "2026-03-28", createdBy: "Ana Paula",
  },
  {
    id: "3", driverId: "d3", driverName: "Maria Oliveira Lima", driverNickName: "MARIA.O",
    base: "São Paulo", type: "declaration", cid: "", cidDescription: "Acompanhamento médico",
    doctorName: "Dr. Paulo Henrique", doctorCRM: "CRM-SP 789012",
    startDate: "2026-03-30", endDate: "2026-03-30", totalDays: 1,
    status: "active", approvalStatus: "pending", blockSchedule: false,
    isINSS: false, fileName: undefined, notes: "Declaração de comparecimento - consulta de rotina",
    createdAt: "2026-03-30", createdBy: "Roberto Alves",
  },
  {
    id: "4", driverId: "d4", driverName: "Pedro Henrique Costa", driverNickName: "PEDRO.H",
    base: "Ribeirão Preto", type: "certificate", cid: "S62.5", cidDescription: "Fratura de polegar",
    doctorName: "Dr. André Luiz", doctorCRM: "CRM-SP 345678",
    startDate: "2026-02-10", endDate: "2026-04-10", totalDays: 59,
    status: "inss", approvalStatus: "approved", blockSchedule: true,
    isINSS: true, inssStartDate: "2026-02-25", inssExpertiseDate: "2026-03-15", inssReturnDate: "2026-04-10",
    fileName: "atestado_pedro_10022026.pdf", notes: "Fratura no polegar direito. Perícia INSS realizada.",
    createdAt: "2026-02-10", createdBy: "Ana Paula",
  },
  {
    id: "5", driverId: "d5", driverName: "Ana Clara Pereira", driverNickName: "ANA.C",
    base: "Campinas", type: "certificate", cid: "K29.7", cidDescription: "Gastrite",
    doctorName: "Dra. Mariana Silva", doctorCRM: "CRM-SP 901234",
    startDate: "2026-03-15", endDate: "2026-03-18", totalDays: 3,
    status: "expired", approvalStatus: "approved", blockSchedule: false,
    isINSS: false, fileName: "atestado_ana_15032026.pdf", notes: "",
    createdAt: "2026-03-15", createdBy: "Roberto Alves",
  },
  {
    id: "6", driverId: "d6", driverName: "Lucas Ferreira Dias", driverNickName: "LUCAS.F",
    base: "São Paulo", type: "report", cid: "Z00.0", cidDescription: "Exame médico geral",
    doctorName: "Dr. Ricardo Mendes", doctorCRM: "CRM-SP 123456",
    startDate: "2026-03-20", endDate: "2026-03-20", totalDays: 1,
    status: "expired", approvalStatus: "approved", blockSchedule: false,
    isINSS: false, notes: "Laudo de aptidão - retorno ao trabalho",
    createdAt: "2026-03-20", createdBy: "Ana Paula",
  },
  {
    id: "7", driverId: "d7", driverName: "Roberto Almeida Souza", driverNickName: "ROBERTO.A",
    base: "Ribeirão Preto", type: "certificate", cid: "F32.1", cidDescription: "Episódio depressivo moderado",
    doctorName: "Dra. Camila Rodrigues", doctorCRM: "CRM-SP 567890",
    startDate: "2026-01-15", endDate: "2026-04-15", totalDays: 90,
    status: "inss", approvalStatus: "approved", blockSchedule: true,
    isINSS: true, inssStartDate: "2026-01-30", inssExpertiseDate: "2026-02-20", inssReturnDate: undefined,
    fileName: "atestado_roberto_15012026.pdf", notes: "Afastamento por transtorno depressivo. Acompanhamento psiquiátrico.",
    createdAt: "2026-01-15", createdBy: "Ana Paula",
  },
  {
    id: "8", driverId: "d8", driverName: "Fernanda Lima Batista", driverNickName: "FERNANDA.L",
    base: "São Paulo", type: "certificate", cid: "M75.1", cidDescription: "Síndrome do manguito rotador",
    doctorName: "Dr. Paulo Henrique", doctorCRM: "CRM-SP 789012",
    startDate: "2026-03-01", endDate: "2026-03-10", totalDays: 9,
    status: "expired", approvalStatus: "rejected", blockSchedule: false,
    isINSS: false, fileName: "atestado_fernanda_01032026.pdf", notes: "Atestado rejeitado - CID incompatível com queixa",
    createdAt: "2026-03-01", createdBy: "Roberto Alves",
  },
];

/* ─── Helpers ─── */

const PAGE_SIZE = 10;

const statusConfig: Record<CertificateStatus, { color: string; icon: typeof Activity }> = {
  active: { color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", icon: Activity },
  expired: { color: "bg-muted text-muted-foreground border-border", icon: Clock },
  pending: { color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", icon: AlertTriangle },
  inss: { color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30", icon: ShieldAlert },
};

const approvalConfig: Record<ApprovalStatus, { color: string }> = {
  pending: { color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  approved: { color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  rejected: { color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" },
};

const typeLabels: Record<CertificateType, string> = {
  certificate: "Atestado",
  declaration: "Declaração",
  report: "Laudo",
};

/* ─── Component ─── */

export default function MedicalCertificatePage() {
  const { t } = useTranslation();
  usePageTitle(t("medicalCertificate.title"), ShieldAlert);

  const { toast: showToast } = useToast();

  // Filters
  const [filterDriverId, setFilterDriverId] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterBase, setFilterBase] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState<string | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<string | null>(null);

  // State
  const [data, setData] = useState<MedicalCertificate[]>(mockCertificates);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingItem, setEditingItem] = useState<Partial<MedicalCertificate> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MedicalCertificate | null>(null);
  const [detailItem, setDetailItem] = useState<MedicalCertificate | null>(null);
  const [searched, setSearched] = useState(true);

  // Computed KPIs
  const kpis = useMemo(() => {
    const active = data.filter(d => d.status === "active" || d.status === "inss").length;
    const inss = data.filter(d => d.isINSS).length;
    const blocked = data.filter(d => d.blockSchedule && (d.status === "active" || d.status === "inss")).length;
    const pendingApproval = data.filter(d => d.approvalStatus === "pending").length;
    return { total: data.length, active, inss, blocked, pendingApproval };
  }, [data]);

  // Filtered data
  const filteredData = useMemo(() => {
    if (!searched) return [];
    return data.filter(item => {
      if (filterDriverId && item.driverId !== filterDriverId) return false;
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      if (filterType !== "all" && item.type !== filterType) return false;
      if (filterBase !== "all" && item.base !== filterBase) return false;
      if (filterStartDate && item.startDate < filterStartDate) return false;
      if (filterEndDate && item.endDate > filterEndDate) return false;
      return true;
    });
  }, [data, filterDriverId, filterStatus, filterType, filterBase, filterStartDate, filterEndDate, searched]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const pageData = filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const bases = useMemo(() => [...new Set(data.map(d => d.base))].sort(), [data]);

  // Actions
  const handleSearch = useCallback(() => {
    setSearched(true);
    setCurrentPage(1);
  }, []);

  const handleClear = useCallback(() => {
    setFilterDriverId("");
    setFilterStatus("all");
    setFilterType("all");
    setFilterBase("all");
    setFilterStartDate(null);
    setFilterEndDate(null);
    setSearched(true);
    setCurrentPage(1);
  }, []);

  const handleNew = useCallback(() => {
    setIsNew(true);
    setEditingItem({
      type: "certificate",
      blockSchedule: true,
      approvalStatus: "pending",
      isINSS: false,
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
    });
  }, []);

  const handleEdit = useCallback((item: MedicalCertificate) => {
    setIsNew(false);
    setEditingItem({ ...item });
  }, []);

  const handleSave = useCallback(() => {
    if (!editingItem) return;

    // Validation
    if (!editingItem.driverName || !editingItem.startDate || !editingItem.endDate) {
      showToast({ title: t("common.error"), description: t("medicalCertificate.requiredFields"), variant: "destructive" });
      return;
    }

    if (new Date(editingItem.startDate!) > new Date(editingItem.endDate!)) {
      showToast({ title: t("common.error"), description: t("common.startAfterEnd"), variant: "destructive" });
      return;
    }

    const days = differenceInDays(new Date(editingItem.endDate!), new Date(editingItem.startDate!)) + 1;
    const isINSSAuto = days > 15;

    const record: MedicalCertificate = {
      id: editingItem.id || crypto.randomUUID(),
      driverId: editingItem.driverId || crypto.randomUUID(),
      driverName: editingItem.driverName || "",
      driverNickName: editingItem.driverNickName || "",
      base: editingItem.base || "",
      type: (editingItem.type as CertificateType) || "certificate",
      cid: editingItem.cid || "",
      cidDescription: editingItem.cidDescription || "",
      doctorName: editingItem.doctorName || "",
      doctorCRM: editingItem.doctorCRM || "",
      startDate: editingItem.startDate!,
      endDate: editingItem.endDate!,
      totalDays: days,
      status: isINSSAuto ? "inss" : days > 0 && new Date(editingItem.endDate!) >= new Date() ? "active" : "expired",
      approvalStatus: (editingItem.approvalStatus as ApprovalStatus) || "pending",
      blockSchedule: editingItem.blockSchedule ?? true,
      isINSS: editingItem.isINSS || isINSSAuto,
      inssStartDate: isINSSAuto ? editingItem.inssStartDate || format(addDays(new Date(editingItem.startDate!), 15), "yyyy-MM-dd") : undefined,
      inssExpertiseDate: editingItem.inssExpertiseDate,
      inssReturnDate: editingItem.inssReturnDate,
      fileName: editingItem.fileName,
      notes: editingItem.notes,
      createdAt: editingItem.createdAt || format(new Date(), "yyyy-MM-dd"),
      createdBy: editingItem.createdBy || "Usuário",
    };

    if (isNew) {
      setData(prev => [record, ...prev]);
      showToast({ title: t("common.success"), description: t("medicalCertificate.created") });
    } else {
      setData(prev => prev.map(d => d.id === record.id ? record : d));
      showToast({ title: t("common.success"), description: t("medicalCertificate.updated") });
    }
    setEditingItem(null);
  }, [editingItem, isNew, showToast, t]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    setData(prev => prev.filter(d => d.id !== deleteTarget.id));
    setDeleteTarget(null);
    showToast({ title: t("common.success"), description: t("medicalCertificate.deleted") });
  }, [deleteTarget, showToast, t]);

  const handleFileUpload = useCallback(() => {
    showToast({ title: t("common.success"), description: t("medicalCertificate.fileUploaded") });
    setEditingItem(prev => prev ? { ...prev, fileName: "atestado_upload.pdf" } : null);
  }, [showToast, t]);

  // Auto-detect INSS
  const formDays = useMemo(() => {
    if (!editingItem?.startDate || !editingItem?.endDate) return 0;
    return differenceInDays(new Date(editingItem.endDate), new Date(editingItem.startDate)) + 1;
  }, [editingItem?.startDate, editingItem?.endDate]);

  const isINSSDetected = formDays > 15;

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: t("medicalCertificate.kpi.total"), value: kpis.total, icon: FileText, color: "text-foreground" },
          { label: t("medicalCertificate.kpi.active"), value: kpis.active, icon: Activity, color: "text-emerald-600 dark:text-emerald-400" },
          { label: t("medicalCertificate.kpi.inss"), value: kpis.inss, icon: ShieldAlert, color: "text-red-600 dark:text-red-400" },
          { label: t("medicalCertificate.kpi.blocked"), value: kpis.blocked, icon: Ban, color: "text-amber-600 dark:text-amber-400" },
          { label: t("medicalCertificate.kpi.pendingApproval"), value: kpis.pendingApproval, icon: AlertTriangle, color: "text-blue-600 dark:text-blue-400" },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">{t("medicalCertificate.driver")}</Label>
              <LookupSearchField
                value={filterDriverId}
                onChange={(id) => setFilterDriverId(id)}
                endpoint="Drivers"
                placeholder={t("medicalCertificate.searchDriver")}
              />
            </div>
            <div>
              <Label className="text-xs">{t("medicalCertificate.status")}</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="active">{t("medicalCertificate.statusActive")}</SelectItem>
                  <SelectItem value="expired">{t("medicalCertificate.statusExpired")}</SelectItem>
                  <SelectItem value="inss">{t("medicalCertificate.statusINSS")}</SelectItem>
                  <SelectItem value="pending">{t("medicalCertificate.statusPending")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t("medicalCertificate.type")}</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="certificate">{t("medicalCertificate.typeCertificate")}</SelectItem>
                  <SelectItem value="declaration">{t("medicalCertificate.typeDeclaration")}</SelectItem>
                  <SelectItem value="report">{t("medicalCertificate.typeReport")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t("medicalCertificate.startDate")}</Label>
              <DatePickerField value={filterStartDate} onChange={setFilterStartDate} />
            </div>
            <div>
              <Label className="text-xs">{t("medicalCertificate.endDate")}</Label>
              <DatePickerField value={filterEndDate} onChange={setFilterEndDate} />
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSearch}><Search className="h-4 w-4 mr-1" />{t("common.search")}</Button>
              <Button size="sm" variant="outline" onClick={handleClear}><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex items-center gap-2">
              <ExportDropdown
                fetchData={async () => filteredData as unknown as Record<string, unknown>[]}
                columns={[
                  { key: "driverName", label: t("medicalCertificate.driver") },
                  { key: "type", label: t("medicalCertificate.type") },
                  { key: "cid", label: "CID" },
                  { key: "startDate", label: t("medicalCertificate.startDate") },
                  { key: "endDate", label: t("medicalCertificate.endDate") },
                  { key: "totalDays", label: t("medicalCertificate.days") },
                  { key: "status", label: t("medicalCertificate.status") },
                ]}
                title="atestados_medicos"
              />
              <Button size="sm" onClick={handleNew}><Plus className="h-4 w-4 mr-1" />{t("common.new")}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("medicalCertificate.driver")}</TableHead>
                <TableHead>{t("medicalCertificate.base")}</TableHead>
                <TableHead>{t("medicalCertificate.type")}</TableHead>
                <TableHead>CID</TableHead>
                <TableHead>{t("medicalCertificate.period")}</TableHead>
                <TableHead>{t("medicalCertificate.days")}</TableHead>
                <TableHead>{t("medicalCertificate.status")}</TableHead>
                <TableHead>{t("medicalCertificate.approval")}</TableHead>
                <TableHead className="text-center">{t("medicalCertificate.scheduleBlock")}</TableHead>
                <TableHead className="text-center">INSS</TableHead>
                <TableHead className="w-[100px]">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    {t("common.noResults")}
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((item, idx) => {
                  const sc = statusConfig[item.status];
                  const ac = approvalConfig[item.approvalStatus];
                  return (
                    <TableRow
                      key={item.id}
                      className={idx % 2 === 0 ? "" : "bg-muted/30"}
                      onDoubleClick={() => setDetailItem(item)}
                    >
                      <TableCell>
                        <div>
                          <span className="font-medium text-sm">{item.driverNickName}</span>
                          <p className="text-xs text-muted-foreground">{item.driverName}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{item.base}</TableCell>
                      <TableCell>
                        <span className="text-sm">{typeLabels[item.type]}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{item.cid || "—"}</span>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(parseISO(item.startDate), "dd/MM/yyyy")} – {format(parseISO(item.endDate), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-center font-medium">{item.totalDays}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${sc.color} text-xs`}>
                          {t(`medicalCertificate.status${item.status.charAt(0).toUpperCase() + item.status.slice(1)}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${ac.color} text-xs`}>
                          {t(`medicalCertificate.approval${item.approvalStatus.charAt(0).toUpperCase() + item.approvalStatus.slice(1)}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.blockSchedule ? (
                          <Ban className="h-4 w-4 text-red-500 mx-auto" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.isINSS && <ShieldAlert className="h-4 w-4 text-red-500 mx-auto" />}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailItem(item)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(item)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {filteredData.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">
                {filteredData.length} {t("common.records")}
              </span>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">{currentPage}/{totalPages}</span>
                <Button size="icon" variant="outline" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/New Panel */}
      {editingItem && (
        <FloatingPanel
          title={isNew ? t("medicalCertificate.newCertificate") : t("medicalCertificate.editCertificate")}
          onClose={() => setEditingItem(null)}
          width={680}
          maxHeight="85vh"
        >
          <div className="space-y-4 py-2">
            {/* Driver */}
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-4">
                <Label className="text-xs">{t("medicalCertificate.driver")} <span className="text-destructive">*</span></Label>
                <LookupSearchField
                  value={editingItem.driverId || ""}
                  onChange={(id, item) => setEditingItem(prev => prev ? {
                    ...prev,
                    driverId: id,
                    driverName: item ? String(item.name || "") + " " + String(item.lastName || "") : "",
                    driverNickName: item ? String(item.nickName || "") : "",
                  } : null)}
                  endpoint="Drivers"
                  placeholder={t("medicalCertificate.searchDriver")}
                  initialLabel={editingItem.driverName || ""}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">{t("medicalCertificate.base")}</Label>
                <Input
                  className="h-9"
                  value={editingItem.base || ""}
                  onChange={e => setEditingItem(prev => prev ? { ...prev, base: e.target.value.toUpperCase() } : null)}
                />
              </div>
            </div>

            {/* Type & CID */}
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">{t("medicalCertificate.type")} <span className="text-destructive">*</span></Label>
                <Select value={editingItem.type || "certificate"} onValueChange={v => setEditingItem(prev => prev ? { ...prev, type: v as CertificateType } : null)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="certificate">{t("medicalCertificate.typeCertificate")}</SelectItem>
                    <SelectItem value="declaration">{t("medicalCertificate.typeDeclaration")}</SelectItem>
                    <SelectItem value="report">{t("medicalCertificate.typeReport")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">CID</Label>
                <Input
                  className="h-9"
                  value={editingItem.cid || ""}
                  onChange={e => setEditingItem(prev => prev ? { ...prev, cid: e.target.value.toUpperCase() } : null)}
                  placeholder="Ex: M54.5"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">{t("medicalCertificate.cidDescription")}</Label>
                <Input
                  className="h-9"
                  value={editingItem.cidDescription || ""}
                  onChange={e => setEditingItem(prev => prev ? { ...prev, cidDescription: e.target.value } : null)}
                />
              </div>
            </div>

            {/* Doctor */}
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-4">
                <Label className="text-xs">{t("medicalCertificate.doctor")}</Label>
                <Input
                  className="h-9"
                  value={editingItem.doctorName || ""}
                  onChange={e => setEditingItem(prev => prev ? { ...prev, doctorName: e.target.value } : null)}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">{t("medicalCertificate.crm")}</Label>
                <Input
                  className="h-9"
                  value={editingItem.doctorCRM || ""}
                  onChange={e => setEditingItem(prev => prev ? { ...prev, doctorCRM: e.target.value.toUpperCase() } : null)}
                  placeholder="CRM-XX 000000"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">{t("medicalCertificate.startDate")} <span className="text-destructive">*</span></Label>
                <DatePickerField
                  value={editingItem.startDate || null}
                  onChange={v => setEditingItem(prev => prev ? { ...prev, startDate: v || undefined } : null)}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">{t("medicalCertificate.endDate")} <span className="text-destructive">*</span></Label>
                <DatePickerField
                  value={editingItem.endDate || null}
                  onChange={v => setEditingItem(prev => prev ? { ...prev, endDate: v || undefined } : null)}
                />
              </div>
              <div className="col-span-1">
                <Label className="text-xs">{t("medicalCertificate.days")}</Label>
                <div className="h-9 flex items-center">
                  <span className={`text-lg font-bold ${isINSSDetected ? "text-red-600 dark:text-red-400" : ""}`}>{formDays}</span>
                </div>
              </div>
              <div className="col-span-1">
                <Label className="text-xs">{t("medicalCertificate.approval")}</Label>
                <Select
                  value={editingItem.approvalStatus || "pending"}
                  onValueChange={v => setEditingItem(prev => prev ? { ...prev, approvalStatus: v as ApprovalStatus } : null)}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t("medicalCertificate.approvalPending")}</SelectItem>
                    <SelectItem value="approved">{t("medicalCertificate.approvalApproved")}</SelectItem>
                    <SelectItem value="rejected">{t("medicalCertificate.approvalRejected")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* INSS Auto Detection */}
            {isINSSDetected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    {t("medicalCertificate.inssDetected", { days: formDays })}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">{t("medicalCertificate.inssStart")}</Label>
                    <DatePickerField
                      value={editingItem.inssStartDate || null}
                      onChange={v => setEditingItem(prev => prev ? { ...prev, inssStartDate: v || undefined } : null)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("medicalCertificate.inssExpertise")}</Label>
                    <DatePickerField
                      value={editingItem.inssExpertiseDate || null}
                      onChange={v => setEditingItem(prev => prev ? { ...prev, inssExpertiseDate: v || undefined } : null)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("medicalCertificate.inssReturn")}</Label>
                    <DatePickerField
                      value={editingItem.inssReturnDate || null}
                      onChange={v => setEditingItem(prev => prev ? { ...prev, inssReturnDate: v || undefined } : null)}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingItem.blockSchedule ?? true}
                  onCheckedChange={v => setEditingItem(prev => prev ? { ...prev, blockSchedule: v } : null)}
                />
                <Label className="text-sm flex items-center gap-1">
                  <Ban className="h-3.5 w-3.5" />
                  {t("medicalCertificate.blockSchedule")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={editingItem.isINSS || isINSSDetected}
                  onCheckedChange={v => setEditingItem(prev => prev ? { ...prev, isINSS: !!v } : null)}
                  disabled={isINSSDetected}
                />
                <Label className="text-sm">{t("medicalCertificate.inssCase")}</Label>
              </div>
            </div>

            {/* Upload */}
            <div>
              <Label className="text-xs">{t("medicalCertificate.attachment")}</Label>
              <div
                className="mt-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                onClick={handleFileUpload}
              >
                {editingItem.fileName ? (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>{editingItem.fileName}</span>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6"
                      onClick={e => { e.stopPropagation(); setEditingItem(prev => prev ? { ...prev, fileName: undefined } : null); }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t("medicalCertificate.uploadHint")}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs">{t("medicalCertificate.notes")}</Label>
              <Textarea
                className="min-h-[60px]"
                value={editingItem.notes || ""}
                onChange={e => setEditingItem(prev => prev ? { ...prev, notes: e.target.value } : null)}
              />
            </div>

            {/* Save */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingItem(null)}>{t("common.cancel")}</Button>
              <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" />{t("common.save")}</Button>
            </div>
          </div>
        </FloatingPanel>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              {t("medicalCertificate.details")}
            </DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">{t("medicalCertificate.driver")}</Label>
                  <p className="font-medium">{detailItem.driverName}</p>
                  <p className="text-sm text-muted-foreground">{detailItem.driverNickName} • {detailItem.base}</p>
                </div>
                <div className="flex gap-2 justify-end items-start">
                  <Badge variant="outline" className={statusConfig[detailItem.status].color}>
                    {t(`medicalCertificate.status${detailItem.status.charAt(0).toUpperCase() + detailItem.status.slice(1)}`)}
                  </Badge>
                  <Badge variant="outline" className={approvalConfig[detailItem.approvalStatus].color}>
                    {t(`medicalCertificate.approval${detailItem.approvalStatus.charAt(0).toUpperCase() + detailItem.approvalStatus.slice(1)}`)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">{t("medicalCertificate.type")}</Label>
                  <p className="text-sm">{typeLabels[detailItem.type]}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">CID</Label>
                  <p className="text-sm font-mono">{detailItem.cid || "—"}</p>
                  <p className="text-xs text-muted-foreground">{detailItem.cidDescription}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("medicalCertificate.doctor")}</Label>
                  <p className="text-sm">{detailItem.doctorName}</p>
                  <p className="text-xs text-muted-foreground">{detailItem.doctorCRM}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">{t("medicalCertificate.startDate")}</Label>
                  <p className="text-sm">{format(parseISO(detailItem.startDate), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("medicalCertificate.endDate")}</Label>
                  <p className="text-sm">{format(parseISO(detailItem.endDate), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("medicalCertificate.days")}</Label>
                  <p className="text-sm font-bold">{detailItem.totalDays} dias</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("medicalCertificate.scheduleBlock")}</Label>
                  <div className="flex items-center gap-1 mt-0.5">
                    {detailItem.blockSchedule ? (
                      <><Ban className="h-4 w-4 text-red-500" /><span className="text-sm text-red-600 dark:text-red-400">{t("medicalCertificate.blocked")}</span></>
                    ) : (
                      <><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-sm text-emerald-600 dark:text-emerald-400">{t("medicalCertificate.released")}</span></>
                    )}
                  </div>
                </div>
              </div>

              {/* INSS Section */}
              {detailItem.isINSS && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-400">{t("medicalCertificate.inssSection")}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("medicalCertificate.inssStart")}</Label>
                      <p className="text-sm">{detailItem.inssStartDate ? format(parseISO(detailItem.inssStartDate), "dd/MM/yyyy") : "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("medicalCertificate.inssExpertise")}</Label>
                      <p className="text-sm">{detailItem.inssExpertiseDate ? format(parseISO(detailItem.inssExpertiseDate), "dd/MM/yyyy") : "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("medicalCertificate.inssReturn")}</Label>
                      <p className="text-sm">{detailItem.inssReturnDate ? format(parseISO(detailItem.inssReturnDate), "dd/MM/yyyy") : "—"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Attachment */}
              {detailItem.fileName && (
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm">{detailItem.fileName}</span>
                </div>
              )}

              {/* Notes */}
              {detailItem.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">{t("medicalCertificate.notes")}</Label>
                  <p className="text-sm mt-1">{detailItem.notes}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground text-right">
                {t("medicalCertificate.createdBy")}: {detailItem.createdBy} • {format(parseISO(detailItem.createdAt), "dd/MM/yyyy")}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("medicalCertificate.deleteConfirm", { name: deleteTarget?.driverName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
