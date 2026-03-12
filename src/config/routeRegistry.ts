import React from "react";
import Dashboard from "@/pages/Dashboard";
import GenericPage from "@/pages/GenericPage";
import Changelog from "@/pages/Changelog";
import Manual from "@/pages/Manual";
import TechnicalManual from "@/pages/TechnicalManual";
import AdminParameters from "@/pages/AdminParameters";
import ActivityPage from "@/pages/ActivityPage";
import ActivityTypePage from "@/pages/ActivityTypePage";
import DriverPage from "@/pages/DriverPage";
import DailyTripPage from "@/pages/DailyTripPage";
import LinePage from "@/pages/LinePage";
import ImportMapPage from "@/pages/ImportMapPage";
import JourneyReleasePage from "@/pages/JourneyReleasePage";
import ReportsPage from "@/pages/ReportsPage";
import TripSchedulePage from "@/pages/TripSchedulePage";

const customRoutes: Record<string, React.ComponentType> = {
  "/dashboard": Dashboard,
  "/changelog": Changelog,
  "/manual": Manual,
  "/technical-manual": TechnicalManual,
  "/admin-parameters": AdminParameters,
  "/activity": ActivityPage,
  "/activity-type": ActivityTypePage,
  "/driver": DriverPage,
  "/daily-trip": DailyTripPage,
  "/line": LinePage,
  "/import-map": ImportMapPage,
  "/release-driver": JourneyReleasePage,
  "/reports": ReportsPage,
  "/daily-trips-schedule": TripSchedulePage,
};

export function getRouteComponent(path: string): React.ComponentType {
  return customRoutes[path] || GenericPage;
}
