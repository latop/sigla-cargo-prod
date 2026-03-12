import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BookOpen, Search, ChevronDown, ChevronRight, Star, FileDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { entitySchemas, type FieldSchema, type FilterSchema } from "@/config/entitySchemas";
import { APP_VERSION } from "@/pages/Changelog";
import { toast } from "sonner";
import siglaLogo from "@/assets/logo-sigla-cargo.png";

type Lang = "pt" | "en" | "es";

/* ───────────────── helpers ───────────────── */

const fieldTypeLabel: Record<string, string> = {
  string: "Texto",
  number: "Numérico",
  boolean: "Sim/Não",
  lookup: "Seleção (lista)",
  select: "Seleção (fixa)",
  color: "Cor",
  datetime: "Data/Hora",
};

const filterTypeLabel: Record<string, string> = {
  string: "Texto livre",
  lookup: "Seleção (lista)",
  bool: "Sim/Não",
  select: "Seleção (fixa)",
};

function buildFieldRows(fields: FieldSchema[]): FieldSchema[] {
  return fields.filter((f) => !f.displayOnly);
}

function buildTableCols(fields: FieldSchema[]): FieldSchema[] {
  return fields.filter((f) => !f.hideInTable);
}

/* ───────────────── Manual content types ───────────────── */

interface ScreenDoc {
  name: string;
  route: string;
  objective: string;
  filters?: string;
  listing?: string;
  creation?: string;
  edition?: string;
  deletion?: string;
  /** Auto-generated from schema */
  schemaKey?: string;
  extra?: string;
}

interface ManualGroup {
  group: string;
  screens: ScreenDoc[];
}

/* ───────────────── Static content for non-schema screens ───────────────── */

