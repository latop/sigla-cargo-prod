import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Search, X, Loader2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { API_BASE } from "@/config/api";
import { getLookupLabel } from "@/config/entitySchemas";
import { cn } from "@/lib/utils";
import { DriverSearchModal } from "@/components/DriverSearchModal";
import { LocationSearchModal } from "@/components/LocationSearchModal";

type Rec = Record<string, unknown>;

interface LookupSearchFieldProps {
  /** API endpoint (e.g. "Cities") */
  endpoint: string;
  /** Which label function to use */
  labelFn?: "codeName" | "codeDescription" | "codeOnly";
  /** Filter param name for text search (e.g. "Filter1String") */
  searchFilterParam?: string;
  /** Alternate filter param for secondary search (e.g. "Filter2String" to also search by fleetCode) */
  alternateSearchFilterParam?: string;
  /** Current selected id (or name if displayAsText) */
  value?: string;
  /** Callback when value changes */
  onChange: (id: string, item?: Rec) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Allow clearing */
  nullable?: boolean;
  /** Error styling */
  hasError?: boolean;
  /** CSS class for the trigger */
  className?: string;
  /** If true, the value is a display text (not an ID), skip fetch-by-ID */
  displayAsText?: boolean;
  /** Transform each API list item before processing (e.g. unwrap nested structures) */
  transformItem?: (item: Rec) => Rec;
  /** Restrict modal table to these column keys (in order). If omitted, auto-detect. */
  modalVisibleColumns?: string[];
  /** Map of column key → display label for modal table headers */
  columnLabels?: Record<string, string>;
  /** If true, disable autocomplete input and only allow opening the modal */
  forceModal?: boolean;
  /** Pre-resolved display label to avoid fetching by ID on mount */
  initialLabel?: string;
  /** Enable multi-select mode: modal shows checkboxes and confirm button */
  multiSelect?: boolean;
  /** Currently selected values for multi-select mode */
  selectedValues?: string[];
  /** Callback for multi-select confirm: receives array of { id, item } */
  onMultiSelectConfirm?: (selections: { id: string; label: string; item: Rec }[]) => void;
  /** Key to extract display value from item in multi-select (default: uses labelFn) */
  multiSelectValueKey?: string;
  /** Extra query parameters to append to every search request */
  extraParams?: Record<string, string>;
  /** Show an "Active" toggle filter in the advanced search modal (for Drivers) */
  showActiveFilter?: boolean;
  /** Always force IsActive=1 without showing toggle (for forms that must only allow active drivers) */
  forceActiveOnly?: boolean;
  /** Only show operational locations (isOperation=true) — passed to LocationSearchModal */
  filterOperationOnly?: boolean;
}

interface PaginationMeta {
  TotalCount: number;
  PageSize: number;
  CurrentPage: number;
  TotalPages: number;
  HasNext: boolean;
  HasPrevious: boolean;
}

