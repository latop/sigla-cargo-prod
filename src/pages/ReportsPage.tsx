import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FileText, Loader2, Download, Search, Eye, FileSpreadsheet, ArrowLeft, FileBarChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DatePickerField } from "@/components/DatePickerField";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";
import { exportToExcel, exportToPdf, ExportColumn } from "@/lib/export-utils";
import { API_BASE } from "@/config/api";

// --- Types ---
interface ReportDef {
  code: string;
  description: string;
  parameterName: string[];
  parameterType: string[];
  parameterCondition: string[];
}

interface ReportDataResponse {
  field: string[];
  values: (string | number | null)[][];
}

const FILE_TYPE_OPTIONS = [
  { value: "data", label: "Visualizar", icon: Eye },
  { value: "xls", label: "Excel", icon: FileSpreadsheet },
];

const fetchReports = async (): Promise<ReportDef[]> => {
  const res = await fetch(`${API_BASE}/api/Report/GetReports`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const generateReport = async (reportCode: string, parameters: string[], fileType: string): Promise<Blob | ReportDataResponse> => {
  const res = await fetch(`${API_BASE}/api/Report/Report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportCode, parameter: parameters, fileType }),
  });
  if (!res.ok) throw new Error(`Erro ao gerar relatório: ${res.status}`);
  if (fileType === "data") return res.json();
  return res.blob();
};

const ReportsPage = () => {
  const { t } = useTranslation();
  usePageTitle(t("menu.reports"), FileBarChart);
  const { toast } = useToast();

  const [selectedReport, setSelectedReport] = useState<ReportDef | null>(null);
  const [paramValues, setParamValues] = useState<string[]>([]);
  const [fileType, setFileType] = useState("data");
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [viewData, setViewData] = useState<ReportDataResponse | null>(null);

  const { data: reports = [], isLoading } = useQuery<ReportDef[]>({
    queryKey: ["reports-list"],
    queryFn: fetchReports,
  });

  const filteredReports = reports.filter((r) =>
    !searchFilter || r.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
    r.description.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  useEffect(() => {
    if (selectedReport) {
      setParamValues(selectedReport.parameterName.map(() => ""));
      setViewData(null);
    }
  }, [selectedReport]);

  const handleGenerate = async () => {
    if (!selectedReport) return;

    const hasErrors = selectedReport.parameterCondition.some((cond, i) => {
      if (cond === "obligatory" && !paramValues[i]?.trim()) return true;
      return false;
    });

    if (hasErrors) {
      toast({ title: "Preencha os parâmetros obrigatórios.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateReport(selectedReport.code, paramValues, fileType);

      if (fileType === "data") {
        setViewData(result as ReportDataResponse);
        toast({ title: "Dados carregados com sucesso!", variant: "success" });
      } else {
        const blob = result as Blob;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedReport.description}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "Relatório gerado com sucesso!", variant: "success" });
      }
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message, variant: "error" });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateParam = (index: number, value: string) => {
    setParamValues((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const convertToObjects = () => {
    if (!viewData) return [];
    return viewData.values.map((row) => {
      const obj: Record<string, unknown> = {};
      viewData.field.forEach((f, i) => { obj[f] = row[i]; });
      return obj;
    });
  };

  const handleExportViewData = async (format: "excel" | "pdf") => {
    if (!viewData || !selectedReport) return;

    const columns: ExportColumn[] = viewData.field.map((f) => ({
      key: f,
      label: f,
    }));

    const rows = convertToObjects();

    try {
      if (format === "excel") {
        await exportToExcel(rows, columns, selectedReport.description);
      } else {
        await exportToPdf(rows, columns, selectedReport.description);
      }
      toast({ title: `Exportação ${format === "excel" ? "Excel" : "PDF"} concluída!`, variant: "success" });
    } catch (err) {
      toast({ title: "Erro na exportação", description: (err as Error).message, variant: "error" });
    }
  };

  // Data view mode
  if (viewData && selectedReport) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setViewData(null)}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Button>
          <span className="text-sm font-semibold">{selectedReport.description}</span>
          <span className="text-xs text-muted-foreground">({viewData.values.length} registros)</span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => handleExportViewData("excel")}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => handleExportViewData("pdf")}
          >
            <FileText className="h-3.5 w-3.5" />
            PDF
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[calc(100vh-160px)]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {viewData.field.map((f) => (
                      <TableHead key={f} className="h-8 text-xs px-3 font-medium whitespace-nowrap">
                        {f}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewData.values.map((row, ri) => (
                    <TableRow key={ri} className="h-6">
                      {viewData.field.map((f, fi) => (
                        <TableCell key={fi} className="text-xs py-0.5 px-3 whitespace-nowrap">
                          {row[fi] == null ? "--" : String(row[fi])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {viewData.values.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={viewData.field.length} className="text-center text-xs text-muted-foreground py-4">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar relatório..."
            className="h-7 pl-8 text-xs"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-auto max-h-[calc(100vh-180px)]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="h-8 text-xs px-3 font-medium">Código</TableHead>
                      <TableHead className="h-8 text-xs px-3 font-medium">Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow
                        key={report.code}
                        className={`cursor-pointer h-6 ${
                          selectedReport?.code === report.code
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted/30"
                        }`}
                        onClick={() => setSelectedReport(report)}
                      >
                        <TableCell className="text-xs py-0.5 px-3 font-medium">{report.code}</TableCell>
                        <TableCell className="text-xs py-0.5 px-3">{report.description}</TableCell>
                      </TableRow>
                    ))}
                    {filteredReports.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-xs text-muted-foreground py-4">
                          Nenhum relatório encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            {!selectedReport ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileBarChart className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">Selecione um relatório na lista</p>
              </div>
            ) : (
              <motion.div
                key={selectedReport.code}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h3 className="text-sm font-bold">{selectedReport.code} — {selectedReport.description}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedReport.parameterName.length} parâmetro(s)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedReport.parameterName.map((name, i) => {
                    const type = selectedReport.parameterType[i];
                    const isRequired = selectedReport.parameterCondition[i] === "obligatory";

                    return (
                      <div key={i} className="space-y-1">
                        <Label className="text-xs">
                          {name} {isRequired && <span className="text-destructive">*</span>}
                        </Label>
                        {type === "datetime" ? (
                          <DatePickerField
                            value={paramValues[i] || ""}
                            onChange={(v) => updateParam(i, v)}
                            hasError={false}
                          />
                        ) : (
                          <Input
                            value={paramValues[i] || ""}
                            onChange={(e) => updateParam(i, e.target.value.toUpperCase())}
                            placeholder={name}
                            className="h-8 text-xs"
                          />
                        )}
                      </div>
                    );
                  })}

                  <div className="space-y-1">
                    <Label className="text-xs">Formato</Label>
                    <Select value={fileType} onValueChange={setFileType}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FILE_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : fileType === "data" ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {fileType === "data" ? "Visualizar" : "Gerar Relatório"}
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsPage;