const manualData: ManualGroup[] = [
  {
    group: "Sobre o Sistema",
    screens: [
      {
        name: "SIGLA Cargo",
        route: "-",
        objective:
          "O SIGLA Cargo (Sistema Integrado de Gestão e Logística Avançada) é uma plataforma completa desenvolvida pela LATOP Tecnologia da Informação Ltda para otimizar operações de transporte, coordenação de frota e planejamento logístico.",
        extra:
          "Principais recursos do sistema:\n\n" +
          "• Dashboard Interativo — KPIs em tempo real com gráficos de status e tendências de viagens.\n" +
          "• Coordenação de Viagens — Gráfico de Gantt com 3 camadas (Planejado, Realizado e Parada) para visualização completa das operações.\n" +
          "• Monitoramento — Acompanhamento de partidas, chegadas e liberação de viagens em tempo real.\n" +
          "• Escala de Motoristas — Gestão de solicitações, escalas e publicação de jornadas.\n" +
          "• Planejamento — Modelos de planejamento, cenários e otimização de rotas.\n" +
          "• Importações — Upload de viagens planejadas e mapas logísticos.\n" +
          "• Cadastros — Mais de 25 telas de cadastro auxiliar com CRUD completo (Criar, Ler, Atualizar, Excluir).\n" +
          "• Relatórios — Geração de relatórios operacionais e gerenciais.\n\n" +
          "Recursos técnicos:\n\n" +
          "• Sistema de abas internas com até 5 telas simultâneas e preservação de estado.\n" +
          "• Suporte multi-idioma: Português, Inglês e Espanhol.\n" +
          "• Tema claro e escuro.\n" +
          "• Exportação de dados em Excel (.xlsx) e PDF.\n" +
          "• Filtros avançados com pesquisa server-side e busca local.\n" +
          "• Campos com validação visual, conversão automática de maiúsculas e lookups inteligentes.\n\n" +
          "Desenvolvido por: LATOP Tecnologia da Informação Ltda.",
      },
    ],
  },
  {
    group: "Geral",
    screens: [
      {
        name: "Login e Acesso",
        route: "/login",
        objective:
          "Autenticar o usuário no sistema. Suporta login por e-mail/senha e SSO (Single Sign-On) corporativo.",
        extra:
          "Após o login, o usuário é redirecionado ao Dashboard. Em caso de falha, uma mensagem de erro é exibida.",
      },
      {
        name: "Dashboard",
        route: "/dashboard",
        objective:
          "Apresentar uma visão geral do sistema com KPIs em tempo real: Viagens Hoje, Veículos, Motoristas e Localidades cadastrados. Inclui gráficos de distribuição de status (pizza) e tendência de viagens (área), além de uma tabela com as últimas viagens.",
      },
      {
        name: "Navegação e Abas",
        route: "-",
        objective:
          "O menu lateral organiza as telas em grupos (Coordenação, Monitoramento, etc.). O sistema de abas internas permite manter até 5 telas abertas simultaneamente com preservação de estado. Use os botões de expandir/compactar no topo do menu para gerenciar todos os grupos.",
      },
    ],
  },
  {
    group: "Coordenação",
    screens: [
      {
        name: "Viagem Diária",
        route: "/daily-trip",
        objective:
          "Gerenciar as viagens diárias planejadas e realizadas. Oferece duas visualizações: Gráfico de Gantt (por veículo, com camadas de viagem planejada, paradas e execução real) e Listagem em tabela.",
        filters:
          "Data da Viagem (obrigatório), Grupo de Frota, Grupo de Localidade, Placas (multi-seleção) e Demanda. Os filtros são enviados ao servidor para refinar a consulta.",
        listing:
          "Exibe veículos como linhas do Gantt com três camadas visuais: barra azul (planejado), barra laranja (parada) e barra verde (realizado). Na visão de lista, mostra demanda, placa, origem, destino, horários e status.",
        creation:
          "Ao clicar em '+', abre o formulário de Nova Viagem com campos de demanda, placa, origem, destino, horários planejados e tipo de viagem.",
        edition:
          "Duplo clique em uma viagem no Gantt ou na listagem abre o painel lateral de edição com todos os campos preenchidos.",
        deletion:
          "A exclusão é feita pelo ícone de lixeira no painel de edição, com confirmação obrigatória.",
      },
      {
        name: "Planejamento de Viagens",
        route: "/daily-trips-schedule",
        objective:
          "Visualizar e gerenciar o cronograma de viagens em formato tabular com filtros por período e status.",
      },
    ],
  },
  {
    group: "Monitoramento",
    screens: [
      {
        name: "Partidas e Chegadas",
        route: "/departures-and-arrivals",
        objective:
          "Monitorar em tempo real as partidas e chegadas de veículos, com visualização de status atual de cada viagem.",
      },
      {
        name: "Liberação de Viagens",
        route: "/release-driver",
        objective:
          "Consultar e liberar viagens para execução. Permite aprovar viagens pendentes e gerenciar o checklist de liberação.",
        filters:
          "Data da Viagem (obrigatório) e Local de Saída (obrigatório). Os filtros devem ser preenchidos antes da pesquisa.",
        listing:
          "Exibe as viagens com colunas de demanda, placa, motorista, origem, destino e status (Pendente/Liberado) com badges coloridos.",
      },
    ],
  },
  {
    group: "Escala de Motoristas",
    screens: [
      {
        name: "Solicitação de Motoristas",
        route: "/drivers-request",
        objective: "Registrar e gerenciar solicitações de motoristas para viagens específicas.",
      },
      {
        name: "Escala de Motoristas",
        route: "/drivers-schedule",
        objective: "Visualizar e gerenciar a escala de trabalho dos motoristas.",
      },
      {
        name: "Publicação de Jornada",
        route: "/publish-journey",
        objective: "Publicar as jornadas de trabalho dos motoristas para o período selecionado.",
      },
    ],
  },
  {
    group: "Importações",
    screens: [
      {
        name: "Importação de Viagens Planejadas",
        route: "/import-trips",
        objective: "Importar viagens planejadas a partir de arquivos externos para alimentar o planejamento.",
      },
      {
        name: "Importação do Mapa",
        route: "/import-map",
        objective:
          "Importar mapas logísticos via upload de arquivo Excel (.xlsx, .xls, .csv). Arraste e solte o arquivo ou clique para selecionar. O sistema exibe barra de progresso e feedback do resultado.",
      },
    ],
  },
  {
    group: "Planejamento",
    screens: [
      {
        name: "Modelo de Planejamento",
        route: "/planning-model",
        objective: "Definir modelos base para geração automática de viagens planejadas.",
      },
      {
        name: "Cenários",
        route: "/scenarios",
        objective: "Criar e comparar cenários de planejamento para otimização logística.",
      },
      {
        name: "Otimização de Viagens",
        route: "/trip-optimization",
        objective: "Executar algoritmos de otimização para maximizar eficiência das rotas.",
      },
      {
        name: "Planejamento de Veículos",
        route: "/vehicle-planning",
        objective: "Vincular veículos a rotas e viagens planejadas para o período selecionado.",
      },
    ],
  },
  {
    group: "Cadastros",
    screens: [
      /* Schema-driven screens are injected below */
    ],
  },
  {
    group: "Relatórios e Administração",
    screens: [
      {
        name: "Relatórios",
        route: "/reports",
        objective: "Tela centralizada para consulta e geração de relatórios operacionais e gerenciais.",
      },
      {
        name: "Parâmetros Administrativos",
        route: "/admin-parameters",
        objective: "Configurar parâmetros globais do sistema como valores padrão e regras de negócio.",
      },
    ],
  },
];

