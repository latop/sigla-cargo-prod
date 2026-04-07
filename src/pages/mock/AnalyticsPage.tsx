import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { motion } from "framer-motion";

const dashboards = [
  { name: "Visão Executiva", description: "KPIs consolidados, tendências mensais e comparativo entre bases", status: "Disponível", category: "Estratégico" },
  { name: "Operação de Viagens", description: "Pontualidade, conclusão, cancelamentos e atrasos por período", status: "Disponível", category: "Operacional" },
  { name: "Gestão de Frota", description: "Utilização, manutenções, km rodados e custo por veículo", status: "Disponível", category: "Operacional" },
  { name: "Escala de Motoristas", description: "Compliance de jornada, horas extras, banco de horas e DSR", status: "Em desenvolvimento", category: "RH" },
  { name: "Financeiro", description: "Custo por viagem, por km e por tonelada transportada", status: "Em desenvolvimento", category: "Financeiro" },
  { name: "Segurança e Compliance", description: "Violações de jornada, ocorrências e indicadores de risco", status: "Planejado", category: "Segurança" },
];

export default function AnalyticsPage() {
  usePageTitle("Analytics", BarChart3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 p-4"
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Dashboards Power BI</CardTitle>
          <p className="text-sm text-muted-foreground">
            Painéis analíticos integrados para tomada de decisão
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {dashboards.map((d, i) => (
              <Card key={i} className="border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-foreground text-sm">{d.name}</h3>
                    <Badge
                      variant={
                        d.status === "Disponível" ? "default" :
                        d.status === "Em desenvolvimento" ? "secondary" : "outline"
                      }
                      className="text-[10px] shrink-0"
                    >
                      {d.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{d.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">{d.category}</Badge>
                    <Button
                      size="sm"
                      variant={d.status === "Disponível" ? "default" : "outline"}
                      disabled={d.status !== "Disponível"}
                      className="h-7 text-xs"
                    >
                      {d.status === "Disponível" ? "Abrir" : "Em breve"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
