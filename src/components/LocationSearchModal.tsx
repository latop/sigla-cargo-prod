import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

interface LocationSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string, item: Rec) => void;
  /** Only show operational locations (isOperation=true) */
  filterOperationOnly?: boolean;
}

export function LocationSearchModal({ open, onOpenChange, onSelect, filterOperationOnly = false }: LocationSearchModalProps) {
  const { t } = useTranslation();
  const [filterCode, setFilterCode] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterIntCode, setFilterIntCode] = useState("");
  const [filterLocGroupId, setFilterLocGroupId] = useState("all");
  const [filterLocTypeId, setFilterLocTypeId] = useState("all");
  const [activeOnly, setActiveOnly] = useState(true);
  const [items, setItems] = useState<Rec[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Dropdowns data
  const [locGroups, setLocGroups] = useState<{ id: string; code: string; description: string }[]>([]);
  const [locTypes, setLocTypes] = useState<{ id: string; code: string; description: string }[]>([]);

  useEffect(() => {
    const fetchList = async (endpoint: string) => {
      try {
        const res = await fetch(`${API_BASE}/${endpoint}?PageSize=200`);
        if (!res.ok) return [];
        const data: Rec[] = await res.json();
        return data
          .map((r) => ({ id: String(r.id), code: String(r.code || ""), description: String(r.description || "") }))
          .filter((r) => r.code)
          .sort((a, b) => a.code.localeCompare(b.code));
      } catch { return []; }
    };
    Promise.all([fetchList("LocationGroup"), fetchList("LocationType")]).then(([groups, types]) => {
      setLocGroups(groups);
      setLocTypes(types);
    });
  }, []);

  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setFilterCode("");
      setFilterName("");
      setFilterIntCode("");
      setFilterLocGroupId("all");
      setFilterLocTypeId("all");
      setActiveOnly(true);
      setItems([]);
      setPagination(null);
      setSearched(false);
    }
    prevOpenRef.current = open;
  }, [open]);

  const doSearch = useCallback(async (pageNum = 1, ps = pageSize) => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (filterCode.trim()) params.set("Filter1String", filterCode.trim());
      if (filterName.trim()) params.set("Filter4String", filterName.trim());
      if (filterIntCode.trim()) params.set("Filter3String", filterIntCode.trim());
      if (filterLocGroupId !== "all") params.set("Filter1Id", filterLocGroupId);
      if (filterLocTypeId !== "all") params.set("Filter2Id", filterLocTypeId);
      if (filterOperationOnly) params.set("Filter1Bool", "true");
      if (activeOnly) params.set("IsActive", "1");
      else params.set("IsActive", "0");
      params.set("PageSize", String(ps));
      params.set("PageNumber", String(pageNum));

      const res = await fetch(`${API_BASE}/Location?${params.toString()}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const rawItems: Rec[] = await res.json();

      const pHeader = res.headers.get("x-pagination");
      const pag: PaginationMeta = pHeader
        ? JSON.parse(pHeader)
        : { TotalCount: rawItems.length, PageSize: ps, CurrentPage: pageNum, TotalPages: 1, HasNext: false, HasPrevious: false };

      const resolved = rawItems.map((item) => {
        const city = item.city as Rec | null;
        const locType = item.locationType as Rec | null;
        return {
          ...item,
          cityName: city?.name ?? "--",
          locationTypeCode: locType?.code ?? "--",
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
  }, [filterCode, filterName, filterIntCode, filterLocGroupId, filterLocTypeId, activeOnly, filterOperationOnly, pageSize]);

  const handleSelect = (item: Rec) => {
    onSelect(String(item.id), item);
    onOpenChange(false);
  };

  const resetFilters = () => {
    setFilterCode("");
    setFilterName("");
    setFilterIntCode("");
    setFilterLocGroupId("all");
    setFilterLocTypeId("all");
    setActiveOnly(true);
    setItems([]);
    setPagination(null);
    setSearched(false);
    setPageSize(10);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetFilters(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm font-display">{t("menu.location") || "Localidade"}</DialogTitle>
          <DialogDescription className="sr-only">Busca avançada de localidades</DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-5 gap-2 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t("common.code")}</label>
            <Input
              value={filterCode}
              onChange={(e) => setFilterCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") doSearch(1); }}
              placeholder={t("common.code") + "..."}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t("driver.name") || "Nome"}</label>
            <Input
              value={filterName}
              onChange={(e) => setFilterName(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") doSearch(1); }}
              placeholder={t("driver.name") + "..."}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Cód. TMS</label>
            <Input
              value={filterIntCode}
              onChange={(e) => setFilterIntCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") doSearch(1); }}
              placeholder="Cód. TMS..."
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t("menu.locationGroup") || "Grupo Localidade"}</label>
            <Select value={filterLocGroupId} onValueChange={setFilterLocGroupId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t("common.selectAll")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.selectAll")}</SelectItem>
                {locGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.code} - {g.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t("menu.locationType") || "Tipo Localidade"}</label>
            <Select value={filterLocTypeId} onValueChange={setFilterLocTypeId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t("common.selectAll")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.selectAll")}</SelectItem>
                {locTypes.map((lt) => (
                  <SelectItem key={lt.id} value={lt.id}>{lt.code} - {lt.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={activeOnly} onCheckedChange={setActiveOnly} />
            <Label className="text-xs cursor-pointer" onClick={() => setActiveOnly(!activeOnly)}>
              {activeOnly ? t("common.active") : t("common.inactive")}
            </Label>
          </div>
          <Button
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => doSearch(1)}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            {t("common.search")}
          </Button>
        </div>

        {/* Results table */}
        <div className="flex-1 overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-7 text-xs px-2">{t("common.code")}</TableHead>
                <TableHead className="h-7 text-xs px-2">{t("driver.name") || "Nome"}</TableHead>
                <TableHead className="h-7 text-xs px-2">Cód. TMS</TableHead>
                <TableHead className="h-7 text-xs px-2">{t("menu.city") || "Cidade"}</TableHead>
                <TableHead className="h-7 text-xs px-2">{t("menu.locationType") || "Tipo"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
              <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                    {loading ? t("common.loading") : searched ? t("common.noResults") : t("common.searchHint")}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow
                    key={String(item.id)}
                    className="cursor-pointer hover:bg-primary/5"
                    onClick={() => handleSelect(item)}
                  >
                    <TableCell className="h-7 text-xs px-2 py-1">{String(item.code ?? "--")}</TableCell>
                    <TableCell className="h-7 text-xs px-2 py-1">{String(item.name ?? "--")}</TableCell>
                    <TableCell className="h-7 text-xs px-2 py-1">{String(item.codeIntegration2 ?? "--")}</TableCell>
                    <TableCell className="h-7 text-xs px-2 py-1">{String(item.cityName ?? "--")}</TableCell>
                    <TableCell className="h-7 text-xs px-2 py-1">{String(item.locationTypeCode ?? "--")}</TableCell>
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
              <span>{pagination.TotalCount} {t("common.records")}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={!pagination.HasPrevious} onClick={() => doSearch(page - 1)}>
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="px-2">{pagination.CurrentPage} / {pagination.TotalPages}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={!pagination.HasNext} onClick={() => doSearch(page + 1)}>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
