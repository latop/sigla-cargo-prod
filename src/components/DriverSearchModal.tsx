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

interface DriverSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string, item: Rec) => void;
  /** Always force only active drivers without showing toggle */
  forceActiveOnly?: boolean;
}

const isDriverActive = (item: Rec): boolean => {
  const raw = item.flgActive ?? item.isActive ?? item.IsActive ?? item.FlgActive;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw === 1;
  if (typeof raw === "string") {
    const lower = raw.toLowerCase();
    return lower === "true" || lower === "1" || lower === "sim" || lower === "yes" || lower === "ativo" || lower === "active";
  }
  return false;
};

export function DriverSearchModal({ open, onOpenChange, onSelect, forceActiveOnly = false }: DriverSearchModalProps) {
  const { t } = useTranslation();
  const [filterNickName, setFilterNickName] = useState("");
  const [filterIntCode, setFilterIntCode] = useState("");
  const [filterLocGroupId, setFilterLocGroupId] = useState("all");
  const [filterFleetGroupId, setFilterFleetGroupId] = useState("all");
  const [activeOnly, setActiveOnly] = useState(true);
  const [items, setItems] = useState<Rec[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Dropdown data
  const [locGroups, setLocGroups] = useState<{ id: string; code: string; description: string }[]>([]);
  const [fleetGroups, setFleetGroups] = useState<{ id: string; code: string; description: string }[]>([]);

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
    Promise.all([fetchList("LocationGroup"), fetchList("FleetGroup")]).then(([lg, fg]) => {
      setLocGroups(lg);
      setFleetGroups(fg);
    });
  }, []);

  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setFilterNickName("");
      setFilterIntCode("");
      setFilterLocGroupId("all");
      setFilterFleetGroupId("all");
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
      if (filterNickName.trim()) params.set("Filter1String", filterNickName.trim());
      if (filterIntCode.trim()) params.set("Filter2String", filterIntCode.trim());
      if (filterLocGroupId !== "all") params.set("Filter1Id", filterLocGroupId);

      const shouldFilterActive = forceActiveOnly || activeOnly;
      if (shouldFilterActive) params.set("IsActive", "1");
      else params.set("IsActive", "0");

      // API não filtra corretamente por grupo de frota via Filter2Id no endpoint Drivers,
      // então aplicamos o filtro de frota no client com driverFleets[].fleetGroupId.
      const needsClientFleetFilter = filterFleetGroupId !== "all";
      const queryPageSize = needsClientFleetFilter ? 200 : ps;
      const queryPageNumber = needsClientFleetFilter ? 1 : pageNum;
      params.set("PageSize", String(queryPageSize));
      params.set("PageNumber", String(queryPageNumber));

      const res = await fetch(`${API_BASE}/Drivers?${params.toString()}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const rawItems: Rec[] = await res.json();

      const pHeader = res.headers.get("x-pagination");
      const pag: PaginationMeta = pHeader
        ? JSON.parse(pHeader)
        : { TotalCount: rawItems.length, PageSize: queryPageSize, CurrentPage: queryPageNumber, TotalPages: 1, HasNext: false, HasPrevious: false };

      // Resolve nested fields – API returns driverBases[].locationGroupId and driverFleets[].fleetGroupId
      const locGroupMap = new Map(locGroups.map((g) => [g.id, g.code]));
      const fleetGroupMap = new Map(fleetGroups.map((g) => [g.id, g.code]));
      const pickCurrent = (rows?: Rec[]) => {
        if (!Array.isArray(rows) || rows.length === 0) return null;
        return (rows.find((r) => !r.endDate && !r.EndDate) ?? rows[0]) as Rec;
      };

      const resolved = rawItems.map((item) => {
        const bases = (item.driverBases ?? item.DriverBases) as Rec[] | undefined;
        const currentBase = pickCurrent(bases);
        const baseIds = Array.isArray(bases)
          ? bases.map((b) => String(b.locationGroupId ?? b.LocationGroupId ?? "")).filter(Boolean)
          : [];
        const locGroupId = currentBase ? String(currentBase.locationGroupId ?? currentBase.LocationGroupId ?? "") : "";
        const locCode = locGroupMap.get(locGroupId)
          || ((currentBase?.locationGroup as Rec | undefined)?.code as string | undefined)
          || ((currentBase?.locationGroup as Rec | undefined)?.Code as string | undefined)
          || "--";

        const fleets = (item.driverFleets ?? item.DriverFleets) as Rec[] | undefined;
        const currentFleet = pickCurrent(fleets);
        const fleetIds = Array.isArray(fleets)
          ? fleets.map((f) => String(f.fleetGroupId ?? f.FleetGroupId ?? "")).filter(Boolean)
          : [];
        const fleetGroupId = currentFleet ? String(currentFleet.fleetGroupId ?? currentFleet.FleetGroupId ?? "") : "";
        const fleetCode = fleetGroupMap.get(fleetGroupId)
          || ((currentFleet?.fleetGroup as Rec | undefined)?.code as string | undefined)
          || ((currentFleet?.fleetGroup as Rec | undefined)?.Code as string | undefined)
          || "--";

        return {
          ...item,
          locationGroupCode: String(locCode),
          fleetGroupCode: String(fleetCode),
          _baseIds: baseIds,
          _fleetIds: fleetIds,
        };
      });

      // Client-side safety filters (status + base + fleet)
      const filtered = resolved
        .filter((item) => isDriverActive(item) === shouldFilterActive)
        .filter((item) => filterLocGroupId === "all" || (((item._baseIds as string[] | undefined) ?? []).includes(filterLocGroupId)))
        .filter((item) => filterFleetGroupId === "all" || (((item._fleetIds as string[] | undefined) ?? []).includes(filterFleetGroupId)));

      if (needsClientFleetFilter) {
        const totalCount = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalCount / ps));
        const start = (pageNum - 1) * ps;
        const pageItems = filtered.slice(start, start + ps);

        setItems(pageItems);
        setPagination({
          TotalCount: totalCount,
          PageSize: ps,
          CurrentPage: pageNum,
          TotalPages: totalPages,
          HasNext: pageNum < totalPages,
          HasPrevious: pageNum > 1,
        });
      } else {
        setItems(filtered);
        setPagination({ ...pag, TotalCount: filtered.length });
      }
      setPage(pageNum);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filterNickName, filterIntCode, filterLocGroupId, filterFleetGroupId, activeOnly, forceActiveOnly, pageSize]);

  const handleSelect = (item: Rec) => {
    onSelect(String(item.id), item);
    onOpenChange(false);
  };

  const resetFilters = () => {
    setFilterNickName("");
    setFilterIntCode("");
    setFilterLocGroupId("all");
    setFilterFleetGroupId("all");
    setActiveOnly(true);
    setItems([]);
    setPagination(null);
    setSearched(false);
    setPageSize(10);
  };

  const renderStatusBadge = (item: Rec) => {
    const active = isDriverActive(item);
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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm font-display">{t("menu.driver") || "Motorista"}</DialogTitle>
          <DialogDescription className="sr-only">Busca avançada de motoristas</DialogDescription>
        </DialogHeader>

        {/* Filter fields */}
        <div className="grid grid-cols-4 gap-2 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t("driver.nickName")}</label>
            <Input
              value={filterNickName}
              onChange={(e) => setFilterNickName(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") doSearch(1); }}
              placeholder={t("driver.nickName") + "..."}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t("driver.integrationCode")}</label>
            <Input
              value={filterIntCode}
              onChange={(e) => setFilterIntCode(e.target.value.toUpperCase())}
              onPaste={(e) => {
                e.stopPropagation();
                const pasted = e.clipboardData.getData("text");
                e.preventDefault();
                setFilterIntCode((prev) => {
                  const input = e.currentTarget;
                  const start = input.selectionStart ?? prev.length;
                  const end = input.selectionEnd ?? prev.length;
                  return (prev.slice(0, start) + pasted + prev.slice(end)).toUpperCase();
                });
              }}
              onKeyDown={(e) => { if (e.key === "Enter") doSearch(1); }}
              placeholder={t("driver.integrationCode") + "..."}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t("driver.driverBase")}</label>
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
            <label className="text-xs font-medium text-muted-foreground">{t("menu.fleetGroup")}</label>
            <Select value={filterFleetGroupId} onValueChange={setFilterFleetGroupId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t("common.selectAll")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.selectAll")}</SelectItem>
                {fleetGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.code} - {g.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {!forceActiveOnly && (
            <div className="flex items-center gap-2">
              <Switch checked={activeOnly} onCheckedChange={setActiveOnly} />
              <Label className="text-xs cursor-pointer" onClick={() => setActiveOnly(!activeOnly)}>
                {activeOnly ? t("common.active") : t("common.inactive")}
              </Label>
            </div>
          )}
          {forceActiveOnly && <div />}
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
                <TableHead className="h-7 text-xs px-2">{t("driver.nickName")}</TableHead>
                <TableHead className="h-7 text-xs px-2">{t("driver.integrationCode")}</TableHead>
                <TableHead className="h-7 text-xs px-2">{t("driver.registration")}</TableHead>
                <TableHead className="h-7 text-xs px-2">{t("driver.driverBase")}</TableHead>
                <TableHead className="h-7 text-xs px-2">{t("menu.fleetGroup")}</TableHead>
                <TableHead className="h-7 text-xs px-2 w-[90px] text-center">{t("common.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
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
                    <TableCell className="h-7 text-xs px-2 py-1">{String(item.nickName ?? "--")}</TableCell>
                    <TableCell className="h-7 text-xs px-2 py-1">{String(item.integrationCode ?? "--")}</TableCell>
                    <TableCell className="h-7 text-xs px-2 py-1">{String(item.registration ?? "--")}</TableCell>
                    <TableCell className="h-7 text-xs px-2 py-1">{String(item.locationGroupCode ?? "--")}</TableCell>
                    <TableCell className="h-7 text-xs px-2 py-1">{String(item.fleetGroupCode ?? "--")}</TableCell>
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
