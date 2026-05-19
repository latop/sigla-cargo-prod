import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { LookupSearchField } from "@/components/LookupSearchField";
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

interface DailyTripSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string, item: Rec) => void;
}

const formatDT = (v?: string | null) => {
  if (!v) return "--";
  try {
    const d = new Date(v);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "--";
  }
};

const toInputDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const COLUMN_KEYS = [
  { key: "demandLabel", labelKey: "common.demand" },
  { key: "locationOrigLabel", labelKey: "common.origin" },
  { key: "locationDestLabel", labelKey: "common.destination" },
  { key: "lineLabel", labelKey: "common.line" },
  { key: "statusLabel", labelKey: "common.status" },
  { key: "startPlannedLabel", labelKey: "common.startPlanned" },
  { key: "endPlannedLabel", labelKey: "common.endPlanned" },
  { key: "tripTypeLabel", labelKey: "common.tripType" },
] as const;

const STATUS_KEY_MAP: Record<string, string> = {
  P: "tripStatus.scheduled",
  A: "tripStatus.inProgress",
  E: "tripStatus.executed",
};

export function DailyTripSearchModal({ open, onOpenChange, onSelect }: DailyTripSearchModalProps) {
  const { t } = useTranslation();
  const COLUMNS = useMemo(() => COLUMN_KEYS.map((c) => ({ key: c.key, label: t(c.labelKey) })), [t]);
  const [filterSTO, setFilterSTO] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterOrigId, setFilterOrigId] = useState("");
  const [filterOrigLabel, setFilterOrigLabel] = useState("");
  const [filterDestId, setFilterDestId] = useState("");
  const [filterDestLabel, setFilterDestLabel] = useState("");

  const [items, setItems] = useState<Rec[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setFilterSTO("");
      setFilterStartDate("");
      setFilterEndDate("");
      setFilterOrigId("");
      setFilterOrigLabel("");
      setFilterDestId("");
      setFilterDestLabel("");
      setItems([]);
      setPagination(null);
      setSearched(false);
      setPageSize(10);
    }
    prevOpenRef.current = open;
  }, [open]);

  // When start date changes, suggest end date +3 days
  const handleStartDateChange = (v: string) => {
    setFilterStartDate(v);
    if (v) {
      const d = new Date(v);
      d.setDate(d.getDate() + 3);
      setFilterEndDate(toInputDate(d));
    }
  };

  const canSearch = filterSTO.trim() || filterStartDate;

  const doSearch = useCallback(async (pageNum = 1, ps = pageSize) => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (filterSTO.trim()) params.set("Filter1String", filterSTO.trim());
      if (filterStartDate) params.set("Filter2String", filterStartDate);
      if (filterEndDate) params.set("Filter5String", filterEndDate);
      if (filterOrigId) params.set("Filter2Id", filterOrigId);
      if (filterDestId) params.set("Filter3Id", filterDestId);
      params.set("PageSize", String(ps));
      params.set("PageNumber", String(pageNum));

      const res = await fetch(`${API_BASE}/DailyTrip?${params.toString()}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const rawItems: Rec[] = await res.json();

      const pHeader = res.headers.get("x-pagination");
      const pag: PaginationMeta = pHeader
        ? JSON.parse(pHeader)
        : { TotalCount: rawItems.length, PageSize: ps, CurrentPage: pageNum, TotalPages: 1, HasNext: false, HasPrevious: false };

      const resolved = rawItems.map((item) => {
        const locationOrig = item.locationOrig as Rec | null;
        const locationDest = item.locationDest as Rec | null;
        const line = item.line as Rec | null;
        const tripType = item.tripType as Rec | null;
        return {
          ...item,
          demandLabel: [item.dt, item.sto].filter(Boolean).join(" / ") || item.demand || item.dailyTripCode || "--",
          locationOrigLabel: locationOrig?.code ?? (item.locationOrigCode as string) ?? "--",
          locationDestLabel: locationDest?.code ?? (item.locationDestCode as string) ?? "--",
          lineLabel: line?.code ?? (item.lineCode as string) ?? "--",
          statusLabel: (() => {
            const k = STATUS_KEY_MAP[item.flgStatus as string];
            return k ? t(k) : ((item.flgStatus as string) || "--");
          })(),
          startPlannedLabel: formatDT(item.startPlanned as string | null),
          endPlannedLabel: formatDT(item.endPlanned as string | null),
          tripTypeLabel: tripType?.code ?? "--",
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
  }, [filterSTO, filterStartDate, filterEndDate, filterOrigId, filterDestId, pageSize]);

  const handleSelect = (item: Rec) => {
    onSelect(String(item.id), item);
    onOpenChange(false);
  };

  const resetFilters = () => {
    setFilterSTO("");
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterOrigId("");
    setFilterOrigLabel("");
    setFilterDestId("");
    setFilterDestLabel("");
    setItems([]);
    setPagination(null);
    setSearched(false);
    setPageSize(10);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetFilters(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm font-display">{t("common.searchDailyTrip")}</DialogTitle>
          <DialogDescription className="sr-only">{t("searchModal.dailyTripDesc")}</DialogDescription>
        </DialogHeader>

        {/* Filter fields */}
        <div className="grid grid-cols-5 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t("common.demand")}</label>
            <Input
              value={filterSTO}
              onChange={(e) => setFilterSTO(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter" && canSearch) doSearch(1); }}
              placeholder={t("common.demandPlaceholder") + "..."}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t("common.startDate")}</label>
            <Input
              type="date"
              value={filterStartDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t("common.endDate")}</label>
            <Input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t("common.origin")}</label>
            <LookupSearchField
              endpoint="Location"
              labelFn="codeOnly"
              searchFilterParam="Filter1String"
              value={filterOrigId}
              onChange={(id, item) => {
                setFilterOrigId(id);
                if (item) {
                  const ci2 = item.codeIntegration2 ? ` (${item.codeIntegration2})` : "";
                  setFilterOrigLabel(`${item.code || ""}${ci2}`);
                } else {
                  setFilterOrigLabel("");
                }
              }}
              placeholder={t("common.origin") + "..."}
              initialLabel={filterOrigLabel}
              nullable
              transformItem={(item) => ({
                ...item,
                code: `${item.code || ""}${item.codeIntegration2 ? ` (${item.codeIntegration2})` : ""}`,
                name: "",
              })}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t("common.destination")}</label>
            <LookupSearchField
              endpoint="Location"
              labelFn="codeOnly"
              searchFilterParam="Filter1String"
              value={filterDestId}
              onChange={(id, item) => {
                setFilterDestId(id);
                if (item) {
                  const ci2 = item.codeIntegration2 ? ` (${item.codeIntegration2})` : "";
                  setFilterDestLabel(`${item.code || ""}${ci2}`);
                } else {
                  setFilterDestLabel("");
                }
              }}
              placeholder={t("common.destination") + "..."}
              initialLabel={filterDestLabel}
              nullable
              transformItem={(item) => ({
                ...item,
                code: `${item.code || ""}${item.codeIntegration2 ? ` (${item.codeIntegration2})` : ""}`,
                name: "",
              })}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {!canSearch && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t("common.fillDemandOrStartDate")}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => doSearch(1)}
            disabled={loading || !canSearch}
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
                    {loading ? t("common.loading") : searched ? t("common.noResults") : t("common.fillFiltersAndSearch")}
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
