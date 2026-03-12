import { useEffect } from "react";
import { usePageContext } from "@/components/AppLayout";

export function usePageTitle(title: string, icon?: React.ComponentType<{ className?: string }>) {
  const context = usePageContext();

  useEffect(() => {
    context?.setPageTitle(title);
    context?.setPageIcon(icon || null);
    return () => {
      context?.setPageTitle("");
      context?.setPageIcon(null);
    };
  }, [title, icon, context]);
}
