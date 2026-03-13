import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Loader2, PackageSearch, Search, FileSpreadsheet, FileUp,
  Download, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
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
import { toast } from "sonner";
import { API_BASE } from "@/config/api";
import { getStoredToken } from "@/contexts/AuthContext";
import { format, subDays, addDays } from "date-fns";
import { DatePickerField } from "@/components/DatePickerField";
import ImportCheckDialog from "@/components/ImportCheckDialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface GTMSRecord {
  id?: string;
  tripGTMSId?: string;
  fileName?: string;
  importDate?: string;
  createAt?: string;
  locationCode?: string;
  locationGroupCode?: string;
  status?: string;
  checkResult?: string;
  message?: string;
  [key: string]: unknown;
}

const ImportMapPage = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language as "pt" | "en" | "es";

  // Listing state
  const [records, setRecords] = useState<GTMSRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const today = new Date();
  const [filterStart, setFilterStart] = useState(format(subDays(today, 1), "yyyy-MM-dd'T'00:00:00"));
  const [filterEnd, setFilterEnd] = useState(format(addDays(today, 1), "yyyy-MM-dd'T'23:59:59"));

  // Pagination state
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [locationGroups, setLocationGroups] = useState<{ code: string; description: string }[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const labels: Record<string, Record<string, string>> = {
    title: { pt: "Importação de Demandas", en: "Demand Import", es: "Importación de Demandas" },
    listTitle: { pt: "Demandas Importadas", en: "Imported Demands", es: "Demandas Importadas" },
    fileName: { pt: "Arquivo", en: "File", es: "Archivo" },
    importDate: { pt: "Data/Hora", en: "Date/Time", es: "Fecha/Hora" },
    locationCode: { pt: "Localidade", en: "Location", es: "Localidad" },
    status: { pt: "Status", en: "Status", es: "Estado" },
    checkResult: { pt: "Resultado", en: "Result", es: "Resultado" },
    message: { pt: "Mensagem", en: "Message", es: "Mensaje" },
    noRecords: { pt: "Nenhum registro encontrado no período.", en: "No records found in the period.", es: "No se encontraron registros en el período." },
    search: { pt: "Pesquisar", en: "Search", es: "Buscar" },
    startDate: { pt: "Data Inicial", en: "Start Date", es: "Fecha Inicial" },
    endDate: { pt: "Data Final", en: "End Date", es: "Fecha Final" },
    connectionError: { pt: "Erro de conexão com a API.", en: "API connection error.", es: "Error de conexión con la API." },
    downloadTemplate: { pt: "Baixar modelo", en: "Download template", es: "Descargar plantilla" },
    newImport: { pt: "Nova Importação", en: "New Import", es: "Nueva Importación" },
    actions: { pt: "Ações", en: "Actions", es: "Acciones" },
    export: { pt: "Exportar", en: "Export", es: "Exportar" },
    delete: { pt: "Excluir", en: "Delete", es: "Eliminar" },
    deleteConfirmTitle: { pt: "Confirmar Exclusão", en: "Confirm Deletion", es: "Confirmar Eliminación" },
    deleteConfirmMsg: { pt: "Tem certeza que deseja excluir esta demanda? Esta ação não pode ser desfeita.", en: "Are you sure you want to delete this demand? This action cannot be undone.", es: "¿Está seguro de que desea eliminar esta demanda? Esta acción no se puede deshacer." },
    cancel: { pt: "Cancelar", en: "Cancel", es: "Cancelar" },
    deleteSuccess: { pt: "Demanda excluída com sucesso.", en: "Demand deleted successfully.", es: "Demanda eliminada con éxito." },
    deleteError: { pt: "Erro ao excluir demanda.", en: "Error deleting demand.", es: "Error al eliminar demanda." },
    // Dialog labels
    dialogTitle: { pt: "Checagem de Importação", en: "Import Check", es: "Verificación de Importación" },
    dialogDescription: { pt: "Selecione o arquivo e o grupo de localidade para validar a importação.", en: "Select the file and location group to validate the import.", es: "Seleccione el archivo y el grupo de localidad para validar la importación." },
    dropzone: { pt: "Arraste o arquivo aqui ou clique para selecionar", en: "Drag the file here or click to select", es: "Arrastre el archivo aquí o haga clic para seleccionar" },
    acceptedFormats: { pt: "Formatos aceitos: XLSX, XLS, CSV", en: "Accepted formats: XLSX, XLS, CSV", es: "Formatos aceptados: XLSX, XLS, CSV" },
    import: { pt: "Importar", en: "Import", es: "Importar" },
    importing: { pt: "Importando...", en: "Importing...", es: "Importando..." },
    success: { pt: "Check realizado com sucesso!", en: "Check completed successfully!", es: "¡Verificación completada con éxito!" },
    error: { pt: "Erro na importação", en: "Import error", es: "Error en la importación" },
    file: { pt: "Arquivo", en: "File", es: "Archivo" },
    requiredFields: { pt: "Preencha todos os campos obrigatórios.", en: "Fill in all required fields.", es: "Complete todos los campos obligatorios." },
    locationCodeLabel: { pt: "Grupo de Localidade", en: "Location Group", es: "Grupo de Localidad" },
    locationCodePlaceholder: { pt: "Selecione o grupo de localidade", en: "Select location group", es: "Seleccione el grupo de localidad" },
    close: { pt: "Fechar", en: "Close", es: "Cerrar" },
    checkHasErrors: { pt: "A validação encontrou inconsistências:", en: "Validation found inconsistencies:", es: "La validación encontró inconsistencias:" },
    rowsPerPage: { pt: "Linhas por página", en: "Rows per page", es: "Filas por página" },
    of: { pt: "de", en: "of", es: "de" },
  };

  const l = (key: string) => labels[key]?.[lang] || labels[key]?.pt || key;

  // Flatten dialog labels for the child component
  const dialogLabels: Record<string, string> = {};
  for (const key of Object.keys(labels)) {
    dialogLabels[key] = l(key);
  }

  useEffect(() => {
    fetchRecords();
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

      const res = await fetch(`${API_BASE}/GetAllGTMS?${params}`, {
        credentials: "include",
        headers: authHeaders(),
      });

      if (res.ok) {
        // Try x-pagination header first
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
        } else {
          // Response might be paginated object
          setRecords(data?.items || data?.data || []);
          if (data?.totalCount != null) setTotalCount(data.totalCount);
          if (data?.totalPages != null) setTotalPages(data.totalPages);
          if (data?.currentPage != null) setPageNumber(data.currentPage);
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

  const handleExport = async (rec: GTMSRecord) => {
    const recId = rec.tripGTMSId || rec.id;
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
        a.download = rec.fileName || `export_${recId}.xlsx`;
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
    const recId = rec.tripGTMSId || rec.id;
    if (!recId) return;
    setDeletingId(recId);
    try {
      const res = await fetch(`${API_BASE}/deleteDemand?id=${recId}`, {
        method: "DELETE",
        credentials: "include",
        headers: authHeaders(),
      });
      if (res.ok) {
        toast.success(l("deleteSuccess"));
        fetchRecords();
      } else {
        toast.error(l("deleteError"));
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PackageSearch className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-display font-bold text-foreground">{l("title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
            <a href="/templates/Modelo_do_Arquivo_de_Importacao.xlsx" download>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {l("downloadTemplate")}
            </a>
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setImportDialogOpen(true)}
          >
            <FileUp className="h-3.5 w-3.5" />
            {l("newImport")}
          </Button>
        </div>
      </div>

      {/* Listing */}
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
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={handleSearch}
              disabled={loadingRecords}
            >
              {loadingRecords ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              {l("search")}
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{l("fileName")}</TableHead>
                  <TableHead className="text-xs">{l("importDate")}</TableHead>
                  <TableHead className="text-xs">{l("locationCode")}</TableHead>
                  <TableHead className="text-xs">{l("status")}</TableHead>
                  <TableHead className="text-xs">{l("checkResult")}</TableHead>
                  <TableHead className="text-xs">{l("message")}</TableHead>
                  <TableHead className="text-xs text-right">{l("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRecords ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                      {l("noRecords")}
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((rec, idx) => {
                    const recId = rec.tripGTMSId || rec.id;
                    return (
                      <TableRow key={recId ?? idx}>
                        <TableCell className="text-xs">{rec.fileName || "-"}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(rec.importDate || rec.createAt)}</TableCell>
                        <TableCell className="text-xs">{rec.locationCode || rec.locationGroupCode || "-"}</TableCell>
                        <TableCell className="text-xs">{rec.status || "-"}</TableCell>
                        <TableCell className="text-xs">{rec.checkResult || "-"}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{rec.message || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title={l("export")}
                              onClick={() => handleExport(rec)}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
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
                                  <AlertDialogDescription>{l("deleteConfirmMsg")}</AlertDialogDescription>
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

          {/* Pagination Footer */}
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
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={pageNumber <= 1 || loadingRecords}
                onClick={() => handlePageChange(1)}
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={pageNumber <= 1 || loadingRecords}
                onClick={() => handlePageChange(pageNumber - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                {pageNumber} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={pageNumber >= totalPages || loadingRecords}
                onClick={() => handlePageChange(pageNumber + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={pageNumber >= totalPages || loadingRecords}
                onClick={() => handlePageChange(totalPages)}
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Check Dialog */}
      <ImportCheckDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        locationGroups={locationGroups}
        loadingGroups={loadingGroups}
        onSuccess={() => fetchRecords(pageNumber, pageSize)}
        labels={dialogLabels}
      />
    </div>
  );
};

export default ImportMapPage;
