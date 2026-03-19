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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { API_BASE } from "@/config/api";

type Rec = Record<string, unknown>;

interface PaginationMeta {
  TotalCount: number;
  PageSize: number;
  CurrentPage: number;
  TotalPages: number;
  HasNext: boolean;
  HasPrevious: boolean;
}

interface ActivitySearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string, item: Rec) => void;
}

const formatTime = (v?: string | null) => {
  if (!v) return "--";
  try {
    const d = new Date(v);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "--";
  }
};

const COLUMNS = [
  { key: "code", label: "Código" },
  { key: "description", label: "Descrição" },
  { key: "startTime", label: "Início" },
  { key: "endTime", label: "Fim" },
  { key: "activityTypeCode", label: "Tipo Atividade" },
  { key: "flgActiveLabel", label: "Ativo" },
];

export function ActivitySearchModal({ open, onOpenChange, onSelect }: ActivitySearchModalProps) {
  const [filterCode, setFilterCode] = useState("");
  const [filterActivityTypeId, setFilterActivityTypeId] = useState("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [items, setItems] = useState<Rec[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activityTypes, setActivityTypes] = useState<{ id: string; code: string }[]>([]);

  // Load activity types for dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/ActivityType?PageSize=200`);
        if (!res.ok) return;
        const data: Rec[] = await res.json();
        const types = data
          .map((t) => ({ id: String(t.id), code: String(t.code || "") }))
          .filter((t) => t.code)
          .sort((a, b) => a.code.localeCompare(b.code));
        setActivityTypes(types);
      } catch { /* ignore */ }
    })();
  }, []);

  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setFilterCode("");
      setFilterActivityTypeId("all");
      setFilterActive("all");
      setItems([]);
      setPagination(null);
      setSearched(false);
    }
    prevOpenRef.current = open;
  }, [open]);

  const hasFilter = filterCode.trim() || filterActivityTypeId !== "all" || filterActive !== "all";

  const doSearch = useCallback(async (pageNum = 1, ps = pageSize) => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (filterCode.trim()) params.set("Filter1String", filterCode.trim());
      if (filterActivityTypeId !== "all") params.set("Filter1Id", filterActivityTypeId);
      if (filterActive === "true") params.set("Filter2Bool", "true");
      if (filterActive === "false") params.set("Filter2Bool", "false");
      params.set("PageSize", String(ps));
      params.set("PageNumber", String(pageNum));

      const res = await fetch(`${API_BASE}/Activity?${params.toString()}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const rawItems: Rec[] = await res.json();

      const pHeader = res.headers.get("x-pagination");
      const pag: PaginationMeta = pHeader
        ? JSON.parse(pHeader)
        : { TotalCount: rawItems.length, PageSize: 10, CurrentPage: pageNum, TotalPages: 1, HasNext: false, HasPrevious: false };

      const resolved = rawItems.map((item) => {
        const activityType = item.activityType as Rec | null;
        return {
          ...item,
          startTime: formatTime(item.start as string | null),
          endTime: formatTime(item.end as string | null),
          activityTypeCode: activityType?.code ?? "--",
          flgActiveLabel: item.flgActive === true ? "Sim" : item.flgActive === false ? "Não" : "--",
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
  }, [filterCode, filterActivityTypeId, filterActive, pageSize]);

  const handleSelect = (item: Rec) => {
    onSelect(String(item.id), item);
    onOpenChange(false);
  };

  const resetFilters = () => {
    setFilterCode("");
    setFilterActivityTypeId("all");
    setFilterActive("all");
    setItems([]);
    setPagination(null);
    setSearched(false);
    setPageSize(10);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetFilters(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm font-display">Pesquisar Atividade</DialogTitle>
          <DialogDescription className="sr-only">Busca avançada de atividades com filtros</DialogDescription>
        </DialogHeader>

        {/* Filter fields */}
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Código</label>
            <Input
              value={filterCode}
              onChange={(e) => setFilterCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") doSearch(1); }}
              placeholder="Código da atividade..."
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tipo de Atividade</label>
            <Select value={filterActivityTypeId} onValueChange={setFilterActivityTypeId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {activityTypes.map((at) => (
                  <SelectItem key={at.id} value={at.id}>{at.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Ativo</label>
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => doSearch(1)}
            disabled={loading}
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
                    {loading ? "Carregando..." : searched ? "Nenhum resultado encontrado." : "Preencha os filtros e clique em Pesquisar."}
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
        {pagination && (
          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v) => { const ps = Number(v); setPageSize(ps); doSearch(1, ps); }}>
                <SelectTrigger className="h-7 w-[70px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((s) => (
                    <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>{pagination.TotalCount} registro(s)</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={!pagination.HasPrevious}
                onClick={() => doSearch(page - 1)}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="px-2">{pagination.CurrentPage} / {pagination.TotalPages}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
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
