import { useState, useRef } from "react";
import {
  Upload, FileUp, X, CheckCircle2, AlertCircle, Loader2,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/config/api";
import { getStoredToken } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

const ACCEPTED_EXTENSIONS = ".xlsx,.xls,.csv";

interface LocationGroup {
  code: string;
  description: string;
}

interface TripGTMSDetail {
  sto?: string;
  message?: string;
  status?: string;
  [key: string]: unknown;
}

interface ImportCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationGroups: LocationGroup[];
  loadingGroups: boolean;
  onSuccess: () => void;
  labels: Record<string, string>;
}

const ImportCheckDialog = ({
  open, onOpenChange, locationGroups, loadingGroups, onSuccess, labels,
}: ImportCheckDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [locationCode, setLocationCode] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importSuccess, setImportSuccess] = useState(false);
  const [errorDetails, setErrorDetails] = useState<TripGTMSDetail[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const l = (key: string) => labels[key] || key;

  const clearForm = () => {
    setSelectedFile(null);
    setProgress(0);
    setLocationCode("");
    setImportSuccess(false);
    setErrorDetails([]);
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (v: boolean) => {
    if (!uploading) {
      clearForm();
      onOpenChange(v);
    }
  };

  const handleFileSelect = (file: File) => {
    setImportSuccess(false);
    setErrorDetails([]);
    setErrorMessage("");
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleImport = async () => {
    if (!selectedFile || !locationCode.trim()) {
      toast.error(l("requiredFields"));
      return;
    }

    setUploading(true);
    setProgress(0);
    setImportSuccess(false);
    setErrorDetails([]);
    setErrorMessage("");

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) { clearInterval(interval); return 90; }
        return p + 10;
      });
    }, 300);

    try {
      const token = getStoredToken();
      const formData = new FormData();
      formData.append("File", selectedFile);
      formData.append("Locationcode", locationCode.trim());

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/importGTMSCheck`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers,
      });

      clearInterval(interval);
      setProgress(100);

      if (res.ok) {
        let data: Record<string, unknown> = {};
        try { data = await res.json(); } catch { /* empty */ }

        // Check if response has tripGTMSDetails with errors
        const details = data?.tripGTMSDetails as TripGTMSDetail[] | undefined;
        if (details && Array.isArray(details) && details.length > 0) {
          // Has validation errors — show them
          setErrorDetails(details);
          setErrorMessage(l("checkHasErrors"));
        } else {
          setImportSuccess(true);
          toast.success(l("success"));
          onSuccess();
          // Auto-close after short delay
          setTimeout(() => handleClose(false), 1500);
        }
      } else {
        let errData: Record<string, unknown> = {};
        try { errData = await res.json(); } catch { /* empty */ }

        // Check for tripGTMSDetails in error response too
        const details = errData?.tripGTMSDetails as TripGTMSDetail[] | undefined;
        if (details && Array.isArray(details) && details.length > 0) {
          setErrorDetails(details);
          setErrorMessage(
            (errData?.message || errData?.title || l("checkHasErrors")) as string
          );
        } else {
          const msg = (errData?.message || errData?.title || errData?.error || `${l("error")} (${res.status})`) as string;
          setErrorMessage(msg);
          toast.error(msg);
        }
      }
    } catch {
      clearInterval(interval);
      setErrorMessage(l("connectionError"));
      toast.error(l("connectionError"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-primary" />
            {l("dialogTitle")}
          </DialogTitle>
          <DialogDescription>{l("dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dropzone */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              {l("file")} <span className="text-destructive">*</span>
            </Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
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
                  <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">{l("dropzone")}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{l("acceptedFormats")}</p>
                </>
              )}
            </div>
          </div>

          {/* Location Group */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              {l("locationCode")} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={locationCode}
              onValueChange={setLocationCode}
              disabled={uploading || loadingGroups}
            >
              <SelectTrigger className="h-9">
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

          {/* Success */}
          {importSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-md border border-accent bg-accent/10 p-4 flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4 text-accent-foreground" />
              <span className="text-sm font-medium">{l("success")}</span>
            </motion.div>
          )}

          {/* Error message */}
          {errorMessage && !importSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-md border border-destructive/50 bg-destructive/5 p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">{errorMessage}</span>
              </div>

              {/* Error details table */}
              {errorDetails.length > 0 && (
                <div className="rounded-md border max-h-60 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">STO</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">{l("message")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorDetails.map((detail, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs font-mono">{detail.sto || "-"}</TableCell>
                          <TableCell className="text-xs">{detail.status || "-"}</TableCell>
                          <TableCell className="text-xs">{detail.message || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleClose(false)}
              disabled={uploading}
            >
              {l("close")}
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              disabled={!selectedFile || !locationCode.trim() || uploading}
              onClick={handleImport}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileUp className="h-3.5 w-3.5" />
              )}
              {l("import")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportCheckDialog;
