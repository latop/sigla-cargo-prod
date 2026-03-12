import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Mail, Lock, LogIn, KeyRound, Globe, Loader2 } from "lucide-react";
import { API_BASE } from "@/config/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import logo from "@/assets/logo-sigla-cargo.png";
import clientLogo from "@/assets/client-logo.png";

const languages = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
];

const Login = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ssoLoading, setSsoLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: integrate with API auth
    localStorage.setItem("userName", email.split("@")[0]);
    navigate("/dashboard");
  };

  const handleSSO = async () => {
    setSsoLoading(true);
    try {
      const response = await fetch(`${API_BASE}/Auth/Login`);
      if (!response.ok) throw new Error("Erro ao conectar com SSO");
      const redirectUrl = await response.text();
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error("URL de redirecionamento não recebida");
      }
    } catch (error) {
      toast.error(t("login.ssoError", "Erro ao iniciar login SSO. Tente novamente."));
      console.error("SSO error:", error);
    } finally {
      setSsoLoading(false);
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{ backgroundColor: "hsl(208, 100%, 29%)" }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary-foreground/20 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary-foreground/10 blur-3xl" />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center px-12"
        >
          <img src={clientLogo} alt="Client Logo" className="w-72 mx-auto drop-shadow-2xl" />
        </motion.div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          {/* Language switcher */}
          <div className="flex justify-end mb-8 gap-1">
            <Globe className="h-4 w-4 text-muted-foreground mr-1 mt-1" />
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  i18n.language === lang.code
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Logo for mobile */}
          <div className="lg:hidden mb-8 flex justify-center">
            <img src={clientLogo} alt="Client Logo" className="w-48" />
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-display font-bold text-foreground">
              {t("login.title")}
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("login.email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="nome@empresa.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="password">{t("login.password")}</Label>
                <button type="button" className="text-xs text-primary hover:underline">
                  {t("login.forgotPassword")}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button type="submit" className="w-full font-semibold" size="lg">
              <LogIn className="mr-2 h-4 w-4" />
              {t("login.signIn")}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground uppercase">{t("login.or")}</span>
            <Separator className="flex-1" />
          </div>

          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={handleSSO}
            disabled={ssoLoading}
          >
            {ssoLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            {t("login.sso")}
          </Button>

          {/* Powered by */}
          <div className="mt-10 flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Powered by</span>
            <img src={logo} alt="SIGLA Cargo" className="h-7 object-contain opacity-80 hover:opacity-100 transition-opacity" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
