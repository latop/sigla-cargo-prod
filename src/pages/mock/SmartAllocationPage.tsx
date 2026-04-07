import { Cpu, Users, Truck, CheckCircle2, Zap } from "lucide-react";
import { MockPage } from "./MockPageTemplate";

const stats = [
  { label: "Alocações Sugeridas", value: 48, icon: Cpu },
  { label: "Aceitas", value: 35, badge: { text: "73%", variant: "default" as const }, icon: CheckCircle2 },
  { label: "Motoristas Disponíveis", value: 62, icon: Users },
  { label: "Veículos Disponíveis", value: 41, icon: Truck },
];

const columns = [
  { key: "trip", label: "Viagem" },
  { key: "origin", label: "Origem" },
  { key: "destination", label: "Destino" },
  { key: "suggestedDriver", label: "Motorista Sugerido" },
  { key: "suggestedVehicle", label: "Veículo Sugerido" },
  { key: "score", label: "Score" },
  { key: "status", label: "Status" },
];

const data = [
  { trip: "VD-20260330-001", origin: "CD Guarulhos", destination: "Campinas", suggestedDriver: "Carlos Silva", suggestedVehicle: "ABC-1D23", score: "98%", status: "accepted" },
  { trip: "VD-20260330-002", origin: "CD Barueri", destination: "Sorocaba", suggestedDriver: "José Santos", suggestedVehicle: "DEF-4E56", score: "95%", status: "accepted" },
  { trip: "VD-20260330-003", origin: "CD Guarulhos", destination: "Santos", suggestedDriver: "Pedro Costa", suggestedVehicle: "GHI-7F89", score: "91%", status: "pending" },
  { trip: "VD-20260330-004", origin: "CD Jundiaí", destination: "Ribeirão Preto", suggestedDriver: "Maria Oliveira", suggestedVehicle: "JKL-0G12", score: "88%", status: "pending" },
  { trip: "VD-20260330-005", origin: "CD Barueri", destination: "São José dos Campos", suggestedDriver: "Ana Pereira", suggestedVehicle: "MNO-3H45", score: "85%", status: "rejected" },
  { trip: "VD-20260330-006", origin: "CD Guarulhos", destination: "Piracicaba", suggestedDriver: "Lucas Ferreira", suggestedVehicle: "PQR-6I78", score: "93%", status: "accepted" },
];

const statusMap = {
  accepted: { label: "Aceita", variant: "default" as const },
  pending: { label: "Pendente", variant: "secondary" as const },
  rejected: { label: "Rejeitada", variant: "destructive" as const },
};

export default function SmartAllocationPage() {
  return (
    <MockPage
      title="Alocação Inteligente"
      icon={Cpu}
      stats={stats}
      columns={columns}
      data={data}
      statusField="status"
      statusMap={statusMap}
    />
  );
}
