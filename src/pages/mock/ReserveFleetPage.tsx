import { Shield, Truck, CheckCircle2, AlertTriangle } from "lucide-react";
import { MockPage } from "./MockPageTemplate";

const stats = [
  { label: "Frota Reserva Total", value: 18, icon: Shield },
  { label: "Disponíveis", value: 12, icon: CheckCircle2 },
  { label: "Em Uso Temporário", value: 4, badge: { text: "Alocados", variant: "default" as const }, icon: Truck },
  { label: "Em Manutenção", value: 2, badge: { text: "Indisponíveis", variant: "destructive" as const }, icon: AlertTriangle },
];

const columns = [
  { key: "plate", label: "Placa" },
  { key: "model", label: "Modelo" },
  { key: "year", label: "Ano" },
  { key: "km", label: "Km Atual" },
  { key: "base", label: "Base" },
  { key: "assignedTo", label: "Alocado Para" },
  { key: "returnDate", label: "Prev. Retorno" },
  { key: "status", label: "Status" },
];

const data = [
  { plate: "RES-1A01", model: "Volvo FH 540", year: "2024", km: "45.200", base: "São Paulo", assignedTo: "-", returnDate: "-", status: "available" },
  { plate: "RES-2B02", model: "Scania R450", year: "2023", km: "62.100", base: "São Paulo", assignedTo: "Rota SP-RJ (DEF-4E56)", returnDate: "05/04/2026", status: "in_use" },
  { plate: "RES-3C03", model: "Mercedes Actros", year: "2024", km: "28.500", base: "Campinas", assignedTo: "-", returnDate: "-", status: "available" },
  { plate: "RES-4D04", model: "Volvo FH 460", year: "2022", km: "98.700", base: "Curitiba", assignedTo: "-", returnDate: "-", status: "maintenance" },
  { plate: "RES-5E05", model: "DAF XF", year: "2024", km: "15.300", base: "Ribeirão Preto", assignedTo: "Rota RP-UB (JKL-0G12)", returnDate: "03/04/2026", status: "in_use" },
  { plate: "RES-6F06", model: "Scania R500", year: "2023", km: "71.800", base: "São Paulo", assignedTo: "-", returnDate: "-", status: "available" },
  { plate: "RES-7G07", model: "Volvo FM 380", year: "2023", km: "55.400", base: "Campinas", assignedTo: "Rota CP-SP (MNO-3H45)", returnDate: "02/04/2026", status: "in_use" },
  { plate: "RES-8H08", model: "Mercedes Atego", year: "2024", km: "12.600", base: "Curitiba", assignedTo: "-", returnDate: "-", status: "available" },
];

const statusMap = {
  available: { label: "Disponível", variant: "default" as const },
  in_use: { label: "Em Uso", variant: "secondary" as const },
  maintenance: { label: "Em Manutenção", variant: "destructive" as const },
};

export default function ReserveFleetPage() {
  return (
    <MockPage
      title="Frota Reserva Técnica"
      icon={Shield}
      stats={stats}
      columns={columns}
      data={data}
      statusField="status"
      statusMap={statusMap}
    />
  );
}
