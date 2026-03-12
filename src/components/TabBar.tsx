import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabs } from "@/contexts/TabsContext";
import { useNavigate } from "react-router-dom";

export function TabBar() {
  const { t } = useTranslation();
  const { tabs, activeTabId, setActiveTab, closeTab } = useTabs();
  const navigate = useNavigate();

  if (tabs.length === 0) return null;

  const handleClick = (id: string) => {
    setActiveTab(id);
    navigate(id);
  };

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const remaining = tabs.filter((t) => t.id !== id);
    closeTab(id);
    // Navigate to the next active tab
    if (activeTabId === id && remaining.length > 0) {
      const idx = tabs.findIndex((t) => t.id === id);
      const newIdx = Math.min(idx, remaining.length - 1);
      navigate(remaining[newIdx].id);
    } else if (remaining.length === 0) {
      navigate("/home");
    }
  };

  return (
    <div className="flex items-center border-b border-border bg-muted/30 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const Icon = tab.icon;
        return (
          <div
            key={tab.id}
            onClick={() => handleClick(tab.id)}
            className={cn(
              "group flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r border-border/50 min-w-0 max-w-[180px] select-none transition-colors",
              isActive
                ? "bg-background text-foreground border-b-2 border-b-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            {Icon && <Icon className="h-3 w-3 shrink-0" />}
            <span className="truncate">{t(tab.titleKey)}</span>
            <button
              onClick={(e) => handleClose(e, tab.id)}
              className={cn(
                "ml-auto shrink-0 rounded-sm p-0.5 transition-colors",
                isActive
                  ? "hover:bg-muted text-muted-foreground hover:text-foreground"
                  : "opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
