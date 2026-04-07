import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { authFetch } from "@/lib/auth-fetch";
import { motion } from "framer-motion";
import {
  Search, Loader2, X, Clock, TrendingUp, TrendingDown, Timer,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DatePickerField } from "@/components/DatePickerField";
import { LookupSearchField } from "@/components/LookupSearchField";
import { ExportDropdown } from "@/components/ExportDropdown";
import type { ExportColumn } from "@/lib/export-utils";
import { API_BASE } from "@/config/api";

type Rec = Record<string, unknown>;

interface OvertimeBankEntry {
  id?: string;
  driverId?: string;
  driverName?: string;
  driverRegistration?: string;
  driverNickName?: string;
  locationGroupCode?: string;
  referenceMonth?: string;
  workedHours?: number;
  allowedHours?: number;
  overtimeHours?: number;
  compensatedHours?: number;
  balance?: number;
  [k: string]: unknown;
}

interface PaginationMeta {
  TotalCount: number;
  PageSize: number;
  CurrentPage: number;
  TotalPages: number;
  HasNext: boolean;
  HasPrevious: boolean;
}

const KPI_ICONS = [
  { key: "worked", icon: Clock, color: "text-blue-500" },
  { key: "allowed", icon: Timer, color: "text-muted-foreground" },
  { key: "overtime", icon: TrendingUp, color: "text-orange-500" },
  { key: "balance", icon: TrendingDown, color: "text-emerald-500" },
];

const exportColumns: ExportColumn[] = [
  { key: "driverName", label: "Motorista" },
  { key: "driverNickName", label: "Nome de Escala" },
  { key: "driverRegistration", label: "CPF" },
  { key: "locationGroupCode", label: "Base" },
  { key: "referenceMonth", label: "Mês Ref." },
  { key: "workedHours", label: "Horas Realizadas" },
  { key: "allowedHours", label: "Horas Permitidas" },
  { key: "overtimeHours", label: "Horas Extras" },
  { key: "compensatedHours", label: "Compensadas" },
  { key: "balance", label: "Saldo (h)" },
];

