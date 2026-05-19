import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ShieldCheck, Truck, BarChart3, Settings2, LogOut } from "lucide-react";
import { useProfile, OperationalProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocalizedLogos } from "@/hooks/use-localized-logos";
import clientLogo from "@/assets/client-logo.png";

type ProfileOption = {
  id: OperationalProfile;
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descKey: string;
};

const OPTIONS: ProfileOption[] = [
  { id: "portaria",  icon: ShieldCheck, titleKey: "profile.portaria.title",  descKey: "profile.portaria.desc" },
  { id: "execucao",  icon: Truck,       titleKey: "profile.execucao.title",  descKey: "profile.execucao.desc" },
  { id: "gestao",    icon: BarChart3,   titleKey: "profile.gestao.title",    descKey: "profile.gestao.desc" },
  { id: "admin",     icon: Settings2,   titleKey: "profile.admin.title",     descKey: "profile.admin.desc" },
];

const ProfileSelect = () => {
  const { t } = useTranslation();
  const { setProfile } = useProfile();
  const { logout, user } = useAuth();
  const { siglaLogo } = useLocalizedLogos();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 border-b flex items-center justify-between px-6 bg-card">
        <div className="flex items-center gap-4">
          <img src={clientLogo} alt="PepsiCo" className="h-8 object-contain" />
          <img src={siglaLogo} alt="SIGLA Cargo" className="h-6 object-contain" />
        </div>
        <Button variant="ghost" size="sm" onClick={() => logout()}>
          <LogOut className="h-4 w-4 mr-1.5" />
          {t("common.logout")}
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-4xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              {t("profile.heading")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {user?.name ? `${t("profile.hello")}, ${user.name}. ` : ""}
              {t("profile.subheading")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {OPTIONS.map((opt, i) => (
              <motion.div
                key={opt.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <Card
                  onClick={() => setProfile(opt.id)}
                  className="cursor-pointer p-6 flex flex-col items-center text-center hover:shadow-lg hover:border-primary transition-all h-full"
                >
                  <div className="p-3 rounded-xl bg-primary/10 mb-3">
                    <opt.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-foreground mb-1">
                    {t(opt.titleKey)}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t(opt.descKey)}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-[11px] text-muted-foreground mt-6">
            {t("profile.footnote")}
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default ProfileSelect;
