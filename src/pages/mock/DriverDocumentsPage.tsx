import { FileText, AlertTriangle, CheckCircle2, Clock, Users } from "lucide-react";
import { MockPage } from "./MockPageTemplate";

const stats = [
  { label: "Total de Documentos", value: 248, icon: FileText },
  { label: "Válidos", value: 189, badge: { text: "76%", variant: "default" as const }, icon: CheckCircle2 },
  { label: "A Vencer (30 dias)", value: 34, badge: { text: "Atenção", variant: "secondary" as const }, icon: Clock },
  { label: "Vencidos", value: 25, badge: { text: "Crítico", variant: "destructive" as const }, icon: AlertTriangle },
];

const columns = [
  { key: "driver", label: "Motorista" },
  { key: "document", label: "Documento" },
  { key: "number", label: "Número" },
  { key: "issued", label: "Emissão" },
  { key: "expiry", label: "Validade" },
  { key: "status", label: "Status" },
];

const data = [
  { driver: "Carlos Silva", document: "ASO", number: "ASO-2025-001", issued: "15/01/2026", expiry: "15/07/2026", status: "valid" },
  { driver: "José Santos", document: "ASO", number: "ASO-2025-002", issued: "20/09/2025", expiry: "20/03/2026", status: "expired" },
  { driver: "Maria Oliveira", document: "CNH", number: "04587123698", issued: "10/05/2024", expiry: "10/05/2029", status: "valid" },
  { driver: "Pedro Costa", document: "ASO", number: "ASO-2025-003", issued: "01/10/2025", expiry: "01/04/2026", status: "expiring" },
  { driver: "Ana Pereira", document: "Atestado Médico", number: "ATM-2026-015", issued: "25/03/2026", expiry: "25/06/2026", status: "valid" },
  { driver: "Lucas Ferreira", document: "CNH", number: "07896541230", issued: "12/02/2023", expiry: "12/02/2028", status: "valid" },
  { driver: "Roberto Almeida", document: "ASO", number: "ASO-2025-004", issued: "05/08/2025", expiry: "05/02/2026", status: "expired" },
  { driver: "Fernanda Lima", document: "Curso MOPP", number: "MOPP-2024-088", issued: "01/06/2024", expiry: "01/06/2029", status: "valid" },
];

const statusMap = {
  valid: { label: "Válido", variant: "default" as const },
  expiring: { label: "A Vencer", variant: "secondary" as const },
  expired: { label: "Vencido", variant: "destructive" as const },
};

export default function DriverDocumentsPage() {
  return (
    <MockPage
      title="Documentos do Motorista"
      icon={FileText}
      stats={stats}
      columns={columns}
      data={data}
      statusField="status"
      statusMap={statusMap}
    />
  );
}
