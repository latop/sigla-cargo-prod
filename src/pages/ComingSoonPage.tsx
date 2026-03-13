import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const ComingSoonPage = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center h-full p-8">
      <Card className="max-w-md w-full border-dashed border-2 border-muted-foreground/30">
        <CardContent className="flex flex-col items-center gap-4 py-12 px-8 text-center">
          <div className="rounded-full bg-muted p-4">
            <Construction className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            {t("menu.comingSoon")}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("menu.comingSoonDesc")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComingSoonPage;