const fetchSearch = async (
  endpoint: string,
  searchFilterParam: string,
  query: string,
  pageSize = 15,
  pageNumber = 1,
  extraParams?: Record<string, string>,
): Promise<{ items: Rec[]; pagination: PaginationMeta }> => {
  const params = new URLSearchParams();
  if (query.trim()) params.set(searchFilterParam, query.trim());
  params.set("PageSize", String(pageSize));
  params.set("PageNumber", String(pageNumber));
  if (extraParams) {
    Object.entries(extraParams).forEach(([k, v]) => params.set(k, v));
  }
  const res = await fetch(`${API_BASE}/${endpoint}?${params.toString()}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const items: Rec[] = await res.json();
  const pHeader = res.headers.get("x-pagination");
  const pagination: PaginationMeta = pHeader
    ? JSON.parse(pHeader)
    : { TotalCount: items.length, PageSize: pageSize, CurrentPage: pageNumber, TotalPages: 1, HasNext: false, HasPrevious: false };
  return { items, pagination };
};

const fetchById = async (endpoint: string, id: string): Promise<Rec | null> => {
  try {
    const res = await fetch(`${API_BASE}/${endpoint}/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export function LookupSearchField({
  endpoint,
  labelFn = "codeName",
  searchFilterParam = "Filter1String",
  alternateSearchFilterParam,
  value,
  onChange,
  placeholder = "Pesquisar...",
  nullable = false,
  hasError = false,
  className,
  displayAsText = false,
  transformItem,
  modalVisibleColumns,
  columnLabels,
  forceModal = false,
  initialLabel,
  multiSelect = false,
  selectedValues = [],
  onMultiSelectConfirm,
  multiSelectValueKey,
  extraParams,
  showActiveFilter: showActiveFilterProp,
  forceActiveOnly = false,
  filterOperationOnly = false,
}: LookupSearchFieldProps) {
  const { t } = useTranslation();
  const showActiveFilter = !forceActiveOnly && (showActiveFilterProp ?? (endpoint === "Drivers"));
  const [displayLabel, setDisplayLabel] = useState(initialLabel || "");
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalItems, setModalItems] = useState<Rec[]>([]);
  const [modalPagination, setModalPagination] = useState<PaginationMeta | null>(null);
  const [modalPage, setModalPage] = useState(1);
  const [modalLoading, setModalLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastFetchedId = useRef<string | undefined>(undefined);

  // Active filter state for modal
  const [modalActiveOnly, setModalActiveOnly] = useState(true);

  // Multi-select state
  const [multiSelections, setMultiSelections] = useState<Map<string, { label: string; item: Rec }>>(new Map());

  // Driver advanced search modal (used instead of generic modal for Drivers)
  const useDriverModal = endpoint === "Drivers" && !multiSelect;
  const [driverModalOpen, setDriverModalOpen] = useState(false);

  // Location advanced search modal
  const useLocationModal = endpoint === "Location" && !multiSelect;
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const normalizeLookupItem = useCallback(
    (rawItem: Rec): Rec => {
      const transformed = transformItem ? transformItem(rawItem) : rawItem;
      const truck = transformed.truck && typeof transformed.truck === "object" ? (transformed.truck as Rec) : {};
      const driver = transformed.driver && typeof transformed.driver === "object" ? (transformed.driver as Rec) : {};
      const code = transformed.code || transformed.licensePlate || truck.licensePlate || transformed.nickName || driver.nickName || transformed.name || "";
      const name = transformed.name || transformed.fleetCode || truck.fleetCode || transformed.integrationCode || driver.integrationCode || transformed.description || "";
      return {
        ...transformed,
        code,
        name,
      };
    },
    [transformItem],
  );

  const isDriverActive = useCallback((item: Rec): boolean => {
    const nestedDriver = item.driver && typeof item.driver === "object" ? (item.driver as Rec) : {};
    const raw = item.isActive ?? item.IsActive ?? item.flgActive ?? item.FlgActive ?? nestedDriver.isActive ?? nestedDriver.IsActive ?? nestedDriver.flgActive ?? nestedDriver.FlgActive;

    if (typeof raw === "boolean") return raw;
    if (typeof raw === "number") return raw === 1;

    const normalized = String(raw ?? "").trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  }, []);

  // Resolve display label when value changes externally
  useEffect(() => {
    if (multiSelect) return; // Skip for multi-select mode
    if (!value) {
      setDisplayLabel("");
      lastFetchedId.current = undefined;
      return;
    }
    if (displayAsText) {
      setDisplayLabel(value);
      return;
    }
    if (lastFetchedId.current === value && displayLabel) return;
    if (initialLabel && lastFetchedId.current === undefined) {
      lastFetchedId.current = value;
      setDisplayLabel(initialLabel);
      return;
    }
    lastFetchedId.current = value;
    fetchById(endpoint, value).then((item) => {
      if (item) {
        const resolved = normalizeLookupItem(item);
        setDisplayLabel(getLookupLabel(resolved, labelFn));
      } else setDisplayLabel("");
    });
  }, [value, endpoint, labelFn, displayAsText, initialLabel, multiSelect, normalizeLookupItem]);

  // Autocomplete search
  const doAutocomplete = useCallback(
    (query: string) => {
      if (query.length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      setLoading(true);
      // For Drivers autocomplete, restrict to active drivers by default
      // (avoid returning desligados in the dropdown when typing the name).
      const autocompleteParams: Record<string, string> = { ...(extraParams || {}) };
      if (endpoint === "Drivers" && autocompleteParams.IsActive === undefined) {
        autocompleteParams.IsActive = "1";
      }
      const searches = [fetchSearch(endpoint, searchFilterParam, query, 10, 1, autocompleteParams)];
      if (alternateSearchFilterParam) {
        searches.push(fetchSearch(endpoint, alternateSearchFilterParam, query, 10, 1, autocompleteParams));
      }
      Promise.all(searches)
        .then((results) => {
          const allItems = results.flatMap(r => r.items);
          // Deduplicate by id
          const seen = new Set<string>();
          const unique = allItems.filter(item => {
            const id = String(item.id || "");
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
          let transformed = unique.map(normalizeLookupItem);
          // Client-side safety: even if backend ignores IsActive, drop inactive drivers
          if (endpoint === "Drivers" && autocompleteParams.IsActive === "1") {
            transformed = transformed.filter((item) => isDriverActive(item));
          }
          transformed.sort((a, b) => getLookupLabel(a, labelFn).toLowerCase().localeCompare(getLookupLabel(b, labelFn).toLowerCase()));
          setSuggestions(transformed);
          setShowSuggestions(true);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    },
    [endpoint, searchFilterParam, alternateSearchFilterParam, extraParams, normalizeLookupItem, isDriverActive, labelFn],
  );

  const handleInputChange = (text: string) => {
    const upper = text.toUpperCase();
    setInputValue(upper);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doAutocomplete(upper), 350);
  };

  const selectItem = (item: Rec) => {
    const normalized = normalizeLookupItem(item);
    onChange(String(normalized.id), normalized);
    setDisplayLabel(getLookupLabel(normalized, labelFn));
    setInputValue("");
    setShowSuggestions(false);
    setSuggestions([]);
    setModalOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setDisplayLabel("");
    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Modal search
  const doModalSearch = useCallback(
    async (page = 1) => {
      setModalLoading(true);
      try {
        // Merge active filter into extra params for modal search
        const mergedParams = { ...extraParams };
        if (endpoint === "Drivers") {
          if (forceActiveOnly) {
            mergedParams.IsActive = "1";
          } else if (showActiveFilter) {
            // Toggle ON => only active, OFF => only inactive
            mergedParams.IsActive = modalActiveOnly ? "1" : "0";
          }
        }

        const searches = [fetchSearch(endpoint, searchFilterParam, modalSearch, 10, page, mergedParams)];
        if (alternateSearchFilterParam && modalSearch.trim()) {
          searches.push(fetchSearch(endpoint, alternateSearchFilterParam, modalSearch, 10, page, mergedParams));
        }
        const results = await Promise.all(searches);
        const allItems = results.flatMap(r => r.items);
        const seen = new Set<string>();
        const uniqueItems = allItems.filter(item => {
          const id = String(item.id || "");
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        const pagination = results[0].pagination;
        let transformed = uniqueItems.map(normalizeLookupItem);

        // Client-side safety: enforce active/inactive filter even if backend ignores IsActive
        if (endpoint === "Drivers" && (mergedParams.IsActive === "1" || mergedParams.IsActive === "0")) {
          const shouldBeActive = mergedParams.IsActive === "1";
          transformed = transformed.filter((item) => isDriverActive(item) === shouldBeActive);
        }
        transformed.sort((a, b) => getLookupLabel(a, labelFn).toLowerCase().localeCompare(getLookupLabel(b, labelFn).toLowerCase()));
        setModalItems(transformed);
        setModalPagination(pagination);
        setModalPage(page);
      } catch {
        setModalItems([]);
      } finally {
        setModalLoading(false);
      }
    },
    [endpoint, searchFilterParam, alternateSearchFilterParam, modalSearch, extraParams, showActiveFilter, modalActiveOnly, forceActiveOnly, normalizeLookupItem, isDriverActive, labelFn],
  );

  const openModal = () => {
    if (useDriverModal) {
      setDriverModalOpen(true);
      return;
    }
    if (useLocationModal) {
      setLocationModalOpen(true);
      return;
    }
    setModalOpen(true);
    setModalSearch("");
    setModalItems([]);
    setModalPagination(null);
    setModalPage(1);
    setModalActiveOnly(true);
    // Initialize multi-selections from selectedValues
    if (multiSelect) {
      const initial = new Map<string, { label: string; item: Rec }>();
      selectedValues.forEach((v) => {
        initial.set(v, { label: v, item: {} });
      });
      setMultiSelections(initial);
    }
  };

  const getItemKey = (item: Rec): string => {
    if (multiSelectValueKey) return String(item[multiSelectValueKey] || item.id);
    return String(item.id);
  };

  const getItemLabel = (item: Rec): string => {
    if (multiSelectValueKey) return String(item[multiSelectValueKey] || "");
    return getLookupLabel(normalizeLookupItem(item), labelFn);
  };

  const toggleMultiItem = (item: Rec) => {
    const key = getItemKey(item);
    setMultiSelections((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, { label: getItemLabel(item), item });
      }
      return next;
    });
  };

  const confirmMultiSelect = () => {
    if (onMultiSelectConfirm) {
      const selections = Array.from(multiSelections.entries()).map(([id, { label, item }]) => ({ id, label, item }));
      onMultiSelectConfirm(selections);
    }
    setModalOpen(false);
  };

  // Determine visible columns for modal table
  const getModalColumns = (items: Rec[]) => {
    if (modalVisibleColumns) return modalVisibleColumns;
    if (items.length === 0) return [];
    return Object.keys(items[0]).filter((k) => {
      const val = items[0][k];
      return (
        k !== "id" &&
        !k.endsWith("Id") &&
        !k.endsWith("At") &&
        k !== "userIdCreate" &&
        k !== "userIdUpdate" &&
        (val === null || typeof val !== "object")
      );
    });
  };

  const getColumnLabel = (col: string) => {
    if (columnLabels && columnLabels[col]) return columnLabels[col];
    return col;
  };

  const modalColumns = getModalColumns(modalItems);
  const showStatusColumn = endpoint === "Drivers";

  const renderStatusCell = (item: Rec) => {
    const isActive = isDriverActive(item);
    return (
      <Badge variant="outline" className={cn(
        "text-[10px] font-medium uppercase",
        isActive
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
          : "bg-muted text-muted-foreground border-border"
      )}>
        {isActive ? t("common.active") : t("common.inactive")}
      </Badge>
    );
  };

  // For multi-select mode, render differently
  if (multiSelect) {
    return (
      <>
        <div ref={containerRef} className="relative">
          <div
            className={cn(
              "flex items-center h-8 w-full rounded-md border border-input bg-background px-2 text-xs gap-1 cursor-pointer hover:border-primary/50 transition-colors",
              hasError && "border-destructive",
              className,
            )}
            onClick={openModal}
          >
            <span className="flex-1 truncate text-muted-foreground">
              {selectedValues.length === 0
                ? placeholder
                : `${selectedValues.length} selecionado(s)`}
            </span>
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </div>
        </div>

        {/* Multi-select Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-sm font-display">Pesquisar {placeholder}</DialogTitle>
              <DialogDescription className="sr-only">Busca avançada com seleção múltipla</DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 items-center">
              <Input
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") doModalSearch(1); }}
                placeholder="Digite para pesquisar..."
                className="h-8 text-xs flex-1"
              />
              {showActiveFilter && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Switch id="modal-active-multi" checked={modalActiveOnly} onCheckedChange={setModalActiveOnly} className="h-4 w-7 [&>span]:h-3 [&>span]:w-3" />
                  <Label htmlFor="modal-active-multi" className="text-xs cursor-pointer whitespace-nowrap">{t("common.active")}</Label>
                </div>
              )}
              <Button size="sm" className="h-8 text-xs gap-1" onClick={() => doModalSearch(1)} disabled={modalLoading}>
                {modalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Pesquisar
              </Button>
            </div>

            {/* Selected badges */}
            {multiSelections.size > 0 && (
              <div className="flex flex-wrap gap-1 py-1">
                {Array.from(multiSelections.entries()).map(([key, { label }]) => (
                  <Badge key={key} variant="secondary" className="text-[10px] gap-1 h-5">
                    {label}
                    <X
                      className="h-2.5 w-2.5 cursor-pointer"
                      onClick={() => setMultiSelections((prev) => {
                        const next = new Map(prev);
                        next.delete(key);
                        return next;
                      })}
                    />
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-7 text-xs px-2 w-8"></TableHead>
                     {modalColumns.map((col) => (
                       <TableHead key={col} className="h-7 text-xs px-2">
                         {getColumnLabel(col)}
                       </TableHead>
                     ))}
                     {showStatusColumn && (
                        <TableHead className="h-7 text-xs px-2 w-[80px]">{t("common.status")}</TableHead>
                     )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modalItems.length === 0 ? (
                    <TableRow>
                       <TableCell colSpan={(modalColumns.length || 1) + 1 + (showStatusColumn ? 1 : 0)} className="text-center text-xs text-muted-foreground py-8">
                         {modalLoading ? t("common.loading") : t("common.searchHint")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    modalItems.map((item) => {
                      const key = getItemKey(item);
                      const isSelected = multiSelections.has(key);
                      return (
                        <TableRow
                          key={String(item.id)}
                          className={cn("cursor-pointer hover:bg-primary/5", isSelected && "bg-primary/10")}
                          onClick={() => toggleMultiItem(item)}
                        >
                          <TableCell className="h-7 px-2 py-1 w-8">
                            <Checkbox checked={isSelected} className="h-3.5 w-3.5" />
                          </TableCell>
                          {modalColumns.map((col) => (
                            <TableCell key={col} className="h-7 text-xs px-2 py-1">
                              {item[col] === null || item[col] === undefined ? "--" : String(item[col])}
                            </TableCell>
                          ))}
                          {showStatusColumn && (
                            <TableCell className="h-7 text-xs px-2 py-1">{renderStatusCell(item)}</TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                {modalPagination ? `${modalPagination.TotalCount} registro(s)` : ""}
                {multiSelections.size > 0 && (
                  <span className="ml-2 font-medium text-foreground">{multiSelections.size} selecionado(s)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {modalPagination && modalPagination.TotalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      disabled={!modalPagination.HasPrevious}
                      onClick={() => doModalSearch(modalPage - 1)}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <span className="text-xs px-2">
                      {modalPagination.CurrentPage} / {modalPagination.TotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      disabled={!modalPagination.HasNext}
                      onClick={() => doModalSearch(modalPage + 1)}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <Button size="sm" className="h-8 text-xs gap-1" onClick={confirmMultiSelect}>
                  <Check className="h-3.5 w-3.5" />
                  Confirmar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        {/* Display selected or input */}
        {value && displayLabel && !showSuggestions ? (
          <div
            className={cn(
              "flex items-center h-8 w-full rounded-md border border-input bg-background px-2 text-xs gap-1",
              hasError && "border-destructive",
              className,
            )}
          >
            <span className="flex-1 truncate">{displayLabel}</span>
            <div className="flex items-center gap-0.5 shrink-0">
              {nullable && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-0.5 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                onClick={openModal}
                className="p-0.5 hover:text-primary"
              >
                <Search className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : forceModal ? (
          <div
            className={cn(
              "flex items-center h-8 w-full rounded-md border border-input bg-background px-2 text-xs gap-1 cursor-pointer hover:border-primary/50 transition-colors",
              hasError && "border-destructive",
              className,
            )}
            onClick={openModal}
          >
            <span className="flex-1 truncate text-muted-foreground">{placeholder}</span>
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </div>
        ) : (
          <div className="relative">
            <Input
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              placeholder={placeholder}
              className={cn("h-8 text-xs pr-14", hasError && "border-destructive", className)}
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              <button
                type="button"
                onClick={openModal}
                className="p-1 hover:text-primary text-muted-foreground"
                title="Pesquisa avançada"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((item) => (
              <button
                key={String(item.id)}
                type="button"
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => selectItem(item)}
              >
                {getLookupLabel(item, labelFn)}
              </button>
            ))}
          </div>
        )}
        {showSuggestions && suggestions.length === 0 && inputValue.length >= 3 && !loading && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg px-3 py-2 text-xs text-muted-foreground">
            Nenhum resultado encontrado.
          </div>
        )}
      </div>

      {/* Advanced Search Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-display">Pesquisar {placeholder}</DialogTitle>
            <DialogDescription className="sr-only">Busca avançada com paginação</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 items-center">
            <Input
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") doModalSearch(1); }}
              placeholder="Digite para pesquisar..."
              className="h-8 text-xs flex-1"
            />
            {showActiveFilter && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Switch id="modal-active-single" checked={modalActiveOnly} onCheckedChange={setModalActiveOnly} className="h-4 w-7 [&>span]:h-3 [&>span]:w-3" />
                <Label htmlFor="modal-active-single" className="text-xs cursor-pointer whitespace-nowrap">{t("common.active")}</Label>
              </div>
            )}
            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => doModalSearch(1)} disabled={modalLoading}>
              {modalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Pesquisar
            </Button>
          </div>
          <div className="flex-1 overflow-auto border rounded-md mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  {modalColumns.map((col) => (
                    <TableHead key={col} className="h-7 text-xs px-2">
                      {getColumnLabel(col)}
                    </TableHead>
                  ))}
                  {showStatusColumn && (
                    <TableHead className="h-7 text-xs px-2 w-[80px]">{t("common.status")}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {modalItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={(modalColumns.length || 1) + (showStatusColumn ? 1 : 0)} className="text-center text-xs text-muted-foreground py-8">
                      {modalLoading ? t("common.loading") : t("common.searchHint")}
                    </TableCell>
                  </TableRow>
                ) : (
                  modalItems.map((item) => (
                    <TableRow
                      key={String(item.id)}
                      className="cursor-pointer hover:bg-primary/5"
                      onClick={() => selectItem(item)}
                    >
                      {modalColumns.map((col) => (
                        <TableCell key={col} className="h-7 text-xs px-2 py-1">
                          {item[col] === null || item[col] === undefined ? "--" : String(item[col])}
                        </TableCell>
                      ))}
                      {showStatusColumn && (
                        <TableCell className="h-7 text-xs px-2 py-1">{renderStatusCell(item)}</TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {modalPagination && modalPagination.TotalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
              <span>{modalPagination.TotalCount} registro(s)</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  disabled={!modalPagination.HasPrevious}
                  onClick={() => doModalSearch(modalPage - 1)}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="px-2">
                  {modalPagination.CurrentPage} / {modalPagination.TotalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  disabled={!modalPagination.HasNext}
                  onClick={() => doModalSearch(modalPage + 1)}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Driver advanced search modal */}
      {useDriverModal && (
        <DriverSearchModal
          open={driverModalOpen}
          onOpenChange={setDriverModalOpen}
          forceActiveOnly={forceActiveOnly}
          onSelect={(id, item) => {
            const normalized = normalizeLookupItem(item);
            selectItem(normalized);
          }}
        />
      )}

      {/* Location advanced search modal */}
      {useLocationModal && (
        <LocationSearchModal
          open={locationModalOpen}
          onOpenChange={setLocationModalOpen}
          onSelect={(id, item) => {
            const normalized = normalizeLookupItem(item);
            selectItem(normalized);
          }}
          filterOperationOnly={filterOperationOnly}
        />
      )}
    </>
  );
}
