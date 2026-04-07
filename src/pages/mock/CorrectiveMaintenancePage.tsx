import { Wrench, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { MockPage } from "./MockPageTemplate";

const stats = [
  { label: "Ordens Abertas", value: 15, icon: Wrench },
  { label: "Em Execução", value: 8, icon: Clock },
  { label: "Concluídas (mês)", value: 32, badge: { text: "+12%", variant: "default" as const }, icon: CheckCircle2 },
  { label: "Urgentes", value: 4, badge: { text: "Crítico", variant: "destructive" as const }, icon: AlertTriangle },
];

const columns = [
  { key: "order", label: "Nº Ordem" },
  { key: "plate", label: "Placa" },
  { key: "defect", label: "Defeito Reportado" },
  { key: "priority", label: "Prioridade" },
  { key: "openDate", label: "Data Abertura" },
  { key: "responsible", label: "Responsável" },
  { key: "estimatedHours", label: "Horas Estimadas" },
  { key: "status", label: "Status" },
];

const data = [
  { order: "OC-2026-001", plate: "DEF-4E56", defect: "Falha no sistema de freios ABS", priority: "Alta", openDate: "30/03/2026", responsible: "Oficina Central", estimatedHours: "6h", status: "in_progress" },
  { order: "OC-2026-002", plate: "JKL-0G12", defect: "Vazamento de óleo no motor", priority: "Alta", openDate: "29/03/2026", responsible: "Oficina Central", estimatedHours: "8h", status: "in_progress" },
  { order: "OC-2026-003", plate: "MNO-3H45", defect: "Sensor de temperatura defeituoso", priority: "Média", openDate: "28/03/2026", responsible: "Elétrica Veicular", estimatedHours: "3h", status: "open" },
  { order: "OC-2026-004", plate: "ABC-1D23", defect: "Ruído na suspensão dianteira", priority: "Baixa", openDate: "27/03/2026", responsible: "Oficina Central", estimatedHours: "4h", status: "open" },
  { order: "OC-2026-005", plate: "VWX-2K34", defect: "Problema no alternador", priority: "Alta", openDate: "25/03/2026", responsible: "Elétrica Veicular", estimatedHours: "5h", status: "completed" },
  { order: "OC-2026-006", plate: "PQR-6I78", defect: "Trinca no para-brisa", priority: "Média", openDate: "26/03/2026", responsible: "Funilaria", estimatedHours: "2h", status: "open" },
  { order: "OC-2026-007", plate: "STU-9J01", defect: "Falha na embreagem", priority: "Alta", openDate: "01/04/2026", responsible: "Oficina Central", estimatedHours: "10h", status: "in_progress" },
];

const statusMap = {
  open: { label: "Aberta", variant: "secondary" as const },
  in_progress: { label: "Em Execução", variant: "default" as const },
  completed: { label: "Concluída", variant: "outline" as const },
};

export default function CorrectiveMaintenancePage() {
  return (
    <MockPage
      title="Manutenção Corretiva"
      icon={Wrench}
      stats={stats}
      columns={columns}
      data={data}
      statusField="status"
      statusMap={statusMap}
    />
  );
}
