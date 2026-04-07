import { Gauge, TrendingUp, AlertTriangle, Truck } from "lucide-react";
import { MockPage } from "./MockPageTemplate";

const stats = [
  { label: "Veículos Registrados", value: 142, icon: Truck },
  { label: "Registros Hoje", value: 38, icon: Gauge },
  { label: "Média Km/Dia", value: "485 km", icon: TrendingUp },
  { label: "Alertas de Desvio", value: 7, badge: { text: "Atenção", variant: "destructive" as const }, icon: AlertTriangle },
];

const columns = [
  { key: "plate", label: "Placa" },
  { key: "driver", label: "Motorista" },
  { key: "date", label: "Data Registro" },
  { key: "kmStart", label: "Km Inicial" },
  { key: "kmEnd", label: "Km Final" },
  { key: "kmTotal", label: "Km Percorrido" },
  { key: "hourmeter", label: "Horímetro (h)" },
  { key: "status", label: "Status" },
];

const data = [
  { plate: "ABC-1D23", driver: "Carlos Silva", date: "01/04/2026", kmStart: "125.000", kmEnd: "125.485", kmTotal: "485", hourmeter: "8.2", status: "validated" },
  { plate: "DEF-4E56", driver: "João Santos", date: "01/04/2026", kmStart: "89.100", kmEnd: "89.620", kmTotal: "520", hourmeter: "9.1", status: "validated" },
  { plate: "GHI-7F89", driver: "Maria Oliveira", date: "01/04/2026", kmStart: "49.500", kmEnd: "49.780", kmTotal: "280", hourmeter: "5.5", status: "pending" },
  { plate: "JKL-0G12", driver: "Pedro Costa", date: "01/04/2026", kmStart: "78.200", kmEnd: "78.900", kmTotal: "700", hourmeter: "11.3", status: "alert" },
  { plate: "MNO-3H45", driver: "Ana Souza", date: "01/04/2026", kmStart: "155.800", kmEnd: "156.350", kmTotal: "550", hourmeter: "9.8", status: "validated" },
  { plate: "PQR-6I78", driver: "Lucas Lima", date: "31/03/2026", kmStart: "34.100", kmEnd: "34.450", kmTotal: "350", hourmeter: "6.2", status: "validated" },
  { plate: "STU-9J01", driver: "Fernanda Alves", date: "31/03/2026", kmStart: "200.900", kmEnd: "201.300", kmTotal: "400", hourmeter: "7.0", status: "pending" },
];

const statusMap = {
  validated: { label: "Validado", variant: "default" as const },
  pending: { label: "Pendente", variant: "secondary" as const },
  alert: { label: "Desvio", variant: "destructive" as const },
};

export default function MileageHourmeterPage() {
  return (
    <MockPage
      title="Quilometragem e Horímetro"
      icon={Gauge}
      stats={stats}
      columns={columns}
      data={data}
      statusField="status"
      statusMap={statusMap}
    />
  );
}
