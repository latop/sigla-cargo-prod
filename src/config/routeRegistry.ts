import React from "react";

const lazyRoutes: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  "/home": () => import("@/pages/Dashboard"),
  "/changelog": () => import("@/pages/Changelog"),
  "/manual": () => import("@/pages/Manual"),
  "/technical-manual": () => import("@/pages/TechnicalManual"),
  "/admin-parameters": () => import("@/pages/AdminParameters"),
  "/activity": () => import("@/pages/ActivityPage"),
  "/activity-type": () => import("@/pages/ActivityTypePage"),
  "/driver": () => import("@/pages/DriverPage"),
  "/daily-trip": () => import("@/pages/DailyTripPage"),
  "/line": () => import("@/pages/LinePage"),
  "/import-map": () => import("@/pages/ImportMapPage"),
  "/release-driver": () => import("@/pages/JourneyReleasePage"),
  "/drivers-request": () => import("@/pages/DriverRequestPage"),
  "/publish-journey": () => import("@/pages/ComingSoonPage"),
  "/reports": () => import("@/pages/ReportsPage"),
  "/daily-trips-schedule": () => import("@/pages/TripSchedulePage"),
  "/departures-and-arrivals": () => import("@/pages/ArrivalDeparturePage"),
  "/drivers-schedule": () => import("@/pages/ComingSoonPage"),
  "/scenarios": () => import("@/pages/ComingSoonPage"),
  "/planning-model": () => import("@/pages/ComingSoonPage"),
  "/trip-optimization": () => import("@/pages/ComingSoonPage"),
  "/vehicle-planning": () => import("@/pages/ComingSoonPage"),
};

const componentCache: Record<string, React.ComponentType> = {};

const GenericPageLazy = React.lazy(() => import("@/pages/GenericPage"));

export function getRouteComponent(path: string): React.ComponentType {
  if (componentCache[path]) return componentCache[path];

  const loader = lazyRoutes[path];
  if (loader) {
    const LazyComponent = React.lazy(loader);
    componentCache[path] = LazyComponent;
    return LazyComponent;
  }

  return GenericPageLazy;
}