/* ───────────────── Schema-to-doc mapping ───────────────── */

const schemaScreenNames: Record<string, string> = {
  "/activity-truck": "Atividade de Veículo",
  "/attribution": "Atribuição",
  "/city": "Cidade",
  "/company": "Empresa",
  "/country": "País",
  "/justification": "Justificativa",
  "/fleet-brand": "Marca de Frota",
  "/fleet-model": "Modelo de Frota",
  "/fleet-group": "Grupo de Frota",
  "/location-group": "Grupo de Localidade",
  "/location": "Localidade",
  "/position": "Cargo de Motorista",
  "/region": "Região",
  "/responsible-sector": "Setor Responsável",
  "/state": "Estado",
  "/timezone": "Fuso Horário",
  "/timezone-value": "Valor de Fuso Horário",
  "/trip-type": "Tipo de Viagem",
  "/stop-type": "Tipo de Parada",
};

const schemaObjectives: Record<string, string> = {
  "/activity-truck": "Cadastrar e gerenciar as atividades disponíveis para veículos (caminhões), definindo código, descrição, obrigatoriedade de motorista e cor de identificação.",
  "/attribution": "Cadastrar tipos de atribuição utilizados no planejamento de rotas e viagens.",
  "/city": "Cadastrar e consultar cidades com vínculo a país e estado, incluindo coordenadas geográficas.",
  "/company": "Cadastrar empresas (clientes e fornecedores) com endereço e localização geográfica completa.",
  "/country": "Cadastrar países com códigos ISO (Alpha-2, Alpha-3 e Numérico).",
  "/justification": "Cadastrar justificativas para atrasos e cancelamentos de viagens, vinculando ao setor responsável.",
  "/fleet-brand": "Cadastrar marcas de veículos da frota (ex: Volvo, Scania, Mercedes).",
  "/fleet-model": "Cadastrar modelos de veículos da frota, vinculando à marca correspondente.",
  "/fleet-group": "Cadastrar grupos de frota para organização e filtragem de veículos, com quantidade de demandas.",
  "/location-group": "Cadastrar grupos de localidades para agrupamento e filtragem.",
  "/location": "Cadastrar localidades (pontos de origem/destino) com coordenadas, códigos de integração (TMS e GPS), tipo e grupo.",
  "/position": "Cadastrar cargos de motoristas com prioridade e cor de identificação.",
  "/region": "Cadastrar regiões geográficas vinculadas a países.",
  "/responsible-sector": "Cadastrar setores responsáveis utilizados em justificativas.",
  "/state": "Cadastrar estados/províncias vinculados a países e opcionalmente a regiões.",
  "/timezone": "Cadastrar fusos horários disponíveis no sistema.",
  "/timezone-value": "Cadastrar valores de fuso horário com período de vigência (início e fim).",
  "/trip-type": "Cadastrar tipos de viagem com indicação de carga e cor de identificação.",
  "/stop-type": "Cadastrar tipos de parada com tempo padrão e indicação de jornada de motorista.",
};

