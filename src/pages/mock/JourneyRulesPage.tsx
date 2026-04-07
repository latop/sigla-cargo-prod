import { Scale, ShieldCheck, AlertTriangle, Clock, Activity } from "lucide-react";
import { MockPage } from "./MockPageTemplate";

const stats = [
  { label: "Regras Ativas", value: 18, icon: Scale },
  { label: "Conformidade Geral", value: "94%", badge: { text: "Meta: 98%", variant: "secondary" as const }, icon: ShieldCheck },
  { label: "Violações (hoje)", value: 3, badge: { text: "Atenção", variant: "destructive" as const }, icon: AlertTriangle },
  { label: "Motoristas Monitorados", value: 142, icon: Activity },
];

const columns = [
  { key: "rule", label: "Regra" },
  { key: "description", label: "Descrição" },
  { key: "category", label: "Categoria" },
  { key: "limit", label: "Limite" },
  { key: "penalty", label: "Penalidade" },
  { key: "status", label: "Status" },
];

const data = [
  { rule: "JOR-001", description: "Jornada máxima diária", category: "Jornada", limit: "10h", penalty: "Grave", status: "active" },
  { rule: "JOR-002", description: "Descanso mínimo entre jornadas", category: "Descanso", limit: "11h", penalty: "Gravíssima", status: "active" },
  { rule: "JOR-003", description: "Intervalo intrajornada", category: "Descanso", limit: "1h (min)", penalty: "Média", status: "active" },
  { rule: "DSR-001", description: "Descanso semanal remunerado", category: "DSR", limit: "35h", penalty: "Grave", status: "active" },
  { rule: "DSR-002", description: "Repouso semanal (pernoite)", category: "DSR", limit: "24h+11h", penalty: "Gravíssima", status: "active" },
  { rule: "HEX-001", description: "Limite de horas extras diárias", category: "Hora Extra", limit: "2h", penalty: "Média", status: "active" },
  { rule: "HEX-002", description: "Limite de horas extras mensais", category: "Hora Extra", limit: "44h", penalty: "Grave", status: "active" },
  { rule: "CON-001", description: "Tempo máximo de condução contínua", category: "Condução", limit: "5h30", penalty: "Grave", status: "active" },
];

const statusMap = {
  active: { label: "Ativa", variant: "default" as const },
  inactive: { label: "Inativa", variant: "secondary" as const },
  draft: { label: "Rascunho", variant: "outline" as const },
};

export default function JourneyRulesPage() {
  return (
    <MockPage
      title="Motor de Regras — Jornada"
      icon={Scale}
      stats={stats}
      columns={columns}
      data={data}
      statusField="status"
      statusMap={statusMap}
    />
  );
}
