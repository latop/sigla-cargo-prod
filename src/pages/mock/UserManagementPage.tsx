import { Users, Shield, UserCheck, UserX, Key } from "lucide-react";
import { MockPage } from "./MockPageTemplate";

const stats = [
  { label: "Usuários Ativos", value: 85, icon: UserCheck },
  { label: "Administradores", value: 6, icon: Shield },
  { label: "Operadores", value: 52, icon: Users },
  { label: "Inativos", value: 12, icon: UserX },
];

const columns = [
  { key: "name", label: "Nome" },
  { key: "email", label: "E-mail" },
  { key: "gpid", label: "GPID" },
  { key: "profile", label: "Perfil" },
  { key: "lastAccess", label: "Último Acesso" },
  { key: "status", label: "Status" },
];

const data = [
  { name: "Admin Sistema", email: "admin@pepsico.com", gpid: "ADM001", profile: "Administrador", lastAccess: "30/03/2026 08:15", status: "active" },
  { name: "João Coordenador", email: "joao.coord@pepsico.com", gpid: "JOA002", profile: "Coordenador", lastAccess: "30/03/2026 07:45", status: "active" },
  { name: "Maria Operadora", email: "maria.op@pepsico.com", gpid: "MAR003", profile: "Operador", lastAccess: "29/03/2026 16:30", status: "active" },
  { name: "Pedro Analista", email: "pedro.an@pepsico.com", gpid: "PED004", profile: "Analista", lastAccess: "28/03/2026 11:00", status: "active" },
  { name: "Ana Supervisora", email: "ana.sup@pepsico.com", gpid: "ANA005", profile: "Supervisor", lastAccess: "30/03/2026 09:00", status: "active" },
  { name: "Carlos Inativo", email: "carlos.in@pepsico.com", gpid: "CAR006", profile: "Operador", lastAccess: "15/01/2026 10:00", status: "inactive" },
  { name: "Lucia Gestora", email: "lucia.gest@pepsico.com", gpid: "LUC007", profile: "Gestor", lastAccess: "30/03/2026 08:30", status: "active" },
];

const statusMap = {
  active: { label: "Ativo", variant: "default" as const },
  inactive: { label: "Inativo", variant: "destructive" as const },
  blocked: { label: "Bloqueado", variant: "secondary" as const },
};

export default function UserManagementPage() {
  return (
    <MockPage
      title="Gestão de Usuários"
      icon={Users}
      stats={stats}
      columns={columns}
      data={data}
      statusField="status"
      statusMap={statusMap}
    />
  );
}
