import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { ExportColumn, exportToExcel, exportToPdf } from "@/lib/export-utils";

type Rec = Record<string, unknown>;

interface ExportDropdownProps {
  /** Function that returns the full data to export */
  fetchData: () => Promise<Rec[]>;
  columns: ExportColumn[];
  title: string;
  filterDesc?: string[];
}

export function ExportDropdown({ fetchData, columns, title, filterDesc = [] }: ExportDropdownProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: "excel" | "pdf") => {
    setIsExporting(true);
    try {
      const data = await fetchData();
      if (format === "excel") {
        await exportToExcel(data, columns, title);
      } else {
        await exportToPdf(data, columns, title, filterDesc);
      }
      toast({ title: `Exportação ${format === "excel" ? "Excel" : "PDF"} concluída!`, variant: "success" });
    } catch (err) {
      toast({ title: "Erro na exportação", description: (err as Error).message, variant: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={isExporting}>
          {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("excel")} className="text-xs gap-2">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Exportar Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")} className="text-xs gap-2">
          <FileText className="h-3.5 w-3.5" />
          Exportar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
