import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
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
  /** Always force only active activities without showing toggle */
  forceActiveOnly?: boolean;
}

const isActivityActive = (item: Rec): boolean => {
  const raw = item.flgActive ?? item.isActive ?? item.IsActive ?? item.FlgActive;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw === 1;
  if (typeof raw === "string") {
    const lower = raw.toLowerCase();
    return lower === "true" || lower === "1" || lower === "sim" || lower === "yes" || lower === "ativo" || lower === "active";
  }
  return false;
};

export function ActivitySearchModal({ open, onOpenChange, onSelect, forceActiveOnly = false }: ActivitySearchModalProps) {
  const { t } = useTranslation();
  const [filterCode, setFilterCode] = useState("");
  const [filterActivityTypeCode, setFilterActivityTypeCode] = useState("all");
  const [activeOnly, setActiveOnly] = useState(true);
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
          .map((at) => ({ id: String(at.id), code: String(at.code || "") }))
          .filter((at) => at.code)
          .sort((a, b) => a.code.localeCompare(b.code));
        setActivityTypes(types);
      } catch { /* ignore */ }
    })();
  }, []);

  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setFilterCode("");
      setFilterActivityTypeCode("all");
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
      if (filterActivityTypeCode !== "all") params.set("Filter1Id", filterActivityTypeCode);

      // IsActive filter
      const shouldFilterActive = forceActiveOnly || activeOnly;
      const shouldFilterInactive = !forceActiveOnly && !activeOnly;
      if (shouldFilterActive) params.set("IsActive", "1");
      else if (shouldFilterInactive) params.set("IsActive", "0");

      params.set("PageSize", String(ps));
      params.set("PageNumber", String(pageNum));

      const res = await fetch(`${API_BASE}/Activity?${params.toString()}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const rawItems: Rec[] = await res.json();

      const pHeader = res.headers.get("x-pagination");
      const pag: PaginationMeta = pHeader
        ? JSON.parse(pHeader)
        : { TotalCount: rawItems.length, PageSize: ps, CurrentPage: pageNum, TotalPages: 1, HasNext: false, HasPrevious: false };

      // Resolve display fields
      const resolved = rawItems.map((item) => {
        const activityType = item.activityType as Rec | null;
        return {
          ...item,
          activityTypeCode: activityType?.code ?? "--",
        };
      });

      // Client-side safety filter
      const filtered = (shouldFilterActive || shouldFilterInactive)
        ? resolved.filter((item) => isActivityActive(item) === shouldFilterActive)
        : resolved;

      setItems(filtered);
      setPagination({ ...pag, TotalCount: filtered.length });
      setPage(pageNum);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filterCode, filterActivityTypeCode, activeOnly, forceActiveOnly, pageSize]);

  const handleSelect = (item: Rec) => {
    onSelect(String(item.id), item);
    onOpenChange(false);
  };

  const resetFilters = () => {
    setFilterCode("");
    setFilterActivityTypeCode("all");
    setActiveOnly(true);
    setItems([]);
    setPagination(null);
    setSearched(false);
    setPageSize(10);
  };

  const renderStatusBadge = (item: Rec) => {
    const active = isActivityActive(item);
    return (
      <Badge variant="outline" className={cn(
        "text-[10px] font-medium uppercase",
        active
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
          : "bg-muted text-muted-foreground border-border"
      )}>
        {active ? t("common.active") : t("common.inactive")}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetFilters(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm font-display">{t("activity.searchTitle") || "Pesquisar Atividade"}</DialogTitle>
          <DialogDescription className="sr-only">Busca avançada de atividades com filtros</DialogDescription>
        </DialogHeader>

        {/* Filter fields */}
        <div className="grid grid-cols-3 gap-2 items-end">
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
            <label className="text-xs font-medium text-muted-foreground">{t("activity.activityType") || "Tipo de Atividade"}</label>
            <Select value={filterActivityTypeCode} onValueChange={setFilterActivityTypeCode}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t("common.selectAll")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.selectAll")}</SelectItem>
                {activityTypes.map((at) => (
                  <SelectItem key={at.id} value={at.id}>{at.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* IsActive toggle - same pattern as Driver search */}
          {!forceActiveOnly && (
            <div className="flex items-center gap-2 h-8">
              <Switch
                checked={activeOnly}
                onCheckedChange={setActiveOnly}
              />
              <Label className="text-xs cursor-pointer" onClick={() => setActiveOnly(!activeOnly)}>
                {activeOnly ? t("common.active") : t("common.inactive")}
              </Label>
            </div>
          )}
        </div>

        <div className="flex justify-end">
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
                <TableHead className="h-7 text-xs px-2">{t("common.description")}</TableHead>
                <TableHead className="h-7 text-xs px-2">{t("activity.activityType") || "Tipo Atividade"}</TableHead>
                <TableHead className="h-7 text-xs px-2 w-[90px] text-center">{t("common.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">
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
                    <TableCell className="h-7 text-xs px-2 py-1">{String(item.description ?? "--")}</TableCell>
                    <TableCell className="h-7 text-xs px-2 py-1">{String(item.activityTypeCode ?? "--")}</TableCell>
                    <TableCell className="h-7 text-xs px-2 py-1 text-center">{renderStatusBadge(item)}</TableCell>
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
