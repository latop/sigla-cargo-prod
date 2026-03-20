import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Loader2, PackageSearch, Search, FileSpreadsheet, FileUp,
  Download, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Upload, X, CheckCircle2, AlertCircle, Eye, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FloatingPanel } from "@/components/FloatingPanel";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { API_BASE } from "@/config/api";
import { getStoredToken } from "@/contexts/AuthContext";
import { format, subDays, addDays } from "date-fns";
import { DatePickerField } from "@/components/DatePickerField";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const ACCEPTED_EXTENSIONS = ".xlsx";

interface GTMSRecord {
  id?: string;
  Id?: string;
  tripGTMSId?: string;
  fileName?: string;
  FileName?: string;
  importDate?: string;
  createAt?: string;
  CreateAt?: string;
  locationCode?: string;
  LocationCode?: string;
  locationGroupCode?: string;
  [key: string]: unknown;
}

interface TripGTMSDetail {
  dt?: string;
  sto?: string;
  codOrigem?: string;
  cdOrigem?: string;
  codDestino?: string;
  clienteCDV?: string;
  dataColeta?: string;
  horaColeta?: string;
  dataSaida?: string;
  horaSaida?: string;
  dataEntrega?: string;
  horaEntrega?: string;
  dataSolicitacao?: string;
  message?: string;
  status?: string;
  erro?: string;
  [key: string]: unknown;
}

interface TripGTMSHeader {
  locationCode?: string;
  fileName?: string;
  createAt?: string;
  id?: string;
  [key: string]: unknown;
}

interface TripGTMSResponse {
  tripGTMS?: TripGTMSHeader;
  tripGTMSDetails?: TripGTMSDetail[];
  tripGTMSDetail?: TripGTMSDetail[];
  locationCode?: string;
  fileName?: string;
  createAt?: string;
  [key: string]: unknown;
}