function generateSchemaScreens(): ScreenDoc[] {
  const screens: ScreenDoc[] = [];

  for (const [route, schema] of Object.entries(entitySchemas)) {
    const name = schemaScreenNames[route] || schema.endpoint;
    const formFields = buildFieldRows(schema.fields);
    const tableCols = buildTableCols(schema.fields);

    // Filters description
    let filtersDesc = "";
    if (schema.filters && schema.filters.length > 0) {
      filtersDesc =
        "Os filtros disponíveis são:\n" +
        schema.filters
          .map((f) => {
            let desc = `• ${f.label} — ${filterTypeLabel[f.type] || f.type}`;
            if (f.type === "select" && f.options) {
              desc += ` (opções: ${f.options.map((o) => o.label).join(", ")})`;
            }
            return desc;
          })
          .join("\n") +
        "\n\nClique em 'Pesquisar' para enviar os filtros ao servidor. Use 'Limpar' para resetar todos os campos.";
    } else {
      filtersDesc =
        "Esta tela não possui filtros avançados. Clique em 'Pesquisar' para carregar todos os registros. Após a carga, utilize o campo 'Filtrar resultados' na barra de ferramentas para busca local em todas as colunas.";
    }

    // Listing description
    const listingDesc =
      "A listagem exibe as seguintes colunas:\n" +
      tableCols.map((f) => `• ${f.label}`).join("\n") +
      "\n\nClique duas vezes em um registro para editá-lo. Passe o mouse sobre uma linha para exibir o ícone de exclusão.";

    // Creation/Edition - field details
    const fieldDetails = formFields
      .map((f) => {
        const parts: string[] = [];
        parts.push(`• ${f.label}`);
        parts.push(`— Tipo: ${fieldTypeLabel[f.type] || f.type}`);
        if (f.required) parts.push("— ⭐ Obrigatório");
        if (f.maxLength) parts.push(`— Máx. ${f.maxLength} caracteres`);
        if (f.minLength) parts.push(`— Mín. ${f.minLength} caracteres`);
        if (f.uppercase) parts.push("— Convertido para maiúsculas");
        if (f.nullable) parts.push("— Pode ser deixado em branco");
        if (f.type === "lookup" && f.lookupEndpoint) parts.push(`— Lista carregada de: ${f.lookupEndpoint}`);
        if (f.type === "select" && f.options) parts.push(`— Opções: ${f.options.map((o) => o.label).join(", ")}`);
        if (f.type === "color") parts.push("— Seletor visual de cor");
        if (f.colorFormat === "decimal") parts.push("— Armazenado como inteiro decimal na API");
        return parts.join(" ");
      })
      .join("\n");

    const requiredFields = formFields.filter((f) => f.required).map((f) => f.label);
    const requiredNote =
      requiredFields.length > 0
        ? `\n\nCampos obrigatórios (marcados com borda vermelha): ${requiredFields.join(", ")}.`
        : "";

    const creationDesc =
      `Clique no botão '+' na barra de ferramentas para abrir o painel de inclusão. Preencha os campos abaixo:\n\n${fieldDetails}${requiredNote}\n\nClique em 'Salvar' para gravar o registro ou 'Cancelar' para fechar sem salvar.`;

    const editionDesc =
      `Dê duplo clique no registro desejado na listagem. O painel de edição será aberto com os dados preenchidos. Altere os campos necessários e clique em 'Salvar'.${requiredNote}`;

    const deletionDesc = `Passe o mouse sobre o registro na listagem e clique no ícone de lixeira (🗑). Uma caixa de confirmação será exibida com o identificador do registro. Confirme para excluir permanentemente.`;

    screens.push({
      name,
      route,
      objective: schemaObjectives[route] || `Cadastrar e gerenciar registros de ${name}.`,
      filters: filtersDesc,
      listing: listingDesc,
      creation: creationDesc,
      edition: editionDesc,
      deletion: deletionDesc,
      schemaKey: route,
    });
  }

  return screens.sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

/* Also include custom CRUD screens not in entitySchemas */
const customCrudScreens: ScreenDoc[] = [
  {
    name: "Atividade de Motorista",
    route: "/activity",
    objective: "Cadastrar atividades de motoristas com horários, localidades e vínculos a linhas e tipos de atividade.",
    filters: "Filtros por Data, Motorista, Localidade e Tipo de Atividade.",
    listing: "Exibe colunas de Data, Motorista, Localidade, Tipo, Horário Início e Fim.",
    creation: "Formulário com campos de Data, Motorista (seleção), Localidade (seleção), Tipo de Atividade (seleção), Horários e observações.",
    edition: "Duplo clique no registro abre o painel de edição com os dados preenchidos.",
    deletion: "Ícone de lixeira com confirmação.",
  },
  {
    name: "Tipo de Atividade",
    route: "/activity-type",
    objective: "Cadastrar os tipos de atividade disponíveis para motoristas.",
  },
  {
    name: "Motorista",
    route: "/driver",
    objective: "Cadastrar e gerenciar motoristas com dados pessoais, documentação e vínculos operacionais.",
    filters: "Filtros por Código, Nome e Status.",
    listing: "Exibe código, nome, CNH, categoria, validade e status do motorista.",
    creation: "Formulário completo com dados pessoais, documentação (CNH), cargo e informações operacionais.",
    edition: "Duplo clique no registro abre o formulário de edição.",
    deletion: "Ícone de lixeira com confirmação pelo nome do motorista.",
  },
  {
    name: "Linha",
    route: "/line",
    objective: "Cadastrar linhas (rotas) com estrutura mestre-detalhe. O mestre define a linha e o detalhe as seções (trechos) com localidades de origem/destino.",
    filters: "Filtros por Código, Origem e Destino.",
    listing: "Exibe código da linha, descrição, origem, destino e quantidade de seções.",
    creation: "O formulário possui duas áreas: dados da linha (código, descrição, tipo) e a grade de seções (origem, destino, distância, tempo). Use o botão '+' na grade para adicionar seções.",
    edition: "Duplo clique na linha abre o painel completo. Seções podem ser adicionadas, editadas ou removidas.",
    deletion: "A exclusão da linha remove automaticamente todas as suas seções. Confirmação obrigatória.",
    extra: "Função de Cópia: O botão de cópia duplica a linha com todas as seções, gerando um novo registro em modo de edição.",
  },
  {
    name: "Tipo de Localidade",
    route: "/location-type",
    objective: "Cadastrar tipos de localidade para classificação dos pontos logísticos (ex: Terminal, Pátio, Cliente).",
  },
  {
    name: "Tipo de Frota",
    route: "/fleet-type",
    objective: "Cadastrar tipos de frota para classificação dos veículos (ex: Cavalo Mecânico, Carreta, Bitrem).",
  },
  {
    name: "Veículo",
    route: "/truck",
    objective: "Cadastrar veículos da frota com dados de placa, modelo, marca, grupo de frota e informações operacionais.",
  },
];

/* ───────────────── Merge schema screens into Cadastros group ───────────────── */

function buildFullManual(): ManualGroup[] {
  const schemaScreens = generateSchemaScreens();
  const allCadastros = [...schemaScreens, ...customCrudScreens].sort((a, b) =>
    a.name.localeCompare(b.name, "pt"),
  );

  return manualData.map((g) => {
    if (g.group === "Cadastros") {
      return { ...g, screens: allCadastros };
    }
    return g;
  });
}

/* ───────────────── PDF Export ───────────────── */

const loadImageBase64 = (src: string): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = src;
  });

