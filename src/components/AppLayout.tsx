import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar, getMenuItemByPath } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Globe, LogOut, UserCog } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TabBar } from "@/components/TabBar";
import { FunctionSearch } from "@/components/FunctionSearch";
import { TabsProvider, useTabs } from "@/contexts/TabsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, isPathAllowedForProfile } from "@/contexts/ProfileContext";
import ProfileSelect from "@/pages/ProfileSelect";
import SimplifiedHome from "@/pages/SimplifiedHome";
import { getRouteComponent, shouldRedirectFromMockPath } from "@/config/routeRegistry";
import { toast } from "sonner";
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
  const { tabs, activeTabId, openTab, closeTab } = useTabs();
  const { logout, user } = useAuth();
  const isPasswordAuth = !!user?.accessToken;
  const { profile, clearProfile } = useProfile();
  const [pageTitle, setPageTitle] = useState("");
  const [PageIcon, setPageIcon] = useState<React.ComponentType<{ className?: string }> | null>(null);

  // Enforce profile access by redirecting disallowed paths to /home (UI guidance only)
  useEffect(() => {
    if (!profile) return;
    const path = location.pathname;
    const utility = ["/home", "/changelog", "/manual", "/technical-manual"];
    if (utility.includes(path)) return;
    // SSO users (no accessToken) cannot access mock screens
    if (shouldRedirectFromMockPath(path, isPasswordAuth)) {
      if (tabs.some((t) => t.id === path)) closeTab(path);
      toast.warning(
        t(
          "access.mockBlockedForSSO",
          "Esta tela ainda está em desenvolvimento (mock) e só está disponível para acesso com usuário e senha. Usuários SSO veem apenas as telas concluídas."
        )
      );
      navigate("/home", { replace: true });
      return;
    }
    if (!isPathAllowedForProfile(profile, path)) {
      if (tabs.some((t) => t.id === path)) closeTab(path);
      navigate("/home", { replace: true });
    }
  }, [location.pathname, profile, isPasswordAuth]);

  // Sync URL to active tab on mount / URL change
  useEffect(() => {
    const path = location.pathname;
    if (path === "/home" || path === "/changelog" || path === "/manual" || path === "/technical-manual") {
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

  // If no operational profile selected yet, render selection screen (after all hooks)
  if (!profile) {
    return <ProfileSelect />;
  }

  const isRestrictedProfile = profile === "portaria" || profile === "execucao";

  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <div className="flex-1 flex min-h-0 flex-col">
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
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => clearProfile()}
              title={t("profile.switch")}
            >
              <UserCog className="h-3.5 w-3.5 mr-1" />
              <span className="hidden md:inline">{t("profile.switch")}</span>
            </Button>
            <ThemeToggle />
            <FunctionSearch />
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
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              {t("common.logout")}
            </Button>
          </div>
        </header>
        <TabBar />
        <main className="relative min-h-0 flex-1 overflow-auto">
          <React.Suspense fallback={<div className="flex items-center justify-center h-full"><span className="text-muted-foreground text-sm">Carregando...</span></div>}>
            {/* Render all open tabs, keep them mounted, hide inactive */}
            {tabs.map((tab) => {
              const Component = getRouteComponent(tab.id);
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  className="h-full min-h-0"
                  style={{ display: isActive ? "block" : "none" }}
                >
                  <div className="flex h-full min-h-0 flex-col p-4">
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
                  <div className="flex h-full min-h-0 flex-col p-4">
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
              <div className="flex h-full min-h-0 flex-col p-4">
                <DashboardFallback setPageTitle={setPageTitle} setPageIcon={setPageIcon} useSimplified={isRestrictedProfile} />
              </div>
            )}
          </React.Suspense>
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
  useSimplified,
}: {
  setPageTitle: (t: string) => void;
  setPageIcon: (i: React.ComponentType<{ className?: string }> | null) => void;
  useSimplified?: boolean;
}) {
  const Component = useSimplified ? SimplifiedHome : getRouteComponent("/home");
  return (
    <PageContextProvider setPageTitle={setPageTitle} setPageIcon={setPageIcon} isActive={true}>
      <Component />
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
