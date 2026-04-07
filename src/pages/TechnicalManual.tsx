import { useState } from "react";
import { ArrowLeft, Code2, ChevronDown, Server, FileCode, Route as RouteIcon, Database, Layers, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { APP_VERSION } from "@/pages/Changelog";

/* ─── Types ──────────────────────────────────────────── */

interface EndpointInfo {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
}

interface ScreenDoc {
  title: string;
  route: string;
  component: string;
  menuGroup: string;
  description: string;
  type: "custom" | "generic-schema";
  endpoints: EndpointInfo[];
  sharedComponents: string[];
  filters?: string[];
  features?: string[];
  ganttAttributes?: { attribute: string; value: string; description: string }[];
}

/* ─── Screen data ────────────────────────────────────── */

const screens: ScreenDoc[] = [
  // --- Coordenação ---
  {
    title: "Viagem Diária",
    route: "/daily-trip",
    component: "DailyTripPage.tsx",
    menuGroup: "Coordenação",
    description: "Gerenciamento de viagens diárias com edição mestre-detalhe, justificativas e observações.",
    type: "custom",
    endpoints: [
      { method: "GET", path: "/DailyTrip", description: "Lista viagens diárias (paginado)" },
      { method: "GET", path: "/DailyTrip/{id}", description: "Detalhes de viagem" },
      { method: "POST", path: "/updatedailytrip", description: "Cria/atualiza viagem" },
      { method: "DELETE", path: "/DailyTrip/{id}", description: "Exclui viagem" },
      { method: "GET", path: "/Line", description: "Busca linhas para lookup" },
      { method: "GET", path: "/Justification?PageSize=999", description: "Lista justificativas" },
    ],
    sharedComponents: ["FloatingPanel", "DatePickerField", "LookupSearchField", "LineSearchModal"],
    filters: ["Data Referência", "Linha", "Status", "Justificativa"],
    features: ["Edição mestre-detalhe", "Ordenação por colunas", "Justificativas e observações", "Paginação servidor"],
  },
  {
    title: "Coordenação de Viagens",
    route: "/daily-trips-schedule",
    component: "TripSchedulePage.tsx",
    menuGroup: "Coordenação",
    description: "Visualização em Gantt e Listagem para gestão de frotas. Gráfico com camadas de viagem planejada, paradas e execução real.",
    type: "custom",
    endpoints: [
      { method: "GET", path: "/gantt/GetDailyTripsByPeriodGantt", description: "Lista viagens por período para Gantt (paginado)" },
    ],
    sharedComponents: ["TripGanttChart", "DailyTripEditPanel", "NewTripDialog", "DatePickerField", "LookupSearchField"],
    filters: ["startDate (padrão: hoje)", "endDate (padrão: +7 dias, máx 15 dias)", "fleetGroupCodes (seleção múltipla)", "locationGroupCode", "licensePlates (modal avançado)", "demand"],
    features: [
      "Gráfico Gantt com zoom (12h, 1d, 2d, 3d, 7d, 15d)",
      "Camadas: TRIP (planejado 18px), STOP (paradas 10px centralizada), TRIP EXEC (realizado 18px)",
      "Fallback: se horários reais (startActual/endActual) nulos, usa estimados (startEstimated/endEstimated)",
      "Cores RGB da API (colorRGBPlanned, colorRGBActual, colorRGBStop)",
      "Tooltip: demanda, trajeto, horários reais e estimados [HH:mm — HH:mm]",
      "Identificação veículo: Placa + Cód. Frota (L1), Grupo Frota (L2)",
      "Altura da linha: 40px (ROW_HEIGHT), bordas rounded-[2px]",
      "Duplo clique em TRIP abre DailyTripEditPanel",
      "Nova Viagem via NewTripDialog",
      "Paginação server-side (pageSize: 50) com scroll infinito",
      "Listagem: colunas Placa, Demanda, Origem, Destino, Início/Fim Plan., Início/Fim Real, Motorista, Status",
      "Listagem filtra apenas TRIP e TRIP EXEC",
    ],
    ganttAttributes: [
      { attribute: "ROW_HEIGHT", value: "40", description: "Altura em px de cada linha de veículo" },
      { attribute: "ZOOM_OPTIONS", value: "12h, 1d, 2d, 3d, 7d, 15d", description: "Níveis de zoom disponíveis" },
      { attribute: "Zoom padrão", value: "1d", description: "Zoom inicial ao abrir a tela" },
      { attribute: "TRIP height", value: "18px", description: "Altura da barra de viagem planejada" },
      { attribute: "STOP height", value: "10px", description: "Altura da barra de parada (centralizada na TRIP)" },
      { attribute: "TRIP EXEC height", value: "18px", description: "Altura da barra de execução real" },
      { attribute: "Border radius", value: "rounded-[2px]", description: "Arredondamento das bordas das barras" },
      { attribute: "colorRGBPlanned", value: "API", description: "Cor RGB da barra de viagem planejada" },
      { attribute: "colorRGBActual", value: "API", description: "Cor RGB da barra de execução real" },
      { attribute: "colorRGBStop", value: "API", description: "Cor RGB da barra de parada" },
      { attribute: "Fallback horários", value: "startEstimated/endEstimated", description: "Usado quando startActual/endActual são nulos" },
      { attribute: "pageSize", value: "50", description: "Registros por página (paginação server-side)" },
    ],
  },
  {
    title: "Planejamento de Veículos",
    route: "/vehicle-planning",
    component: "ComingSoonPage.tsx",
    menuGroup: "Planejamento",
    description: "Pendente de liberação. Esta função será liberada em breve.",
    type: "custom",
    endpoints: [],
    sharedComponents: [],
  },
  {
    title: "Modelo de Planejamento",
    route: "/planning-model",
    component: "ComingSoonPage.tsx",
    menuGroup: "Planejamento",
    description: "Pendente de liberação. Esta função será liberada em breve.",
    type: "custom",
    endpoints: [],
    sharedComponents: [],
  },
  {
    title: "Cenários",
    route: "/scenarios",
    component: "ComingSoonPage.tsx",
    menuGroup: "Planejamento",
    description: "Pendente de liberação. Esta função será liberada em breve.",
    type: "custom",
    endpoints: [],
    sharedComponents: [],
  },
  {
    title: "Otimização de Viagens",
    route: "/trip-optimization",
    component: "ComingSoonPage.tsx",
    menuGroup: "Planejamento",
    description: "Pendente de liberação. Esta função será liberada em breve.",
    type: "custom",
    endpoints: [],
    sharedComponents: [],
  },

  // --- Monitoramento ---
  {
    title: "Saídas e Chegadas",
    route: "/departures-and-arrivals",
    component: "ComingSoonPage.tsx",
    menuGroup: "Monitoramento",
    description: "Pendente de liberação. Esta função será liberada em breve.",
    type: "custom",
    endpoints: [],
    sharedComponents: [],
  },
  {
    title: "Liberação de Viagens",
    route: "/release-driver",
    component: "JourneyReleasePage.tsx",
    menuGroup: "Monitoramento",
    description: "Consulta e liberação de viagens com filtros avançados de motorista, veículo e localidade.",
    type: "custom",
    endpoints: [
      { method: "GET", path: "/Journey/ReleaseDriver", description: "Lista viagens para liberação" },
      { method: "GET", path: "/Location/GetLocationRelease", description: "Localidades válidas para liberação" },
      { method: "GET", path: "/Drivers", description: "Busca motoristas (lookup)" },
      { method: "GET", path: "/Truck", description: "Busca veículos (lookup)" },
    ],
    sharedComponents: ["DatePickerField", "LookupSearchField"],
    filters: ["Data da Viagem (dtRef)", "Local de Saída (locOrig)", "STO/DT (demand)", "Motorista (nickName)", "Veículo (licensePlate)", "Status (releaseStatus)"],
    features: ["Filtros obrigatórios (data + local)", "Badge de status Pendente/Liberado", "Ordenação por colunas"],
  },

  // --- Escala de Motoristas ---
  {
    title: "Solicitação de Motoristas",
    route: "/drivers-request",
    component: "DriverRequestPage.tsx",
    menuGroup: "Escala de Motoristas",
    description: "Gestão de solicitações de motoristas com fluxo de aprovação/negação, filtros por período, status e busca avançada de motorista (Nome de Escala, Cód. Integração, CPF).",
    type: "custom",
    endpoints: [
      { method: "GET", path: "/DriverRequest", description: "Lista solicitações (paginado, filtros)" },
      { method: "PUT", path: "/DriverRequest", description: "Aprova ou nega solicitação" },
    ],
    sharedComponents: ["DatePickerField", "LookupSearchField", "ExportDropdown"],
    filters: ["startDate", "endDate", "FlgStatus", "Motorista (nickName/registration)"],
    features: ["Aprovação/Negação com confirmação", "Status Pendente = null na API", "Busca de motorista com CPF", "Exportação Excel/PDF", "Paginação servidor"],
  },
  {
    title: "Circuitos de Motoristas",
    route: "/drivers-schedule",
    component: "DriverCircuitPage.tsx",
    menuGroup: "Escala de Motoristas",
    description: "Gestão de circuitos de motoristas com Gráfico de Gantt interativo, painel de edição de circuitos com tarefas (viagens/atividades), modal de detalhe master-detail com seções, filtros secundários em resultados e painel de viagens sem motorista.",
    type: "custom",
    endpoints: [
      { method: "GET", path: "/gantt/GetDriverCircuitByPeriodGantt", description: "Consulta circuitos por período para o Gantt" },
      { method: "GET", path: "/gantt/GetCircuit", description: "Detalhe do circuito (tooltip e edição)" },
      { method: "GET", path: "/gantt/GetDailyTripDetail?idTask={id}", description: "Detalhe da viagem com seções" },
      { method: "GET", path: "/gantt/GetDailyTripDetail?isReturn=true", description: "Consulta viagem de retorno" },
      { method: "GET", path: "/gantt/GetDailyTripUnallocated", description: "Viagens sem motorista alocado" },
      { method: "POST", path: "/gantt/UpdateCircuit", description: "Salvar circuito (criar/atualizar)" },
      { method: "DELETE", path: "/gantt/DeleteCircuit", description: "Excluir circuito" },
    ],
    sharedComponents: ["CircuitGanttChart", "CircuitEditPanel", "FloatingPanel", "DatePickerField", "LookupSearchField", "DailyTripSearchModal", "ActivitySearchModal"],
  },
  {
    title: "Publicar Jornada",
    route: "/publish-journey",
    component: "ComingSoonPage.tsx",
    menuGroup: "Escala de Motoristas",
    description: "Pendente de liberação. Esta função será liberada em breve.",
    type: "custom",
    endpoints: [],
    sharedComponents: [],
  },

  // --- Importações ---
  {
    title: "Importar Viagens",
    route: "/import-trips",
    component: "GenericPage.tsx",
    menuGroup: "Importações",
    description: "Importação de viagens via arquivo.",
    type: "generic-schema",
    endpoints: [
      { method: "GET", path: "/ImportTrips", description: "Lista importações" },
    ],
    sharedComponents: [],
  },
  {
    title: "Importação de Demandas",
    route: "/import-map",
    component: "ImportMapPage.tsx",
    menuGroup: "Importações",
    description: "Upload de arquivos Excel (.xlsx, .xls, .csv) para importação de demandas logísticas com seleção de Grupo de Localidade via dropdown dinâmico.",
    type: "custom",
    endpoints: [
      { method: "POST", path: "/importGTMSCheck", description: "Envia arquivo de demanda para verificação" },
      { method: "GET", path: "/LocationGroup?PageSize=999", description: "Lista grupos de localidade para dropdown" },
      { method: "GET", path: "/importGTMSCheck", description: "Consulta histórico de importações por período" },
    ],
    sharedComponents: ["DatePickerField", "Select"],
    filters: ["startDate (D-1)", "endDate (D+1)"],
    features: [
      "Upload drag-and-drop com validação de extensão",
      "Dropdown dinâmico de Grupo de Localidade (LocationGroup.Code)",
      "Barra de progresso durante upload",
      "Histórico de importações com filtro por período",
      "Ordenação por colunas no histórico (ascendente/descendente)",
      "Download de template Excel",
    ],
  },

  // --- Cadastros (Custom) ---
  {
    title: "Atividade",
    route: "/activity",
    component: "ActivityPage.tsx",
    menuGroup: "Cadastro",
    description: "Cadastro completo de atividades com filtros por código, tipo e flags (solicitação, ativo).",
    type: "custom",
    endpoints: [
      { method: "GET", path: "/Activity", description: "Lista atividades (paginado, filtros)" },
      { method: "POST", path: "/Activity", description: "Cria atividade" },
      { method: "PUT", path: "/Activity", description: "Atualiza atividade" },
      { method: "DELETE", path: "/Activity/{id}", description: "Exclui atividade" },
      { method: "GET", path: "/ActivityType?PageSize=999", description: "Lista tipos de atividade (lookup)" },
    ],
    sharedComponents: ["FloatingPanel", "DatePickerField"],
    filters: ["Filter1String: Code", "Filter1Id: ActivityTypeId", "Filter1Bool: FlgRequest", "Filter2Bool: FlgActive"],
    features: ["CRUD completo", "Campos datetime com DatePickerField", "Filtros bool (Sim/Não/Todos)", "Paginação servidor"],
  },
  {
    title: "Tipo de Atividade",
    route: "/activity-type",
    component: "ActivityTypePage.tsx",
    menuGroup: "Cadastro",
    description: "Cadastro de tipos de atividade com campos de função, jornada, folha de pagamento e cor.",
    type: "custom",
    endpoints: [
      { method: "GET", path: "/ActivityType", description: "Lista tipos (paginado)" },
      { method: "POST", path: "/ActivityType", description: "Cria tipo de atividade" },
      { method: "PUT", path: "/ActivityType", description: "Atualiza tipo de atividade" },
      { method: "DELETE", path: "/ActivityType/{id}", description: "Exclui tipo de atividade" },
    ],
    sharedComponents: ["FloatingPanel"],
    features: ["CRUD completo", "Select de função predefinida", "Campo de cor com color picker", "Paginação servidor"],
  },
  {
    title: "Motorista",
    route: "/driver",
    component: "DriverPage.tsx",
    menuGroup: "Cadastro",
    description: "Cadastro de motoristas com informações pessoais, CNH, empresa e localidade.",
    type: "custom",
    endpoints: [
      { method: "GET", path: "/Drivers", description: "Lista motoristas (paginado, filtros)" },
      { method: "POST", path: "/Drivers", description: "Cria motorista" },
      { method: "PUT", path: "/Drivers", description: "Atualiza motorista" },
      { method: "DELETE", path: "/Drivers/{id}", description: "Exclui motorista" },
      { method: "GET", path: "/Companies?PageSize=999", description: "Lista empresas (lookup)" },
      { method: "GET", path: "/LocationGroup?PageSize=999", description: "Lista grupos de localidade (lookup)" },
    ],
    sharedComponents: ["FloatingPanel", "DatePickerField"],
    filters: ["Código", "CNH", "Empresa", "Grupo de Localidade", "Ativo"],
    features: ["CRUD completo", "Campos de data (CNH, nascimento)", "Lookups de empresa e grupo de localidade", "Paginação servidor"],
  },
  {
    title: "Linha",
    route: "/line",
    component: "LinePage.tsx",
    menuGroup: "Cadastro",
    description: "Cadastro mestre-detalhe de linhas de transporte com trechos, paradas e custos.",
    type: "custom",
    endpoints: [
      { method: "GET", path: "/Line", description: "Lista linhas (paginado, filtros)" },
      { method: "GET", path: "/returnline/{id}", description: "Retorna linha completa com trechos" },
      { method: "POST", path: "/updateline", description: "Cria/atualiza linha com trechos" },
      { method: "DELETE", path: "/Line/{id}", description: "Exclui linha" },
      { method: "GET", path: "/Location/{id}", description: "Detalhes de localidade" },
      { method: "GET", path: "/FleetGroup?PageSize=999", description: "Lista grupos de frota (lookup)" },
      { method: "GET", path: "/TripType?PageSize=999", description: "Lista tipos de viagem (lookup)" },
      { method: "GET", path: "/StopType?PageSize=999", description: "Lista tipos de parada (lookup)" },
      { method: "GET", path: "/LocationGroup?PageSize=999", description: "Lista grupos de localidade (lookup)" },
    ],
    sharedComponents: ["FloatingPanel", "DatePickerField", "LookupSearchField", "LineSearchModal"],
    filters: ["Filter1String: Code"],
    features: ["Mestre-detalhe com trechos", "Função copiar linha", "Máscara de tempo (hh:mm)", "Máscara monetária (R$)", "Frequência semanal", "Ordenação por colunas"],
  },

  // --- Cadastros (Generic Schema) ---
  {
    title: "Atividade de Veículo",
    route: "/activity-truck",
    component: "GenericPage.tsx (schema)",
    menuGroup: "Cadastro",
    description: "Cadastro de atividades de veículo via schema genérico.",
    type: "generic-schema",
    endpoints: [
      { method: "GET", path: "/ActivityTruck", description: "Lista (paginado)" },
      { method: "POST", path: "/ActivityTruck", description: "Cria registro" },
      { method: "PUT", path: "/ActivityTruck", description: "Atualiza registro" },
      { method: "DELETE", path: "/ActivityTruck/{id}", description: "Exclui registro" },
    ],
    sharedComponents: ["GenericPage", "FloatingPanel"],
    features: ["Campos: code, description, flgDriverRequired, color"],
  },
  {
    title: "Cidade",
    route: "/city",
    component: "GenericPage.tsx (schema)",
    menuGroup: "Cadastro",
    description: "Cadastro de cidades com lookups para país, estado e pesquisa avançada por nome.",
    type: "generic-schema",
    endpoints: [
      { method: "GET", path: "/Cities", description: "Lista cidades (paginado, filtros)" },
      { method: "POST", path: "/Cities", description: "Cria cidade" },
      { method: "PUT", path: "/Cities", description: "Atualiza cidade" },
      { method: "DELETE", path: "/Cities/{id}", description: "Exclui cidade" },
      { method: "GET", path: "/Countries?PageSize=999", description: "Lookup países" },
      { method: "GET", path: "/States?PageSize=999", description: "Lookup estados" },
    ],
    sharedComponents: ["GenericPage", "FloatingPanel", "LookupSearchField"],
    filters: ["Filter1Id: País", "Filter2Id: Estado", "Filter1String: Cidade (largeLookup)"],
  },
  {
    title: "Empresa",
    route: "/company",
    component: "GenericPage.tsx (schema)",
    menuGroup: "Cadastro",
    description: "Cadastro de empresas com endereço, localização e flag de fornecedor.",
    type: "generic-schema",
    endpoints: [
      { method: "GET", path: "/Companies", description: "Lista empresas (paginado)" },
      { method: "POST", path: "/Companies", description: "Cria empresa" },
      { method: "PUT", path: "/Companies", description: "Atualiza empresa" },
      { method: "DELETE", path: "/Companies/{id}", description: "Exclui empresa" },
      { method: "GET", path: "/Countries?PageSize=999", description: "Lookup países" },
      { method: "GET", path: "/States?PageSize=999", description: "Lookup estados" },
      { method: "GET", path: "/Regions?PageSize=999", description: "Lookup regiões" },
      { method: "GET", path: "/Cities?PageSize=999", description: "Lookup cidades" },
    ],
    sharedComponents: ["GenericPage", "FloatingPanel"],
  },
  {
    title: "País",
    route: "/country",
    component: "GenericPage.tsx (schema)",
    menuGroup: "Cadastro",
    description: "Cadastro de países com código ISO Alpha-2, Alpha-3 e numérico.",
    type: "generic-schema",
    endpoints: [
      { method: "GET", path: "/Countries", description: "Lista países (paginado)" },
      { method: "POST", path: "/Countries", description: "Cria país" },
      { method: "PUT", path: "/Countries", description: "Atualiza país" },
      { method: "DELETE", path: "/Countries/{id}", description: "Exclui país" },
    ],
    sharedComponents: ["GenericPage", "FloatingPanel"],
  },
  {
    title: "Justificativa",
    route: "/justification",
    component: "GenericPage.tsx (schema)",
    menuGroup: "Cadastro",
    description: "Cadastro de justificativas vinculadas a setores responsáveis.",
    type: "generic-schema",
    endpoints: [
      { method: "GET", path: "/Justification", description: "Lista justificativas (paginado)" },
      { method: "POST", path: "/Justification", description: "Cria justificativa" },
      { method: "PUT", path: "/Justification", description: "Atualiza justificativa" },
      { method: "DELETE", path: "/Justification/{id}", description: "Exclui justificativa" },
      { method: "GET", path: "/ResponsibleSector?PageSize=999", description: "Lookup setores" },
    ],
    sharedComponents: ["GenericPage", "FloatingPanel"],
  },
  {
    title: "Tipo de Localidade",
    route: "/location-type",
    component: "GenericPage.tsx (schema)",
    menuGroup: "Cadastro",
    description: "Cadastro de tipos de localidade com flags de operação e liberação.",
    type: "generic-schema",
    endpoints: [
      { method: "GET", path: "/LocationType", description: "Lista tipos (paginado, filtros)" },
      { method: "POST", path: "/LocationType", description: "Cria tipo" },
      { method: "PUT", path: "/LocationType", description: "Atualiza tipo" },
      { method: "DELETE", path: "/LocationType/{id}", description: "Exclui tipo" },
    ],
    sharedComponents: ["GenericPage", "FloatingPanel"],
    filters: ["Filter1String: Código", "Filter1Bool: Local de Operação", "Filter2Bool: Local de Liberação"],
  },
  {
    title: "Localidade",
    route: "/location",
    component: "GenericPage.tsx (schema)",
    menuGroup: "Cadastro",
    description: "Cadastro de localidades com integração TMS/GPS, timezone e coordenadas.",
    type: "generic-schema",
    endpoints: [
      { method: "GET", path: "/Location", description: "Lista localidades (paginado, filtros)" },
      { method: "POST", path: "/Location", description: "Cria localidade" },
      { method: "PUT", path: "/Location", description: "Atualiza localidade" },
      { method: "DELETE", path: "/Location/{id}", description: "Exclui localidade" },
      { method: "GET", path: "/LocationType?PageSize=999", description: "Lookup tipo localidade" },
      { method: "GET", path: "/Cities?PageSize=999", description: "Lookup cidades (largeLookup)" },
      { method: "GET", path: "/Timezone?PageSize=999", description: "Lookup timezone" },
      { method: "GET", path: "/LocationGroup?PageSize=999", description: "Lookup grupo localidade" },
    ],
    sharedComponents: ["GenericPage", "FloatingPanel", "LookupSearchField"],
    filters: ["Filter1String: Código", "Filter3String: Cód. TMS", "Filter2String: Cód. GPS", "Filter2Id: Tipo Localidade", "Filter3Id: Cidade"],
  },
  {
    title: "Região",
    route: "/region",
    component: "GenericPage.tsx (schema)",
    menuGroup: "Cadastro",
    description: "Cadastro de regiões vinculadas a países.",
    type: "generic-schema",
    endpoints: [
      { method: "GET", path: "/Regions", description: "Lista regiões (paginado)" },
      { method: "POST", path: "/Regions", description: "Cria região" },
      { method: "PUT", path: "/Regions", description: "Atualiza região" },
      { method: "DELETE", path: "/Regions/{id}", description: "Exclui região" },
      { method: "GET", path: "/Countries?PageSize=999", description: "Lookup países" },
    ],
    sharedComponents: ["GenericPage", "FloatingPanel"],
  },
  {
    title: "Setor Responsável",
    route: "/responsible-sector",
    component: "GenericPage.tsx (schema)",
    menuGroup: "Cadastro",
    description: "Cadastro de setores responsáveis.",
    type: "generic-schema",
    endpoints: [
      { method: "GET", path: "/ResponsibleSector", description: "Lista setores (paginado)" },
      { method: "POST", path: "/ResponsibleSector", description: "Cria setor" },
      { method: "PUT", path: "/ResponsibleSector", description: "Atualiza setor" },
      { method: "DELETE", path: "/ResponsibleSector/{id}", description: "Exclui setor" },
    ],
    sharedComponents: ["GenericPage", "FloatingPanel"],
  },
  {
    title: "Estado",
    route: "/state",
    component: "GenericPage.tsx (schema)",
    menuGroup: "Cadastro",
    description: "Cadastro de estados com vínculo para país e região.",
    type: "generic-schema",
    endpoints: [
      { method: "GET", path: "/States", description: "Lista estados (paginado)" },
      { method: "POST", path: "/States", description: "Cria estado" },
      { method: "PUT", path: "/States", description: "Atualiza estado" },
      { method: "DELETE", path: "/States/{id}", description: "Exclui estado" },
      { method: "GET", path: "/Countries?PageSize=999", description: "Lookup países" },
      { method: "GET", path: "/Regions?PageSize=999", description: "Lookup regiões" },
    ],
    sharedComponents: ["GenericPage", "FloatingPanel"],
  },
  {
    title: "Timezone",
    route: "/timezone",
    component: "GenericPage.tsx (schema)",
    menuGroup: "Cadastro",
    description: "Cadastro de fusos horários.",
    type: "generic-schema",
    endpoints: [
      { method: "GET", path: "/Timezone", description: "Lista timezones (paginado)" },
      { method: "POST", path: "/Timezone", description: "Cria timezone" },
      { method: "PUT", path: "/Timezone", description: "Atualiza timezone" },
      { method: "DELETE", path: "/Timezone/{id}", description: "Exclui timezone" },
    ],
    sharedComponents: ["GenericPage", "FloatingPanel"],
  },
  {
    title: "Valor de Timezone",
    route: "/timezone-value",
    component: "GenericPage.tsx (schema)",
    menuGroup: "Cadastro",
    description: "Cadastro de valores de fuso horário com período de vigência.",
    type: "generic-schema",
    endpoints: [
      { method: "GET", path: "/TimezoneValue", description: "Lista valores (paginado)" },
      { method: "POST", path: "/TimezoneValue", description: "Cria valor" },
      { method: "PUT", path: "/TimezoneValue", description: "Atualiza valor" },
      { method: "DELETE", path: "/TimezoneValue/{id}", description: "Exclui valor" },
      { method: "GET", path: "/Timezone?PageSize=999", description: "Lookup timezones" },
    ],
    sharedComponents: ["GenericPage", "FloatingPanel", "DatePickerField"],
  },

  // --- Escala de Motoristas (Custom) ---
  {
    title: "Férias de Motoristas",
    route: "/driver-vacation",
    component: "DriverVacationPage.tsx",
    menuGroup: "Escala de Motoristas",
    description: "Gestão de férias planejadas de motoristas com filtro por data de referência e base, status automático (Em Andamento/Prevista/Encerrada) e pesquisa avançada de motorista.",
    type: "custom",
    endpoints: [
      { method: "GET", path: "/DriversVacation", description: "Lista férias (paginado, filtros)" },
      { method: "POST", path: "/DriversVacation", description: "Cria férias" },
      { method: "PUT", path: "/DriversVacation", description: "Atualiza férias" },
      { method: "DELETE", path: "/DriversVacation/{id}", description: "Exclui férias" },
    ],
    sharedComponents: ["FloatingPanel", "DatePickerField", "LookupSearchField", "DriverSearchModal"],
    filters: ["dtRef (Data Referência)", "locationGroupId (Base)"],
    features: ["Status automático por período", "Pesquisa avançada de motorista (DriverSearchModal)", "forceActiveOnly para seleção de motoristas", "Exportação Excel/PDF"],
  },
  {
    title: "Treinamento de Motoristas",
    route: "/training-class",
    component: "TrainingClassPage.tsx",
    menuGroup: "Escala de Motoristas",
    description: "Gestão de turmas de treinamento com motoristas, atividades e localidades. Suporte a atribuição de cursos aos motoristas da turma.",
    type: "custom",
    endpoints: [
      { method: "GET", path: "/TrainingClass", description: "Lista turmas (paginado)" },
      { method: "POST", path: "/TrainingClass", description: "Cria turma" },
      { method: "PUT", path: "/TrainingClass", description: "Atualiza turma" },
      { method: "DELETE", path: "/TrainingClass/{id}", description: "Exclui turma" },
      { method: "GET", path: "/TrainingClass/{id}", description: "Detalhes da turma com motoristas" },
      { method: "POST", path: "/TrainingClassDriver", description: "Adiciona motorista à turma" },
      { method: "DELETE", path: "/TrainingClassDriver/{id}", description: "Remove motorista da turma" },
    ],
    sharedComponents: ["FloatingPanel", "DatePickerField", "LookupSearchField", "ActivitySearchModal", "LocationSearchModal", "DriverSearchModal"],
    features: ["Mestre-detalhe (turma + motoristas)", "Pesquisa avançada de Atividade, Localidade e Motorista", "Atribuição de curso ao motorista", "Exportação Excel/PDF"],
  },
  {
    title: "Ocorrências de Motoristas",
    route: "/driver-occurrence",
    component: "DriverOccurrencePage.tsx",
    menuGroup: "Escala de Motoristas",
    description: "Registro de ocorrências e advertências de motoristas com pesquisa avançada.",
    type: "custom",
    endpoints: [
      { method: "GET", path: "/DriverOccurrence", description: "Lista ocorrências (paginado, filtros)" },
      { method: "POST", path: "/DriverOccurrence", description: "Cria ocorrência" },
      { method: "PUT", path: "/DriverOccurrence", description: "Atualiza ocorrência" },
      { method: "DELETE", path: "/DriverOccurrence/{id}", description: "Exclui ocorrência" },
    ],
    sharedComponents: ["FloatingPanel", "DatePickerField", "LookupSearchField", "DriverSearchModal"],
    filters: ["dtRef (Data Referência)", "Motorista"],
    features: ["Pesquisa avançada de motorista (DriverSearchModal)", "Campo de advertência (Sim/Não)", "Exportação Excel/PDF"],
  },

  // --- Documentos do Motorista ---
  {
    title: "Documentos do Motorista",
    route: "/driver-documents",
    component: "DriverDocumentsPage.tsx",
    menuGroup: "Escala de Motoristas",
    description: "Gestão completa de documentos obrigatórios e informativos para motoristas com KPIs, upload, envio em massa e rastreamento de leitura por destinatário. Dados mock (sem persistência).",
    type: "custom",
    endpoints: [],
    sharedComponents: ["FloatingPanel", "DatePickerField", "ExportDropdown"],
    features: [
      "KPIs: Total, Ativos, A Vencer (30 dias), Taxa Média de Leitura",
      "Filtros: Nome, Status (active/expiring/expired/draft), Obrigatório",
      "CRUD com upload drag-and-drop (PDF, DOC, XLS)",
      "Envio em massa (todos ou por base)",
      "Rastreamento de leitura por destinatário com barra de progresso",
      "Tabela de destinatários com filtro por status (Todos/Lidos/Enviados/Pendentes)",
      "Exportação Excel/PDF",
    ],
  },

  // --- Frequência de Localidade ---
  {
    title: "Frequência de Localidade",
    route: "/location-frequency",
    component: "LocationFrequencyPage.tsx",
    menuGroup: "Cadastro",
    description: "Cadastro de faixas horárias de carga/descarga por localidade e dia da semana com pesquisa avançada de localidade e CRUD inline.",
    type: "custom",
    endpoints: [
      { method: "GET", path: "/LocationFrequency?LocationId={id}&PageSize=500", description: "Lista faixas horárias por localidade" },
      { method: "POST", path: "/LocationFrequency", description: "Cria faixa horária" },
      { method: "PUT", path: "/LocationFrequency/{id}", description: "Atualiza faixa horária" },
      { method: "DELETE", path: "/LocationFrequency/{id}", description: "Exclui faixa horária" },
    ],
    sharedComponents: ["LookupSearchField", "LocationSearchModal"],
    filters: ["LocationId (pesquisa avançada via LookupSearchField com forceModal)"],
    features: [
      "Filtro de localidade com LookupSearchField e LocationSearchModal",
      "Toolbar: Pesquisar, Limpar, Novo",
      "Abas por dia da semana (Seg-Dom) com badges de capacidade",
      "Edição inline de capacidade de carga/descarga",
      "Validação de horário (início < fim)",
    ],
  },

  {
    title: "Login",
    route: "/login",
    component: "Login.tsx",
    menuGroup: "Sistema",
    description: "Tela de autenticação com e-mail/senha e SSO.",
    type: "custom",
    endpoints: [
      { method: "POST", path: "/User/Login", description: "Autenticação do usuário" },
    ],
    sharedComponents: [],
    features: ["Login por e-mail e senha", "Suporte a SSO", "Armazenamento de token no localStorage"],
  },
  {
    title: "Dashboard",
    route: "/dashboard",
    component: "Dashboard.tsx",
    menuGroup: "Sistema",
    description: "Painel principal com visão geral do sistema.",
    type: "custom",
    endpoints: [],
    sharedComponents: [],
  },
  {
    title: "Parâmetros Administrativos",
    route: "/admin-parameters",
    component: "AdminParameters.tsx",
    menuGroup: "Administração",
    description: "Configurações administrativas do sistema.",
    type: "custom",
    endpoints: [],
    sharedComponents: [],
  },
];

/* ─── Shared Components catalog ───────────────────────── */

interface SharedComponentDoc {
  name: string;
  file: string;
  description: string;
}

const sharedComponentsDocs: SharedComponentDoc[] = [
  { name: "GenericPage", file: "src/pages/GenericPage.tsx", description: "Controlador universal CRUD baseado em schema (entitySchemas.ts). Gera filtros, tabela paginada e formulário automaticamente. Utiliza searchTrigger para invalidar cache do React Query a cada clique em Pesquisar, garantindo nova consulta à API." },
  { name: "FloatingPanel", file: "src/components/FloatingPanel.tsx", description: "Painel flutuante para formulários de criação/edição. Posicionado no canto superior esquerdo com largura padrão de 560px." },
  { name: "DatePickerField", file: "src/components/DatePickerField.tsx", description: "Campo de data com máscara dd/mm/aaaa, calendário popup e suporte a internacionalização (pt, en, es)." },
  { name: "LookupSearchField", file: "src/components/LookupSearchField.tsx", description: "Campo de autocomplete com modal de pesquisa para grandes conjuntos de dados. Suporta busca server-side. Detecta automaticamente endpoints especializados (Drivers → DriverSearchModal, Location → LocationSearchModal) para abrir pesquisa avançada." },
  { name: "DriverSearchModal", file: "src/components/DriverSearchModal.tsx", description: "Modal de pesquisa avançada de motoristas com filtros por Nome de Escala, Cód. GPID, Base de Motorista e Grupo de Frota. Exibe colunas com resolução de driverBases e driverFleets. Toggle Ativo/Inativo. Suporta forceActiveOnly e Ctrl+V no campo GPID." },
  { name: "LocationSearchModal", file: "src/components/LocationSearchModal.tsx", description: "Modal de pesquisa avançada de localidades com filtros por Código, Nome, Grupo de Localidade, Tipo de Localidade e Cód. TMS." },
  { name: "ActivitySearchModal", file: "src/components/ActivitySearchModal.tsx", description: "Modal de pesquisa avançada de atividades com filtro por Tipo de Atividade e toggle Ativo/Inativo." },
  { name: "LineSearchModal", file: "src/components/LineSearchModal.tsx", description: "Modal especializado para pesquisa de linhas de transporte." },
  { name: "AppLayout", file: "src/components/AppLayout.tsx", description: "Layout principal com sidebar, header e outlet de conteúdo." },
  { name: "AppSidebar", file: "src/components/AppSidebar.tsx", description: "Sidebar com grupos colapsáveis, expansão/colapso global e navegação completa." },
  { name: "ThemeToggle", file: "src/components/ThemeToggle.tsx", description: "Alternância entre tema claro e escuro." },
  { name: "NavLink", file: "src/components/NavLink.tsx", description: "Link de navegação com estilo ativo automático." },
];

/* ─── Architecture info ──────────────────────────────── */

const architectureNotes = [
  {
    title: "Stack Tecnológica",
    items: ["React 18 + TypeScript", "Vite (build tool)", "Tailwind CSS + shadcn/ui", "React Router DOM v6", "TanStack React Query v5", "Framer Motion", "i18next (pt, en, es)", "React Hook Form + Zod"],
  },
  {
    title: "API Base",
    items: [`URL: https://apicarga.azurewebsites.net`, "Autenticação: Bearer Token (JWT) via header Authorization", "Paginação: headers x-pagination com PageNumber/PageSize", "Filtros: padrão FilterNString, FilterNId, FilterNBool"],
  },
  {
    title: "Padrões de Design",
    items: [
      "Schema-driven CRUD: entitySchemas.ts define campos, filtros e endpoints por entidade",
      "Tabelas compactas: h-6 body rows, h-8 headers, text-xs",
      "Ações hover-only: opacity-0 → group-hover:opacity-100",
      "FloatingPanel para formulários (top-0 left-0, 560px)",
      "Campos obrigatórios com borda destructive quando vazios",
      "Conversão automática para uppercase (exceto onde especificado)",
    ],
  },
  {
    title: "Estrutura de Diretórios",
    items: [
      "src/pages/ — Páginas da aplicação",
      "src/components/ — Componentes reutilizáveis",
      "src/components/ui/ — Componentes shadcn/ui",
      "src/config/ — Configurações (API, schemas de entidades)",
      "src/i18n/ — Internacionalização (pt, en, es)",
      "src/hooks/ — Hooks customizados",
      "src/assets/ — Imagens e logos",
    ],
  },
];

/* ─── Method badge color ──────────────────────────────── */

const methodColor: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  POST: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PUT: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

/* ─── Component ──────────────────────────────────────── */

const TechnicalManual = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [openScreens, setOpenScreens] = useState<Record<string, boolean>>({});

  const toggleScreen = (route: string) => {
    setOpenScreens((p) => ({ ...p, [route]: !p[route] }));
  };

  const filtered = searchTerm.trim()
    ? screens.filter(
        (s) =>
          s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.component.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.menuGroup.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.endpoints.some((e) => e.path.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    : screens;

  const groups = [...new Set(filtered.map((s) => s.menuGroup))];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Code2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-display font-bold text-foreground">
            Manual Técnico
          </h1>
        </div>
        <Badge variant="outline" className="ml-auto text-xs">
          v{APP_VERSION}
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por tela, rota, componente ou endpoint..."
          className="pl-9 h-9 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Architecture */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Arquitetura do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {architectureNotes.map((note) => (
              <div key={note.title} className="space-y-1.5">
                <h4 className="text-xs font-semibold text-foreground">{note.title}</h4>
                <ul className="space-y-0.5">
                  {note.items.map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shared Components */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <FileCode className="h-4 w-4 text-primary" />
            Componentes Compartilhados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="h-8 px-3 text-xs font-medium">Componente</TableHead>
                  <TableHead className="h-8 px-3 text-xs font-medium">Arquivo</TableHead>
                  <TableHead className="h-8 px-3 text-xs font-medium">Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sharedComponentsDocs.map((c) => (
                  <TableRow key={c.name} className="h-6">
                    <TableCell className="px-3 py-1 text-xs font-medium text-foreground whitespace-nowrap">{c.name}</TableCell>
                    <TableCell className="px-3 py-1 text-xs text-muted-foreground font-mono whitespace-nowrap">{c.file}</TableCell>
                    <TableCell className="px-3 py-1 text-xs text-muted-foreground">{c.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Screens by group */}
      {groups.map((group) => (
        <Card key={group}>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              {group}
              <Badge variant="secondary" className="text-[10px] ml-1">
                {filtered.filter((s) => s.menuGroup === group).length} telas
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0 space-y-1">
            {filtered
              .filter((s) => s.menuGroup === group)
              .map((screen) => (
                <Collapsible
                  key={screen.route}
                  open={openScreens[screen.route] ?? false}
                  onOpenChange={() => toggleScreen(screen.route)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-left w-full">
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${
                          openScreens[screen.route] ? "rotate-0" : "-rotate-90"
                        }`}
                      />
                      <span className="text-xs font-medium text-foreground">{screen.title}</span>
                      <Badge variant="outline" className="text-[10px] font-mono ml-1">
                        {screen.route}
                      </Badge>
                      <Badge
                        className={`text-[10px] ml-auto ${
                          screen.type === "custom"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                        variant="outline"
                      >
                        {screen.type === "custom" ? "Custom" : "Schema"}
                      </Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 pl-3 border-l-2 border-muted space-y-3 py-2">
                      {/* Info */}
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{screen.description}</p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground">
                            <FileCode className="inline h-3 w-3 mr-1" />
                            <span className="font-mono">{screen.component}</span>
                          </span>
                        </div>
                      </div>

                      {/* Endpoints */}
                      {screen.endpoints.length > 0 && (
                        <div className="space-y-1">
                          <h5 className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                            <Database className="h-3 w-3" /> Endpoints
                          </h5>
                          <div className="space-y-0.5">
                            {screen.endpoints.map((ep, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <Badge className={`text-[10px] font-mono px-1.5 py-0 h-4 ${methodColor[ep.method]}`}>
                                  {ep.method}
                                </Badge>
                                <span className="font-mono text-muted-foreground">{ep.path}</span>
                                <span className="text-muted-foreground/60">— {ep.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Filters */}
                      {screen.filters && screen.filters.length > 0 && (
                        <div className="space-y-1">
                          <h5 className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                            <Search className="h-3 w-3" /> Filtros
                          </h5>
                          <div className="flex flex-wrap gap-1">
                            {screen.filters.map((f) => (
                              <Badge key={f} variant="secondary" className="text-[10px]">
                                {f}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Features */}
                      {screen.features && screen.features.length > 0 && (
                        <div className="space-y-1">
                          <h5 className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                            <RouteIcon className="h-3 w-3" /> Funcionalidades
                          </h5>
                          <ul className="space-y-0.5">
                            {screen.features.map((f) => (
                              <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="text-primary">•</span> {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Gantt Attributes */}
                      {screen.ganttAttributes && screen.ganttAttributes.length > 0 && (
                        <div className="space-y-1">
                          <h5 className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                            <Layers className="h-3 w-3" /> Atributos Configuráveis do Gantt
                          </h5>
                          <div className="overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead className="h-6 px-2 text-[10px] font-medium">Atributo</TableHead>
                                  <TableHead className="h-6 px-2 text-[10px] font-medium">Valor</TableHead>
                                  <TableHead className="h-6 px-2 text-[10px] font-medium">Descrição</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {screen.ganttAttributes.map((attr) => (
                                  <TableRow key={attr.attribute} className="h-6">
                                    <TableCell className="px-2 py-0.5 text-[10px] font-mono font-medium text-foreground whitespace-nowrap">{attr.attribute}</TableCell>
                                    <TableCell className="px-2 py-0.5 text-[10px] font-mono text-primary whitespace-nowrap">{attr.value}</TableCell>
                                    <TableCell className="px-2 py-0.5 text-[10px] text-muted-foreground">{attr.description}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}

                      {screen.sharedComponents.length > 0 && (
                        <div className="space-y-1">
                          <h5 className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                            <Layers className="h-3 w-3" /> Componentes Utilizados
                          </h5>
                          <div className="flex flex-wrap gap-1">
                            {screen.sharedComponents.map((c) => (
                              <Badge key={c} variant="outline" className="text-[10px] font-mono">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
          </CardContent>
        </Card>
      ))}

      {/* Summary stats */}
      <Card>
        <CardContent className="py-4 px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{screens.length}</p>
              <p className="text-xs text-muted-foreground">Telas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {screens.reduce((acc, s) => acc + s.endpoints.length, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Endpoints</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{sharedComponentsDocs.length}</p>
              <p className="text-xs text-muted-foreground">Componentes Compartilhados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{groups.length}</p>
              <p className="text-xs text-muted-foreground">Grupos de Menu</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center pt-2 pb-4">
        © LATOP Tecnologia da Informação Ltda — Documentação gerada automaticamente
      </p>
    </div>
  );
};

export default TechnicalManual;