function screenToTextBlocks(screen: ScreenDoc): { label: string; text: string }[] {
  const blocks: { label: string; text: string }[] = [];
  blocks.push({ label: "Objetivo", text: screen.objective });
  if (screen.filters) blocks.push({ label: "Filtros", text: screen.filters });
  if (screen.listing) blocks.push({ label: "Listagem", text: screen.listing });
  if (screen.creation) blocks.push({ label: "Inclusão (Novo Registro)", text: screen.creation });
  if (screen.edition) blocks.push({ label: "Edição", text: screen.edition });
  if (screen.deletion) blocks.push({ label: "Exclusão", text: screen.deletion });
  if (screen.extra) blocks.push({ label: "Observações", text: screen.extra });
  return blocks;
}

async function exportManualToPdf(groups: ManualGroup[], title: string) {
  const { default: jsPDF } = await import("jspdf");

  const logoB64 = await loadImageBase64(siglaLogo);
  const now = new Date().toLocaleString("pt-BR");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const headerHeight = 20;
  const footerHeight = 12;
  const topStart = headerHeight + 8;
  const bottomLimit = pageHeight - footerHeight - 5;

  let y = topStart;

  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = topStart;
    }
  };

  const addHeaderFooter = () => {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);

      // Header background
      doc.setFillColor(245, 245, 245);
      doc.rect(0, 0, pageWidth, headerHeight, "F");
      doc.setDrawColor(200, 200, 200);
      doc.line(0, headerHeight, pageWidth, headerHeight);

      // Logo left
      if (logoB64) {
        try { doc.addImage(logoB64, "PNG", marginLeft, 2, 0, 16); } catch { /* skip */ }
      }

      // Title center
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(title, pageWidth / 2, 12, { align: "center" });

      // Footer
      doc.setDrawColor(200, 200, 200);
      doc.line(marginLeft, pageHeight - footerHeight, pageWidth - marginRight, pageHeight - footerHeight);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(`SIGLA Cargo v${APP_VERSION}`, marginLeft, pageHeight - 7);
      doc.text(`Gerado em: ${now}`, pageWidth / 2, pageHeight - 7, { align: "center" });
      doc.text(`Página ${i} de ${total}`, pageWidth - marginRight, pageHeight - 7, { align: "right" });
    }
  };

  // Render content
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];

    // Group title
    ensureSpace(14);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 65, 122);
    doc.text(group.group, marginLeft, y);
    y += 3;
    doc.setDrawColor(41, 65, 122);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 6;

    for (const screen of group.screens) {
      // Screen name
      ensureSpace(12);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`${screen.name}  (${screen.route})`, marginLeft + 2, y);
      y += 5;

      const blocks = screenToTextBlocks(screen);
      for (const block of blocks) {
        ensureSpace(10);
        // Section label
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text(block.label, marginLeft + 4, y);
        y += 4;

        // Section text
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        const lines = doc.splitTextToSize(block.text, contentWidth - 8);
        for (const line of lines) {
          ensureSpace(4);
          doc.text(line, marginLeft + 6, y);
          y += 3.5;
        }
        y += 2;
      }
      y += 4;
    }

    // Add page break between groups (except last)
    if (gi < groups.length - 1) {
      doc.addPage();
      y = topStart;
    }
  }

  addHeaderFooter();

  const filename = title.replace(/\s+/g, "_");
  doc.save(`${filename}.pdf`);
}

