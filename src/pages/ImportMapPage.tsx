import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Upload, FileUp, X, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ACCEPTED_EXTENSIONS = ".xlsx,.xls,.csv";

interface ImportResult {
  status: "success" | "error";
  message: string;
  totalRows?: number;
  importedRows?: number;
  errors?: string[];
}

const ImportMapPage = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as "pt" | "en" | "es";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const labels: Record<string, Record<string, string>> = {
    title: { pt: "Importação do Mapa", en: "Map Import", es: "Importación del Mapa" },
    dropzone: { pt: "Arraste o arquivo aqui ou clique para selecionar", en: "Drag the file here or click to select", es: "Arrastre el archivo aquí o haga clic para seleccionar" },
    acceptedFormats: { pt: "Formatos aceitos: XLSX, XLS, CSV", en: "Accepted formats: XLSX, XLS, CSV", es: "Formatos aceptados: XLSX, XLS, CSV" },
    selectedFile: { pt: "Arquivo selecionado", en: "Selected file", es: "Archivo seleccionado" },
    import: { pt: "Importar", en: "Import", es: "Importar" },
    remove: { pt: "Remover", en: "Remove", es: "Eliminar" },
    importing: { pt: "Importando...", en: "Importing...", es: "Importando..." },
    success: { pt: "Importação concluída com sucesso!", en: "Import completed successfully!", es: "¡Importación completada con éxito!" },
    error: { pt: "Erro na importação", en: "Import error", es: "Error en la importación" },
    newImport: { pt: "Nova importação", en: "New import", es: "Nueva importación" },
    totalRows: { pt: "Total de registros", en: "Total records", es: "Total de registros" },
    importedRows: { pt: "Registros importados", en: "Imported records", es: "Registros importados" },
    errorsFound: { pt: "Erros encontrados", en: "Errors found", es: "Errores encontrados" },
    instructions: { pt: "Instruções", en: "Instructions", es: "Instrucciones" },
    inst1: { pt: "Faça o download do modelo de planilha antes de importar.", en: "Download the spreadsheet template before importing.", es: "Descargue la plantilla antes de importar." },
    inst2: { pt: "Preencha os dados conforme o modelo, sem alterar o cabeçalho.", en: "Fill in the data as per the template, without changing the header.", es: "Complete los datos según la plantilla, sin cambiar el encabezado." },
    inst3: { pt: "Selecione o arquivo preenchido e clique em Importar.", en: "Select the filled file and click Import.", es: "Seleccione el archivo completo y haga clic en Importar." },
    downloadTemplate: { pt: "Baixar modelo", en: "Download template", es: "Descargar plantilla" },
  };

  const l = (key: string) => labels[key]?.[lang] || labels[key]?.pt || key;

  const handleFileSelect = (file: File) => {
    setResult(null);
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setResult(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setProgress(0);
    setResult(null);

    // Simulate progress (replace with real upload logic)
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) { clearInterval(interval); return 90; }
        return p + 10;
      });
    }, 300);

    try {
      // TODO: Replace with actual API call
      // const formData = new FormData();
      // formData.append("file", selectedFile);
      // const res = await fetch(`${API_BASE}/ImportMap`, { method: "POST", body: formData });
      
      await new Promise((resolve) => setTimeout(resolve, 2500));
      clearInterval(interval);
      setProgress(100);
      
      setResult({
        status: "success",
        message: l("success"),
        totalRows: 150,
        importedRows: 148,
        errors: ["Linha 45: Código de localidade inválido", "Linha 89: Coordenada fora do intervalo"],
      });
      toast.success(l("success"));
    } catch {
      clearInterval(interval);
      setResult({ status: "error", message: l("error") });
      toast.error(l("error"));
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Map className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-display font-bold text-foreground">{l("title")}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Instructions card */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{l("instructions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ol className="list-decimal list-inside space-y-2 text-xs text-muted-foreground">
              <li>{l("inst1")}</li>
              <li>{l("inst2")}</li>
              <li>{l("inst3")}</li>
            </ol>
            <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5 mt-2">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {l("downloadTemplate")}
            </Button>
          </CardContent>
        </Card>

        {/* Upload area */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6 space-y-4">
            {/* Dropzone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30",
                uploading && "pointer-events-none opacity-60"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
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
              <Upload className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">{l("dropzone")}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{l("acceptedFormats")}</p>
            </div>

            {/* Selected file */}
            {selectedFile && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 rounded-md border bg-muted/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!uploading && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); removeFile(); }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {l("importing")}
                  </span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Result */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-md border p-4 space-y-2",
                  result.status === "success" ? "border-accent bg-accent/10" : "border-destructive/50 bg-destructive/5"
                )}
              >
                <div className="flex items-center gap-2">
                  {result.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-accent-foreground" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm font-medium">{result.message}</span>
                </div>
                {result.totalRows != null && (
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                    <span>{l("totalRows")}: <strong className="text-foreground">{result.totalRows}</strong></span>
                    <span>{l("importedRows")}: <strong className="text-foreground">{result.importedRows}</strong></span>
                  </div>
                )}
                {result.errors && result.errors.length > 0 && (
                  <div className="pt-2 space-y-1">
                    <span className="text-xs font-medium text-destructive">{l("errorsFound")} ({result.errors.length}):</span>
                    <ul className="text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-auto">
                      {result.errors.map((err, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-destructive mt-0.5">•</span>
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-2">
              {result && (
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={removeFile}>
                  {l("newImport")}
                </Button>
              )}
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                disabled={!selectedFile || uploading}
                onClick={handleImport}
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                {l("import")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ImportMapPage;
