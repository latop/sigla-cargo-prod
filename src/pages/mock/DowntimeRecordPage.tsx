import { Timer, Truck, TrendingDown, AlertTriangle } from "lucide-react";
import { MockPage } from "./MockPageTemplate";

const stats = [
  { label: "Veículos Parados", value: 9, icon: Truck },
  { label: "Tempo Médio Parada", value: "18h", icon: Timer },
  { label: "Disponibilidade Frota", value: "93.7%", badge: { text: "Meta: 95%", variant: "secondary" as const }, icon: TrendingDown },
  { label: "Paradas > 48h", value: 3, badge: { text: "Atenção", variant: "destructive" as const }, icon: AlertTriangle },
];

const columns = [
  { key: "plate", label: "Placa" },
  { key: "reason", label: "Motivo da Parada" },
  { key: "startDate", label: "Início Parada" },
  { key: "endDate", label: "Fim Parada" },
  { key: "totalHours", label: "Horas Parado" },
  { key: "orderRef", label: "Ordem Vinculada" },
  { key: "status", label: "Status" },
];

const data = [
  { plate: "DEF-4E56", reason: "Manutenção corretiva - Freios", startDate: "30/03/2026 08:00", endDate: "-", totalHours: "48h", orderRef: "OC-2026-001", status: "stopped" },
  { plate: "JKL-0G12", reason: "Manutenção corretiva - Motor", startDate: "29/03/2026 14:00", endDate: "-", totalHours: "66h", orderRef: "OC-2026-002", status: "stopped" },
  { plate: "MNO-3H45", reason: "Sensor de temperatura", startDate: "01/04/2026 07:00", endDate: "-", totalHours: "5h", orderRef: "OC-2026-003", status: "stopped" },
  { plate: "PQR-6I78", reason: "Troca de para-brisa", startDate: "31/03/2026 10:00", endDate: "31/03/2026 14:00", totalHours: "4h", orderRef: "OC-2026-006", status: "released" },
  { plate: "VWX-2K34", reason: "Substituição alternador", startDate: "25/03/2026 09:00", endDate: "26/03/2026 15:00", totalHours: "30h", orderRef: "OC-2026-005", status: "released" },
  { plate: "STU-9J01", reason: "Falha na embreagem", startDate: "01/04/2026 06:00", endDate: "-", totalHours: "6h", orderRef: "OC-2026-007", status: "stopped" },
  { plate: "ABC-1D23", reason: "Manutenção preventiva", startDate: "28/03/2026 07:00", endDate: "28/03/2026 18:00", totalHours: "11h", orderRef: "-", status: "released" },
];

const statusMap = {
  stopped: { label: "Parado", variant: "destructive" as const },
  released: { label: "Liberado", variant: "default" as const },
};

export default function DowntimeRecordPage() {
  return (
    <MockPage
      title="Registro de Tempo de Parada"
      icon={Timer}
      stats={stats}
      columns={columns}
      data={data}
      statusField="status"
      statusMap={statusMap}
    />
  );
}
