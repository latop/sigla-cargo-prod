import { BarChart3, Clock, Truck, ShieldCheck, TrendingUp } from "lucide-react";
import { MockPage } from "./MockPageTemplate";

const stats = [
  { label: "Pontualidade", value: "87%", badge: { text: "Meta: 95%", variant: "secondary" as const }, icon: Clock },
  { label: "Utilização de Frota", value: "78%", badge: { text: "+3%", variant: "default" as const }, icon: Truck },
  { label: "Compliance Jornada", value: "94%", icon: ShieldCheck },
  { label: "Índice Geral", value: "86%", badge: { text: "B+", variant: "default" as const }, icon: TrendingUp },
];

const columns = [
  { key: "kpi", label: "Indicador" },
  { key: "current", label: "Atual" },
  { key: "target", label: "Meta" },
  { key: "previous", label: "Mês Anterior" },
  { key: "trend", label: "Tendência" },
  { key: "status", label: "Status" },
];

const data = [
  { kpi: "Taxa de Pontualidade", current: "87,2%", target: "95,0%", previous: "85,1%", trend: "↑ +2,1%", status: "warning" },
  { kpi: "Taxa de Conclusão", current: "96,5%", target: "98,0%", previous: "95,8%", trend: "↑ +0,7%", status: "ok" },
  { kpi: "Taxa de Cancelamento", current: "2,1%", target: "<3,0%", previous: "2,8%", trend: "↓ -0,7%", status: "ok" },
  { kpi: "Utilização de Frota", current: "78,3%", target: "85,0%", previous: "75,0%", trend: "↑ +3,3%", status: "warning" },
  { kpi: "Compliance de Jornada", current: "94,1%", target: "98,0%", previous: "93,5%", trend: "↑ +0,6%", status: "warning" },
  { kpi: "Horas Extras / Total", current: "12,4%", target: "<10,0%", previous: "14,2%", trend: "↓ -1,8%", status: "critical" },
  { kpi: "Tempo Médio de Viagem", current: "4h 12min", target: "4h 00min", previous: "4h 25min", trend: "↓ -13min", status: "ok" },
  { kpi: "Ocorrências / 1000 viagens", current: "3,2", target: "<2,0", previous: "3,8", trend: "↓ -0,6", status: "warning" },
];

const statusMap = {
  ok: { label: "Na Meta", variant: "default" as const },
  warning: { label: "Atenção", variant: "secondary" as const },
  critical: { label: "Crítico", variant: "destructive" as const },
};

export default function OperationalKpisPage() {
  return (
    <MockPage
      title="KPIs Operacionais"
      icon={BarChart3}
      stats={stats}
      columns={columns}
      data={data}
      statusField="status"
      statusMap={statusMap}
    />
  );
}
