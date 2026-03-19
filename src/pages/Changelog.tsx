import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ChangelogEntry {
  version: string;
  date: string;
  type: "feature" | "fix" | "improvement";
  changes: { pt: string; en: string; es: string }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "1.13.0",
    date: "2026-03-19",
    type: "improvement",
    changes: [
      {
        pt: "Ordenação de colunas (ascendente/descendente) na tabela de histórico da Importação de Demandas",
        en: "Column sorting (ascending/descending) in the Demand Import history table",
        es: "Ordenación de columnas (ascendente/descendente) en la tabla de historial de Importación de Demandas",
      },
      {
        pt: "Botão Pesquisar sempre realiza nova consulta à API, mesmo sem alteração nos filtros (todas as telas de cadastro genérico)",
        en: "Search button always performs a new API query, even without filter changes (all generic registration screens)",
        es: "Botón Buscar siempre realiza nueva consulta a la API, incluso sin cambios en los filtros (todas las pantallas de registro genérico)",
      },
    ],
  },
  {
    version: "1.12.0",
    date: "2026-03-13",
    type: "feature",
    changes: [
      {
        pt: "Telas pendentes de liberação: Partidas e Chegadas, Publicação de Jornadas, Cenários, Modelo de Planejamento, Otimização de Viagens, Planejamento de Veículos e Escala de Motoristas exibem mensagem 'Pendente de Liberação'",
        en: "Pending release screens: Departures & Arrivals, Publish Journey, Scenarios, Planning Model, Trip Optimization, Vehicle Planning and Driver Schedule show 'Pending Release' message",
        es: "Pantallas pendientes de liberación: Partidas y Llegadas, Publicar Jornada, Escenarios, Modelo de Planificación, Optimización de Viajes, Planificación de Vehículos y Escala de Conductores muestran mensaje 'Pendiente de Liberación'",
      },
      {
        pt: "Solicitação de Motoristas: status Pendente corrigido para identificar registros com FlgStatus nulo",
        en: "Driver Request: Pending status corrected to identify records with null FlgStatus",
        es: "Solicitud de Conductores: estado Pendiente corregido para identificar registros con FlgStatus nulo",
      },
      {
        pt: "Busca avançada de motorista com CPF padronizada nas telas de Liberação de Viagens e Solicitação de Motoristas",
        en: "Advanced driver search with CPF standardized on Trip Release and Driver Request screens",
        es: "Búsqueda avanzada de conductor con CPF estandarizada en pantallas de Liberación de Viajes y Solicitud de Conductores",
      },
      {
        pt: "Traduções e manuais atualizados com as novas telas pendentes de liberação",
        en: "Translations and manuals updated with the new pending release screens",
        es: "Traducciones y manuales actualizados con las nuevas pantallas pendientes de liberación",
      },
    ],
  },
  {
    version: "1.11.0",
    date: "2026-03-13",
    type: "feature",
    changes: [
      {
        pt: "Importação de Demandas: campo 'Grupo de Localidade' alterado para dropdown com listagem dinâmica da API (LocationGroup)",
        en: "Demand Import: 'Location Group' field changed to dropdown with dynamic listing from API (LocationGroup)",
        es: "Importación de Demandas: campo 'Grupo de Localidad' cambiado a dropdown con listado dinámico de la API (LocationGroup)",
      },
      {
        pt: "Manuais de Usuário e Técnico atualizados com documentação da tela de Importação de Demandas",
        en: "User and Technical Manuals updated with Demand Import screen documentation",
        es: "Manuales de Usuario y Técnico actualizados con documentación de la pantalla de Importación de Demandas",
      },
    ],
  },
  {
    version: "1.10.0",
    date: "2026-03-12",
    type: "feature",
    changes: [
      {
        pt: "Novo cadastro de Modelo de Frota com filtros por Código, Nome e Marca",
        en: "New Fleet Model registration with filters by Code, Name and Brand",
        es: "Nuevo registro de Modelo de Flota con filtros por Código, Nombre y Marca",
      },
      {
        pt: "Listagem de Modelo de Frota com colunas Código, Nome e Marca (via FleetBrand)",
        en: "Fleet Model listing with Code, Name and Brand columns (via FleetBrand)",
        es: "Listado de Modelo de Flota con columnas Código, Nombre y Marca (via FleetBrand)",
      },
      {
        pt: "Formulário de inclusão/edição com layout Código, Nome e Marca (dropdown)",
        en: "Create/edit form with Code, Name and Brand (dropdown) layout",
        es: "Formulario de alta/edición con diseño Código, Nombre y Marca (dropdown)",
      },
      {
        pt: "Ajustes na listagem de Localidade: coluna Cidade após Nome, Lat/Long reposicionados",
        en: "Location listing adjustments: City column after Name, Lat/Long repositioned",
        es: "Ajustes en listado de Localidad: columna Ciudad después del Nombre, Lat/Long reposicionados",
      },
    ],
  },
  {
    version: "1.9.0",
    date: "2026-03-11",
    type: "feature",
    changes: [
      {
        pt: "Novo Dashboard com KPIs em tempo real (Viagens Hoje, Veículos, Motoristas e Localidades cadastrados)",
        en: "New Dashboard with real-time KPIs (Trips Today, Vehicles, Drivers and Locations registered)",
        es: "Nuevo Dashboard con KPIs en tiempo real (Viajes Hoy, Vehículos, Conductores y Localidades registrados)",
      },
      {
        pt: "Gráfico de pizza com distribuição de viagens por status e gráfico de área com tendência dos próximos 7 dias",
        en: "Pie chart with trip status distribution and area chart with next 7 days trend",
        es: "Gráfico de torta con distribución de viajes por estado y gráfico de área con tendencia de los próximos 7 días",
      },
      {
        pt: "Tabela de últimas viagens com demanda, placa, origem, destino, motorista e status",
        en: "Recent trips table with demand, plate, origin, destination, driver and status",
        es: "Tabla de últimos viajes con demanda, placa, origen, destino, conductor y estado",
      },
      {
        pt: "Link direto para o Dashboard no menu lateral",
        en: "Direct link to Dashboard in sidebar menu",
        es: "Enlace directo al Dashboard en el menú lateral",
      },
      {
        pt: "Manual do Sistema renomeado para 'Manual do Usuário' com campo de pesquisa e novas seções",
        en: "System Manual renamed to 'User Manual' with search field and new sections",
        es: "Manual del Sistema renombrado a 'Manual del Usuario' con campo de búsqueda y nuevas secciones",
      },
      {
        pt: "Manual Técnico atualizado com atributos configuráveis do Gráfico de Gantt",
        en: "Technical Manual updated with Gantt Chart configurable attributes",
        es: "Manual Técnico actualizado con atributos configurables del Gráfico de Gantt",
      },
    ],
  },
  {
    version: "1.8.0",
    date: "2026-03-11",
    type: "improvement",
    changes: [
      {
        pt: "Tela 'Vínculo de Veículos' renomeada para 'Planejamento de Veículos' e movida para o grupo Planejamento",
        en: "'Vehicle Link' screen renamed to 'Vehicle Planning' and moved to the Planning menu group",
        es: "Pantalla 'Vínculo de Vehículos' renombrada a 'Planificación de Vehículos' y movida al grupo Planificación",
      },
      {
        pt: "Remoção de itens duplicados e obsoletos no menu lateral (Nova Otimização de Viagens)",
        en: "Removed duplicate and obsolete items from sidebar menu (New Trip Optimization)",
        es: "Eliminación de elementos duplicados y obsoletos en el menú lateral (Nueva Optimización de Viajes)",
      },
    ],
  },
  {
    version: "1.7.0",
    date: "2026-03-10",
    type: "improvement",
    changes: [
      {
        pt: "Cadastro de Justificativa: filtros por Código, Setor Responsável e Tipo (Atraso/Cancelamento) com exibição descritiva",
        en: "Justification registration: filters by Code, Responsible Sector and Type (Delay/Cancellation) with descriptive display",
        es: "Registro de Justificación: filtros por Código, Sector Responsable y Tipo (Retraso/Cancelación) con visualización descriptiva",
      },
      {
        pt: "Novo tipo de campo 'select' com opções fixas para formulários e filtros (ex: Tipo de Justificativa)",
        en: "New 'select' field type with fixed options for forms and filters (e.g. Justification Type)",
        es: "Nuevo tipo de campo 'select' con opciones fijas para formularios y filtros (ej: Tipo de Justificación)",
      },
      {
        pt: "Filtros posicionados acima dos botões Pesquisar/Limpar em todas as telas com filtros",
        en: "Filters positioned above Search/Clear buttons on all screens with filters",
        es: "Filtros posicionados encima de los botones Buscar/Limpiar en todas las pantallas con filtros",
      },
      {
        pt: "Ajustes de layout nos formulários de País, Região, Marca de Frota, Setor Responsável, Tipo de Parada e Tipo de Viagem",
        en: "Form layout adjustments for Country, Region, Fleet Brand, Responsible Sector, Stop Type and Trip Type",
        es: "Ajustes de diseño en formularios de País, Región, Marca de Flota, Sector Responsable, Tipo de Parada y Tipo de Viaje",
      },
    ],
  },
  {
    version: "1.6.0",
    date: "2026-03-09",
    type: "feature",
    changes: [
      {
        pt: "Novo grupo de menu 'Monitoramento' com Partidas e Chegadas e Liberação de Viagens",
        en: "New 'Monitoring' menu group with Departures & Arrivals and Trip Release",
        es: "Nuevo grupo de menú 'Monitoreo' con Partidas y Llegadas y Liberación de Viajes",
      },
      {
        pt: "Novo grupo de menu 'Importações' com Importação de Viagens Planejadas e Importação do Mapa",
        en: "New 'Imports' menu group with Planned Trips Import and Map Import",
        es: "Nuevo grupo de menú 'Importaciones' con Importación de Viajes Planificados e Importación del Mapa",
      },
      {
        pt: "Tela de Importação do Mapa com drag-and-drop, instruções e feedback de resultado",
        en: "Map Import screen with drag-and-drop, instructions and result feedback",
        es: "Pantalla de Importación del Mapa con drag-and-drop, instrucciones y feedback de resultado",
      },
      {
        pt: "Botões de expandir/compactar todos os grupos no menu lateral",
        en: "Expand/collapse all groups buttons in sidebar menu",
        es: "Botones para expandir/compactar todos los grupos en el menú lateral",
      },
    ],
  },
  {
    version: "1.5.0",
    date: "2026-03-08",
    type: "feature",
    changes: [
      {
        pt: "Cadastro de Linhas (Line) com suporte mestre-detalhe (LineSections)",
        en: "Line registration with master-detail support (LineSections)",
        es: "Registro de Líneas con soporte maestro-detalle (LineSections)",
      },
      {
        pt: "Função de Cópia de Linha com confirmação e abertura automática em modo edição",
        en: "Copy Line function with confirmation and automatic edit mode",
        es: "Función de Copia de Línea con confirmación y apertura automática en modo edición",
      },
      {
        pt: "Padronização do DatePickerField com máscara de digitação manual e calendário",
        en: "DatePickerField standardization with manual input mask and calendar",
        es: "Estandarización del DatePickerField con máscara de entrada manual y calendario",
      },
      {
        pt: "Validação visual de campos obrigatórios com destaque em vermelho",
        en: "Visual validation of required fields with red highlight",
        es: "Validación visual de campos obligatorios con resaltado en rojo",
      },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-03-07",
    type: "fix",
    changes: [
      {
        pt: "Correção na pesquisa de Linha: parâmetros da API corrigidos (filter1String, filter1Id, filter2Id) para consulta correta por Código, Origem e Destino",
        en: "Fixed Line search: corrected API parameters (filter1String, filter1Id, filter2Id) for proper Code, Origin and Destination queries",
        es: "Corrección en búsqueda de Línea: parámetros de API corregidos (filter1String, filter1Id, filter2Id) para consulta correcta por Código, Origen y Destino",
      },
      {
        pt: "Correção na leitura dos dados da API de Linha: extração correta do objeto aninhado (line) retornado pelo endpoint",
        en: "Fixed Line API data parsing: correct extraction of nested object (line) returned by the endpoint",
        es: "Corrección en lectura de datos de API de Línea: extracción correcta del objeto anidado (line) devuelto por el endpoint",
      },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-03-06",
    type: "improvement",
    changes: [
      {
        pt: "Autocomplete com pesquisa avançada (modal paginado) para campos com grande volume de dados (ex: Cidades)",
        en: "Autocomplete with advanced search (paginated modal) for large dataset fields (e.g. Cities)",
        es: "Autocompletado con búsqueda avanzada (modal paginado) para campos con gran volumen de datos (ej: Ciudades)",
      },
      {
        pt: "Ajustes de layout no formulário de Localidade: Latitude e Longitude lado a lado, Delay GPS ao lado do Cód. Integração GPS",
        en: "Layout adjustments in Location form: Latitude and Longitude side by side, Delay GPS next to GPS Integration Code",
        es: "Ajustes de diseño en el formulario de Localidad: Latitud y Longitud lado a lado, Delay GPS junto al Cód. Integración GPS",
      },
      {
        pt: "Melhorias nos filtros de Localidade: nova ordem, remoção de filtros desnecessários e suporte a minúsculas no Cód. Integração GPS",
        en: "Location filter improvements: new order, removal of unnecessary filters and lowercase support for GPS Integration Code",
        es: "Mejoras en filtros de Localidad: nuevo orden, eliminación de filtros innecesarios y soporte a minúsculas en Cód. Integración GPS",
      },
      {
        pt: "Alinhamento à esquerda nos campos de seleção (dropdowns)",
        en: "Left alignment on select fields (dropdowns)",
        es: "Alineación a la izquierda en los campos de selección (dropdowns)",
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-03-06",
    type: "feature",
    changes: [
      {
        pt: "Integração com API nas telas genéricas de cadastro",
        en: "API integration on generic registration screens",
        es: "Integración con API en las pantallas genéricas de registro",
      },
      {
        pt: "Toasts coloridos de sucesso (verde) e erro (vermelho) em todas as telas",
        en: "Colored success (green) and error (red) toasts on all screens",
        es: "Toasts de éxito (verde) y error (rojo) en todas las pantallas",
      },
      {
        pt: "Botão de limpar filtros em todas as telas de cadastro",
        en: "Clear filters button on all registration screens",
        es: "Botón de limpiar filtros en todas las pantallas de registro",
      },
      {
        pt: "Tabela dinâmica com dados da API e filtro local por texto",
        en: "Dynamic table with API data and local text filtering",
        es: "Tabla dinámica con datos de API y filtro local por texto",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-03-05",
    type: "feature",
    changes: [
      {
        pt: "Lançamento inicial do SIGLA Cargo",
        en: "Initial release of SIGLA Cargo",
        es: "Lanzamiento inicial de SIGLA Cargo",
      },
      {
        pt: "Tela de Login com e-mail/senha e SSO",
        en: "Login screen with email/password and SSO",
        es: "Pantalla de inicio de sesión con correo/contraseña y SSO",
      },
      {
        pt: "Dashboard com visão geral do sistema",
        en: "Dashboard with system overview",
        es: "Panel con visión general del sistema",
      },
      {
        pt: "Menu lateral com todos os módulos: Coordenação, Escala de Motoristas, Planejamento e Cadastros",
        en: "Sidebar menu with all modules: Coordination, Driver Schedule, Planning and Register",
        es: "Menú lateral con todos los módulos: Coordinación, Escala de Conductores, Planificación y Registros",
      },
      {
        pt: "Suporte multi-idioma (Português, Inglês, Espanhol)",
        en: "Multi-language support (Portuguese, English, Spanish)",
        es: "Soporte multilingüe (Portugués, Inglés, Español)",
      },
      {
        pt: "Controle de versão e manual do sistema",
        en: "Version control and system manual",
        es: "Control de versiones y manual del sistema",
      },
    ],
  },
];

const typeBadge = {
  feature: { label: { pt: "Novidade", en: "Feature", es: "Novedad" }, className: "bg-primary/10 text-primary border-primary/20" },
  fix: { label: { pt: "Correção", en: "Fix", es: "Corrección" }, className: "bg-destructive/10 text-destructive border-destructive/20" },
  improvement: { label: { pt: "Melhoria", en: "Improvement", es: "Mejora" }, className: "bg-accent-foreground/10 text-accent-foreground border-accent-foreground/20" },
};

export const APP_VERSION = "1.13.0";

const Changelog = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = (i18n.language as "pt" | "en" | "es") || "pt";

  const titles: Record<string, string> = {
    pt: "Histórico de Versões",
    en: "Version History",
    es: "Historial de Versiones",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-display font-bold text-foreground">
          {titles[lang]}
        </h1>
      </div>

      <div className="space-y-4">
        {changelog.map((entry, i) => (
          <motion.div
            key={entry.version}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-display">
                    v{entry.version}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={typeBadge[entry.type].className}>
                      {typeBadge[entry.type].label[lang]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{entry.date}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {entry.changes.map((change, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span>{change[lang]}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center pt-4">
        © LATOP Tecnologia da Informação Ltda
      </p>
    </div>
  );
};

export default Changelog;
