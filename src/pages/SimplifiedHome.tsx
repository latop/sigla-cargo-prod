import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { LayoutDashboard, UserMinus, Truck, CalendarDays, Users, Route, FileBarChart, FolderTree } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useTabs } from "@/contexts/TabsContext";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/contexts/ProfileContext";
import { Card } from "@/components/ui/card";

type Shortcut = {
  url: string;
  titleKey: string;
  descKey: string;
  icon: React.ComponentType<{ className?: string }>;
};

const PORTARIA_SHORTCUTS: Shortcut[] = [
  { url: "/release-driver", titleKey: "menu.releaseDriver", descKey: "home.shortcuts.releaseDriverDesc", icon: UserMinus },
  { url: "/departures-and-arrivals", titleKey: "menu.departuresAndArrivals", descKey: "home.shortcuts.arrivalDesc", icon: Truck },
];

const EXECUCAO_SHORTCUTS: Shortcut[] = [
  { url: "/release-driver", titleKey: "menu.releaseDriver", descKey: "home.shortcuts.releaseDriverDesc", icon: UserMinus },
  { url: "/departures-and-arrivals", titleKey: "menu.departuresAndArrivals", descKey: "home.shortcuts.arrivalDesc", icon: Truck },
  { url: "/daily-trip", titleKey: "menu.dailyTrip", descKey: "home.shortcuts.dailyTripDesc", icon: CalendarDays },
  { url: "/drivers-schedule", titleKey: "menu.driversSchedule", descKey: "home.shortcuts.driverScheduleDesc", icon: Users },
  { url: "/daily-trips-schedule", titleKey: "menu.dailyTripsSchedule", descKey: "home.shortcuts.tripScheduleDesc", icon: Route },
  { url: "/reports", titleKey: "sidebar.reports", descKey: "home.shortcuts.reportsDesc", icon: FileBarChart },
];

const SimplifiedHome = () => {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { openTab } = useTabs();
  const navigate = useNavigate();
  usePageTitle(t("dashboard.title"), LayoutDashboard);

  const shortcuts = profile === "portaria" ? PORTARIA_SHORTCUTS : EXECUCAO_SHORTCUTS;

  const open = (s: Shortcut) => {
    openTab({ id: s.url, titleKey: s.titleKey, icon: s.icon });
    navigate(s.url);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">
          {t("home.welcomeTitle")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t(`profile.${profile}.title`)} — {t("home.welcomeSub")}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shortcuts.map((s, i) => (
          <motion.div
            key={s.url}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card
              onClick={() => open(s)}
              className="cursor-pointer p-5 hover:shadow-md hover:border-primary transition-all h-full"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-display font-bold text-foreground">
                    {t(s.titleKey)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {t(s.descKey)}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
        {profile === "execucao" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * EXECUCAO_SHORTCUTS.length }}
          >
            <Card
              onClick={() => navigate("/driver")}
              className="cursor-pointer p-5 hover:shadow-md hover:border-primary transition-all h-full"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
                  <FolderTree className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-display font-bold text-foreground">
                    {t("sidebar.register")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {t("home.shortcuts.registerDesc")}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SimplifiedHome;
