import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar, getMenuItemByPath } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Globe, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TabBar } from "@/components/TabBar";
import { TabsProvider, useTabs } from "@/contexts/TabsContext";
import { getRouteComponent } from "@/config/routeRegistry";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const languages = [
  { code: "pt", label: "Português" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];

export interface PageContext {
  setPageTitle: (title: string) => void;
  setPageIcon: (icon: React.ComponentType<{ className?: string }> | null) => void;
}

function AppLayoutInner() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { tabs, activeTabId, openTab } = useTabs();
  const [pageTitle, setPageTitle] = useState("");
  const [PageIcon, setPageIcon] = useState<React.ComponentType<{ className?: string }> | null>(null);

  // Sync URL to active tab on mount / URL change
  useEffect(() => {
    const path = location.pathname;
    if (path === "/dashboard" || path === "/changelog" || path === "/manual" || path === "/technical-manual") {
      // These are utility pages, don't force into tabs
      return;
    }
    const menuItem = getMenuItemByPath(path);
    if (menuItem) {
      openTab({ id: path, titleKey: menuItem.titleKey, icon: menuItem.icon });
    }
  }, [location.pathname]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
  };

  // Determine what to render: tabs content or regular outlet
  const isTabRoute = tabs.some((t) => t.id === location.pathname);
  const showTabContent = tabs.length > 0;

  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-10 flex items-center justify-between border-b px-4 bg-card">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            {PageIcon && <PageIcon className="h-4 w-4 text-primary" />}
            {pageTitle && (
              <h1 className="text-sm font-display font-bold text-foreground truncate">
                {pageTitle}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  <Globe className="h-3.5 w-3.5 mr-1" />
                  {i18n.language.toUpperCase()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                  >
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => navigate("/login")}
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              {t("common.logout")}
            </Button>
          </div>
        </header>
        <TabBar />
        <main className="flex-1 overflow-auto relative">
          {/* Render all open tabs, keep them mounted, hide inactive */}
          {tabs.map((tab) => {
            const Component = getRouteComponent(tab.id);
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                className="h-full"
                style={{ display: isActive ? "block" : "none" }}
              >
                <div className="p-4 h-full">
                  <TabPageWrapper
                    tabId={tab.id}
                    setPageTitle={setPageTitle}
                    setPageIcon={setPageIcon}
                    isActive={isActive}
                  >
                    <Component />
                  </TabPageWrapper>
                </div>
              </div>
            );
          })}
          {/* Utility pages (changelog, manual, etc.) */}
          {(() => {
            const utilityPaths = ["/changelog", "/manual", "/technical-manual"];
            const currentPath = location.pathname;
            if (utilityPaths.includes(currentPath)) {
              const UtilityComponent = getRouteComponent(currentPath);
              return (
                <div className="p-4 h-full">
                  <PageContextProvider setPageTitle={setPageTitle} setPageIcon={setPageIcon} isActive={true}>
                    <UtilityComponent />
                  </PageContextProvider>
                </div>
              );
            }
            return null;
          })()}
          {/* If no tabs and not a utility page, show dashboard */}
          {tabs.length === 0 && !["/changelog", "/manual", "/technical-manual"].includes(location.pathname) && (
            <div className="p-4 h-full">
              <DashboardFallback setPageTitle={setPageTitle} setPageIcon={setPageIcon} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Wrapper that provides page context to tab pages
function TabPageWrapper({
  tabId,
  children,
  setPageTitle,
  setPageIcon,
  isActive,
}: {
  tabId: string;
  children: React.ReactNode;
  setPageTitle: (t: string) => void;
  setPageIcon: (i: React.ComponentType<{ className?: string }> | null) => void;
  isActive: boolean;
}) {
  // Each tab page uses usePageTitle which calls setPageTitle via outlet context
  // We need to provide that context. Since we're not using Outlet anymore,
  // we provide it via a wrapper context.
  return (
    <PageContextProvider setPageTitle={setPageTitle} setPageIcon={setPageIcon} isActive={isActive}>
      {children}
    </PageContextProvider>
  );
}

// We need to make usePageTitle work without Outlet context
// Let's create a context that replaces it
import React, { createContext, useContext } from "react";

const PageCtx = createContext<PageContext | null>(null);

function PageContextProvider({
  children,
  setPageTitle,
  setPageIcon,
  isActive,
}: {
  children: React.ReactNode;
  setPageTitle: (t: string) => void;
  setPageIcon: (i: React.ComponentType<{ className?: string }> | null) => void;
  isActive: boolean;
}) {
  const ctx: PageContext = {
    setPageTitle: isActive ? setPageTitle : () => {},
    setPageIcon: isActive ? setPageIcon : () => {},
  };
  return <PageCtx.Provider value={ctx}>{children}</PageCtx.Provider>;
}

export function usePageContext(): PageContext | undefined {
  return useContext(PageCtx) || undefined;
}

function DashboardFallback({
  setPageTitle,
  setPageIcon,
}: {
  setPageTitle: (t: string) => void;
  setPageIcon: (i: React.ComponentType<{ className?: string }> | null) => void;
}) {
  const Dashboard = getRouteComponent("/dashboard");
  return (
    <PageContextProvider setPageTitle={setPageTitle} setPageIcon={setPageIcon} isActive={true}>
      <Dashboard />
    </PageContextProvider>
  );
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <TabsProvider>
        <AppLayoutInner />
      </TabsProvider>
    </SidebarProvider>
  );
}
