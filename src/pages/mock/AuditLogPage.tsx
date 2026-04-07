import { ScrollText, Eye, Edit, Trash2, Activity } from "lucide-react";
import { MockPage } from "./MockPageTemplate";

const stats = [
  { label: "Registros (hoje)", value: 1247, icon: ScrollText },
  { label: "Consultas", value: 856, icon: Eye },
  { label: "Alterações", value: 312, icon: Edit },
  { label: "Exclusões", value: 79, icon: Trash2 },
];

const columns = [
  { key: "timestamp", label: "Data/Hora" },
  { key: "user", label: "Usuário" },
  { key: "action", label: "Ação" },
  { key: "module", label: "Módulo" },
  { key: "entity", label: "Registro" },
  { key: "detail", label: "Detalhe" },
];

const data = [
  { timestamp: "30/03/2026 09:15:32", user: "admin@pepsico.com", action: "Alteração", module: "Viagem Diária", entity: "VD-330-001", detail: "Status: Planejada → Em Execução" },
  { timestamp: "30/03/2026 09:12:18", user: "joao.coord@pepsico.com", action: "Criação", module: "Viagem Diária", entity: "VD-330-015", detail: "Nova viagem criada" },
  { timestamp: "30/03/2026 09:08:45", user: "maria.op@pepsico.com", action: "Consulta", module: "Motorista", entity: "Carlos Silva", detail: "Visualização de cadastro" },
  { timestamp: "30/03/2026 09:05:11", user: "admin@pepsico.com", action: "Exclusão", module: "Treinamento", entity: "TURMA-2026-003", detail: "Turma cancelada" },
  { timestamp: "30/03/2026 08:58:03", user: "ana.sup@pepsico.com", action: "Alteração", module: "Escala", entity: "ESC-330-A", detail: "Motorista remanejado" },
  { timestamp: "30/03/2026 08:45:29", user: "pedro.an@pepsico.com", action: "Exportação", module: "Relatórios", entity: "REL-Pontualidade", detail: "PDF exportado" },
  { timestamp: "30/03/2026 08:30:15", user: "joao.coord@pepsico.com", action: "Alteração", module: "Veículo", entity: "ABC-1D23", detail: "Status: Disponível → Manutenção" },
  { timestamp: "30/03/2026 08:22:47", user: "admin@pepsico.com", action: "Login", module: "Sistema", entity: "—", detail: "Login via SSO" },
];

export default function AuditLogPage() {
  return (
    <MockPage
      title="Log de Auditoria"
      icon={ScrollText}
      stats={stats}
      columns={columns}
      data={data}
    />
  );
}