/* ───────────────── Render helpers ───────────────── */

function TextBlock({ text }: { text: string }) {
  return (
    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
      {text}
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <h4 className="text-sm font-semibold text-foreground mt-4 mb-1 flex items-center gap-1.5">
      {label}
    </h4>
  );
}

function ScreenCard({ screen }: { screen: ScreenDoc }) {
  const [open, setOpen] = useState(false);

  const hasSections =
    screen.filters || screen.listing || screen.creation || screen.edition || screen.deletion || screen.extra;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-border/60">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {open ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                {screen.name}
              </CardTitle>
              <Badge variant="outline" className="text-xs font-mono">
                {screen.route}
              </Badge>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-1">
            <SectionLabel label="Objetivo" />
            <TextBlock text={screen.objective} />

            {screen.filters && (
              <>
                <SectionLabel label="Filtros" />
                <TextBlock text={screen.filters} />
              </>
            )}

            {screen.listing && (
              <>
                <SectionLabel label="Listagem" />
                <TextBlock text={screen.listing} />
              </>
            )}

            {screen.creation && (
              <>
                <SectionLabel label="Inclusão (Novo Registro)" />
                <TextBlock text={screen.creation} />
              </>
            )}

            {screen.edition && (
              <>
                <SectionLabel label="Edição" />
                <TextBlock text={screen.edition} />
              </>
            )}

            {screen.deletion && (
              <>
                <SectionLabel label="Exclusão" />
                <TextBlock text={screen.deletion} />
              </>
            )}

            {screen.extra && (
              <>
                <SectionLabel label="Observações" />
                <TextBlock text={screen.extra} />
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/* ───────────────── Main component ───────────────── */

const Manual = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = (i18n.language as Lang) || "pt";
  const [searchTerm, setSearchTerm] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const fullManual = useMemo(() => buildFullManual(), []);

  const titles: Record<string, string> = {
    pt: "Manual do Usuário",
    en: "User Manual",
    es: "Manual del Usuario",
  };

  const searchPlaceholder: Record<string, string> = {
    pt: "Buscar no manual...",
    en: "Search manual...",
    es: "Buscar en el manual...",
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return fullManual;

    return fullManual
      .map((g) => ({
        ...g,
        screens: g.screens.filter((s) => {
          const all = [
            s.name,
            s.objective,
            s.filters,
            s.listing,
            s.creation,
            s.edition,
            s.deletion,
            s.extra,
            s.route,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return all.includes(term);
        }),
      }))
      .filter((g) => g.screens.length > 0);
  }, [searchTerm, fullManual]);

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    filtered.forEach((g) => (all[g.group] = true));
    setOpenGroups(all);
  };

  const collapseAll = () => setOpenGroups({});

  const handleExportFull = useCallback(async () => {
    toast.info("Gerando PDF do manual completo...");
    await exportManualToPdf(fullManual, "Manual do Usuário - SIGLA Cargo");
    toast.success("PDF gerado com sucesso!");
  }, [fullManual]);

  const handleExportGroup = useCallback(async (group: ManualGroup) => {
    toast.info(`Gerando PDF: ${group.group}...`);
    await exportManualToPdf([group], `Manual - ${group.group}`);
    toast.success("PDF gerado com sucesso!");
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-display font-bold text-foreground">
            {titles[lang]}
          </h1>
        </div>
      </div>

      {/* Search + expand/collapse */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder[lang]}
            className="pl-9 h-9 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={expandAll} className="text-xs shrink-0">
          Expandir
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll} className="text-xs shrink-0">
          Compactar
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs shrink-0 gap-1">
              <FileDown className="h-3.5 w-3.5" />
              PDF
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportFull} className="text-xs gap-2">
              <FileDown className="h-3.5 w-3.5" />
              Manual Completo
            </DropdownMenuItem>
            {fullManual.map((g) => (
              <DropdownMenuItem key={g.group} onClick={() => handleExportGroup(g)} className="text-xs gap-2">
                <FileDown className="h-3.5 w-3.5" />
                {g.group}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {filtered.map((group) => {
          const isOpen = openGroups[group.group] ?? false;

          return (
            <Collapsible key={group.group} open={isOpen} onOpenChange={() => toggleGroup(group.group)}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer rounded-lg bg-muted/50 px-4 py-3 hover:bg-muted transition-colors">
                  {isOpen ? (
                    <ChevronDown className="h-5 w-5 text-primary shrink-0" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-primary shrink-0" />
                  )}
                  <h2 className="text-base font-display font-bold text-foreground">
                    {group.group}
                  </h2>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {group.screens.length} {group.screens.length === 1 ? "tela" : "telas"}
                  </Badge>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="space-y-3 pt-3 pl-2">
                  {group.screens.map((screen) => (
                    <ScreenCard key={screen.route} screen={screen} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum resultado encontrado.
          </p>
        )}
      </div>

      {/* General notes */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            Informações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Campos obrigatórios:</strong> São destacados com borda vermelha quando não preenchidos. Não é possível salvar o registro sem preencher todos os campos obrigatórios.
          </p>
          <p>
            <strong>Exportação:</strong> Os dados das listagens podem ser exportados nos formatos Excel (.xlsx) e PDF usando o botão de exportação na barra de ferramentas.
          </p>
          <p>
            <strong>Temas e Idiomas:</strong> O sistema suporta tema claro e escuro (ícone no cabeçalho) e três idiomas: Português, Inglês e Espanhol.
          </p>
          <p>
            <strong>Maiúsculas:</strong> Campos marcados com conversão automática para maiúsculas transformam o texto digitado automaticamente.
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center pt-4">
        © LATOP Tecnologia da Informação Ltda
      </p>
    </div>
  );
};

export default Manual;
