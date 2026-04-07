import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ExportDropdown } from "@/components/ExportDropdown";
import { fetchAllForExport } from "@/lib/export-utils";
import { motion } from "framer-motion";
import {
  Search, Loader2, X,
  Plus, Pencil, Trash2, Save, User,
  ChevronLeft, ChevronRight, Eye, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { DatePickerField } from "@/components/DatePickerField";
import { FloatingPanel } from "@/components/FloatingPanel";
import { API_BASE } from "@/config/api";
import { LookupSearchField } from "@/components/LookupSearchField";
import { LineSearchModal } from "@/components/LineSearchModal";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

// --- Types ---
interface DriverItem {
  id?: string;
  name?: string;
  lastName?: string;
  nickName?: string;
  registration?: string;
  seniority?: number;
  identification?: string;
  genre?: string;
  birthdate?: string | null;
  admission?: string | null;
  resign?: string | null;
  address?: string;
  zipCode?: string;
  district?: string;
  cityId?: string | null;
  city?: string | null;
  stateId?: string | null;
  state?: string | null;
  countryId?: string | null;
  email?: string;
  phone1?: string;
  phone2?: string;
  note?: string;
  isActive?: boolean;
  integrationCode?: string;
  integrationCodeGPS?: string;
  urlPhoto?: string | null;
  driverAttributions?: DriverAttribution[];
  driverBases?: DriverBase[];
  driverFleets?: DriverFleet[];
  driverPositions?: DriverPosition[];
  [k: string]: unknown;
}

interface DriverAttribution {
  id?: string;
  driverId?: string;
  attributionId?: string;
  startDate?: string | null;
  endDate?: string | null;
  attribution?: { id?: string; code?: string; description?: string } | null;
}

interface DriverBase {
  id?: string;
  driverId?: string;
  locationGroupId?: string;
  startDate?: string | null;
  endDate?: string | null;
  locationGroup?: { id?: string; code?: string; description?: string } | null;
}

interface DriverFleet {
  id?: string;
  driverId?: string;
  fleetGroupId?: string;
  startDate?: string | null;
  endDate?: string | null;
  fleetGroup?: { id?: string; code?: string; description?: string } | null;
}

interface DriverPosition {
  id?: string;
  driverId?: string;
  positionId?: string;
  startDate?: string | null;
  endDate?: string | null;
  position?: { id?: string; code?: string; description?: string } | null;
}

interface DriverLicenseItem {
  id?: string;
  driverId?: string;
  licenseId?: string;
  startDate?: string | null;
  endDate?: string | null;
  license?: { id?: string; code?: string; description?: string } | null;
}

interface LookupItem {
  id: string;
  description?: string;
  code?: string;
  name?: string;
  [k: string]: unknown;
}

// --- Mock flag ---
const USE_MOCK = false;

const MOCK_DRIVERS: DriverItem[] = [
  {
    id: "00f2145f-2227-494e-835a-7070a342f1e9",
    name: "ABEL", lastName: "JUSTINO DA SILVA", nickName: "ABEL",
    registration: "14992534864", seniority: 0, identification: "02.642.100-1",
    genre: "M", birthdate: "1972-06-02T00:00:00", admission: "1997-04-22T00:00:00",
    resign: null, address: "RUA LUIZ VIALTA, 311 - RESIDENCIAL MONTE VERDE - INDAIATUBA/SP",
    zipCode: "13330-000", district: "RESIDENCIAL MONTE VERDE",
    cityId: "city1", stateId: "state1", countryId: "country1",
    email: "abelao615@gmail.com",
    phone1: "(11) 99274-1994", phone2: "(19) 98272-1168",
    note: "CNH 2737089403", isActive: true, integrationCode: "20200842",
    integrationCodeGPS: "b9E",
    driverAttributions: [{ id: "b2a284b2-c73c-4198-afe7-fda2b5568115", attributionId: "789d0279-1f1d-480d-892d-721cf7fc02ca", startDate: "2023-01-01T00:00:00", endDate: null }],
    driverBases: [{ id: "209358ae-d71e-4bf2-8899-60e51ca3bdab", locationGroupId: "30d2c031-9367-4b43-bc09-3aa2bba721c0", startDate: "2000-01-01T00:00:00", endDate: null }],
    driverFleets: [{ id: "fe5a5217-2645-4c90-91ca-a53df725affe", fleetGroupId: "7bd5b3e8-1660-493b-9370-522c8b0f1afa", startDate: "2023-01-01T00:00:00", endDate: null }],
    driverPositions: [{ id: "711ecc67-fa65-4a1e-b31d-4376c7a8ecb8", positionId: "5b9ccbfb-a60f-420a-aa18-1cf702b7d595", startDate: "2000-01-01T00:00:00", endDate: null }],
  },
  {
    id: "11a3256g-3338-5a5f-946b-8181b453g2f0",
    name: "CARLOS", lastName: "EDUARDO SANTOS", nickName: "CARLÃO",
    registration: "28873645912", seniority: 5, identification: "04.321.200-3",
    genre: "M", birthdate: "1985-03-15T00:00:00", admission: "2010-08-01T00:00:00",
    resign: null, address: "AV BRASIL, 500 - CENTRO - CAMPINAS/SP",
    zipCode: "13010-100", district: "CENTRO", email: "carlos.santos@email.com",
    phone1: "(19) 99881-2233", phone2: "", note: "",
    isActive: true, integrationCode: "20200900", integrationCodeGPS: "c4F",
    driverAttributions: [], driverBases: [], driverFleets: [], driverPositions: [],
  },
  {
    id: "22b4367h-4449-6b6g-a57c-9292c564h3g1",
    name: "MARIA", lastName: "APARECIDA LIMA", nickName: "CIDA",
    registration: "33764756023", seniority: 3, identification: "06.543.300-5",
    genre: "F", birthdate: "1990-11-20T00:00:00", admission: "2018-02-15T00:00:00",
    resign: null, address: "RUA DAS FLORES, 123 - JD PRIMAVERA - SOROCABA/SP",
    zipCode: "18040-200", district: "JD PRIMAVERA", email: "maria.lima@email.com",
    phone1: "(15) 99772-3344", phone2: "", note: "Motorista categoria D",
    isActive: true, integrationCode: "20201050", integrationCodeGPS: "d7G",
    driverAttributions: [], driverBases: [], driverFleets: [], driverPositions: [],
  },
  {
    id: "33c5478i-5550-7c7h-b68d-0303d675i4h2",
    name: "JOSÉ", lastName: "ROBERTO FERREIRA", nickName: "BETÃO",
    registration: "44655867134", seniority: 8, identification: "08.765.400-7",
    genre: "M", birthdate: "1978-07-10T00:00:00", admission: "2005-06-01T00:00:00",
    resign: "2023-12-31T00:00:00", address: "RUA SAO PAULO, 800 - VILA NOVA - JUNDIAÍ/SP",
    zipCode: "13201-300", district: "VILA NOVA", email: "jose.ferreira@email.com",
    phone1: "(11) 98665-4455", phone2: "(11) 97754-3322", note: "",
    isActive: false, integrationCode: "20200500", integrationCodeGPS: "e2H",
    driverAttributions: [], driverBases: [], driverFleets: [], driverPositions: [],
  },
];

const MOCK_LOCATION_GROUPS: LookupItem[] = [
  { id: "30d2c031-9367-4b43-bc09-3aa2bba721c0", code: "IND", description: "BASE INDAIATUBA" },
  { id: "40e3d142-a478-5b54-cd1a-4bb3ccb832d1", code: "CPS", description: "BASE CAMPINAS" },
  { id: "50f4e253-b589-6c65-de2b-5cc4ddc943e2", code: "SPO", description: "BASE SÃO PAULO" },
];

const MOCK_POSITIONS: LookupItem[] = [
  { id: "5b9ccbfb-a60f-420a-aa18-1cf702b7d595", code: "MOT", description: "MOTORISTA" },
  { id: "6ca0dc0c-b71g-531b-bb29-2dg813c8e6a6", code: "MSR", description: "MOTORISTA SÊNIOR" },
  { id: "7db1ed1d-c82h-642c-cc3a-3eh924d9f7b7", code: "AJD", description: "AJUDANTE" },
];

const MOCK_FLEET_GROUPS: LookupItem[] = [
  { id: "7bd5b3e8-1660-493b-9370-522c8b0f1afa", code: "LEV", description: "FROTA LEVE" },
  { id: "8ce6c4f9-2771-5a4c-a481-633d9c1g2bfb", code: "PES", description: "FROTA PESADA" },
  { id: "9df7d500-3882-6b5d-b592-744ea2dh3cgc", code: "ESP", description: "FROTA ESPECIAL" },
];

const MOCK_ATTRIBUTIONS: LookupItem[] = [
  { id: "789d0279-1f1d-480d-892d-721cf7fc02ca", code: "ATR1", description: "MOTORISTA CARRETEIRO" },
  { id: "890e1380-2g2e-591e-9a3e-832dg8gd13db", code: "ATR2", description: "MOTORISTA TRUCK" },
];

const MOCK_CITIES: LookupItem[] = [
  { id: "city1", code: "IND", description: "INDAIATUBA" },
  { id: "city2", code: "CPS", description: "CAMPINAS" },
  { id: "city3", code: "SPO", description: "SÃO PAULO" },
  { id: "city4", code: "SOR", description: "SOROCABA" },
];

const MOCK_STATES: LookupItem[] = [
  { id: "state1", code: "SP", description: "SÃO PAULO" },
  { id: "state2", code: "RJ", description: "RIO DE JANEIRO" },
  { id: "state3", code: "MG", description: "MINAS GERAIS" },
];

const MOCK_COUNTRIES: LookupItem[] = [
  { id: "country1", code: "BR", description: "BRASIL" },
  { id: "country2", code: "AR", description: "ARGENTINA" },
];

// --- API ---
const fetchLookup = async (endpoint: string, mockData: LookupItem[]): Promise<LookupItem[]> => {
  if (USE_MOCK) return mockData;
  const res = await fetch(`${API_BASE}/${endpoint}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

interface DriverFilters {
  nickName: string;
  integrationCode: string;
  registration: string;
  admission: string;
  locationGroupId: string;
  positionId: string;
  fleetGroupId: string;
}

interface PaginationMeta {
  TotalCount: number;
  PageSize: number;
  CurrentPage: number;
  TotalPages: number;
  HasNext: boolean;
  HasPrevious: boolean;
}

interface PaginatedDriverResult {
  items: DriverItem[];
  pagination: PaginationMeta;
}

const fetchDrivers = async (filters: DriverFilters, pageNumber: number, pageSize: number): Promise<PaginatedDriverResult> => {
  if (USE_MOCK) {
    let items = [...MOCK_DRIVERS];
    if (filters.nickName) items = items.filter((d) => d.nickName?.toLowerCase().includes(filters.nickName.toLowerCase()) || d.name?.toLowerCase().includes(filters.nickName.toLowerCase()) || d.lastName?.toLowerCase().includes(filters.nickName.toLowerCase()));
    if (filters.integrationCode) items = items.filter((d) => d.integrationCode?.includes(filters.integrationCode));
    if (filters.registration) items = items.filter((d) => d.registration?.includes(filters.registration));
    if (filters.admission) {
      const refDate = new Date(filters.admission);
      items = items.filter((d) => {
        if (!d.admission) return false;
        const admDate = new Date(d.admission);
        if (admDate > refDate) return false;
        if (d.resign) {
          const resDate = new Date(d.resign);
          if (resDate <= refDate) return false;
        }
        return true;
      });
    }
    return { items, pagination: { TotalCount: items.length, PageSize: pageSize, CurrentPage: 1, TotalPages: 1, HasNext: false, HasPrevious: false } };
  }
  const params = new URLSearchParams();
  if (filters.nickName) params.append("Filter1String", filters.nickName);
  if (filters.integrationCode) params.append("Filter2String", filters.integrationCode);
  if (filters.registration) params.append("Filter3String", filters.registration);
  if (filters.admission) params.append("Filter4String", filters.admission);
  if (filters.locationGroupId && filters.locationGroupId !== "all") params.append("Filter1Id", filters.locationGroupId);
  if (filters.positionId && filters.positionId !== "all") params.append("Filter2Id", filters.positionId);
  if (filters.fleetGroupId && filters.fleetGroupId !== "all") params.append("Filter3Id", filters.fleetGroupId);
  params.set("PageNumber", String(pageNumber));
  params.set("PageSize", String(pageSize));
  const url = `${API_BASE}/Drivers?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const items: DriverItem[] = await res.json();
  const ph = res.headers.get("x-pagination");
  const pagination: PaginationMeta = ph
    ? JSON.parse(ph)
    : { TotalCount: items.length, PageSize: pageSize, CurrentPage: pageNumber, TotalPages: 1, HasNext: false, HasPrevious: false };
  return { items, pagination };
};

const createDriver = async (data: Partial<DriverItem>): Promise<DriverItem> => {
  if (USE_MOCK) return { ...data, id: crypto.randomUUID() } as DriverItem;
  const res = await fetch(`${API_BASE}/Drivers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const updateDriver = async (data: Partial<DriverItem>): Promise<DriverItem> => {
  if (USE_MOCK) return data as DriverItem;
  const res = await fetch(`${API_BASE}/Drivers/UpdateDriver`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const deleteDriver = async (id: string): Promise<void> => {
  if (USE_MOCK) return;
  const res = await fetch(`${API_BASE}/Drivers/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
};

// --- Helpers ---
const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return "--";
  try { return new Date(dateStr).toLocaleDateString("pt-BR"); } catch { return "--"; }
};

const toDateInput = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  try { return dateStr.substring(0, 10); } catch { return ""; }
};

const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const lookupLabel = (item: LookupItem) => {
  const parts: string[] = [];
  if (item.code) parts.push(item.code);
  if (item.description) parts.push(item.description);
  if (parts.length === 0 && item.name) parts.push(item.name);
  return parts.join(" - ") || item.id;
};

// --- Vacation table (no lookup, just dates) ---
interface VacationTableProps {
  items: { id?: string; startDate?: string | null; endDate?: string | null; [k: string]: unknown }[];
  t: (k: string) => string;
  driverId?: string;
  onAdd: (startDate: string, endDate: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

const VacationTable = ({ items, t, driverId, onAdd, onRemove }: VacationTableProps) => {
  const [newStartDate, setNewStartDate] = useState(todayISO());
  const [newEndDate, setNewEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newStartDate || !newEndDate) return;
    setSaving(true);
    try {
      await onAdd(`${newStartDate}T00:00:00`, `${newEndDate}T00:00:00`);
      setNewStartDate(todayISO());
      setNewEndDate("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {driverId && (
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("driver.startDate")}</Label>
            <DatePickerField value={newStartDate ? `${newStartDate}T00:00:00` : null} onChange={(v) => setNewStartDate(v ? v.substring(0, 10) : todayISO())} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("driver.endDate")}</Label>
            <DatePickerField value={newEndDate ? `${newEndDate}T00:00:00` : null} onChange={(v) => setNewEndDate(v ? v.substring(0, 10) : "")} className="h-9" />
          </div>
          <Button size="sm" variant="outline" className="h-9" onClick={handleAdd} disabled={!newStartDate || !newEndDate || saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}{t("common.new")}
          </Button>
        </div>
      )}
      {!driverId && (
        <p className="text-xs text-muted-foreground py-2 italic">{t("driver.fillRequiredFirst")}</p>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">{t("common.noResults")}</p>
      ) : (
        <div className="overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs w-[180px]">{t("driver.startDate")}</TableHead>
                <TableHead className="text-xs w-[180px]">{t("driver.endDate")}</TableHead>
                <TableHead className="text-xs w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row, i) => (
                <TableRow key={row.id || i}>
                  <TableCell className="text-xs">{formatDate(row.startDate)}</TableCell>
                  <TableCell className="text-xs">{formatDate(row.endDate)}</TableCell>
                  <TableCell className="text-xs text-center">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => row.id && onRemove(row.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

// --- Sub-entity CRUD table (API-backed) ---
interface ExtraColumn {
  header: string;
  render: (row: { [k: string]: unknown }) => React.ReactNode;
  width?: string;
}

interface SubEntityTableProps {
  items: { id?: string; startDate?: string | null; endDate?: string | null; [k: string]: unknown }[];
  lookupItems: LookupItem[];
  lookupKey: string;
  lookupLabel: string;
  t: (k: string) => string;
  onAdd: (lookupId: string, startDate: string, endDate: string | null) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  getLookupDisplay: (item: { [k: string]: unknown }) => string;
  driverId?: string;
  extraColumns?: ExtraColumn[];
}

const SubEntityTable = ({ items, lookupItems, lookupKey, lookupLabel: colLabel, t, onAdd, onRemove, getLookupDisplay, driverId, extraColumns }: SubEntityTableProps) => {
  const [newLookupId, setNewLookupId] = useState("");
  const [newStartDate, setNewStartDate] = useState(todayISO());
  const [newEndDate, setNewEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newLookupId) return;
    setSaving(true);
    try {
      await onAdd(newLookupId, `${newStartDate}T00:00:00`, newEndDate ? `${newEndDate}T00:00:00` : null);
      setNewLookupId("");
      setNewStartDate(todayISO());
      setNewEndDate("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Add row */}
      {driverId && (
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">{colLabel}</Label>
            <Select value={newLookupId} onValueChange={setNewLookupId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder={t("common.search") + "..."} />
              </SelectTrigger>
              <SelectContent>
                {lookupItems.map((li) => (
                  <SelectItem key={li.id} value={li.id} className="text-xs">
                    {lookupLabel(li)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("driver.startDate")}</Label>
            <DatePickerField value={newStartDate ? `${newStartDate}T00:00:00` : null} onChange={(v) => setNewStartDate(v ? v.substring(0, 10) : todayISO())} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("driver.endDate")}</Label>
            <DatePickerField value={newEndDate ? `${newEndDate}T00:00:00` : null} onChange={(v) => setNewEndDate(v ? v.substring(0, 10) : "")} className="h-9" />
          </div>
          <Button size="sm" variant="outline" className="h-9" onClick={handleAdd} disabled={!newLookupId || saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}{t("common.new")}
          </Button>
        </div>
      )}
      {!driverId && (
        <p className="text-xs text-muted-foreground py-2 italic">{t("driver.fillRequiredFirst")}</p>
      )}

      {/* Table */}
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">{t("common.noResults")}</p>
      ) : (
        <div className="overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs">{colLabel}</TableHead>
                {extraColumns?.map((ec, idx) => (
                  <TableHead key={idx} className="text-xs" style={ec.width ? { width: ec.width } : undefined}>{ec.header}</TableHead>
                ))}
                <TableHead className="text-xs w-[180px]">{t("driver.startDate")}</TableHead>
                <TableHead className="text-xs w-[180px]">{t("driver.endDate")}</TableHead>
                <TableHead className="text-xs w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row, i) => (
                <TableRow key={row.id || i}>
                  <TableCell className="text-xs">{getLookupDisplay(row)}</TableCell>
                  {extraColumns?.map((ec, idx) => (
                    <TableCell key={idx} className="text-xs">{ec.render(row)}</TableCell>
                  ))}
                  <TableCell className="text-xs">{formatDate(row.startDate)}</TableCell>
                  <TableCell className="text-xs">{formatDate(row.endDate)}</TableCell>
                  <TableCell className="text-xs text-center">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => row.id && onRemove(row.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

// --- Read-only sub-entity table (for tabs that only display API data) ---
interface ReadOnlySubEntityTableProps {
  items: { id?: string; startDate?: string | null; endDate?: string | null; description?: string; code?: string; name?: string; [k: string]: unknown }[];
  t: (k: string) => string;
  driverId?: string;
}

const ReadOnlySubEntityTable = ({ items, t, driverId }: ReadOnlySubEntityTableProps) => {
  if (!driverId) {
    return <p className="text-xs text-muted-foreground py-2 italic">{t("driver.fillRequiredFirst")}</p>;
  }
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">{t("common.noResults")}</p>;
  }

  // Auto-detect columns from first item (exclude internal keys)
  const excludeKeys = new Set(["id", "driverId", "createdAt", "updatedAt", "isDeleted"]);
  const columns = Object.keys(items[0]).filter(k => !excludeKeys.has(k) && items[0][k] !== undefined && items[0][k] !== null && typeof items[0][k] !== "object");

  return (
    <div className="overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {columns.map((col) => (
              <TableHead key={col} className="text-xs capitalize">{col}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row, i) => (
            <TableRow key={row.id || i}>
              {columns.map((col) => (
                <TableCell key={col} className="text-xs">
                  {col.toLowerCase().includes("date") ? formatDate(row[col] as string) : String(row[col] ?? "--")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

// --- Component ---
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const DriverPage = () => {
  const { t } = useTranslation();
  usePageTitle(t("menu.driver"), User);
  const { toast } = useToast();

  // Filter state
  const [filters, setFilters] = useState<DriverFilters>({
    nickName: "", integrationCode: "", registration: "", admission: todayISO(),
    locationGroupId: "", positionId: "", fleetGroupId: "",
  });
  const [searched, setSearched] = useState(false);
  const [searchParams, setSearchParams] = useState<DriverFilters>({ ...filters });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // CRUD state
  const [editingItem, setEditingItem] = useState<DriverItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<DriverItem>>({});
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  // Resign confirmation dialog
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [pendingResignDate, setPendingResignDate] = useState<string | null>(null);

  // Lookup queries
  const { data: locationGroups, isLoading: loadingLG } = useQuery<LookupItem[]>({
    queryKey: ["location-groups"],
    queryFn: () => fetchLookup("LocationGroup", MOCK_LOCATION_GROUPS),
  });
  const { data: positions, isLoading: loadingPos } = useQuery<LookupItem[]>({
    queryKey: ["positions"],
    queryFn: () => fetchLookup("Position", MOCK_POSITIONS),
  });
  const { data: fleetGroups, isLoading: loadingFG } = useQuery<LookupItem[]>({
    queryKey: ["fleet-groups"],
    queryFn: () => fetchLookup("FleetGroup", MOCK_FLEET_GROUPS),
  });
  const { data: attributions } = useQuery<LookupItem[]>({
    queryKey: ["attributions"],
    queryFn: () => fetchLookup("Attribution", MOCK_ATTRIBUTIONS),
  });
  const { data: licenses } = useQuery<LookupItem[]>({
    queryKey: ["licenses-lookup"],
    queryFn: () => fetchLookup("License", []),
  });
  const { data: courses } = useQuery<LookupItem[]>({
    queryKey: ["courses-lookup"],
    queryFn: () => fetchLookup("Course", []),
  });
  const { data: cities } = useQuery<LookupItem[]>({
    queryKey: ["cities"],
    queryFn: () => fetchLookup("Cities", MOCK_CITIES),
  });
  const { data: states } = useQuery<LookupItem[]>({
    queryKey: ["states"],
    queryFn: () => fetchLookup("States", MOCK_STATES),
  });
  const { data: countries } = useQuery<LookupItem[]>({
    queryKey: ["countries"],
    queryFn: () => fetchLookup("Countries", MOCK_COUNTRIES),
  });

  // Driver query
  const { data: driverResult, isLoading, isError, error, refetch } = useQuery<PaginatedDriverResult>({
    queryKey: ["drivers", searchParams, currentPage, pageSize],
    queryFn: () => fetchDrivers(searchParams, currentPage, pageSize),
    enabled: searched,
  });
  const drivers = driverResult?.items;
  const pagination = driverResult?.pagination;
  const totalPages = pagination?.TotalPages || 1;
  const totalCount = pagination?.TotalCount || 0;

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data: Partial<DriverItem>) => data.id ? updateDriver(data) : createDriver(data),
    onSuccess: () => {
      toast({ title: t("common.saveSuccess"), variant: "success" });
      closeForm();
      refetch();
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDriver,
    onSuccess: () => {
      toast({ title: t("common.deleteSuccess"), variant: "success" });
      setDeleteId(null);
      refetch();
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "error" });
    },
  });

  // === Generic sub-entity API helpers ===
  interface SubEntityItem { id?: string; driverId?: string; startDate?: string | null; endDate?: string | null; [k: string]: unknown }

  const [driverAttributionsList, setDriverAttributionsList] = useState<SubEntityItem[]>([]);
  const [driverBasesList, setDriverBasesList] = useState<SubEntityItem[]>([]);
  const [driverFleetsList, setDriverFleetsList] = useState<SubEntityItem[]>([]);
  const [driverPositionsList, setDriverPositionsList] = useState<SubEntityItem[]>([]);
  const [driverVacationsList, setDriverVacationsList] = useState<SubEntityItem[]>([]);
  const [driverLicenses, setDriverLicenses] = useState<DriverLicenseItem[]>([]);
  const [driverCoursesList, setDriverCoursesList] = useState<SubEntityItem[]>([]);
  const [driverDedicatedRoutesList, setDriverDedicatedRoutesList] = useState<SubEntityItem[]>([]);
  const [driverOccurrencesList, setDriverOccurrencesList] = useState<SubEntityItem[]>([]);
  const [driverMessagesList, setDriverMessagesList] = useState<SubEntityItem[]>([]);

  // Occurrence form state (top-level to avoid hooks-in-IIFE)
  const [occDtOccurrence, setOccDtOccurrence] = useState<string | null>(`${todayISO()}T00:00:00`);
  const [occDescription, setOccDescription] = useState("");
  const [occResponsible, setOccResponsible] = useState("");
  const [occWarningFlag, setOccWarningFlag] = useState(true);
  const [occSaving, setOccSaving] = useState(false);
  const [occDescDialogOpen, setOccDescDialogOpen] = useState(false);
  const [occDescDialogContent, setOccDescDialogContent] = useState("");

  const [newLicenseId, setNewLicenseId] = useState("");
  const [newLicenseStart, setNewLicenseStart] = useState(todayISO());
  const [newLicenseEnd, setNewLicenseEnd] = useState("");

  // Dedicated routes (lines)
  const [dedicatedLineModalOpen, setDedicatedLineModalOpen] = useState(false);
  const [newDedicatedLineId, setNewDedicatedLineId] = useState("");
  const [newDedicatedLineLabel, setNewDedicatedLineLabel] = useState("");
  const [newDedicatedLineStart, setNewDedicatedLineStart] = useState(todayISO());
  const [newDedicatedLineEnd, setNewDedicatedLineEnd] = useState("");

  const fetchSubEntities = async (endpoint: string, driverId: string, setter: (items: SubEntityItem[]) => void) => {
    try {
      const res = await fetch(`${API_BASE}/${endpoint}?Filter1Id=${driverId}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data: SubEntityItem[] = await res.json();
      // Filter client-side to ensure only records for this specific driver are shown
      const filtered = data.filter((item) => item.driverId === driverId);
      setter(filtered);
    } catch {
      setter([]);
    }
  };

  const saveSubEntity = async (endpoint: string, idKey: string, lookupId: string, startDate: string, endDate: string | null, driverId: string, setter: (items: SubEntityItem[]) => void) => {
    if (endDate && endDate < startDate) {
      toast({ title: t("driverVacation.startAfterEnd"), variant: "destructive" });
      return;
    }
    const payload = { driverId, [idKey]: lookupId, startDate, endDate };
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    toast({ title: t("common.saveSuccess"), variant: "success" });
    await fetchSubEntities(endpoint, driverId, setter);
  };

  const deleteSubEntityById = async (endpoint: string, id: string, driverId: string, setter: (items: SubEntityItem[]) => void) => {
    const res = await fetch(`${API_BASE}/${endpoint}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    toast({ title: t("common.deleteSuccess"), variant: "success" });
    await fetchSubEntities(endpoint, driverId, setter);
  };

  const fetchDriverLicenses = async (driverId: string) => {
    fetchSubEntities("DriversLicense", driverId, setDriverLicenses as unknown as (items: SubEntityItem[]) => void);
  };

  const saveDriverLicense = async () => {
    if (!newLicenseId || !newLicenseStart || !formData.id) {
      toast({ title: t("driver.licenseRequired"), variant: "destructive" });
      return;
    }
    try {
      await saveSubEntity("DriversLicense", "licenseId", newLicenseId, `${newLicenseStart}T00:00:00`, newLicenseEnd ? `${newLicenseEnd}T00:00:00` : null, formData.id, setDriverLicenses as unknown as (items: SubEntityItem[]) => void);
      setNewLicenseId("");
      setNewLicenseStart(todayISO());
      setNewLicenseEnd("");
    } catch (err: unknown) {
      toast({ title: "Erro", description: (err as Error).message, variant: "error" });
    }
  };

  const deleteDriverLicense = async (id: string) => {
    try {
      await deleteSubEntityById("DriversLicense", id, formData.id!, setDriverLicenses as unknown as (items: SubEntityItem[]) => void);
    } catch (err: unknown) {
      toast({ title: "Erro", description: (err as Error).message, variant: "error" });
    }
  };

  const fetchAllSubEntities = (driverId: string) => {
    fetchSubEntities("DriversAttribution", driverId, setDriverAttributionsList);
    fetchSubEntities("DriversBase", driverId, setDriverBasesList);
    fetchSubEntities("DriversFleet", driverId, setDriverFleetsList);
    fetchSubEntities("DriversPosition", driverId, setDriverPositionsList);
    fetchSubEntities("DriversVacation", driverId, setDriverVacationsList);
    fetchDriverLicenses(driverId);
    fetchSubEntities("DriverCourse", driverId, setDriverCoursesList);
    fetchSubEntities("DriverDedicatedRoute", driverId, setDriverDedicatedRoutesList);
    fetchSubEntities("DriversOccurrence", driverId, setDriverOccurrencesList);
    fetchSubEntities("DriverMessage", driverId, setDriverMessagesList);
  };

  // Handlers
  const handleSearch = () => {
    setSearchParams({ ...filters });
    setSearched(true);
    setCurrentPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const emptyForm = (): Partial<DriverItem> => ({
    name: "", lastName: "", nickName: "", registration: "", seniority: 0,
    identification: "", genre: "M", birthdate: null,
    admission: `${todayISO()}T00:00:00`,
    resign: null,
    address: "", zipCode: "", district: "", cityId: null, stateId: null, countryId: null,
    email: "", phone1: "", phone2: "", note: "", isActive: true,
    integrationCode: "", integrationCodeGPS: "",
    driverAttributions: [], driverBases: [], driverFleets: [], driverPositions: [],
  });

  const openCreate = () => {
    setFormData(emptyForm());
    setFormErrors({});
    setEditingItem(null);
    setIsCreating(true);
    setDriverLicenses([]);
    setDriverAttributionsList([]);
    setDriverBasesList([]);
    setDriverFleetsList([]);
    setDriverPositionsList([]);
    setDriverVacationsList([]);
    setDriverCoursesList([]);
    setDriverDedicatedRoutesList([]);
    setDriverOccurrencesList([]);
    setDriverMessagesList([]);
  };

  const openEdit = (item: DriverItem) => {
    setFormData({ ...item });
    setEditingItem(item);
    setIsCreating(true);
    // Use embedded sub-entity data from the Driver response (already filtered by this driver's ID)
    if (item.id) {
      setDriverAttributionsList((item as any).driverAttributions || []);
      setDriverBasesList((item as any).driverBases || []);
      setDriverFleetsList((item as any).driverFleets || []);
      setDriverPositionsList((item as any).driverPositions || []);
      setDriverVacationsList((item as any).driverVacations || []);
      setDriverLicenses((item as any).driverLicenses || []);
      setDriverCoursesList((item as any).driverCourses || []);
      setDriverDedicatedRoutesList((item as any).driverDedicatedRoutes || []);
      // These may not be in the Driver response yet — fetch separately
      fetchSubEntities("DriversOccurrence", item.id, setDriverOccurrencesList);
      fetchSubEntities("DriverMessage", item.id, setDriverMessagesList);
    }
  };

  const closeForm = () => {
    setIsCreating(false);
    setEditingItem(null);
  };

  const handleSave = () => {
    // Validate required fields
    const errors: Record<string, boolean> = {};
    if (!formData.name?.trim()) errors.name = true;
    if (!formData.lastName?.trim()) errors.lastName = true;
    if (!formData.nickName?.trim()) errors.nickName = true;
    if (!formData.registration?.trim()) errors.registration = true;
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({ title: t("common.requiredFields"), variant: "destructive" });
      return;
    }
    setFormErrors({});

    // If resign date is filled, ask about isActive + endDates
    if (formData.resign && formData.isActive) {
      setPendingResignDate(formData.resign);
      setShowResignConfirm(true);
      return;
    }
    const { driverAttributions, driverBases, driverFleets, driverPositions, ...driverData } = formData;
    saveMutation.mutate(driverData);
  };

  const confirmResignAndSave = (autoFill: boolean) => {
    let data = { ...formData };
    if (autoFill && pendingResignDate) {
      data.isActive = false;
    }
    setShowResignConfirm(false);
    setPendingResignDate(null);
    const { driverAttributions, driverBases, driverFleets, driverPositions, ...driverData } = data;
    saveMutation.mutate(driverData);
  };

  const updateForm = (field: string, value: unknown) => {
    setFormData((p) => ({ ...p, [field]: value }));
  };

  const getLookupDisplay = (items: LookupItem[] | undefined, idKey: string, row: Record<string, unknown>) => {
    const id = row[idKey] as string;
    const found = items?.find((i) => i.id === id);
    if (found) return lookupLabel(found);
    return id || "--";
  };

  const panelTitle = editingItem
    ? `${t("common.edit")} ${t("menu.driver")}`
    : `${t("common.new")} ${t("menu.driver")}`;

  const requiredFilled = !!(formData.name?.trim() && formData.lastName?.trim() && formData.nickName?.trim() && formData.registration?.trim());

  return (
    <div className="space-y-4">

      {/* Floating CRUD Panel */}
      {isCreating && (
        <FloatingPanel title={panelTitle} onClose={closeForm} width={900}>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-2">
              <TabsTrigger value="general" className="text-xs">{t("driver.general")}</TabsTrigger>
              <TabsTrigger value="contact" className="text-xs">{t("driver.contact")}</TabsTrigger>
            </TabsList>

            {/* === GENERAL TAB === */}
            <TabsContent value="general" className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.name")} <span className="text-destructive">*</span></Label>
                  <Input className={`h-8 text-xs ${formErrors.name ? "border-destructive" : ""}`} value={formData.name || ""} onChange={(e) => updateForm("name", e.target.value.toUpperCase())} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs text-muted-foreground">{t("driver.lastName")} <span className="text-destructive">*</span></Label>
                  <Input className={`h-8 text-xs ${formErrors.lastName ? "border-destructive" : ""}`} value={formData.lastName || ""} onChange={(e) => updateForm("lastName", e.target.value.toUpperCase())} />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.nickName")} <span className="text-destructive">*</span></Label>
                  <Input className={`h-8 text-xs ${formErrors.nickName ? "border-destructive" : ""}`} value={formData.nickName || ""} onChange={(e) => updateForm("nickName", e.target.value.toUpperCase())} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.registration")} <span className="text-destructive">*</span></Label>
                  <Input className={`h-8 text-xs ${formErrors.registration ? "border-destructive" : ""}`} value={formData.registration || ""} onChange={(e) => updateForm("registration", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.identification")}</Label>
                  <Input className="h-8 text-xs" value={formData.identification || ""} onChange={(e) => updateForm("identification", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.genre")}</Label>
                  <Select value={formData.genre || "M"} onValueChange={(v) => updateForm("genre", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">{t("driver.male")}</SelectItem>
                      <SelectItem value="F">{t("driver.female")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.birthdate")}</Label>
                  <DatePickerField value={formData.birthdate} onChange={(v) => updateForm("birthdate", v)} className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.admission")}</Label>
                  <DatePickerField value={formData.admission} onChange={(v) => updateForm("admission", v)} className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.resign")}</Label>
                  <DatePickerField value={formData.resign} onChange={(v) => updateForm("resign", v)} className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.seniority")}</Label>
                  <Input type="number" className="h-8 text-xs" value={formData.seniority ?? 0} onChange={(e) => updateForm("seniority", Number(e.target.value))} />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.integrationCode")}</Label>
                  <Input className="h-8 text-xs" value={formData.integrationCode || ""} onChange={(e) => updateForm("integrationCode", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.integrationCodeGPS")}</Label>
                  <Input className="h-8 text-xs" value={formData.integrationCodeGPS || ""} onChange={(e) => updateForm("integrationCodeGPS", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.cnh")}</Label>
                  <Input className="h-8 text-xs" value={formData.note || ""} onChange={(e) => updateForm("note", e.target.value.toUpperCase())} />
                </div>
                <div className="flex items-end">
                  <div className="flex items-center justify-between rounded-lg border p-2 w-full h-8">
                    <Label className="text-xs">{t("common.active")}</Label>
                    <Switch checked={formData.isActive ?? true} onCheckedChange={(v) => updateForm("isActive", v)} className="scale-90" />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* === CONTACT TAB === */}
            <TabsContent value="contact" className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.email")}</Label>
                  <Input type="email" className="h-8 text-xs" value={formData.email || ""} onChange={(e) => updateForm("email", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.phone1")}</Label>
                  <Input className="h-8 text-xs" value={formData.phone1 || ""} onChange={(e) => updateForm("phone1", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.phone2")}</Label>
                  <Input className="h-8 text-xs" value={formData.phone2 || ""} onChange={(e) => updateForm("phone2", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.zipCode")}</Label>
                  <Input className="h-8 text-xs" value={formData.zipCode || ""} onChange={(e) => updateForm("zipCode", e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("driver.address")}</Label>
                <Input className="h-8 text-xs" value={formData.address || ""} onChange={(e) => updateForm("address", e.target.value.toUpperCase())} />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.district")}</Label>
                  <Input className="h-8 text-xs" value={formData.district || ""} onChange={(e) => updateForm("district", e.target.value.toUpperCase())} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.city")}</Label>
                  <LookupSearchField
                    endpoint="Cities"
                    labelFn="codeName"
                    searchFilterParam="Filter1String"
                    value={formData.cityId ? String(formData.cityId) : ""}
                    onChange={(id, item) => {
                      updateForm("cityId", id || null);
                      if (item) {
                        if (item.stateId) updateForm("stateId", item.stateId);
                        if (item.countryId) updateForm("countryId", item.countryId);
                      }
                    }}
                    placeholder={t("driver.city")}
                    nullable
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.state")}</Label>
                  <LookupSearchField
                    endpoint="States"
                    labelFn="codeName"
                    searchFilterParam="Filter1String"
                    value={formData.stateId ? String(formData.stateId) : ""}
                    onChange={(id) => updateForm("stateId", id || null)}
                    placeholder={t("driver.state")}
                    nullable
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("driver.country")}</Label>
                  <LookupSearchField
                    endpoint="Countries"
                    labelFn="codeName"
                    searchFilterParam="Filter1String"
                    value={formData.countryId ? String(formData.countryId) : ""}
                    onChange={(id) => updateForm("countryId", id || null)}
                    placeholder={t("driver.country")}
                    nullable
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Separator className="my-4" />

          {/* ===== SUB-ENTITY TABS ===== */}
          {(() => {
            return (
              <div className={`${!requiredFilled ? "opacity-50 pointer-events-none" : ""}`}>
                {!requiredFilled && (
                  <p className="text-xs text-muted-foreground mb-2 italic">
                    {t("driver.fillRequiredFirst")}
                  </p>
                )}
                <Tabs defaultValue="attributions" className="w-full">
                  <div className="overflow-x-auto">
                    <TabsList className="inline-flex w-auto min-w-full h-auto flex-wrap">
                      <TabsTrigger value="attributions" className="text-[10px] px-2 py-1" disabled={!requiredFilled}>{t("driver.attributions")}</TabsTrigger>
                      <TabsTrigger value="bases" className="text-[10px] px-2 py-1" disabled={!requiredFilled}>{t("driver.bases")}</TabsTrigger>
                      <TabsTrigger value="positions" className="text-[10px] px-2 py-1" disabled={!requiredFilled}>{t("driver.positions")}</TabsTrigger>
                      <TabsTrigger value="licenses" className="text-[10px] px-2 py-1" disabled={!requiredFilled}>{t("driver.licenses")}</TabsTrigger>
                      <TabsTrigger value="courses" className="text-[10px] px-2 py-1" disabled={!requiredFilled}>{t("driver.courses")}</TabsTrigger>
                      <TabsTrigger value="vacations" className="text-[10px] px-2 py-1" disabled={!requiredFilled}>{t("driver.plannedVacations")}</TabsTrigger>
                      <TabsTrigger value="fleets" className="text-[10px] px-2 py-1" disabled={!requiredFilled}>{t("driver.fleets")}</TabsTrigger>
                      <TabsTrigger value="dedicatedLines" className="text-[10px] px-2 py-1" disabled={!requiredFilled}>{t("driver.dedicatedLines")}</TabsTrigger>
                      <TabsTrigger value="messages" className="text-[10px] px-2 py-1" disabled={!requiredFilled}>{t("driver.messages")}</TabsTrigger>
                      <TabsTrigger value="occurrences" className="text-[10px] px-2 py-1" disabled={!requiredFilled}>{t("driver.occurrences")}</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="attributions" className="pt-2">
                    <SubEntityTable
                      items={driverAttributionsList}
                      lookupItems={attributions || []}
                      lookupKey="attributionId"
                      lookupLabel={t("driver.attributions")}
                      t={t}
                      driverId={formData.id}
                      onAdd={async (id, date, endDate) => { if (formData.id) await saveSubEntity("DriversAttribution", "attributionId", id, date, endDate, formData.id, setDriverAttributionsList); }}
                      onRemove={async (id) => { if (formData.id) await deleteSubEntityById("DriversAttribution", id, formData.id, setDriverAttributionsList); }}
                      getLookupDisplay={(row) => getLookupDisplay(attributions, "attributionId", row)}
                    />
                  </TabsContent>

                  <TabsContent value="bases" className="pt-2">
                    <SubEntityTable
                      items={driverBasesList}
                      lookupItems={locationGroups || []}
                      lookupKey="locationGroupId"
                      lookupLabel={t("driver.bases")}
                      t={t}
                      driverId={formData.id}
                      onAdd={async (id, date, endDate) => { if (formData.id) await saveSubEntity("DriversBase", "locationGroupId", id, date, endDate, formData.id, setDriverBasesList); }}
                      onRemove={async (id) => { if (formData.id) await deleteSubEntityById("DriversBase", id, formData.id, setDriverBasesList); }}
                      getLookupDisplay={(row) => getLookupDisplay(locationGroups, "locationGroupId", row)}
                    />
                  </TabsContent>

                  <TabsContent value="positions" className="pt-2">
                    <SubEntityTable
                      items={driverPositionsList}
                      lookupItems={positions || []}
                      lookupKey="positionId"
                      lookupLabel={t("driver.positions")}
                      t={t}
                      driverId={formData.id}
                      onAdd={async (id, date, endDate) => { if (formData.id) await saveSubEntity("DriversPosition", "positionId", id, date, endDate, formData.id, setDriverPositionsList); }}
                      onRemove={async (id) => { if (formData.id) await deleteSubEntityById("DriversPosition", id, formData.id, setDriverPositionsList); }}
                      getLookupDisplay={(row) => getLookupDisplay(positions, "positionId", row)}
                    />
                  </TabsContent>

                  <TabsContent value="licenses" className="pt-2">
                    <div className="space-y-3">
                      {formData.id && (
                        <div className="flex items-end gap-2">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs text-muted-foreground">{t("driver.licenses")}</Label>
                            <Select value={newLicenseId} onValueChange={setNewLicenseId}>
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder={t("common.search") + "..."} />
                              </SelectTrigger>
                              <SelectContent>
                                {(licenses || [])
                                  .sort((a, b) => (a.code || "").localeCompare(b.code || ""))
                                  .map((li) => (
                                    <SelectItem key={li.id} value={li.id} className="text-xs">
                                      {li.code}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{t("driver.startDate")}</Label>
                            <DatePickerField
                              value={newLicenseStart ? `${newLicenseStart}T00:00:00` : null}
                              onChange={(v) => setNewLicenseStart(v ? v.substring(0, 10) : todayISO())}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{t("driver.endDate")}</Label>
                            <DatePickerField
                              value={newLicenseEnd ? `${newLicenseEnd}T00:00:00` : null}
                              onChange={(v) => setNewLicenseEnd(v ? v.substring(0, 10) : "")}
                              className="h-9"
                            />
                          </div>
                          <Button size="sm" variant="outline" className="h-9" onClick={saveDriverLicense} disabled={!newLicenseId || !newLicenseStart}>
                            <Plus className="h-3.5 w-3.5 mr-1" />{t("common.new")}
                          </Button>
                        </div>
                      )}
                      {!formData.id && (
                        <p className="text-xs text-muted-foreground py-2 italic">{t("driver.fillRequiredFirst")}</p>
                      )}
                      {driverLicenses.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">{t("common.noResults")}</p>
                      ) : (
                        <div className="overflow-auto rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-xs">{t("driver.licenses")}</TableHead>
                                <TableHead className="text-xs w-[180px]">{t("driver.startDate")}</TableHead>
                                <TableHead className="text-xs w-[180px]">{t("driver.endDate")}</TableHead>
                                <TableHead className="text-xs w-12"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {driverLicenses.map((dl) => (
                                <TableRow key={dl.id}>
                                  <TableCell className="text-xs">{dl.license?.code || (licenses || []).find(l => l.id === dl.licenseId)?.code || "--"}</TableCell>
                                  <TableCell className="text-xs">{formatDate(dl.startDate)}</TableCell>
                                  <TableCell className="text-xs">{formatDate(dl.endDate)}</TableCell>
                                  <TableCell className="text-xs text-center">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => dl.id && deleteDriverLicense(dl.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="courses" className="pt-2">
                    <SubEntityTable
                      items={driverCoursesList}
                      lookupItems={courses || []}
                      lookupKey="courseId"
                      lookupLabel={t("driver.courses")}
                      t={t}
                      driverId={formData.id}
                      onAdd={async (id, date, endDate) => { if (formData.id) await saveSubEntity("DriverCourse", "courseId", id, date, endDate, formData.id, setDriverCoursesList); }}
                      onRemove={async (id) => { if (formData.id) await deleteSubEntityById("DriverCourse", id, formData.id, setDriverCoursesList); }}
                      getLookupDisplay={(row) => getLookupDisplay(courses, "courseId", row)}
                      extraColumns={[{
                        header: "Tipo de Restrição",
                        render: (row) => {
                          const courseId = String(row.courseId ?? "");
                          const course = courses?.find((c) => String(c.id) === courseId);
                          const rawType = (course as any)?.restrictionType ?? (course as any)?.typeRestriction;
                          const typeVal = Number(rawType);
                          const labels: Record<number, string> = { 0: "Sem restrição", 1: "Alerta", 2: "Bloqueio" };
                          return Number.isNaN(typeVal) ? "--" : (labels[typeVal] ?? "--");
                        },
                        width: "160px",
                      }]}
                    />
                  </TabsContent>

                  <TabsContent value="vacations" className="pt-2">
                    <VacationTable
                      items={driverVacationsList}
                      t={t}
                      driverId={formData.id}
                      onAdd={async (startDate, endDate) => {
                        if (!formData.id) return;
                        if (endDate && endDate < startDate) {
                          toast({ title: t("driverVacation.startAfterEnd"), variant: "destructive" });
                          return;
                        }
                        const payload = { driverId: formData.id, startDate, endDate };
                        const res = await fetch(`${API_BASE}/DriversVacation`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(payload),
                        });
                        if (!res.ok) throw new Error(`API error: ${res.status}`);
                        toast({ title: t("common.saveSuccess"), variant: "success" });
                        await fetchSubEntities("DriversVacation", formData.id, setDriverVacationsList);
                      }}
                      onRemove={async (id) => {
                        if (!formData.id) return;
                        await deleteSubEntityById("DriversVacation", id, formData.id, setDriverVacationsList);
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="fleets" className="pt-2">
                    <SubEntityTable
                      items={driverFleetsList}
                      lookupItems={fleetGroups || []}
                      lookupKey="fleetGroupId"
                      lookupLabel={t("driver.fleets")}
                      t={t}
                      driverId={formData.id}
                      onAdd={async (id, date, endDate) => { if (formData.id) await saveSubEntity("DriversFleet", "fleetGroupId", id, date, endDate, formData.id, setDriverFleetsList); }}
                      onRemove={async (id) => { if (formData.id) await deleteSubEntityById("DriversFleet", id, formData.id, setDriverFleetsList); }}
                      getLookupDisplay={(row) => getLookupDisplay(fleetGroups, "fleetGroupId", row)}
                    />
                  </TabsContent>

                  <TabsContent value="dedicatedLines" className="pt-2">
                    <div className="space-y-3">
                      {formData.id && (
                        <div className="flex items-end gap-2">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs text-muted-foreground">{t("driver.dedicatedLines")}</Label>
                            <div className="flex items-center gap-1">
                              <Input
                                className="h-9 text-xs flex-1"
                                value={newDedicatedLineLabel}
                                readOnly
                                placeholder={t("common.search") + "..."}
                                onClick={() => setDedicatedLineModalOpen(true)}
                              />
                              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setDedicatedLineModalOpen(true)}>
                                <Search className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{t("driver.startDate")}</Label>
                            <DatePickerField
                              value={newDedicatedLineStart ? `${newDedicatedLineStart}T00:00:00` : null}
                              onChange={(v) => setNewDedicatedLineStart(v ? v.substring(0, 10) : todayISO())}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{t("driver.endDate")}</Label>
                            <DatePickerField
                              value={newDedicatedLineEnd ? `${newDedicatedLineEnd}T00:00:00` : null}
                              onChange={(v) => setNewDedicatedLineEnd(v ? v.substring(0, 10) : "")}
                              className="h-9"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9"
                            disabled={!newDedicatedLineId}
                            onClick={async () => {
                              if (!formData.id || !newDedicatedLineId) return;
                              try {
                                await saveSubEntity(
                                  "DriversDedicatedRoute",
                                  "lineId",
                                  newDedicatedLineId,
                                  `${newDedicatedLineStart}T00:00:00`,
                                  newDedicatedLineEnd ? `${newDedicatedLineEnd}T00:00:00` : null,
                                  formData.id,
                                  setDriverDedicatedRoutesList
                                );
                                setNewDedicatedLineId("");
                                setNewDedicatedLineLabel("");
                                setNewDedicatedLineStart(todayISO());
                                setNewDedicatedLineEnd("");
                              } catch (err: unknown) {
                                toast({ title: "Erro", description: (err as Error).message, variant: "error" });
                              }
                            }}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />{t("common.new")}
                          </Button>
                        </div>
                      )}
                      {!formData.id && (
                        <p className="text-xs text-muted-foreground py-2 italic">{t("driver.fillRequiredFirst")}</p>
                      )}
                      {driverDedicatedRoutesList.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">{t("common.noResults")}</p>
                      ) : (
                        <div className="overflow-auto rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="text-xs">{t("driver.dedicatedLines")}</TableHead>
                                <TableHead className="text-xs w-[180px]">{t("driver.startDate")}</TableHead>
                                <TableHead className="text-xs w-[180px]">{t("driver.endDate")}</TableHead>
                                <TableHead className="text-xs w-12"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {driverDedicatedRoutesList.map((row, i) => (
                                <TableRow key={row.id || i}>
                                  <TableCell className="text-xs">
                                    {(row as any).line?.code || (row as any).lineCode || (row as any).lineId || "--"}
                                  </TableCell>
                                  <TableCell className="text-xs">{formatDate(row.startDate)}</TableCell>
                                  <TableCell className="text-xs">{formatDate(row.endDate)}</TableCell>
                                  <TableCell className="text-xs text-center">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-destructive hover:text-destructive"
                                      onClick={() => {
                                        if (row.id && formData.id)
                                          deleteSubEntityById("DriversDedicatedRoute", row.id, formData.id, setDriverDedicatedRoutesList);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>

                    {/* Line Search Modal */}
                    <LineSearchModal
                      open={dedicatedLineModalOpen}
                      onOpenChange={setDedicatedLineModalOpen}
                      onSelect={(id, item) => {
                        setNewDedicatedLineId(id);
                        setNewDedicatedLineLabel(item?.code ? `${item.code}` : id);
                        setDedicatedLineModalOpen(false);
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="messages" className="pt-2">
                    <ReadOnlySubEntityTable
                      items={driverMessagesList}
                      t={t}
                      driverId={formData.id}
                    />
                  </TabsContent>

                  <TabsContent value="occurrences" className="pt-2">
                    {!formData.id ? (
                      <p className="text-xs text-muted-foreground py-2 italic">{t("driver.fillRequiredFirst")}</p>
                    ) : (
                      <div className="space-y-3">
                        {/* Add form */}
                        <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">{t("driverOccurrence.date")}</Label>
                              <DatePickerField value={occDtOccurrence} onChange={setOccDtOccurrence} className="h-9" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">{t("driverOccurrence.responsible")}</Label>
                              <Input value={occResponsible} onChange={(e) => setOccResponsible(e.target.value.toUpperCase())} className="h-9 text-xs" />
                            </div>
                            <div className="flex items-end gap-2">
                              <div className="flex items-center gap-2 rounded-md border px-2 h-9">
                                <Label className="text-xs">{t("driverOccurrence.warning")}</Label>
                                <Switch checked={occWarningFlag} onCheckedChange={setOccWarningFlag} />
                              </div>
                              <Button size="sm" variant="outline" className="h-9" onClick={async () => {
                                if (!occDtOccurrence || !formData.id) return;
                                setOccSaving(true);
                                try {
                                  const res = await fetch(`${API_BASE}/DriversOccurrence`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      driverId: formData.id,
                                      dtOccurrence: occDtOccurrence,
                                      description: occDescription,
                                      responsible: occResponsible,
                                      warningFlag: occWarningFlag,
                                    }),
                                  });
                                  if (!res.ok) throw new Error("Erro");
                                  toast({ title: t("common.saveSuccess"), variant: "success" });
                                  setOccDtOccurrence(`${todayISO()}T00:00:00`);
                                  setOccDescription("");
                                  setOccResponsible("");
                                  setOccWarningFlag(true);
                                  fetchSubEntities("DriversOccurrence", formData.id, setDriverOccurrencesList);
                                } catch (err: unknown) {
                                  toast({ title: "Erro", description: (err as Error).message, variant: "error" });
                                } finally {
                                  setOccSaving(false);
                                }
                              }} disabled={!occDtOccurrence || occSaving}>
                                {occSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}{t("common.new")}
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{t("common.description")}</Label>
                            <Textarea value={occDescription} onChange={(e) => setOccDescription(e.target.value)} className="min-h-[60px] text-xs" placeholder={t("driverOccurrence.descriptionPlaceholder")} />
                          </div>
                        </div>

                        {/* Table */}
                        {driverOccurrencesList.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">{t("common.noResults")}</p>
                        ) : (
                          <div className="overflow-auto rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead className="text-xs w-[120px]">{t("driverOccurrence.date")}</TableHead>
                                  <TableHead className="text-xs">{t("driverOccurrence.responsible")}</TableHead>
                                  <TableHead className="text-xs">{t("common.description")}</TableHead>
                                  <TableHead className="text-xs w-[80px] text-center">{t("driverOccurrence.warning")}</TableHead>
                                  <TableHead className="text-xs w-12"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {driverOccurrencesList.map((row, i) => (
                                  <TableRow key={row.id || i}>
                                    <TableCell className="text-xs">{formatDate(row.dtOccurrence as string)}</TableCell>
                                    <TableCell className="text-xs">{(row.responsible as string) || "--"}</TableCell>
                                    <TableCell className="text-xs">
                                      <div className="flex items-center gap-1">
                                        <span className="truncate max-w-[180px]">{(row.description as string) || "--"}</span>
                                        {row.description && (
                                          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => { setOccDescDialogContent(row.description as string); setOccDescDialogOpen(true); }}>
                                            <Eye className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-center">
                                      {(row.warningFlag as boolean) ? (
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mx-auto" />
                                      ) : (
                                        <span className="text-muted-foreground">--</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs text-center">
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={async () => {
                                        if (!row.id || !formData.id) return;
                                        try {
                                          await deleteSubEntityById("DriversOccurrence", row.id, formData.id, setDriverOccurrencesList);
                                        } catch (err: unknown) {
                                          toast({ title: "Erro", description: (err as Error).message, variant: "error" });
                                        }
                                      }}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}

                        {/* Description dialog */}
                        <Dialog open={occDescDialogOpen} onOpenChange={setOccDescDialogOpen}>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle className="text-sm">{t("driverOccurrence.descriptionDetail")}</DialogTitle>
                            </DialogHeader>
                            <div className="text-sm whitespace-pre-wrap border rounded-md p-3 bg-muted/30 max-h-[400px] overflow-auto">
                              {occDescDialogContent}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            );
          })()}

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="outline" onClick={closeForm}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {t("common.save")}
            </Button>
          </div>
        </FloatingPanel>
      )}

      {/* Resign confirmation dialog */}
      <AlertDialog open={showResignConfirm} onOpenChange={() => setShowResignConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("driver.confirmResign")}</AlertDialogTitle>
            <AlertDialogDescription>{t("driver.confirmResignDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => confirmResignAndSave(false)}>{t("driver.resignNo")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmResignAndSave(true)}>{t("driver.resignYes")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">{t("menu.driver")}</Label>
          <Input
            value={filters.nickName}
            onChange={(e) => setFilters((p) => ({ ...p, nickName: e.target.value.toUpperCase() }))}
            onKeyDown={handleKeyDown}
            placeholder={t("menu.driver") + "..."}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">GPID</Label>
          <Input
            value={filters.integrationCode}
            onChange={(e) => setFilters((p) => ({ ...p, integrationCode: e.target.value }))}
            onKeyDown={handleKeyDown}
            placeholder="GPID..."
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("driver.registration")}</Label>
          <Input
            value={filters.registration}
            onChange={(e) => setFilters((p) => ({ ...p, registration: e.target.value }))}
            onKeyDown={handleKeyDown}
            placeholder={t("driver.registration") + "..."}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("common.referenceDate")}</Label>
          <DatePickerField
            value={filters.admission ? `${filters.admission}T00:00:00` : null}
            onChange={(v) => setFilters((p) => ({ ...p, admission: v ? v.substring(0, 10) : "" }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("menu.position")}</Label>
          <Select value={filters.positionId} onValueChange={(v) => setFilters((p) => ({ ...p, positionId: v }))}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={loadingPos ? t("common.loading") : t("common.selectAll")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">{t("common.selectAll")}</SelectItem>
              {positions?.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">{p.description || p.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("driver.driverBase")}</Label>
          <Select value={filters.locationGroupId} onValueChange={(v) => setFilters((p) => ({ ...p, locationGroupId: v }))}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={loadingLG ? t("common.loading") : t("common.selectAll")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">{t("common.selectAll")}</SelectItem>
              {locationGroups?.map((lg) => (
                <SelectItem key={lg.id} value={lg.id} className="text-xs">{lg.description || lg.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("menu.fleetGroup")}</Label>
          <Select value={filters.fleetGroupId} onValueChange={(v) => setFilters((p) => ({ ...p, fleetGroupId: v }))}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={loadingFG ? t("common.loading") : t("common.selectAll")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">{t("common.selectAll")}</SelectItem>
              {fleetGroups?.map((fg) => (
                <SelectItem key={fg.id} value={fg.id} className="text-xs">{fg.description || fg.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" className="h-8 gap-1 text-xs" onClick={handleSearch}>
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          {t("common.search")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => {
            setFilters({ nickName: "", integrationCode: "", registration: "", admission: todayISO(), locationGroupId: "", positionId: "", fleetGroupId: "" });
          }}
        >
          <X className="h-3.5 w-3.5" />
          {t("common.clear")}
        </Button>
        <div className="flex-1" />
        {searched && drivers && drivers.length > 0 && (
          <ExportDropdown
            fetchData={() => fetchAllForExport("Driver", new URLSearchParams())}
            columns={[
              { key: "name", label: "Nome" },
              { key: "lastName", label: "Sobrenome" },
              { key: "nickName", label: "Escala" },
              { key: "registration", label: "CPF" },
            ]}
            title={t("menu.driver")}
          />
        )}
        <Button onClick={openCreate} size="sm" className="h-7 text-xs gap-1">
          <Plus className="h-3.5 w-3.5" />
          {t("common.new")}
        </Button>
      </div>
      {searched && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-0">
              {isLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              {isError && (
                <p className="text-sm text-destructive py-4">{(error as Error)?.message || "Erro ao carregar dados."}</p>
              )}
              {drivers && drivers.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">{t("common.noResults")}</p>
              )}

              {drivers && drivers.length > 0 && (
                <>
                  <div className="overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                       <TableRow className="bg-muted/50">
                          <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs">{t("driver.nickName")}</TableHead>
                          <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs">{t("driver.fullName")}</TableHead>
                          <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs">CPF</TableHead>
                          <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs">GPID</TableHead>
                          <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs">{t("driver.admission")}</TableHead>
                          <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs">{t("driver.phone1")}</TableHead>
                          <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs text-center">{t("common.active")}</TableHead>
                          <TableHead className="whitespace-nowrap font-medium h-8 px-3 text-xs text-center w-24">{t("common.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drivers.map((item, i) => (
                          <TableRow key={item.id ?? i} className="hover:bg-muted/30 group h-6">
                            <TableCell className="whitespace-nowrap text-xs py-0.5 px-3 font-medium">{item.nickName || "--"}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{`${item.name || ""} ${item.lastName || ""}`.trim() || "--"}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{item.registration || "--"}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{item.integrationCode || "--"}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{formatDate(item.admission)}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs py-0.5 px-3">{item.phone1 || "--"}</TableCell>
                            <TableCell className="text-center text-xs py-0.5 px-3">
                              {item.isActive ? (
                                <Badge variant="outline" className="bg-accent text-accent-foreground border-border text-xs">{t("common.active")}</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">{t("common.inactive")}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-xs py-0.5 px-3">
                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => item.id && setDeleteId(item.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between border-t border-border px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t("common.rowsPerPage")}:</span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(v) => {
                          setPageSize(Number(v));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="h-7 w-16 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAGE_SIZE_OPTIONS.map((s) => (
                            <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground ml-2">
                        {totalCount} {t("common.records")}
                      </span>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" disabled={!pagination?.HasPrevious} onClick={() => setCurrentPage((p) => p - 1)}>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </Button>
                        {getPageNumbers().map((p, i) =>
                          p === "ellipsis" ? (
                            <span key={`e${i}`} className="text-xs text-muted-foreground px-1">…</span>
                          ) : (
                            <Button
                              key={p}
                              variant={p === currentPage ? "default" : "outline"}
                              size="icon"
                              className="h-7 w-7 text-xs"
                              onClick={() => setCurrentPage(p)}
                            >
                              {p}
                            </Button>
                          ),
                        )}
                        <Button variant="outline" size="icon" className="h-7 w-7" disabled={!pagination?.HasNext} onClick={() => setCurrentPage((p) => p + 1)}>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.confirmDeleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DriverPage;
