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
  Landmark, Flag, Clock, Timer, Navigation, Container, Shield,
  ChevronDown, BookOpen, Info, ChevronsUpDown, ChevronsDownUp, LayoutDashboard, GraduationCap,
  FileText, Wrench, ArrowLeftRight, Radio, ScrollText, BarChart3,
  ShieldAlert, Target,
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
import { useLocalizedLogos } from "@/hooks/use-localized-logos";
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
    labelKey: "sidebar.maintenance",
    items: [
      { titleKey: "menu.vehicleMaintenance", url: "/vehicle-maintenance", icon: Wrench },
      { titleKey: "menu.mileageHourmeter", url: "/mileage-hourmeter", icon: Cpu },
      { titleKey: "menu.preventiveMaintenance", url: "/preventive-maintenance", icon: CalendarDays },
      { titleKey: "menu.correctiveMaintenance", url: "/corrective-maintenance", icon: Wrench },
      { titleKey: "menu.downtimeRecord", url: "/downtime-record", icon: Timer },
      { titleKey: "menu.reserveFleet", url: "/reserve-fleet", icon: Shield },
    ],
  },
  {
    labelKey: "sidebar.monitoring",
    items: [
      { titleKey: "menu.departuresAndArrivals", url: "/departures-and-arrivals", icon: Truck },
      { titleKey: "menu.releaseDriver", url: "/release-driver", icon: UserMinus },
      { titleKey: "menu.dailyVehicleAssignment", url: "/daily-vehicle-assignment", icon: Car },
      { titleKey: "menu.driverAvailability", url: "/driver-availability", icon: Radio },
    ],
  },
  {
    labelKey: "sidebar.driverSchedule",
    items: [
      { titleKey: "menu.driversRequest", url: "/drivers-request", icon: UserCheck },
      { titleKey: "menu.driversSchedule", url: "/drivers-schedule", icon: Users },
      { titleKey: "menu.publishJourney", url: "/publish-journey", icon: Megaphone },
      { titleKey: "menu.driverVacation", url: "/driver-vacation", icon: CalendarDays },
      { titleKey: "menu.trainingClass", url: "/training-class", icon: GraduationCap },
      { titleKey: "menu.driverOccurrence", url: "/driver-occurrence", icon: ClipboardList },
      { titleKey: "menu.medicalCertificate", url: "/medical-certificate", icon: ShieldAlert },
      { titleKey: "menu.driverDocuments", url: "/driver-documents", icon: FileText },
      { titleKey: "menu.overtimeBank", url: "/overtime-bank", icon: Clock },
      { titleKey: "menu.shiftSwap", url: "/shift-swap", icon: ArrowLeftRight },
      { titleKey: "menu.journeyRules", url: "/journey-rules", icon: Scale },
    ],
  },
  {
    labelKey: "sidebar.imports",
    items: [
      { titleKey: "menu.importDemands", url: "/import-map", icon: FileUp },
    ],
  },
  {
    labelKey: "sidebar.planning",
    items: [
      
      { titleKey: "menu.planningModel", url: "/planning-model", icon: LayoutTemplate },
      { titleKey: "menu.scenarios", url: "/scenarios", icon: Layers },
      { titleKey: "menu.strategicPlanning", url: "/strategic-planning", icon: Target },
      { titleKey: "menu.tripOptimization", url: "/trip-optimization", icon: Cpu },
      { titleKey: "menu.vehiclePlanning", url: "/vehicle-planning", icon: Truck },
      { titleKey: "menu.smartAllocation", url: "/smart-allocation", icon: Cpu },
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
      { titleKey: "menu.course", url: "/course", icon: GraduationCap },
      { titleKey: "menu.company", url: "/company", icon: Landmark },
      { titleKey: "menu.country", url: "/country", icon: Globe2 },
      { titleKey: "menu.driver", url: "/driver", icon: User },
      { titleKey: "menu.fleetBrand", url: "/fleet-brand", icon: Car },
      { titleKey: "menu.fleetGroup", url: "/fleet-group", icon: FolderTree },
      { titleKey: "menu.fleetModel", url: "/fleet-model", icon: Boxes },
      { titleKey: "menu.fleetType", url: "/fleet-type", icon: CircleDot },
      { titleKey: "menu.justification", url: "/justification", icon: Scale },
      { titleKey: "menu.license", url: "/license", icon: Shield },
      { titleKey: "menu.line", url: "/line", icon: Milestone },
      { titleKey: "menu.locationGroup", url: "/location-group", icon: Map },
      { titleKey: "menu.locationType", url: "/location-type", icon: Waypoints },
      { titleKey: "menu.location", url: "/location", icon: MapPin },
      { titleKey: "menu.locationFrequency", url: "/location-frequency", icon: Clock },
      { titleKey: "menu.position", url: "/position", icon: Navigation },
      { titleKey: "menu.regulationRule", url: "/regulation-rule", icon: Scale },
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
    labelKey: "sidebar.analytics",
    items: [
      { titleKey: "menu.operationalKpis", url: "/operational-kpis", icon: BarChart3 },
      { titleKey: "menu.analytics", url: "/analytics", icon: BarChart3 },
    ],
  },
  {
    labelKey: "sidebar.admin",
    items: [
      { titleKey: "menu.adminParameters", url: "/admin-parameters", icon: Zap },
      { titleKey: "menu.userManagement", url: "/user-management", icon: Users },
      { titleKey: "menu.auditLog", url: "/audit-log", icon: ScrollText },
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
  const { siglaLogo, siglaLogoWhite, latopLogo } = useLocalizedLogos();
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
      {/* Top bar - white/dark background for client logo */}
      <div className="h-16 flex items-center justify-center px-4 border-b border-sidebar-border bg-background">
        {!collapsed && (
          <img src={clientLogo} alt="PepsiCo" className="h-9 object-contain mx-auto" />
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

        {/* SIGLA Cargo logo - white/dark background strip */}
        <div className="flex flex-col items-center pt-2 pb-1 -mx-3 -mb-3 px-3 bg-background border-t border-sidebar-border">
          <img src={siglaLogoWhite} alt="SIGLA Cargo" className={cn(
            "object-contain max-w-[140px]",
            collapsed ? "h-5 max-w-[36px]" : "h-8"
          )} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