export default function OvertimeBankPage() {
  const { t } = useTranslation();
  usePageTitle(t("menu.overtimeBank"));

  // Filters
  const [filterDriver, setFilterDriver] = useState("");
  const [filterDriverLabel, setFilterDriverLabel] = useState("");
  const [filterLocGroup, setFilterLocGroup] = useState("");
  const [filterLocGroupLabel, setFilterLocGroupLabel] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState<string | null>(null);
  const [filterDateTo, setFilterDateTo] = useState<string | null>(null);

  // Data
  const [items, setItems] = useState<OvertimeBankEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fmtDate = (d?: string | null) => d ? d.split("T")[0] : "";

  const fetchData = useCallback(async (page: number, size: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDriver) params.append("DriverId", filterDriver);
      if (filterLocGroup) params.append("LocationGroupCode", filterLocGroup);
      if (filterDateFrom) params.append("StartDate", fmtDate(filterDateFrom));
      if (filterDateTo) params.append("EndDate", fmtDate(filterDateTo));
      params.set("PageNumber", String(page));
      params.set("PageSize", String(size));

      const res = await authFetch(`/OvertimeBank?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const list: OvertimeBankEntry[] = Array.isArray(data) ? data : data.items || data.data || [];
        const ph = res.headers.get("x-pagination");
        const pag = ph
          ? JSON.parse(ph)
          : { TotalCount: list.length, PageSize: size, CurrentPage: page, TotalPages: 1, HasNext: false, HasPrevious: false };
        setItems(list);
        setPagination(pag);
      } else {
        setItems([]);
        setPagination(null);
      }
    } catch {
      setItems([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [filterDriver, filterLocGroup, filterDateFrom, filterDateTo]);

  const handleSearch = () => {
    setSearched(true);
    setCurrentPage(1);
    fetchData(1, pageSize);
  };

  const handleClear = () => {
    setFilterDriver("");
    setFilterDriverLabel("");
    setFilterLocGroup("");
    setFilterLocGroupLabel("");
    setFilterDateFrom(undefined);
    setFilterDateTo(undefined);
    setItems([]);
    setPagination(null);
    setSearched(false);
    setCurrentPage(1);
  };

  const goToPage = (p: number) => {
    setCurrentPage(p);
    fetchData(p, pageSize);
  };

  // KPIs computed from current data
  const totalWorked = items.reduce((s, i) => s + (i.workedHours || 0), 0);
  const totalAllowed = items.reduce((s, i) => s + (i.allowedHours || 0), 0);
  const totalOvertime = items.reduce((s, i) => s + (i.overtimeHours || 0), 0);
  const totalBalance = items.reduce((s, i) => s + (i.balance || 0), 0);

  const kpis = [
    { label: t("overtimeBank.workedHours"), value: `${totalWorked.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`, icon: Clock, color: "text-blue-500" },
    { label: t("overtimeBank.allowedHours"), value: `${totalAllowed.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`, icon: Timer, color: "text-muted-foreground" },
    { label: t("overtimeBank.overtimeHours"), value: `${totalOvertime.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`, icon: TrendingUp, color: "text-orange-500" },
    { label: t("overtimeBank.balance"), value: `${totalBalance >= 0 ? "+" : ""}${totalBalance.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`, icon: TrendingDown, color: totalBalance >= 0 ? "text-emerald-500" : "text-destructive" },
  ];

  const getBalanceVariant = (bal?: number): "default" | "secondary" | "destructive" => {
    if (bal === undefined || bal === null) return "secondary";
    if (bal < 0) return "destructive";
    if (bal > 40) return "secondary";
    return "default";
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">{t("menu.overtimeBank")}</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">{t("driver.name")}</Label>
              <LookupSearchField
                endpoint="Drivers"
                value={filterDriver}
                onChange={(id, item) => {
                  setFilterDriver(id);
                  setFilterDriverLabel(item ? `${(item as Rec).name || ""} ${(item as Rec).lastName || ""}`.trim() : "");
                }}
                nullable
                placeholder={t("driver.name")}
                initialLabel={filterDriverLabel || undefined}
                showActiveFilter
              />
            </div>
            <div className="col-span-1">
              <Label className="text-xs mb-1 block">{t("driver.driverBase")}</Label>
              <LookupSearchField
                endpoint="LocationGroups"
                value={filterLocGroup}
                onChange={(id, item) => {
                  setFilterLocGroup(id);
                  setFilterLocGroupLabel(item ? `${(item as Rec).code || ""}` : "");
                }}
                nullable
                placeholder={t("driver.driverBase")}
                initialLabel={filterLocGroupLabel || undefined}
              />
            </div>
            <div className="col-span-1">
              <Label className="text-xs mb-1 block">{t("overtimeBank.dateFrom")}</Label>
              <DatePickerField value={filterDateFrom} onChange={setFilterDateFrom} />
            </div>
            <div className="col-span-1">
              <Label className="text-xs mb-1 block">{t("overtimeBank.dateTo")}</Label>
              <DatePickerField value={filterDateTo} onChange={setFilterDateTo} />
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSearch}>
                <Search className="h-3.5 w-3.5 mr-1" />{t("common.search")}
              </Button>
              <Button size="sm" variant="outline" onClick={handleClear}>
                <X className="h-3.5 w-3.5 mr-1" />{t("common.clear")}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {searched && items.length > 0 && (
                <ExportDropdown
                  title={t("menu.overtimeBank")}
                  columns={exportColumns}
                  fetchData={async () => {
                    const params = new URLSearchParams();
                    if (filterDriver) params.append("DriverId", filterDriver);
                    if (filterLocGroup) params.append("LocationGroupCode", filterLocGroup);
                    if (filterDateFrom) params.append("StartDate", fmtDate(filterDateFrom));
                    if (filterDateTo) params.append("EndDate", fmtDate(filterDateTo));
                    params.set("PageSize", "99999");
                    const res = await authFetch(`/OvertimeBank?${params.toString()}`);
                    if (!res.ok) throw new Error("Export error");
                    const data = await res.json();
                    return Array.isArray(data) ? data : data.items || data.data || [];
                  }}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      {searched && items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-4 gap-3"
        >
          {kpis.map((kpi, i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className={`rounded-lg p-2 bg-muted ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Table */}
      {searched && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t("common.noResults")}</p>
              ) : (
                <>
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs">{t("driver.name")}</TableHead>
                          <TableHead className="text-xs">{t("driver.nickName")}</TableHead>
                          <TableHead className="text-xs w-[130px]">{t("driver.registration")}</TableHead>
                          <TableHead className="text-xs w-[100px]">{t("driver.driverBase")}</TableHead>
                          <TableHead className="text-xs w-[100px] text-right">{t("overtimeBank.workedHours")}</TableHead>
                          <TableHead className="text-xs w-[100px] text-right">{t("overtimeBank.allowedHours")}</TableHead>
                          <TableHead className="text-xs w-[100px] text-right">{t("overtimeBank.overtimeHours")}</TableHead>
                          <TableHead className="text-xs w-[100px] text-right">{t("overtimeBank.compensated")}</TableHead>
                          <TableHead className="text-xs w-[100px] text-right">{t("overtimeBank.balance")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, idx) => (
                          <TableRow key={item.id || idx} className={idx % 2 === 1 ? "bg-muted/30" : ""}>
                            <TableCell className="text-xs">{item.driverName || "—"}</TableCell>
                            <TableCell className="text-xs">{item.driverNickName || "—"}</TableCell>
                            <TableCell className="text-xs font-mono">{item.driverRegistration || "—"}</TableCell>
                            <TableCell className="text-xs">{item.locationGroupCode || "—"}</TableCell>
                            <TableCell className="text-xs text-right font-mono">
                              {(item.workedHours ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono">
                              {(item.allowedHours ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono">
                              {(item.overtimeHours ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono">
                              {(item.compensatedHours ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                            </TableCell>
                            <TableCell className="text-xs text-right">
                              <Badge variant={getBalanceVariant(item.balance)} className="font-mono text-[10px]">
                                {(item.balance ?? 0) >= 0 ? "+" : ""}
                                {(item.balance ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {pagination && (
                    <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
                      <span>
                        {pagination.TotalCount} {t("common.records")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>{t("common.rowsPerPage")}</span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={(v) => {
                            const ps = parseInt(v);
                            setPageSize(ps);
                            setCurrentPage(1);
                            fetchData(1, ps);
                          }}
                        >
                          <SelectTrigger className="h-7 w-[65px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[10, 20, 50, 100].map((v) => (
                              <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span>
                          {t("common.page")} {pagination.CurrentPage} {t("common.of")} {pagination.TotalPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={!pagination.HasPrevious}
                          onClick={() => goToPage(currentPage - 1)}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={!pagination.HasNext}
                          onClick={() => goToPage(currentPage + 1)}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
