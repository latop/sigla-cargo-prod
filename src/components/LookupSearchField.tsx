import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2, ChevronLeft, ChevronRight, Check } from "lucide-react";
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

type Rec = Record<string, unknown>;

interface LookupSearchFieldProps {
  /** API endpoint (e.g. "Cities") */
  endpoint: string;
  /** Which label function to use */
  labelFn?: "codeName" | "codeDescription" | "codeOnly";
  /** Filter param name for text search (e.g. "Filter1String") */
  searchFilterParam?: string;
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
): Promise<{ items: Rec[]; pagination: PaginationMeta }> => {
  const params = new URLSearchParams();
  if (query.trim()) params.set(searchFilterParam, query.trim());
  params.set("PageSize", String(pageSize));
  params.set("PageNumber", String(pageNumber));
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
}: LookupSearchFieldProps) {
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

  // Multi-select state
  const [multiSelections, setMultiSelections] = useState<Map<string, { label: string; item: Rec }>>(new Map());

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
        const resolved = transformItem ? transformItem(item) : item;
        setDisplayLabel(getLookupLabel(resolved, labelFn));
      } else setDisplayLabel("");
    });
  }, [value, endpoint, labelFn, displayAsText, transformItem, initialLabel, multiSelect]);

  // Autocomplete search
  const doAutocomplete = useCallback(
    (query: string) => {
      if (query.length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      setLoading(true);
      fetchSearch(endpoint, searchFilterParam, query, 10)
        .then(({ items }) => {
          const transformed = transformItem ? items.map(transformItem) : items;
          // Sort alphabetically by label
          transformed.sort((a, b) => {
            const la = (a.code || a.name || a.description || "").toString().toLowerCase();
            const lb = (b.code || b.name || b.description || "").toString().toLowerCase();
            return la.localeCompare(lb);
          });
          setSuggestions(transformed);
          setShowSuggestions(true);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    },
    [endpoint, searchFilterParam, transformItem],
  );

  const handleInputChange = (text: string) => {
    const upper = text.toUpperCase();
    setInputValue(upper);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doAutocomplete(upper), 350);
  };

  const selectItem = (item: Rec) => {
    onChange(String(item.id), item);
    setDisplayLabel(getLookupLabel(item, labelFn));
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
        const { items, pagination } = await fetchSearch(endpoint, searchFilterParam, modalSearch, 10, page);
        const transformed = transformItem ? items.map(transformItem) : items;
        transformed.sort((a, b) => {
          const la = (a.code || a.name || a.description || "").toString().toLowerCase();
          const lb = (b.code || b.name || b.description || "").toString().toLowerCase();
          return la.localeCompare(lb);
        });
        setModalItems(transformed);
        setModalPagination(pagination);
        setModalPage(page);
      } catch {
        setModalItems([]);
      } finally {
        setModalLoading(false);
      }
    },
    [endpoint, searchFilterParam, modalSearch],
  );

  const openModal = () => {
    setModalOpen(true);
    setModalSearch("");
    setModalItems([]);
    setModalPagination(null);
    setModalPage(1);
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
    return getLookupLabel(item, labelFn);
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modalItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={(modalColumns.length || 1) + 1} className="text-center text-xs text-muted-foreground py-8">
                        {modalLoading ? "Carregando..." : "Utilize o campo acima para pesquisar."}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {modalItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={modalColumns.length || 1} className="text-center text-xs text-muted-foreground py-8">
                      {modalLoading ? "Carregando..." : "Utilize o campo acima para pesquisar."}
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
    </>
  );
}
