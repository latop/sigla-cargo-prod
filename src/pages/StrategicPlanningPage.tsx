import { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery } from "@tanstack/react-query";
import { ExportDropdown } from "@/components/ExportDropdown";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Search, Loader2, X, Plus, Pencil, Trash2, Save, Copy,
  ChevronLeft, ChevronRight, Target, MapPin, TrendingUp,
  Truck, Building2, DollarSign, BarChart3, Percent, Package,
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { FloatingPanel } from "@/components/FloatingPanel";
import { LookupSearchField } from "@/components/LookupSearchField";
import { authFetch } from "@/lib/auth-fetch";

/* ─── Types ─── */

interface Scenario {
  id: string;
  code: string;
  description: string;
  startDate: string;
  endDate: string;
}

interface StrategicDemand {
  id: string;
  scenarioId: string;
  originId: string;
  originCode: string;
  originName: string;
  destinationId: string;
  destinationCode: string;
  destinationName: string;
  fleetGroupId: string;
  fleetGroupCode: string;
  freightValue: number;
  ownCarrierQty: number;
  thirdPartyCarrierQty: number;
  totalTrips: number;
  internalPercent: number;
  distance: number;
  notes: string;
  status: "draft" | "optimized" | "published";
}

/* ─── Mock Data ─── */

const mockDemands: StrategicDemand[] = [
  {
    id: "1", scenarioId: "s1",
    originId: "o1", originCode: "FAB ITU", originName: "FÁBRICA PEPSICO ITU",
    destinationId: "d1", destinationCode: "CD CIC", destinationName: "CD CURITIBA",
    fleetGroupId: "fg1", fleetGroupCode: "BT9",
    freightValue: 4500, ownCarrierQty: 8, thirdPartyCarrierQty: 2, totalTrips: 10,
    internalPercent: 80, distance: 408, notes: "", status: "draft",
  },
  {
    id: "2", scenarioId: "s1",
    originId: "o1", originCode: "FAB ITU", originName: "FÁBRICA PEPSICO ITU",
    destinationId: "d2", destinationCode: "CD STL", destinationName: "CD SETE LAGOAS",
    fleetGroupId: "fg2", fleetGroupCode: "BT6",
    freightValue: 6200, ownCarrierQty: 5, thirdPartyCarrierQty: 5, totalTrips: 10,
    internalPercent: 50, distance: 685, notes: "Rota alternativa via BR-381", status: "draft",
  },
  {
    id: "3", scenarioId: "s1",
    originId: "o2", originCode: "FAB STL", originName: "FÁBRICA SETE LAGOAS",
    destinationId: "d3", destinationCode: "CDV BHZ", destinationName: "CDV BELO HORIZONTE",
    fleetGroupId: "fg1", fleetGroupCode: "SIM",
    freightValue: 1800, ownCarrierQty: 12, thirdPartyCarrierQty: 0, totalTrips: 12,
    internalPercent: 100, distance: 78, notes: "", status: "optimized",
  },
  {
    id: "4", scenarioId: "s1",
    originId: "o1", originCode: "FAB ITU", originName: "FÁBRICA PEPSICO ITU",
    destinationId: "d4", destinationCode: "CLT POA", destinationName: "CLIENTES PORTO ALEGRE",
    fleetGroupId: "fg3", fleetGroupCode: "BT9",
    freightValue: 8900, ownCarrierQty: 3, thirdPartyCarrierQty: 7, totalTrips: 10,
    internalPercent: 30, distance: 1109, notes: "Considerar rodízio de motoristas", status: "draft",
  },
  {
    id: "5", scenarioId: "s1",
    originId: "o2", originCode: "FAB STL", originName: "FÁBRICA SETE LAGOAS",
    destinationId: "d5", destinationCode: "CD REC", destinationName: "CD RECIFE",
    fleetGroupId: "fg2", fleetGroupCode: "BT6",
    freightValue: 12500, ownCarrierQty: 2, thirdPartyCarrierQty: 8, totalTrips: 10,
    internalPercent: 20, distance: 2060, notes: "Longa distância - avaliar viabilidade", status: "draft",
  },
  {
    id: "6", scenarioId: "s1",
    originId: "o1", originCode: "FAB ITU", originName: "FÁBRICA PEPSICO ITU",
    destinationId: "d6", destinationCode: "CDV CPQ", destinationName: "CDV CAMPINAS",
    fleetGroupId: "fg4", fleetGroupCode: "SIM",
    freightValue: 950, ownCarrierQty: 15, thirdPartyCarrierQty: 0, totalTrips: 15,
    internalPercent: 100, distance: 45, notes: "", status: "published",
  },
  {
    id: "7", scenarioId: "s1",
    originId: "o2", originCode: "FAB STL", originName: "FÁBRICA SETE LAGOAS",
    destinationId: "d7", destinationCode: "CLT VIT", destinationName: "CLIENTES VITÓRIA",
    fleetGroupId: "fg2", fleetGroupCode: "BT6",
    freightValue: 5400, ownCarrierQty: 4, thirdPartyCarrierQty: 4, totalTrips: 8,
    internalPercent: 50, distance: 520, notes: "", status: "optimized",
  },
];

