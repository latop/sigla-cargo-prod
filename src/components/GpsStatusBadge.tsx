import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Activity, AlertTriangle, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { cn } from "@/lib/utils";

/**
 * Small status pill that polls GET /api/timed-service/status
 * to show whether the GPS integration is currently active.
 */
export function GpsStatusBadge({ className }: { className?: string }) {
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["timed-service-status"],
    queryFn: async () => {
      const res = await authFetch("/api/timed-service/status");
      if (!res.ok) throw new Error("status request failed");
      // Tolerate different response shapes
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) return await res.json();
      return await res.text();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });

  // Infer active flag from common shapes
  const active = (() => {
    if (isLoading || isError || data == null) return null;
    if (typeof data === "boolean") return data;
    if (typeof data === "string") {
      const s = data.toLowerCase();
      return s.includes("active") || s.includes("running") || s === "true" || s === "ok";
    }
    if (typeof data === "object") {
      const d = data as Record<string, unknown>;
      if (typeof d.running === "boolean") return d.running;
      if (typeof d.active === "boolean") return d.active;
      if (typeof d.isActive === "boolean") return d.isActive;
      if (typeof d.enabled === "boolean") return d.enabled;
      if (typeof d.status === "string") {
        const s = (d.status as string).toLowerCase();
        return s.includes("active") || s.includes("running") || s === "ok";
      }
    }
    return null;
  })();

  const tone =
    isLoading
      ? "border-border bg-muted text-muted-foreground"
      : active === true
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : active === false
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";

  const Icon = isLoading ? Loader2 : active === true ? Activity : AlertTriangle;

  const label = isLoading
    ? t("gps.checking")
    : active === true
    ? t("gps.active")
    : active === false
    ? t("gps.inactive")
    : t("gps.unknown");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tone,
        className,
      )}
      title={t("gps.tooltip")}
    >
      <Icon className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
      {label}
    </span>
  );
}
