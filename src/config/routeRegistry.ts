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
  "/license": () => import("@/pages/GenericPage"),
  "/release-driver": () => import("@/pages/JourneyReleasePage"),
  "/drivers-request": () => import("@/pages/DriverRequestPage"),
  "/publish-journey": () => import("@/pages/PublishJourneyPage"),
  "/reports": () => import("@/pages/ReportsPage"),
  "/daily-trips-schedule": () => import("@/pages/TripSchedulePage"),
  "/departures-and-arrivals": () => import("@/pages/ArrivalDeparturePage"),
  "/drivers-schedule": () => import("@/pages/DriverCircuitPage"),
  "/scenarios": () => import("@/pages/ScenarioPage"),
  "/planning-model": () => import("@/pages/GenericPage"),
  "/strategic-planning": () => import("@/pages/StrategicPlanningPage"),
  "/trip-optimization": () => import("@/pages/TripOptimizationPage"),
  "/vehicle-planning": () => import("@/pages/VehiclePlanningPage"),
  "/daily-vehicle-assignment": () => import("@/pages/DailyVehicleAssignmentPage"),
  "/driver-vacation": () => import("@/pages/DriverVacationPage"),
  "/training-class": () => import("@/pages/TrainingClassPage"),
  "/driver-occurrence": () => import("@/pages/DriverOccurrencePage"),
  "/driver-documents": () => import("@/pages/DriverDocumentsPage"),
  "/medical-certificate": () => import("@/pages/MedicalCertificatePage"),
  "/vehicle-maintenance": () => import("@/pages/mock/VehicleMaintenancePage"),
  "/mileage-hourmeter": () => import("@/pages/mock/MileageHourmeterPage"),
  "/preventive-maintenance": () => import("@/pages/mock/PreventiveMaintenancePage"),
  "/corrective-maintenance": () => import("@/pages/mock/CorrectiveMaintenancePage"),
  "/downtime-record": () => import("@/pages/mock/DowntimeRecordPage"),
  "/reserve-fleet": () => import("@/pages/mock/ReserveFleetPage"),
  "/journey-rules": () => import("@/pages/mock/JourneyRulesPage"),
  "/overtime-bank": () => import("@/pages/OvertimeBankPage"),
  "/smart-allocation": () => import("@/pages/mock/SmartAllocationPage"),
  "/shift-swap": () => import("@/pages/mock/ShiftSwapPage"),
  "/location-frequency": () => import("@/pages/LocationFrequencyPage"),
  "/driver-availability": () => import("@/pages/mock/DriverAvailabilityPage"),
  "/user-management": () => import("@/pages/mock/UserManagementPage"),
  "/audit-log": () => import("@/pages/mock/AuditLogPage"),
  "/operational-kpis": () => import("@/pages/mock/OperationalKpisPage"),
  "/analytics": () => import("@/pages/mock/AnalyticsPage"),
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