const PAGE_SIZE = 20;

const statusConfig = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground border-border" },
  optimized: { label: "Otimizado", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  published: { label: "Publicado", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
};

/* ─── Component ─── */

export default function StrategicPlanningPage() {
  const { t } = useTranslation();
  usePageTitle(t("strategicPlanning.title"), Target);

  const { toast: showToast } = useToast();

  // Scenario selection
  const [selectedScenarioId, setSelectedScenarioId] = useState("");

  // Fetch scenarios for dropdown
  const { data: scenariosData } = useQuery({
    queryKey: ["scenarios-dropdown"],
    queryFn: async () => {
      const res = await authFetch("/Scenario?PageSize=200");
      if (!res.ok) return [];
      return (await res.json()) as Scenario[];
    },
  });
  const scenarios = scenariosData || [];

  // Local data
  const [demands, setDemands] = useState<StrategicDemand[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Filters
  const [filterOrigin, setFilterOrigin] = useState("");
  const [filterDestination, setFilterDestination] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Edit
  const [editingItem, setEditingItem] = useState<Partial<StrategicDemand> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StrategicDemand | null>(null);

  // Sort
  const [sortField, setSortField] = useState("originCode");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Load mock data when scenario selected
  const handleLoadScenario = useCallback(() => {
    if (!selectedScenarioId) {
      showToast({ title: t("common.error"), description: t("strategicPlanning.selectScenarioFirst"), variant: "destructive" });
      return;
    }
    setDemands(mockDemands.map(d => ({ ...d, scenarioId: selectedScenarioId })));
    setHasLoaded(true);
    setCurrentPage(1);
  }, [selectedScenarioId, showToast, t]);

  const handleClear = useCallback(() => {
    setFilterOrigin("");
    setFilterDestination("");
    setFilterStatus("all");
    setCurrentPage(1);
  }, []);

  // KPIs
  const kpis = useMemo(() => {
    const totalTrips = demands.reduce((s, d) => s + d.totalTrips, 0);
    const ownTrips = demands.reduce((s, d) => s + d.ownCarrierQty, 0);
    const thirdTrips = demands.reduce((s, d) => s + d.thirdPartyCarrierQty, 0);
    const totalFreight = demands.reduce((s, d) => s + d.freightValue * d.totalTrips, 0);
    const avgInternal = demands.length > 0 ? Math.round(demands.reduce((s, d) => s + d.internalPercent, 0) / demands.length) : 0;
    return { routes: demands.length, totalTrips, ownTrips, thirdTrips, totalFreight, avgInternal };
  }, [demands]);

  // Filtered & sorted
  const filteredData = useMemo(() => {
    return demands.filter(d => {
      if (filterOrigin && !d.originCode.toLowerCase().includes(filterOrigin.toLowerCase())) return false;
      if (filterDestination && !d.destinationCode.toLowerCase().includes(filterDestination.toLowerCase())) return false;
      if (filterStatus !== "all" && d.status !== filterStatus) return false;
      return true;
    });
  }, [demands, filterOrigin, filterDestination, filterStatus]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const aVal = String((a as unknown as Record<string, unknown>)[sortField] ?? "").toLowerCase();
      const bVal = String((b as unknown as Record<string, unknown>)[sortField] ?? "").toLowerCase();
      return sortDir === "asc" ? aVal.localeCompare(bVal, "pt-BR") : bVal.localeCompare(aVal, "pt-BR");
    });
    return sorted;
  }, [filteredData, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE));
  const pageData = sortedData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };
  const sortIndicator = (field: string) => sortField === field ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  // CRUD
  const handleNew = useCallback(() => {
    setIsNew(true);
    setEditingItem({
      scenarioId: selectedScenarioId,
      freightValue: 0,
      ownCarrierQty: 0,
      thirdPartyCarrierQty: 0,
      totalTrips: 0,
      internalPercent: 0,
      distance: 0,
      notes: "",
      status: "draft",
    });
  }, [selectedScenarioId]);

  const handleEdit = useCallback((item: StrategicDemand) => {
    setIsNew(false);
    setEditingItem({ ...item });
  }, []);

  const handleDuplicate = useCallback((item: StrategicDemand) => {
    setIsNew(true);
    setEditingItem({ ...item, id: undefined, status: "draft" });
  }, []);

  const handleSave = useCallback(() => {
    if (!editingItem) return;
    if (!editingItem.originCode || !editingItem.destinationCode) {
      showToast({ title: t("common.error"), description: t("strategicPlanning.requiredFields"), variant: "destructive" });
      return;
    }

    const ownQty = editingItem.ownCarrierQty || 0;
    const thirdQty = editingItem.thirdPartyCarrierQty || 0;
    const total = ownQty + thirdQty;
    const pct = total > 0 ? Math.round((ownQty / total) * 100) : 0;

    const record: StrategicDemand = {
      id: editingItem.id || crypto.randomUUID(),
      scenarioId: editingItem.scenarioId || selectedScenarioId,
      originId: editingItem.originId || "",
      originCode: editingItem.originCode || "",
      originName: editingItem.originName || "",
      destinationId: editingItem.destinationId || "",
      destinationCode: editingItem.destinationCode || "",
      destinationName: editingItem.destinationName || "",
      fleetGroupId: editingItem.fleetGroupId || "",
      fleetGroupCode: editingItem.fleetGroupCode || "",
      freightValue: editingItem.freightValue || 0,
      ownCarrierQty: ownQty,
      thirdPartyCarrierQty: thirdQty,
      totalTrips: total,
      internalPercent: pct,
      distance: editingItem.distance || 0,
      notes: editingItem.notes || "",
      status: (editingItem.status as StrategicDemand["status"]) || "draft",
    };

    if (isNew) {
      setDemands(prev => [record, ...prev]);
      showToast({ title: t("common.success"), description: t("strategicPlanning.created") });
    } else {
      setDemands(prev => prev.map(d => d.id === record.id ? record : d));
      showToast({ title: t("common.success"), description: t("strategicPlanning.updated") });
    }
    setEditingItem(null);
  }, [editingItem, isNew, selectedScenarioId, showToast, t]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    setDemands(prev => prev.filter(d => d.id !== deleteTarget.id));
    setDeleteTarget(null);
    showToast({ title: t("common.success"), description: t("strategicPlanning.deleted") });
  }, [deleteTarget, showToast, t]);

  // Auto-calc internal %
  const formOwnQty = editingItem?.ownCarrierQty || 0;
  const formThirdQty = editingItem?.thirdPartyCarrierQty || 0;
  const formTotal = formOwnQty + formThirdQty;
  const formPct = formTotal > 0 ? Math.round((formOwnQty / formTotal) * 100) : 0;

  const fmtCurrency = (val: number) => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);

  return (
    <div className="p-6 space-y-6">
      {/* KPIs */}
      {hasLoaded && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: t("strategicPlanning.kpi.routes"), value: kpis.routes, icon: MapPin, fmt: String(kpis.routes) },
            { label: t("strategicPlanning.kpi.totalTrips"), value: kpis.totalTrips, icon: Truck, fmt: String(kpis.totalTrips) },
            { label: t("strategicPlanning.kpi.ownTrips"), value: kpis.ownTrips, icon: Building2, fmt: String(kpis.ownTrips) },
            { label: t("strategicPlanning.kpi.thirdTrips"), value: kpis.thirdTrips, icon: Package, fmt: String(kpis.thirdTrips) },
            { label: t("strategicPlanning.kpi.totalFreight"), value: kpis.totalFreight, icon: DollarSign, fmt: fmtCurrency(kpis.totalFreight) },
            { label: t("strategicPlanning.kpi.avgInternal"), value: kpis.avgInternal, icon: Percent, fmt: `${kpis.avgInternal}%` },
          ].map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <kpi.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-tight">{kpi.fmt}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{kpi.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Scenario selector + filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">{t("strategicPlanning.scenario")} <span className="text-destructive">*</span></Label>
              <Select value={selectedScenarioId} onValueChange={setSelectedScenarioId}>
                <SelectTrigger className="h-9"><SelectValue placeholder={t("strategicPlanning.selectScenario")} /></SelectTrigger>
                <SelectContent>
                  {scenarios.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.code} - {s.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Label className="text-xs">{t("strategicPlanning.origin")}</Label>
              <Input
                className="h-9"
                value={filterOrigin}
                onChange={e => setFilterOrigin(e.target.value.toUpperCase())}
                placeholder={t("strategicPlanning.filterOrigin")}
              />
            </div>
            <div className="col-span-1">
              <Label className="text-xs">{t("strategicPlanning.destination")}</Label>
              <Input
                className="h-9"
                value={filterDestination}
                onChange={e => setFilterDestination(e.target.value.toUpperCase())}
                placeholder={t("strategicPlanning.filterDest")}
              />
            </div>
            <div className="col-span-1">
              <Label className="text-xs">{t("strategicPlanning.status")}</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="draft">{t("strategicPlanning.statusDraft")}</SelectItem>
                  <SelectItem value="optimized">{t("strategicPlanning.statusOptimized")}</SelectItem>
                  <SelectItem value="published">{t("strategicPlanning.statusPublished")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedScenario && (
              <div className="col-span-1 flex items-end">
                <Badge variant="outline" className="text-xs h-9 flex items-center gap-1 px-3">
                  {format(new Date(selectedScenario.startDate), "dd/MM")} – {format(new Date(selectedScenario.endDate), "dd/MM/yy")}
                </Badge>
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleLoadScenario} disabled={!selectedScenarioId}>
                <Search className="h-4 w-4 mr-1" />{t("common.search")}
              </Button>
              <Button size="sm" variant="outline" onClick={handleClear}><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex items-center gap-2">
              {hasLoaded && (
                <ExportDropdown
                  fetchData={async () => sortedData as unknown as Record<string, unknown>[]}
                  columns={[
                    { key: "originCode", label: t("strategicPlanning.origin") },
                    { key: "destinationCode", label: t("strategicPlanning.destination") },
                    { key: "fleetGroupCode", label: t("strategicPlanning.fleetGroup") },
                    { key: "freightValue", label: t("strategicPlanning.freightValue") },
                    { key: "ownCarrierQty", label: t("strategicPlanning.ownCarrier") },
                    { key: "thirdPartyCarrierQty", label: t("strategicPlanning.thirdPartyCarrier") },
                    { key: "totalTrips", label: t("strategicPlanning.totalTrips") },
                    { key: "internalPercent", label: t("strategicPlanning.internalPercent") },
                    { key: "distance", label: t("strategicPlanning.distance") },
                  ]}
                  title={t("strategicPlanning.title")}
                />
              )}
              <Button size="sm" onClick={handleNew} disabled={!hasLoaded}>
                <Plus className="h-4 w-4 mr-1" />{t("common.new")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {hasLoaded && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("originCode")}>
                      {t("strategicPlanning.origin")}{sortIndicator("originCode")}
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("destinationCode")}>
                      {t("strategicPlanning.destination")}{sortIndicator("destinationCode")}
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("fleetGroupCode")}>
                      {t("strategicPlanning.fleetGroup")}{sortIndicator("fleetGroupCode")}
                    </TableHead>
                    <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("freightValue")}>
                      {t("strategicPlanning.freightValue")}{sortIndicator("freightValue")}
                    </TableHead>
                    <TableHead className="text-center">{t("strategicPlanning.ownCarrier")}</TableHead>
                    <TableHead className="text-center">{t("strategicPlanning.thirdPartyCarrier")}</TableHead>
                    <TableHead className="text-center cursor-pointer select-none" onClick={() => toggleSort("totalTrips")}>
                      {t("strategicPlanning.totalTrips")}{sortIndicator("totalTrips")}
                    </TableHead>
                    <TableHead className="text-center">% {t("strategicPlanning.internalShort")}</TableHead>
                    <TableHead className="text-right">{t("strategicPlanning.distance")}</TableHead>
                    <TableHead className="text-center">{t("strategicPlanning.status")}</TableHead>
                    <TableHead className="w-[100px]">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        {t("common.noResults")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageData.map((item, idx) => {
                      const sc = statusConfig[item.status];
                      return (
                        <TableRow
                          key={item.id}
                          className={idx % 2 === 0 ? "" : "bg-muted/30"}
                          onDoubleClick={() => handleEdit(item)}
                        >
                          <TableCell>
                            <div>
                              <span className="font-mono text-sm font-medium">{item.originCode}</span>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{item.originName}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-mono text-sm font-medium">{item.destinationCode}</span>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{item.destinationName}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{item.fleetGroupCode}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmtCurrency(item.freightValue)}</TableCell>
                          <TableCell className="text-center font-medium">{item.ownCarrierQty}</TableCell>
                          <TableCell className="text-center font-medium">{item.thirdPartyCarrierQty}</TableCell>
                          <TableCell className="text-center font-bold">{item.totalTrips}</TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold text-sm ${
                              item.internalPercent >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                              item.internalPercent >= 50 ? "text-amber-600 dark:text-amber-400" :
                              "text-red-600 dark:text-red-400"
                            }`}>
                              {item.internalPercent}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm">{item.distance} km</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`${sc.color} text-xs`}>
                              {t(`strategicPlanning.status${item.status.charAt(0).toUpperCase() + item.status.slice(1)}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)} title={t("common.edit")}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(item)} title={t("strategicPlanning.duplicate")}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(item)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {sortedData.length > PAGE_SIZE && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <span className="text-sm text-muted-foreground">{sortedData.length} {t("common.records")}</span>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">{currentPage}/{totalPages}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Edit Panel */}
      {editingItem && (
        <FloatingPanel
          title={isNew ? t("strategicPlanning.newDemand") : t("strategicPlanning.editDemand")}
          onClose={() => setEditingItem(null)}
          width={720}
        >
          <div className="space-y-4 py-2">
            {/* Origin & Destination */}
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-3">
                <Label className="text-xs">{t("strategicPlanning.origin")} <span className="text-destructive">*</span></Label>
                <LookupSearchField
                  endpoint="Location"
                  value={editingItem.originId || ""}
                  onChange={(id, item) => setEditingItem(prev => prev ? {
                    ...prev,
                    originId: id,
                    originCode: item ? String(item.code || "") : "",
                    originName: item ? String(item.name || "") : "",
                  } : null)}
                  placeholder={t("strategicPlanning.selectOrigin")}
                  initialLabel={editingItem.originCode ? `${editingItem.originCode} - ${editingItem.originName}` : ""}
                />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">{t("strategicPlanning.destination")} <span className="text-destructive">*</span></Label>
                <LookupSearchField
                  endpoint="Location"
                  value={editingItem.destinationId || ""}
                  onChange={(id, item) => setEditingItem(prev => prev ? {
                    ...prev,
                    destinationId: id,
                    destinationCode: item ? String(item.code || "") : "",
                    destinationName: item ? String(item.name || "") : "",
                  } : null)}
                  placeholder={t("strategicPlanning.selectDest")}
                  initialLabel={editingItem.destinationCode ? `${editingItem.destinationCode} - ${editingItem.destinationName}` : ""}
                />
              </div>
            </div>

            {/* Fleet Group & Distance */}
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">{t("strategicPlanning.fleetGroup")}</Label>
                <LookupSearchField
                  endpoint="FleetGroup"
                  value={editingItem.fleetGroupId || ""}
                  onChange={(id, item) => setEditingItem(prev => prev ? {
                    ...prev,
                    fleetGroupId: id,
                    fleetGroupCode: item ? String(item.code || "") : "",
                  } : null)}
                  placeholder={t("strategicPlanning.selectFleetGroup")}
                  initialLabel={editingItem.fleetGroupCode || ""}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">{t("strategicPlanning.freightValue")} (R$)</Label>
                <Input
                  className="h-9"
                  type="number"
                  min={0}
                  value={editingItem.freightValue ?? 0}
                  onChange={e => setEditingItem(prev => prev ? { ...prev, freightValue: Number(e.target.value) } : null)}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">{t("strategicPlanning.distance")} (km)</Label>
                <Input
                  className="h-9"
                  type="number"
                  min={0}
                  value={editingItem.distance ?? 0}
                  onChange={e => setEditingItem(prev => prev ? { ...prev, distance: Number(e.target.value) } : null)}
                />
              </div>
            </div>

            {/* Carrier quantities */}
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">{t("strategicPlanning.ownCarrier")}</Label>
                <Input
                  className="h-9"
                  type="number"
                  min={0}
                  value={editingItem.ownCarrierQty ?? 0}
                  onChange={e => setEditingItem(prev => prev ? { ...prev, ownCarrierQty: Number(e.target.value) } : null)}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">{t("strategicPlanning.thirdPartyCarrier")}</Label>
                <Input
                  className="h-9"
                  type="number"
                  min={0}
                  value={editingItem.thirdPartyCarrierQty ?? 0}
                  onChange={e => setEditingItem(prev => prev ? { ...prev, thirdPartyCarrierQty: Number(e.target.value) } : null)}
                />
              </div>
              <div className="col-span-1">
                <Label className="text-xs">{t("strategicPlanning.totalTrips")}</Label>
                <div className="h-9 flex items-center">
                  <span className="text-lg font-bold">{formTotal}</span>
                </div>
              </div>
              <div className="col-span-1">
                <Label className="text-xs">% {t("strategicPlanning.internalShort")}</Label>
                <div className="h-9 flex items-center">
                  <span className={`text-lg font-bold ${
                    formPct >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                    formPct >= 50 ? "text-amber-600 dark:text-amber-400" :
                    "text-red-600 dark:text-red-400"
                  }`}>
                    {formPct}%
                  </span>
                </div>
              </div>
            </div>

            {/* Visual bar */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] text-muted-foreground">{t("strategicPlanning.carrierMix")}</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden flex bg-muted">
                {formTotal > 0 && (
                  <>
                    <div
                      className="bg-primary transition-all"
                      style={{ width: `${formPct}%` }}
                    />
                    <div
                      className="bg-muted-foreground/30 transition-all"
                      style={{ width: `${100 - formPct}%` }}
                    />
                  </>
                )}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">{t("strategicPlanning.ownCarrier")} ({formOwnQty})</span>
                <span className="text-[10px] text-muted-foreground">{t("strategicPlanning.thirdPartyCarrier")} ({formThirdQty})</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs">{t("strategicPlanning.notes")}</Label>
              <Input
                className="h-9"
                value={editingItem.notes || ""}
                onChange={e => setEditingItem(prev => prev ? { ...prev, notes: e.target.value } : null)}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingItem(null)}>{t("common.cancel")}</Button>
              <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" />{t("common.save")}</Button>
            </div>
          </div>
        </FloatingPanel>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("strategicPlanning.deleteConfirm", { origin: deleteTarget?.originCode, dest: deleteTarget?.destinationCode })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
