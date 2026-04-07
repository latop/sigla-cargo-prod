import { Wrench, AlertTriangle, CheckCircle2, Clock, Truck } from "lucide-react";
import { MockPage } from "./MockPageTemplate";

const stats = [
  { label: "Veículos em Manutenção", value: 12, icon: Wrench },
  { label: "Manutenções Agendadas", value: 28, icon: Clock },
  { label: "Concluídas (mês)", value: 45, badge: { text: "+8%", variant: "default" as const }, icon: CheckCircle2 },
  { label: "Atrasadas", value: 5, badge: { text: "Crítico", variant: "destructive" as const }, icon: AlertTriangle },
];

const columns = [
  { key: "plate", label: "Placa" },
  { key: "type", label: "Tipo Manutenção" },
  { key: "description", label: "Descrição" },
  { key: "scheduled", label: "Data Agendada" },
  { key: "km", label: "Km Atual" },
  { key: "status", label: "Status" },
];

const data = [
  { plate: "ABC-1D23", type: "Preventiva", description: "Troca de óleo e filtros", scheduled: "02/04/2026", km: "125.430", status: "scheduled" },
  { plate: "DEF-4E56", type: "Corretiva", description: "Reparo sistema freios", scheduled: "28/03/2026", km: "89.200", status: "in_progress" },
  { plate: "GHI-7F89", type: "Preventiva", description: "Revisão 50.000 km", scheduled: "05/04/2026", km: "49.800", status: "scheduled" },
  { plate: "JKL-0G12", type: "Preventiva", description: "Troca de pneus", scheduled: "25/03/2026", km: "78.600", status: "overdue" },
  { plate: "MNO-3H45", type: "Corretiva", description: "Sensor de temperatura", scheduled: "30/03/2026", km: "156.100", status: "in_progress" },
  { plate: "PQR-6I78", type: "Preventiva", description: "Alinhamento e balanceamento", scheduled: "01/04/2026", km: "34.500", status: "scheduled" },
  { plate: "STU-9J01", type: "Inspeção", description: "Inspeção veicular anual", scheduled: "10/04/2026", km: "201.300", status: "scheduled" },
  { plate: "VWX-2K34", type: "Corretiva", description: "Substituição bateria", scheduled: "29/03/2026", km: "67.800", status: "completed" },
];

const statusMap = {
  scheduled: { label: "Agendada", variant: "secondary" as const },
  in_progress: { label: "Em Andamento", variant: "default" as const },
  completed: { label: "Concluída", variant: "outline" as const },
  overdue: { label: "Atrasada", variant: "destructive" as const },
};

export default function VehicleMaintenancePage() {
  return (
    <MockPage
      title="Manutenção de Veículos"
      icon={Wrench}
      stats={stats}
      columns={columns}
      data={data}
      statusField="status"
      statusMap={statusMap}
    />
  );
}
