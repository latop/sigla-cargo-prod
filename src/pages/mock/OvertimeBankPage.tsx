import { Clock, TrendingUp, TrendingDown, Users, Timer } from "lucide-react";
import { MockPage } from "./MockPageTemplate";

const stats = [
  { label: "Saldo Total (Banco)", value: "1.248h", icon: Clock },
  { label: "Horas Extras (mês)", value: "342h", badge: { text: "+12%", variant: "secondary" as const }, icon: TrendingUp },
  { label: "Compensações (mês)", value: "186h", icon: TrendingDown },
  { label: "Motoristas c/ Saldo", value: 98, icon: Users },
];

const columns = [
  { key: "driver", label: "Motorista" },
  { key: "registration", label: "CPF" },
  { key: "balance", label: "Saldo (h)" },
  { key: "overtime", label: "HE Mês (h)" },
  { key: "compensated", label: "Comp. Mês (h)" },
  { key: "status", label: "Situação" },
];

const data = [
  { driver: "Carlos Silva", registration: "123.456.789-00", balance: "+32,5", overtime: "18,0", compensated: "8,0", status: "normal" },
  { driver: "José Santos", registration: "987.654.321-00", balance: "+58,0", overtime: "22,5", compensated: "0,0", status: "high" },
  { driver: "Maria Oliveira", registration: "456.789.123-00", balance: "+12,0", overtime: "8,0", compensated: "12,0", status: "normal" },
  { driver: "Pedro Costa", registration: "321.654.987-00", balance: "-4,5", overtime: "6,0", compensated: "16,0", status: "negative" },
  { driver: "Ana Pereira", registration: "789.123.456-00", balance: "+45,0", overtime: "15,0", compensated: "0,0", status: "high" },
  { driver: "Lucas Ferreira", registration: "654.987.321-00", balance: "+8,0", overtime: "10,0", compensated: "6,0", status: "normal" },
  { driver: "Roberto Almeida", registration: "147.258.369-00", balance: "+72,0", overtime: "28,0", compensated: "0,0", status: "critical" },
  { driver: "Fernanda Lima", registration: "369.258.147-00", balance: "+0,5", overtime: "4,0", compensated: "8,0", status: "normal" },
];

const statusMap = {
  normal: { label: "Normal", variant: "default" as const },
  high: { label: "Saldo Alto", variant: "secondary" as const },
  negative: { label: "Negativo", variant: "destructive" as const },
  critical: { label: "Limite", variant: "destructive" as const },
};

export default function OvertimeBankPage() {
  return (
    <MockPage
      title="Banco de Horas"
      icon={Clock}
      stats={stats}
      columns={columns}
      data={data}
      statusField="status"
      statusMap={statusMap}
    />
  );
}
