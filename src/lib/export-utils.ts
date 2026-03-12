import { API_BASE } from "@/config/api";
import clientLogo from "@/assets/client-logo.png";
import siglaLogo from "@/assets/logo-sigla-cargo.png";

type Rec = Record<string, unknown>;

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: unknown, row: Rec) => string;
}

const loadImageBase64 = (src: string): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = src;
  });

/** Build display rows from data and column definitions */
const buildRows = (data: Rec[], columns: ExportColumn[]): string[][] =>
  data.map((row) =>
    columns.map((col) =>
      col.format ? col.format(row[col.key], row) : (row[col.key] == null ? "--" : String(row[col.key])),
    ),
  );

export async function exportToExcel(data: Rec[], columns: ExportColumn[], title: string) {
  const XLSX = await import("xlsx");
  const rows = data.map((row) =>
    Object.fromEntries(
      columns.map((col) => [
        col.label,
        col.format ? col.format(row[col.key], row) : (row[col.key] == null ? "--" : String(row[col.key])),
      ]),
    ),
  );
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  XLSX.writeFile(wb, `${title}.xlsx`);
}

export async function exportToPdf(
  data: Rec[],
  columns: ExportColumn[],
  title: string,
  filterDesc: string[] = [],
) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const headers = columns.map((c) => c.label);
  const rows = buildRows(data, columns);
  const now = new Date().toLocaleString("pt-BR");

  const [clientLogoB64, siglaLogoB64] = await Promise.all([
    loadImageBase64(clientLogo),
    loadImageBase64(siglaLogo),
  ]);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const addHeaderFooter = (pageNum: number, totalPages: number) => {
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 0, pageWidth, 22, "F");
    doc.setDrawColor(200, 200, 200);
    doc.line(0, 22, pageWidth, 22);

    if (clientLogoB64) {
      try { doc.addImage(clientLogoB64, "PNG", 8, 3, 0, 16); } catch { /* skip */ }
    }

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(title, pageWidth / 2, 10, { align: "center" });

    if (filterDesc.length > 0) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(filterDesc.join("  |  "), pageWidth / 2, 16, { align: "center" });
    }

    if (siglaLogoB64) {
      try { doc.addImage(siglaLogoB64, "PNG", pageWidth - 50, 3, 40, 16); } catch { /* skip */ }
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(8, pageHeight - 10, pageWidth - 8, pageHeight - 10);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`Emitido em: ${now}`, 8, pageHeight - 6);
    doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - 8, pageHeight - 6, { align: "right" });
  };

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 25,
    margin: { top: 25, bottom: 15 },
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [41, 65, 122], textColor: 255, fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addHeaderFooter(i, totalPages);
  }

  doc.save(`${title}.pdf`);
}

/** Fetch all items for export (bypasses pagination) */
export async function fetchAllForExport(endpoint: string, params?: URLSearchParams): Promise<Rec[]> {
  const p = params ? new URLSearchParams(params) : new URLSearchParams();
  p.set("PageSize", "99999");
  p.set("PageNumber", "1");
  const res = await fetch(`${API_BASE}/${endpoint}?${p.toString()}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