const ImportMapPage = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language as "pt" | "en" | "es";

  // --- Upload state ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLocationCode, setUploadLocationCode] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadErrorMessage, setUploadErrorMessage] = useState("");

  // Import result panel
  const [importResultOpen, setImportResultOpen] = useState(false);
  const [importResultStatus, setImportResultStatus] = useState<"processing" | "success" | "error">("processing");
  const [importResultMessage, setImportResultMessage] = useState("");
  const [importResultErrors, setImportResultErrors] = useState<TripGTMSDetail[]>([]);


  // --- Listing state ---
  const [records, setRecords] = useState<GTMSRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const today = new Date();
  const [filterStart, setFilterStart] = useState(format(subDays(today, 1), "yyyy-MM-dd"));
  const [filterEnd, setFilterEnd] = useState(format(addDays(today, 1), "yyyy-MM-dd"));
  const [filterLocationGroup, setFilterLocationGroup] = useState("");

  // Pagination
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Location groups
  const [locationGroups, setLocationGroups] = useState<{ code: string; description: string }[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sort
  const [sortField, setSortField] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // View details dialog
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsData, setDetailsData] = useState<TripGTMSResponse | null>(null);
  const [detailsPage, setDetailsPage] = useState(1);
  const [detailsPageSize, setDetailsPageSize] = useState(20);

  const labels: Record<string, Record<string, string>> = {
    title: { pt: "Importação de Demandas", en: "Demand Import", es: "Importación de Demandas" },
    importSection: { pt: "Importar Arquivo", en: "Import File", es: "Importar Archivo" },
    importSectionDesc: { pt: "Selecione um arquivo e o grupo de localidade para importar as demandas.", en: "Select a file and location group to import demands.", es: "Seleccione un archivo y el grupo de localidad para importar demandas." },
    listTitle: { pt: "Demandas Importadas", en: "Imported Demands", es: "Demandas Importadas" },
    fileName: { pt: "Arquivo", en: "File", es: "Archivo" },
    importDate: { pt: "Data/Hora", en: "Date/Time", es: "Fecha/Hora" },
    locationCode: { pt: "Localidade", en: "Location", es: "Localidad" },
    noRecords: { pt: "Nenhum registro encontrado no período.", en: "No records found in the period.", es: "No se encontraron registros en el período." },
    search: { pt: "Pesquisar", en: "Search", es: "Buscar" },
    startDate: { pt: "Data Inicial Solicitação", en: "Request Start Date", es: "Fecha Inicial Solicitud" },
    endDate: { pt: "Data Final Solicitação", en: "Request End Date", es: "Fecha Final Solicitud" },
    connectionError: { pt: "Erro de conexão com a API.", en: "API connection error.", es: "Error de conexión con la API." },
    downloadTemplate: { pt: "Baixar modelo", en: "Download template", es: "Descargar plantilla" },
    actions: { pt: "Ações", en: "Actions", es: "Acciones" },
    export: { pt: "Exportar", en: "Export", es: "Exportar" },
    delete: { pt: "Excluir", en: "Delete", es: "Eliminar" },
    deleteConfirmTitle: { pt: "Confirmar Exclusão", en: "Confirm Deletion", es: "Confirmar Eliminación" },
    deleteConfirmMsg: { pt: "Tem certeza que deseja excluir o arquivo", en: "Are you sure you want to delete the file", es: "¿Está seguro de que desea eliminar el archivo" },
    cancel: { pt: "Cancelar", en: "Cancel", es: "Cancelar" },
    deleteSuccess: { pt: "Arquivo excluído com sucesso.", en: "File deleted successfully.", es: "Archivo eliminado con éxito." },
    deleteError: { pt: "Erro ao excluir arquivo.", en: "Error deleting file.", es: "Error al eliminar archivo." },
    dropzone: { pt: "Arraste o arquivo aqui ou clique para selecionar", en: "Drag the file here or click to select", es: "Arrastre el archivo aquí o haga clic para seleccionar" },
    acceptedFormats: { pt: "Formato aceito: XLSX", en: "Accepted format: XLSX", es: "Formato aceptado: XLSX" },
    import: { pt: "Importar", en: "Import", es: "Importar" },
    importing: { pt: "Importação em andamento...", en: "Import in progress...", es: "Importación en curso..." },
    success: { pt: "Importação realizada com sucesso!", en: "Import completed successfully!", es: "¡Importación completada con éxito!" },
    error: { pt: "Erro na importação", en: "Import error", es: "Error en la importación" },
    file: { pt: "Arquivo", en: "File", es: "Archivo" },
    requiredFields: { pt: "Preencha todos os campos obrigatórios.", en: "Fill in all required fields.", es: "Complete todos los campos obligatorios." },
    locationCodeLabel: { pt: "Grupo de Localidade", en: "Location Group", es: "Grupo de Localidad" },
    locationCodePlaceholder: { pt: "Selecione o grupo", en: "Select group", es: "Seleccione grupo" },
    checkHasErrors: { pt: "A validação encontrou inconsistências:", en: "Validation found inconsistencies:", es: "La validación encontró inconsistencias:" },
    rowsPerPage: { pt: "Linhas por página", en: "Rows per page", es: "Filas por página" },
    of: { pt: "de", en: "of", es: "de" },
    viewTrips: { pt: "Consultar Viagens", en: "View Trips", es: "Ver Viajes" },
    tripDetailsTitle: { pt: "Viagens Importadas", en: "Imported Trips", es: "Viajes Importadas" },
    close: { pt: "Fechar", en: "Close", es: "Cerrar" },
    allGroups: { pt: "Todos", en: "All", es: "Todos" },
    message: { pt: "Mensagem", en: "Message", es: "Mensaje" },
    clear: { pt: "Limpar", en: "Clear", es: "Limpiar" },
  };

  const l = (key: string) => labels[key]?.[lang] || labels[key]?.pt || key;

  useEffect(() => {
    fetchLocationGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const authHeaders = (): Record<string, string> => {
    const token = getStoredToken();
    const h: Record<string, string> = {};
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  };

  const fetchLocationGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch(`${API_BASE}/LocationGroup?PageSize=999`, {
        credentials: "include",
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setLocationGroups(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    finally { setLoadingGroups(false); }
  };

  // ==================== UPLOAD ====================
  const handleFileSelect = (file: File) => {
    setUploadSuccess(false);
    setUploadErrorMessage("");
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const clearUpload = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadSuccess(false);
    setUploadErrorMessage("");
    setUploadLocationCode("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleImport = async () => {
    if (!selectedFile || !uploadLocationCode.trim()) {
      toast.error(l("requiredFields"));
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadSuccess(false);
    setUploadErrorMessage("");

    // Open result panel in processing state
    setImportResultOpen(true);
    setImportResultStatus("processing");
    setImportResultMessage("");
    setImportResultErrors([]);

    const interval = setInterval(() => {
      setUploadProgress((p) => {
        if (p >= 90) { clearInterval(interval); return 90; }
        return p + 5;
      });
    }, 400);

    try {
      const token = getStoredToken();
      const formData = new FormData();
      formData.append("File", selectedFile);
      formData.append("Locationcode", uploadLocationCode.trim());

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/importGTMSCheck`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers,
      });

      clearInterval(interval);
      setUploadProgress(100);

      if (res.ok) {
        let data: Record<string, unknown> = {};
        try { data = await res.json(); } catch { /* empty */ }

        const preview = data?.preview as string | undefined;
        const details = data?.tripGTMSDetails as TripGTMSDetail[] | undefined;

        if (preview) {
          setImportResultStatus("error");
          setImportResultMessage(preview);
        } else if (details && Array.isArray(details)) {
          const errorDetails = details.filter(d => d.erro && d.erro.trim() !== "");
          if (errorDetails.length > 0) {
            setImportResultStatus("error");
            setImportResultMessage(l("checkHasErrors"));
            setImportResultErrors(errorDetails);
          } else {
            setUploadSuccess(true);
            setImportResultStatus("success");
            setImportResultMessage(l("success"));
            toast.success(l("success"));
            fetchRecords(1, pageSize);
          }
        } else {
          setUploadSuccess(true);
          setImportResultStatus("success");
          setImportResultMessage(l("success"));
          toast.success(l("success"));
          fetchRecords(1, pageSize);
        }
      } else {
        const rawText = await res.text();
        let msg = `${l("error")} (${res.status})`;
        let errorDetails: TripGTMSDetail[] = [];

        try {
          const errData = JSON.parse(rawText);
          const preview = errData?.preview as string | undefined;
          const details = errData?.tripGTMSDetails as TripGTMSDetail[] | undefined;
          msg = (preview || errData?.message || errData?.title || errData?.error || msg) as string;

          if (details && Array.isArray(details)) {
            errorDetails = details.filter(d => d.erro && d.erro.trim() !== "");
          }
        } catch {
          if (rawText && rawText.trim()) {
            msg = rawText.trim();
          }
        }

        setImportResultStatus("error");
        setImportResultMessage(msg);
        if (errorDetails.length > 0) {
          setImportResultErrors(errorDetails);
        }
      }
    } catch {
      clearInterval(interval);
      setImportResultStatus("error");
      setImportResultMessage(l("connectionError"));
    } finally {
      setUploading(false);
    }
  };

  // ==================== LISTING ====================
  const fetchRecords = async (page?: number, size?: number) => {
    setLoadingRecords(true);
    const currentPage = page ?? pageNumber;
    const currentSize = size ?? pageSize;
    try {
      const params = new URLSearchParams({
        startDate: filterStart,
        endDate: filterEnd,
        PageNumber: String(currentPage),
        PageSize: String(currentSize),
      });
      if (filterLocationGroup && filterLocationGroup !== "all") {
        params.set("locationGroupCode", filterLocationGroup);
      }

      const res = await fetch(`${API_BASE}/GetAllGTMS?${params}`, {
        credentials: "include",
        headers: authHeaders(),
      });

      if (res.ok) {
        const paginationHeader = res.headers.get("x-pagination");
        if (paginationHeader) {
          try {
            const pag = JSON.parse(paginationHeader);
            setTotalCount(pag.TotalCount ?? pag.totalCount ?? 0);
            setTotalPages(pag.TotalPages ?? pag.totalPages ?? 1);
          } catch { /* ignore */ }
        }

        const data = await res.json();
        if (Array.isArray(data)) {
          setRecords(data);
          if (!paginationHeader) {
            setTotalCount(data.length);
            setTotalPages(1);
          }
        } else {
          setRecords(data?.items || data?.data || []);
          if (data?.totalCount != null) setTotalCount(data.totalCount);
          if (data?.totalPages != null) setTotalPages(data.totalPages);
        }
      } else {
        setRecords([]);
      }
    } catch {
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPageNumber(newPage);
    fetchRecords(newPage, pageSize);
  };

  const handlePageSizeChange = (newSize: string) => {
    const size = parseInt(newSize);
    setPageSize(size);
    setPageNumber(1);
    fetchRecords(1, size);
  };

  const handleSearch = () => {
    setPageNumber(1);
    fetchRecords(1, pageSize);
  };

  // ==================== ACTIONS ====================
  const handleViewDetails = async (rec: GTMSRecord) => {
    const recId = rec.tripGTMSId || rec.Id || rec.id;
    if (!recId) return;
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsData(null);
    setDetailsPage(1);
    try {
      const res = await fetch(`${API_BASE}/GetGTMS/?Id=${recId}`, {
        credentials: "include",
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setDetailsData(data);
      } else {
        toast.error(l("connectionError"));
        setDetailsOpen(false);
      }
    } catch {
      toast.error(l("connectionError"));
      setDetailsOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleExport = async (rec: GTMSRecord) => {
    const recId = rec.tripGTMSId || rec.Id || rec.id;
    if (!recId) return;
    try {
      const res = await fetch(`${API_BASE}/ExportGTMS/?tripGTMSId=${recId}`, {
        credentials: "include",
        headers: authHeaders(),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = rec.FileName || rec.fileName || `export_${recId}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        toast.error(l("connectionError"));
      }
    } catch {
      toast.error(l("connectionError"));
    }
  };

  const handleDelete = async (rec: GTMSRecord) => {
    const recId = rec.tripGTMSId || rec.Id || rec.id;
    if (!recId) return;
    setDeletingId(recId);
    try {
      const res = await fetch(`${API_BASE}/deleteDemand?id=${recId}`, {
        method: "DELETE",
        credentials: "include",
        headers: authHeaders(),
      });
      if (res.ok) {
        let data: Record<string, unknown> = {};
        try { data = await res.json(); } catch { /* empty */ }
        const msg = data?.message as string | undefined;
        if (msg && msg.toLowerCase().includes("não será possível")) {
          toast.error(msg);
        } else {
          toast.success(l("deleteSuccess"));
          fetchRecords();
        }
      } else {
        let errData: Record<string, unknown> = {};
        try { errData = await res.json(); } catch { /* empty */ }
        const msg = (errData?.message || errData?.title || l("deleteError")) as string;
        toast.error(msg);
      }
    } catch {
      toast.error(l("connectionError"));
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return "-";
    try { return format(new Date(d), "dd/MM/yyyy HH:mm"); } catch { return d; }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedRecords = [...records].sort((a, b) => {
    if (!sortField) return 0;
    const getVal = (rec: GTMSRecord) => {
      if (sortField === "locationCode") return (rec.LocationCode || rec.locationCode || rec.locationGroupCode || "").toString().toLowerCase();
      if (sortField === "fileName") return (rec.FileName || rec.fileName || "").toString().toLowerCase();
      if (sortField === "createAt") return rec.CreateAt || rec.createAt || rec.importDate || "";
      return "";
    };
    const va = getVal(a);
    const vb = getVal(b);
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground/40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
      : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  const detailsList = detailsData?.tripGTMSDetails || detailsData?.tripGTMSDetail || [];
  const detailsTotalPages = Math.max(1, Math.ceil(detailsList.length / detailsPageSize));
  const detailsSlice = (detailsList as TripGTMSDetail[]).slice(
    (detailsPage - 1) * detailsPageSize,
    detailsPage * detailsPageSize
  );
  const detailsHeader = detailsData?.tripGTMS;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <PackageSearch className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-display font-bold text-foreground">{l("title")}</h1>
      </div>

      {/* ============ UPLOAD SECTION ============ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileUp className="h-4 w-4 text-primary" />
            {l("importSection")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{l("importSectionDesc")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            {/* Dropzone */}
            <div className="flex-1 min-w-[250px]">
              <Label className="text-xs font-medium">
                {l("file")} <span className="text-destructive">*</span>
              </Label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors mt-1",
                  !selectedFile && !uploading
                    ? "border-border hover:border-primary/50 hover:bg-muted/30"
                    : selectedFile
                    ? "border-primary/30 bg-primary/5"
                    : "pointer-events-none opacity-60",
                  uploading && "pointer-events-none opacity-60"
                )}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS}
                  onChange={handleInputChange}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="text-xs font-medium truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => { e.stopPropagation(); clearUpload(); }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground/50 mb-1" />
                    <p className="text-xs text-muted-foreground">{l("dropzone")}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{l("acceptedFormats")}</p>
                  </>
                )}
              </div>
            </div>

            {/* Location Group */}
            <div className="w-[200px]">
              <Label className="text-xs font-medium">
                {l("locationCodeLabel")} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={uploadLocationCode}
                onValueChange={setUploadLocationCode}
                disabled={uploading || loadingGroups}
              >
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue placeholder={l("locationCodePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {locationGroups.map((lg) => (
                    <SelectItem key={lg.code} value={lg.code}>
                      {lg.code} – {lg.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Import Button */}
            <Button
              size="sm"
              className="h-9 text-xs gap-1.5"
              disabled={!selectedFile || !uploadLocationCode.trim() || uploading}
              onClick={handleImport}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileUp className="h-3.5 w-3.5" />
              )}
              {l("import")}
            </Button>

            {/* Clear / Reset Button */}
            {(selectedFile || uploadSuccess || importResultStatus === "error") && !uploading && (
              <Button
                size="sm"
                variant="outline"
                className="h-9 text-xs gap-1.5"
                onClick={clearUpload}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {l("clear")}
              </Button>
            )}
          </div>

          {/* Progress */}
          {uploading && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {l("importing")}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Success */}
          {uploadSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-md border border-accent bg-accent/10 p-3 flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4 text-accent-foreground" />
              <span className="text-xs font-medium">{l("success")}</span>
            </motion.div>
          )}

        </CardContent>
      </Card>

      {/* ============ LISTING SECTION ============ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{l("listTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{l("startDate")}</Label>
              <DatePickerField
                value={filterStart}
                onChange={(v) => v && setFilterStart(v)}
                includeTime={false}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{l("endDate")}</Label>
              <DatePickerField
                value={filterEnd}
                onChange={(v) => v && setFilterEnd(v)}
                includeTime={false}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{l("locationCodeLabel")}</Label>
              <Select
                value={filterLocationGroup}
                onValueChange={setFilterLocationGroup}
              >
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder={l("allGroups")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{l("allGroups")}</SelectItem>
                  {locationGroups.map((lg) => (
                    <SelectItem key={lg.code} value={lg.code}>
                      {lg.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs gap-1.5"
              onClick={handleSearch}
              disabled={loadingRecords}
            >
              {loadingRecords ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              {l("search")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs gap-1.5"
              onClick={() => {
                setFilterStart(format(subDays(new Date(), 1), "yyyy-MM-dd"));
                setFilterEnd(format(addDays(new Date(), 1), "yyyy-MM-dd"));
                setFilterLocationGroup("");
                setRecords([]);
              }}
            >
              <X className="h-3.5 w-3.5" />
              {l("clear")}
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("locationCode")}>
                    <span className="flex items-center">{l("locationCode")}<SortIcon field="locationCode" /></span>
                  </TableHead>
                  <TableHead className="text-xs cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("fileName")}>
                    <span className="flex items-center">{l("fileName")}<SortIcon field="fileName" /></span>
                  </TableHead>
                  <TableHead className="text-xs cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("createAt")}>
                    <span className="flex items-center">{l("importDate")}<SortIcon field="createAt" /></span>
                  </TableHead>
                  <TableHead className="text-xs text-right">{l("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRecords ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">
                      {l("noRecords")}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRecords.map((rec, idx) => {
                    const recId = rec.tripGTMSId || rec.Id || rec.id;
                    const recFileName = rec.FileName || rec.fileName;
                    const recLocationCode = rec.LocationCode || rec.locationCode || rec.locationGroupCode;
                    const recCreateAt = rec.CreateAt || rec.createAt || rec.importDate;
                    return (
                      <TableRow key={recId ?? idx}>
                        <TableCell className="text-xs">{recLocationCode || "-"}</TableCell>
                        <TableCell className="text-xs">{recFileName || "-"}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(recCreateAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* View trips */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title={l("viewTrips")}
                              onClick={() => handleViewDetails(rec)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {/* Export */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title={l("export")}
                              onClick={() => handleExport(rec)}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            {/* Delete */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  title={l("delete")}
                                  disabled={deletingId === recId}
                                >
                                  {deletingId === recId ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{l("deleteConfirmTitle")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {l("deleteConfirmMsg")} <strong>"{recFileName || recId}"</strong>?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{l("cancel")}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(rec)}>
                                    {l("delete")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{l("rowsPerPage")}</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-7 w-[65px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((s) => (
                    <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>
                {totalCount > 0
                  ? `${(pageNumber - 1) * pageSize + 1}-${Math.min(pageNumber * pageSize, totalCount)} ${l("of")} ${totalCount}`
                  : `0 ${l("of")} 0`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={pageNumber <= 1 || loadingRecords} onClick={() => handlePageChange(1)}>
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={pageNumber <= 1 || loadingRecords} onClick={() => handlePageChange(pageNumber - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">{pageNumber} / {totalPages}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={pageNumber >= totalPages || loadingRecords} onClick={() => handlePageChange(pageNumber + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={pageNumber >= totalPages || loadingRecords} onClick={() => handlePageChange(totalPages)}>
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ============ TRIP DETAILS FLOATING PANEL ============ */}
      {detailsOpen && (
        <FloatingPanel
          title={l("tripDetailsTitle")}
          onClose={() => setDetailsOpen(false)}
          width={1100}
        >
          {detailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detailsData ? (
            <div className="space-y-3">
              {/* Header info */}
              <div className="grid grid-cols-[2fr_0.8fr_1fr] gap-3 p-2.5 rounded-md bg-primary/10 border border-primary/20 text-xs">
                <div>
                  <span className="text-muted-foreground font-semibold">Arquivo:</span>{" "}
                  <span className="font-medium">{detailsHeader?.fileName || detailsData.fileName || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Localidade:</span>{" "}
                  <span className="font-medium">{detailsHeader?.locationCode || detailsData.locationCode || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Data/Hora de Importação:</span>{" "}
                  <span className="font-medium">{formatDate(detailsHeader?.createAt || detailsData.createAt)}</span>
                </div>
              </div>

              {/* Details table */}
              <div className="rounded-md border max-h-[55vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="h-7 bg-muted/80 border-b-2 border-border">
                      <TableHead className="text-[10px] font-bold whitespace-nowrap py-1 px-2">DT</TableHead>
                      <TableHead className="text-[10px] font-bold whitespace-nowrap py-1 px-2">STO</TableHead>
                      <TableHead className="text-[10px] font-bold whitespace-nowrap py-1 px-2">Cód. Origem</TableHead>
                      <TableHead className="text-[10px] font-bold whitespace-nowrap py-1 px-2">CD Origem</TableHead>
                      <TableHead className="text-[10px] font-bold whitespace-nowrap py-1 px-2">Cód. Destino</TableHead>
                      <TableHead className="text-[10px] font-bold whitespace-nowrap py-1 px-2">Cliente CDV</TableHead>
                      <TableHead className="text-[10px] font-bold whitespace-nowrap py-1 px-2">Data Coleta</TableHead>
                      <TableHead className="text-[10px] font-bold whitespace-nowrap py-1 px-2">Hora Coleta</TableHead>
                      <TableHead className="text-[10px] font-bold whitespace-nowrap py-1 px-2">Data Saída</TableHead>
                      <TableHead className="text-[10px] font-bold whitespace-nowrap py-1 px-2">Hora Saída</TableHead>
                      <TableHead className="text-[10px] font-bold whitespace-nowrap py-1 px-2">Data Entrega</TableHead>
                      <TableHead className="text-[10px] font-bold whitespace-nowrap py-1 px-2">Hora Entrega</TableHead>
                      <TableHead className="text-[10px] font-bold whitespace-nowrap py-1 px-2">Data Solicitação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailsSlice.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center py-4 text-xs text-muted-foreground">
                          {l("noRecords")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      detailsSlice.map((d, idx) => (
                        <TableRow key={idx} className={`h-6 ${idx % 2 === 0 ? "bg-background" : "bg-muted/30"}`}>
                          <TableCell className="text-[10px] font-mono py-0.5 px-2">{d.dt || "-"}</TableCell>
                          <TableCell className="text-[10px] font-mono py-0.5 px-2">{d.sto || "-"}</TableCell>
                          <TableCell className="text-[10px] py-0.5 px-2">{d.codOrigem || "-"}</TableCell>
                          <TableCell className="text-[10px] py-0.5 px-2">{d.cdOrigem || "-"}</TableCell>
                          <TableCell className="text-[10px] py-0.5 px-2">{d.codDestino || "-"}</TableCell>
                          <TableCell className="text-[10px] py-0.5 px-2">{d.clienteCDV || "-"}</TableCell>
                          <TableCell className="text-[10px] whitespace-nowrap py-0.5 px-2">{d.dataColeta || "-"}</TableCell>
                          <TableCell className="text-[10px] py-0.5 px-2">{d.horaColeta || "-"}</TableCell>
                          <TableCell className="text-[10px] whitespace-nowrap py-0.5 px-2">{d.dataSaida || "-"}</TableCell>
                          <TableCell className="text-[10px] py-0.5 px-2">{d.horaSaida || "-"}</TableCell>
                          <TableCell className="text-[10px] whitespace-nowrap py-0.5 px-2">{d.dataEntrega || "-"}</TableCell>
                          <TableCell className="text-[10px] py-0.5 px-2">{d.horaEntrega || "-"}</TableCell>
                          <TableCell className="text-[10px] whitespace-nowrap py-0.5 px-2">{d.dataSolicitacao || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Details Pagination */}
              {detailsList.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{l("rowsPerPage")}</span>
                    <Select value={String(detailsPageSize)} onValueChange={(v) => { setDetailsPageSize(parseInt(v)); setDetailsPage(1); }}>
                      <SelectTrigger className="h-7 w-[65px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 20, 50, 100].map((s) => (
                          <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>
                      {detailsList.length > 0
                        ? `${(detailsPage - 1) * detailsPageSize + 1}-${Math.min(detailsPage * detailsPageSize, detailsList.length)} ${l("of")} ${detailsList.length}`
                        : `0 ${l("of")} 0`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" disabled={detailsPage <= 1} onClick={() => setDetailsPage(1)}>
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7" disabled={detailsPage <= 1} onClick={() => setDetailsPage(detailsPage - 1)}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs text-muted-foreground px-2">{detailsPage} / {detailsTotalPages}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" disabled={detailsPage >= detailsTotalPages} onClick={() => setDetailsPage(detailsPage + 1)}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7" disabled={detailsPage >= detailsTotalPages} onClick={() => setDetailsPage(detailsTotalPages)}>
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </FloatingPanel>
      )}

      {/* ============ IMPORT RESULT PANEL ============ */}
      {importResultOpen && (
        <FloatingPanel
          title="Resultado da Importação"
          onClose={() => setImportResultOpen(false)}
          width={700}
        >
          <div className="space-y-3">
            {/* Status indicator */}
            <div className={`flex items-center gap-2 p-2.5 rounded-md border text-sm ${
              importResultStatus === "processing"
                ? "bg-muted/50 border-border"
                : importResultStatus === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}>
              {importResultStatus === "processing" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-medium">{l("importing")}</span>
                </>
              ) : importResultStatus === "success" ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">{importResultMessage}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">{importResultMessage}</span>
                </>
              )}
            </div>

            {/* Error details table */}
            {importResultErrors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  {importResultErrors.length} item(ns) com erro:
                </p>
                <div className="rounded-md border max-h-[50vh] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-7 bg-muted/80 border-b-2 border-border">
                        <TableHead className="text-[10px] font-bold whitespace-nowrap py-1 px-2">STO</TableHead>
                        <TableHead className="text-[10px] font-bold whitespace-nowrap py-1 px-2">DT</TableHead>
                        <TableHead className="text-[10px] font-bold whitespace-nowrap py-1 px-2">Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResultErrors.map((d, idx) => (
                        <TableRow key={idx} className={`h-6 ${idx % 2 === 0 ? "bg-background" : "bg-muted/30"}`}>
                          <TableCell className="text-[10px] font-mono py-0.5 px-2 whitespace-nowrap">{d.sto || "-"}</TableCell>
                          <TableCell className="text-[10px] font-mono py-0.5 px-2 whitespace-nowrap">{d.dt || "-"}</TableCell>
                          <TableCell className="text-[10px] py-0.5 px-2 text-destructive">{d.erro || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </FloatingPanel>
      )}
    </div>
  );
};

export default ImportMapPage;
