import { Calendar, CheckCircle2, Clock, Settings } from "lucide-react";
import { MockPage } from "./MockPageTemplate";

const stats = [
  { label: "Planos Ativos", value: 24, icon: Settings },
  { label: "Próximos 7 Dias", value: 11, icon: Calendar },
  { label: "Em Dia", value: 18, badge: { text: "75%", variant: "default" as const }, icon: CheckCircle2 },
  { label: "Atrasados", value: 6, badge: { text: "Crítico", variant: "destructive" as const }, icon: Clock },
];

const columns = [
  { key: "plate", label: "Placa" },
  { key: "plan", label: "Plano" },
  { key: "description", label: "Descrição" },
  { key: "frequency", label: "Frequência" },
  { key: "lastExec", label: "Última Execução" },
  { key: "nextExec", label: "Próxima Execução" },
  { key: "kmTrigger", label: "Km Gatilho" },
  { key: "status", label: "Status" },
];

const data = [
  { plate: "ABC-1D23", plan: "REV-001", description: "Troca de óleo e filtros", frequency: "10.000 km", lastExec: "15/02/2026", nextExec: "15/04/2026", kmTrigger: "135.000", status: "on_schedule" },
  { plate: "DEF-4E56", plan: "REV-002", description: "Revisão de freios", frequency: "30.000 km", lastExec: "10/01/2026", nextExec: "10/05/2026", kmTrigger: "119.000", status: "on_schedule" },
  { plate: "GHI-7F89", plan: "REV-003", description: "Revisão geral 50.000 km", frequency: "50.000 km", lastExec: "01/12/2025", nextExec: "01/04/2026", kmTrigger: "50.000", status: "due_soon" },
  { plate: "JKL-0G12", plan: "REV-001", description: "Troca de óleo e filtros", frequency: "10.000 km", lastExec: "20/11/2025", nextExec: "20/01/2026", kmTrigger: "88.000", status: "overdue" },
  { plate: "MNO-3H45", plan: "REV-004", description: "Troca de pneus", frequency: "60.000 km", lastExec: "05/03/2026", nextExec: "05/09/2026", kmTrigger: "216.000", status: "on_schedule" },
  { plate: "PQR-6I78", plan: "REV-002", description: "Revisão de freios", frequency: "30.000 km", lastExec: "22/12/2025", nextExec: "22/03/2026", kmTrigger: "64.000", status: "overdue" },
  { plate: "STU-9J01", plan: "REV-005", description: "Inspeção veicular anual", frequency: "Anual", lastExec: "10/04/2025", nextExec: "10/04/2026", kmTrigger: "-", status: "due_soon" },
];

const statusMap = {
  on_schedule: { label: "Em Dia", variant: "default" as const },
  due_soon: { label: "Próximo", variant: "secondary" as const },
  overdue: { label: "Atrasado", variant: "destructive" as const },
};

export default function PreventiveMaintenancePage() {
  return (
    <MockPage
      title="Manutenção Preventiva"
      icon={Calendar}
      stats={stats}
      columns={columns}
      data={data}
      statusField="status"
      statusMap={statusMap}
    />
  );
}
