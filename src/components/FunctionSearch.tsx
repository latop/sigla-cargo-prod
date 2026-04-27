import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { menuGroups } from "@/components/AppSidebar";
import { useTabs } from "@/contexts/TabsContext";
import { cn } from "@/lib/utils";

interface SearchableItem {
  titleKey: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  groupKey: string;
}

export function FunctionSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { openTab, tabs, MAX_TABS } = useTabs();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten all menu items into a searchable list
  const allItems = useMemo<SearchableItem[]>(() => {
    const out: SearchableItem[] = [];
    for (const group of menuGroups) {
      if (group.directLink) {
        out.push({
          titleKey: group.labelKey,
          url: group.directLink.url,
          icon: group.directLink.icon,
          groupKey: group.labelKey,
        });
      }
      for (const item of group.items) {
        out.push({
          titleKey: item.titleKey,
          url: item.url,
          icon: item.icon,
          groupKey: group.labelKey,
        });
      }
    }
    return out;
  }, []);

  // Filter by translated label (case-insensitive, contains)
  const results = useMemo<{ item: SearchableItem; label: string; groupLabel: string }[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allItems
      .map((it) => ({
        item: it,
        label: t(it.titleKey).toString(),
        groupLabel: t(it.groupKey).toString(),
      }))
      .filter(({ label, groupLabel }) =>
        label.toLowerCase().includes(q) || groupLabel.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [allItems, query, t]);

  useEffect(() => { setHighlight(0); }, [query]);

  const handleSelect = useCallback((item: SearchableItem) => {
    const success = openTab({ id: item.url, titleKey: item.titleKey, icon: item.icon });
    if (success) {
      navigate(item.url);
      setOpen(false);
      setQuery("");
    } else if (!tabs.find((tb) => tb.id === item.url)) {
      toast.warning(`Limite de ${MAX_TABS} abas atingido. Feche uma aba para abrir outra.`);
    }
  }, [openTab, navigate, tabs, MAX_TABS]);

  // Global hotkey: Ctrl/Cmd+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      // Focus input when popover opens
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground"
          title="Buscar função (Ctrl+K)"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Buscar função</span>
          <kbd className="hidden lg:inline pointer-events-none ml-1 rounded border bg-muted px-1 font-mono text-[10px] text-muted-foreground">
            Ctrl+K
          </kbd>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0" sideOffset={6}>
        <div className="flex items-center border-b px-2.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlight((h) => Math.min(h + 1, Math.max(results.length - 1, 0)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const sel = results[highlight];
                if (sel) handleSelect(sel.item);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder="Digite o nome da função..."
            className="h-9 border-0 shadow-none focus-visible:ring-0 text-xs px-2"
          />
          {query && (
            <button onClick={() => setQuery("")} className="p-0.5">
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="max-h-[320px] overflow-y-auto p-1">
          {!query.trim() ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              Digite para buscar uma função do sistema.
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              Nenhuma função encontrada.
            </div>
          ) : (
            results.map(({ item, label, groupLabel }, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.url}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground transition-colors",
                    highlight === i && "bg-accent text-accent-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{label}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{groupLabel}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
