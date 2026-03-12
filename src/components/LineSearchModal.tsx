import { useState, useCallback, useEffect, useRef } from "react";
import { Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { LookupSearchField } from "@/components/LookupSearchField";
import { API_BASE } from "@/config/api";
import { cn } from "@/lib/utils";


type Rec = Record<string, unknown>;

interface PaginationMeta {
  TotalCount: number;
  PageSize: number;
  CurrentPage: number;
  TotalPages: number;
  HasNext: boolean;
  HasPrevious: boolean;
}

interface LineSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string, item: Rec) => void;
  /** Pre-fill origin filter from parent form */
  initialOrigId?: string;
  /** Pre-fill destination filter from parent form */
  initialDestId?: string;
}

const LOCATION_MODAL_COLUMNS = ["code", "name", "codeIntegration2"];
const LOCATION_COLUMN_LABELS: Record<string, string> = {
  code: "Código", name: "Nome", codeIntegration2: "Cód. Integração TMS",
};

const COLUMNS = [
  { key: "code", label: "Código" },
  { key: "locationOrigCode", label: "Origem" },
  { key: "locationDestCode", label: "Destino" },
  { key: "description", label: "Descrição" },
  { key: "fleetGroupCode", label: "Grupo de Frota" },
];

const fetchLocationById = async (id: string): Promise<Rec | null> => {
  try {
    const res = await fetch(`${API_BASE}/Location/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export function LineSearchModal({ open, onOpenChange, onSelect, initialOrigId, initialDestId }: LineSearchModalProps) {
  const [filterCode, setFilterCode] = useState("");
  const [filterOrigId, setFilterOrigId] = useState("");
  const [filterDestId, setFilterDestId] = useState("");
  const [items, setItems] = useState<Rec[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Pre-fill filters from parent when modal opens
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setFilterOrigId(initialOrigId || "");
      setFilterDestId(initialDestId || "");
      setFilterCode("");
      setItems([]);
      setPagination(null);
      setSearched(false);
    }
    prevOpenRef.current = open;
  }, [open, initialOrigId, initialDestId]);

  const hasFilter = filterCode.trim() || filterOrigId || filterDestId;

  const doSearch = useCallback(async (pageNum = 1) => {
    if (!filterCode.trim() && !filterOrigId && !filterDestId) return;
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (filterCode.trim()) params.set("filter1String", filterCode.trim());
      if (filterOrigId) params.set("filter1Id", filterOrigId);
      if (filterDestId) params.set("filter2Id", filterDestId);
      params.set("PageSize", "10");
      params.set("PageNumber", String(pageNum));

      const res = await fetch(`${API_BASE}/Line?${params.toString()}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const rawResponse: Rec[] = await res.json();

      // API returns wrapped objects: { line: {...}, qtdLineSections: N }
      const rawItems: Rec[] = rawResponse.map((wrapper) => {
        const lineData = wrapper.line as Rec | undefined;
        return lineData ? { ...lineData, qtdLineSections: wrapper.qtdLineSections } : wrapper;
      });

      const pHeader = res.headers.get("x-pagination");
      const pag: PaginationMeta = pHeader
        ? JSON.parse(pHeader)
        : { TotalCount: rawItems.length, PageSize: 10, CurrentPage: pageNum, TotalPages: 1, HasNext: false, HasPrevious: false };

      const resolved = rawItems.map((item) => {
        const locationOrig = item.locationOrig as Rec | null;
        const locationDest = item.locationDest as Rec | null;
        const fleetGroup = item.fleetGroup as Rec | null;

        return {
          ...item,
          locationOrigCode: locationOrig?.code ?? "--",
          locationDestCode: locationDest?.code ?? "--",
          fleetGroupCode: fleetGroup?.code ?? "--",
        };
      });

      setItems(resolved);
      setPagination(pag);
      setPage(pageNum);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filterCode, filterOrigId, filterDestId]);

  const handleSelect = (item: Rec) => {
    onSelect(String(item.id), item);
    onOpenChange(false);
  };

  const resetFilters = () => {
    setFilterCode("");
    setFilterOrigId("");
    setFilterDestId("");
    setItems([]);
    setPagination(null);
    setSearched(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetFilters(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm font-display">Pesquisar Linha</DialogTitle>
          <DialogDescription className="sr-only">Busca avançada de linhas com filtros</DialogDescription>
        </DialogHeader>

        {/* Filter fields */}
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Código</label>
            <Input
              value={filterCode}
              onChange={(e) => setFilterCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter" && hasFilter) doSearch(1); }}
              placeholder="Código da linha..."
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Origem</label>
            <LookupSearchField
              endpoint="Location"
              labelFn="codeOnly"
              searchFilterParam="Filter1String"
              value={filterOrigId}
              onChange={(id) => setFilterOrigId(id)}
              placeholder="Origem..."
              nullable
              className="h-8 text-xs"
              modalVisibleColumns={LOCATION_MODAL_COLUMNS}
              columnLabels={LOCATION_COLUMN_LABELS}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Destino</label>
            <LookupSearchField
              endpoint="Location"
              labelFn="codeOnly"
              searchFilterParam="Filter1String"
              value={filterDestId}
              onChange={(id) => setFilterDestId(id)}
              placeholder="Destino..."
              nullable
              className="h-8 text-xs"
              modalVisibleColumns={LOCATION_MODAL_COLUMNS}
              columnLabels={LOCATION_COLUMN_LABELS}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => doSearch(1)}
            disabled={loading || !hasFilter}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Pesquisar
          </Button>
        </div>

        {/* Results table */}
        <div className="flex-1 overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableHead key={col.key} className="h-7 text-xs px-2">
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="text-center text-xs text-muted-foreground py-8">
                    {loading ? "Carregando..." : searched ? "Nenhum resultado encontrado." : "Preencha ao menos um filtro e clique em Pesquisar."}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow
                    key={String(item.id)}
                    className="cursor-pointer hover:bg-primary/5"
                    onClick={() => handleSelect(item)}
                  >
                    {COLUMNS.map((col) => (
                      <TableCell key={col.key} className="h-7 text-xs px-2 py-1">
                        {item[col.key] === null || item[col.key] === undefined ? "--" : String(item[col.key])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination && pagination.TotalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <span>{pagination.TotalCount} registro(s)</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                disabled={!pagination.HasPrevious}
                onClick={() => doSearch(page - 1)}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="px-2">{pagination.CurrentPage} / {pagination.TotalPages}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                disabled={!pagination.HasNext}
                onClick={() => doSearch(page + 1)}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
