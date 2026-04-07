import { ArrowLeftRight, Clock, CheckCircle2, XCircle, Users } from "lucide-react";
import { MockPage } from "./MockPageTemplate";

const stats = [
  { label: "Solicitações (mês)", value: 23, icon: ArrowLeftRight },
  { label: "Aprovadas", value: 18, badge: { text: "78%", variant: "default" as const }, icon: CheckCircle2 },
  { label: "Pendentes", value: 3, icon: Clock },
  { label: "Recusadas", value: 2, icon: XCircle },
];

const columns = [
  { key: "requestDate", label: "Data Solicitação" },
  { key: "driverFrom", label: "Motorista Solicitante" },
  { key: "shiftFrom", label: "Turno Original" },
  { key: "driverTo", label: "Motorista Permuta" },
  { key: "shiftTo", label: "Turno Permuta" },
  { key: "swapDate", label: "Data da Troca" },
  { key: "status", label: "Status" },
];

const data = [
  { requestDate: "28/03/2026", driverFrom: "Carlos Silva", shiftFrom: "Manhã (06-14h)", driverTo: "José Santos", shiftTo: "Tarde (14-22h)", swapDate: "01/04/2026", status: "approved" },
  { requestDate: "27/03/2026", driverFrom: "Maria Oliveira", shiftFrom: "Noite (22-06h)", driverTo: "Ana Pereira", shiftTo: "Manhã (06-14h)", swapDate: "31/03/2026", status: "pending" },
  { requestDate: "26/03/2026", driverFrom: "Pedro Costa", shiftFrom: "Tarde (14-22h)", driverTo: "Lucas Ferreira", shiftTo: "Manhã (06-14h)", swapDate: "30/03/2026", status: "approved" },
  { requestDate: "25/03/2026", driverFrom: "Roberto Almeida", shiftFrom: "Manhã (06-14h)", driverTo: "Fernanda Lima", shiftTo: "Tarde (14-22h)", swapDate: "29/03/2026", status: "rejected" },
  { requestDate: "24/03/2026", driverFrom: "Lucas Ferreira", shiftFrom: "Noite (22-06h)", driverTo: "Carlos Silva", shiftTo: "Tarde (14-22h)", swapDate: "28/03/2026", status: "approved" },
  { requestDate: "29/03/2026", driverFrom: "Ana Pereira", shiftFrom: "Manhã (06-14h)", driverTo: "Pedro Costa", shiftTo: "Noite (22-06h)", swapDate: "02/04/2026", status: "pending" },
];

const statusMap = {
  approved: { label: "Aprovada", variant: "default" as const },
  pending: { label: "Pendente", variant: "secondary" as const },
  rejected: { label: "Recusada", variant: "destructive" as const },
};

export default function ShiftSwapPage() {
  return (
    <MockPage
      title="Troca de Turno"
      icon={ArrowLeftRight}
      stats={stats}
      columns={columns}
      data={data}
      statusField="status"
      statusMap={statusMap}
    />
  );
}
