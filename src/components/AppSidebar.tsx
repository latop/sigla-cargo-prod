import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useTabs } from "@/contexts/TabsContext";
import { toast } from "sonner";
import {
  CalendarDays, Route, Link2,
  UserCheck, Users, Megaphone, UserMinus,
  FileUp, Sparkles, LayoutTemplate, Layers, Cpu, Truck,
  ClipboardList, Tag, Zap, GitBranch, Building2, MapPin, Globe2,
  User, Car, FolderTree, Boxes, CircleDot,
  Scale, Milestone, Map, Waypoints, FileBarChart,
  Landmark, Flag, Clock, Timer, Navigation, Container,
  ChevronDown, BookOpen, Info, ChevronsUpDown, ChevronsDownUp, LayoutDashboard,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import logo from "@/assets/logo-sigla-cargo.png";
import clientLogo from "@/assets/client-logo.png";
import { APP_VERSION } from "@/pages/Changelog";
import { useAuth } from "@/contexts/AuthContext";

interface MenuItem {
  titleKey: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MenuGroup {
  labelKey: string;
  items: MenuItem[];
  directLink?: { url: string; icon: React.ComponentType<{ className?: string }> };
}

export const menuGroups: MenuGroup[] = [
  {
    labelKey: "dashboard.title",
    items: [],
    directLink: { url: "/home", icon: LayoutDashboard },
  },
  {
    labelKey: "sidebar.coordination",
    items: [
      { titleKey: "menu.dailyTrip", url: "/daily-trip", icon: CalendarDays },
      { titleKey: "menu.dailyTripsSchedule", url: "/daily-trips-schedule", icon: Route },
      
    ],
  },
  {
    labelKey: "sidebar.monitoring",
    items: [
      { titleKey: "menu.departuresAndArrivals", url: "/departures-and-arrivals", icon: Truck },
      { titleKey: "menu.releaseDriver", url: "/release-driver", icon: UserMinus },
    ],
  },
  {
    labelKey: "sidebar.driverSchedule",
    items: [
      { titleKey: "menu.driversRequest", url: "/drivers-request", icon: UserCheck },
      { titleKey: "menu.driversSchedule", url: "/drivers-schedule", icon: Users },
      { titleKey: "menu.publishJourney", url: "/publish-journey", icon: Megaphone },
    ],
  },
  {
    labelKey: "sidebar.imports",
    items: [
      { titleKey: "menu.importTrips", url: "/import-trips", icon: FileUp },
      { titleKey: "menu.importMap", url: "/import-map", icon: Map },
    ],
  },
  {
    labelKey: "sidebar.planning",
    items: [
      
      { titleKey: "menu.planningModel", url: "/planning-model", icon: LayoutTemplate },
      { titleKey: "menu.scenarios", url: "/scenarios", icon: Layers },
      { titleKey: "menu.tripOptimization", url: "/trip-optimization", icon: Cpu },
      { titleKey: "menu.vehiclePlanning", url: "/vehicle-planning", icon: Truck },
      
    ],
  },
  {
    labelKey: "sidebar.register",
    items: [
      { titleKey: "menu.activityTruck", url: "/activity-truck", icon: Container },
      { titleKey: "menu.activityType", url: "/activity-type", icon: Tag },
      { titleKey: "menu.activity", url: "/activity", icon: ClipboardList },
      { titleKey: "menu.attribution", url: "/attribution", icon: GitBranch },
      { titleKey: "menu.city", url: "/city", icon: Building2 },
      { titleKey: "menu.company", url: "/company", icon: Landmark },
      { titleKey: "menu.country", url: "/country", icon: Globe2 },
      { titleKey: "menu.driver", url: "/driver", icon: User },
      { titleKey: "menu.fleetBrand", url: "/fleet-brand", icon: Car },
      { titleKey: "menu.fleetGroup", url: "/fleet-group", icon: FolderTree },
      { titleKey: "menu.fleetModel", url: "/fleet-model", icon: Boxes },
      { titleKey: "menu.fleetType", url: "/fleet-type", icon: CircleDot },
      { titleKey: "menu.justification", url: "/justification", icon: Scale },
      { titleKey: "menu.line", url: "/line", icon: Milestone },
      { titleKey: "menu.locationGroup", url: "/location-group", icon: Map },
      { titleKey: "menu.locationType", url: "/location-type", icon: Waypoints },
      { titleKey: "menu.location", url: "/location", icon: MapPin },
      { titleKey: "menu.position", url: "/position", icon: Navigation },
      { titleKey: "menu.region", url: "/region", icon: Flag },
      { titleKey: "menu.responsibleSector", url: "/responsible-sector", icon: Zap },
      { titleKey: "menu.state", url: "/state", icon: Map },
      { titleKey: "menu.stopType", url: "/stop-type", icon: CircleDot },
      { titleKey: "menu.timezoneValue", url: "/timezone-value", icon: Timer },
      { titleKey: "menu.timezone", url: "/timezone", icon: Clock },
      { titleKey: "menu.tripType", url: "/trip-type", icon: Route },
      { titleKey: "menu.truck", url: "/truck", icon: Truck },
    ],
  },
  {
    labelKey: "sidebar.reports",
    items: [],
    directLink: { url: "/reports", icon: FileBarChart },
  },
  {
    labelKey: "sidebar.admin",
    items: [
      { titleKey: "menu.adminParameters", url: "/admin-parameters", icon: Zap },
    ],
  },
];

export function getMenuItemByPath(path: string): MenuItem | null {
  for (const group of menuGroups) {
    if (group.directLink && group.directLink.url === path) {
      return { titleKey: group.labelKey, url: group.directLink.url, icon: group.directLink.icon };
    }
    const item = group.items.find((i) => i.url === path);
    if (item) return item;
  }
  return null;
}

export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { openTab, tabs, activeTabId, MAX_TABS } = useTabs();
  const { user } = useAuth();
  const userName = user?.name || "Usuário";
  const userGpid = user?.gpid || "";
  const userInitial = userName.charAt(0).toUpperCase();

  const handleNavClick = useCallback((item: MenuItem) => {
    const success = openTab({ id: item.url, titleKey: item.titleKey, icon: item.icon });
    if (success) {
      navigate(item.url);
    } else {
      // Already exists? Just focus
      if (tabs.find((t) => t.id === item.url)) {
        navigate(item.url);
      } else {
        toast.warning(`Limite de ${MAX_TABS} abas atingido. Feche uma aba para abrir outra.`);
      }
    }
  }, [openTab, navigate, tabs, MAX_TABS]);

  // Controlled open state for each group
  const activeGroups = useMemo(() => 
    menuGroups
      .filter((g) => g.items.some((item) => location.pathname === item.url))
      .map((g) => g.labelKey),
    [location.pathname]
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menuGroups.forEach((g) => {
      initial[g.labelKey] = activeGroups.includes(g.labelKey);
    });
    return initial;
  });

  const toggleGroup = useCallback((key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const expandAll = useCallback(() => {
    const all: Record<string, boolean> = {};
    menuGroups.forEach((g) => { all[g.labelKey] = true; });
    setOpenGroups(all);
  }, []);

  const collapseAll = useCallback(() => {
    const all: Record<string, boolean> = {};
    menuGroups.forEach((g) => { all[g.labelKey] = false; });
    setOpenGroups(all);
  }, []);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="h-16 flex items-center justify-center px-4 border-b border-sidebar-border">
        {!collapsed && (
          <img src={clientLogo} alt="Cliente" className="h-9 object-contain mx-auto" />
        )}
      </div>
      <SidebarContent className="pt-2">
        {/* Expand / Collapse all */}
        {!collapsed && (
          <div className="flex items-center justify-end gap-1 px-3 pb-1">
            <button
              onClick={expandAll}
              className="p-1 rounded hover:bg-sidebar-accent/50 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
              title={t("sidebar.expandAll") || "Expandir todos"}
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={collapseAll}
              className="p-1 rounded hover:bg-sidebar-accent/50 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
              title={t("sidebar.collapseAll") || "Compactar todos"}
            >
              <ChevronsDownUp className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {menuGroups.map((group) => {
          // Direct link groups (no submenu)
          if (group.directLink) {
            return (
              <SidebarGroup key={group.labelKey}>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton size="sm">
                      <button
                        onClick={() => handleNavClick({ titleKey: group.labelKey, url: group.directLink!.url, icon: group.directLink!.icon })}
                        className={cn(
                          "flex items-center w-full hover:bg-sidebar-accent/50",
                          activeTabId === group.directLink!.url && "bg-sidebar-accent text-sidebar-primary font-medium"
                        )}
                      >
                        {!collapsed && (
                          <span className="truncate text-sm font-semibold">{t(group.labelKey)}</span>
                        )}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            );
          }

          const sortedItems = [...group.items].sort((a, b) =>
            t(a.titleKey).localeCompare(t(b.titleKey))
          );

          return (
            <Collapsible key={group.labelKey} open={openGroups[group.labelKey] ?? false} onOpenChange={() => toggleGroup(group.labelKey)}>
              <SidebarGroup>
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:text-sidebar-foreground transition-colors text-sm font-semibold">
                    {!collapsed && t(group.labelKey)}
                    {!collapsed && <ChevronDown className="h-3.5 w-3.5" />}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {sortedItems.map((item) => (
                        <SidebarMenuItem key={item.url}>
                          <SidebarMenuButton size="sm">
                            <button
                              onClick={() => handleNavClick(item)}
                              className={cn(
                                "flex items-center w-full hover:bg-sidebar-accent/50",
                                activeTabId === item.url && "bg-sidebar-accent text-sidebar-primary font-medium"
                              )}
                            >
                              <item.icon className="mr-2 h-4 w-4 shrink-0" />
                              {!collapsed && <span className="truncate">{t(item.titleKey)}</span>}
                            </button>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-3">
        {/* User info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0 bg-sidebar-accent">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-sm font-semibold">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-sidebar-foreground truncate">{userName}</span>
              {userGpid && <span className="text-xs text-sidebar-foreground/60 truncate">[{userGpid}]</span>}
              <span className="text-xs text-sidebar-foreground/60 truncate">Funcionário</span>
            </div>
          )}
        </div>

        {/* Links: Version, Manual */}
        {!collapsed && (
          <div className="space-y-1">
            <button
              onClick={() => navigate("/changelog")}
              className="flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-primary transition-colors w-full"
            >
              <Info className="h-3.5 w-3.5" />
              <span>Versão {APP_VERSION}</span>
            </button>
            <button
              onClick={() => navigate("/manual")}
              className="flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-primary transition-colors w-full"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Manual do Usuário</span>
            </button>
            <button
              onClick={() => navigate("/technical-manual")}
              className="flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-primary transition-colors w-full"
            >
              <Info className="h-3.5 w-3.5" />
              <span>Manual Técnico</span>
            </button>
          </div>
        )}

        {/* Powered by SIGLA Cargo */}
        <div className="flex flex-col items-center gap-1 pt-1">
          {!collapsed ? (
            <>
              <span className="text-[9px] text-sidebar-foreground/40 uppercase tracking-widest">Powered by</span>
              <img src={logo} alt="SIGLA Cargo" className="h-6 object-contain opacity-60 hover:opacity-100 transition-opacity" />
              <p className="text-[9px] text-sidebar-foreground/30 leading-tight mt-0.5">
                LATOP Tecnologia da Informação Ltda
              </p>
            </>
          ) : (
            <img src={logo} alt="SIGLA Cargo" className="h-5 object-contain opacity-50 hover:opacity-100 transition-opacity" />
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
