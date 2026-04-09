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
          "O SIGLA Cargo (Sistema Integrado de Gestão e Logística Avançada) é uma plataforma completa desenvolvida pela LATOP Tecnologia da Informação Ltda para otimizar operações de transporte, coordenação de frota e planejamento logístico. " +
          "O sistema gerencia toda a operação do transporte de carga, atuando na escala dos motoristas desde o planejamento — com a atribuição de demandas ou atividades —, acompanhando a execução em tempo real e gerando dados estatísticos, tudo em conformidade com a legislação vigente da Lei do Motorista.",
        extra:
          "Principais recursos do sistema:\n\n" +
          "• Dashboard Interativo — KPIs em tempo real com gráficos de status e tendências de viagens.\n" +
          "• Coordenação de Viagens — Gráfico de Gantt com 3 camadas (Planejado, Realizado e Parada) para visualização completa das operações.\n" +
          "• Monitoramento — Acompanhamento de partidas, chegadas e liberação de viagens em tempo real.\n" +
          "• Escala de Motoristas — Gestão de solicitações, circuitos, férias, treinamentos e publicação de jornadas conforme a legislação.\n" +
          "• Planejamento — Modelos de planejamento, cenários, otimização de rotas e planejamento de veículos.\n" +
          "• Importações — Upload de demandas logísticas e mapas de operação.\n" +
          "• Cadastros — Mais de 25 telas de cadastro auxiliar com CRUD completo (Criar, Ler, Atualizar, Excluir).\n" +
          "• Relatórios — Geração de relatórios operacionais e gerenciais com parâmetros dinâmicos.\n\n" +
          "Recursos técnicos:\n\n" +
          "• Sistema de abas internas com até 5 telas simultâneas e preservação de estado.\n" +
          "• Suporte multi-idioma: Português, Inglês e Espanhol.\n" +
          "• Tema claro e escuro.\n" +
          "• Exportação de dados em Excel (.xlsx) e PDF.\n" +
          "• Filtros avançados com pesquisa server-side e busca local.\n" +
          "• Pesquisas avançadas de Motorista, Veículo, Atividade, Localidade e Linha com modais dedicados.\n" +
          "• Campos com validação visual, conversão automática de maiúsculas e lookups inteligentes.\n\n" +
          "Desenvolvido por: LATOP Tecnologia da Informação Ltda.",
      },
    ],
  },
  {
    group: "Dashboard",
    screens: [
      {
        name: "Dashboard",
        route: "/dashboard",
        objective:
          "Painel de controle central do sistema que apresenta uma visão consolidada de toda a operação de transporte em tempo real. " +
          "Concentra indicadores-chave de desempenho (KPIs), gráficos analíticos e uma tabela de próximas partidas, " +
          "permitindo ao gestor acompanhar o andamento das viagens sem navegar entre múltiplas telas.",
        filters:
          "Data de Referência (navegação por dia com setas ◀ ▶) e Grupo de Localidade (botões de filtro carregados da API). " +
          "O filtro 'Todas' exibe dados consolidados de todos os grupos. A seleção de um grupo específico restringe todos os indicadores e gráficos.",
        extra:
          "KPIs Principais (cartões no topo):\n\n" +
          "• Viagens Hoje — Total de viagens planejadas para a data selecionada.\n" +
          "• Em Execução — Quantidade de viagens atualmente em trânsito.\n" +
          "• Motoristas Escalados — Número de motoristas únicos com viagens atribuídas.\n" +
          "• Veículos em Operação — Número de veículos únicos em uso.\n" +
          "• Atrasadas — Viagens com atraso identificado.\n\n" +
          "Gráficos e Indicadores:\n\n" +
          "• Status do Dia (gráfico de rosca) — Distribuição visual das viagens por status: Planejadas, Em Execução, Concluídas, Atrasadas e Canceladas.\n" +
          "• Taxas de Performance (barras horizontais) — Pontualidade (onTimeRate), Conclusão (completionRate) e Cancelamentos (cancelRate).\n" +
          "• Tendência de Viagens (gráfico de barras) — Quantidade de viagens dos últimos 7 dias, permitindo identificar tendências e variações.\n" +
          "• Justificativas por Setor — Distribuição das justificativas de atraso/cancelamento por setor responsável.\n\n" +
          "Tabela de Próximas Saídas:\n\n" +
          "Exibe as viagens com partida programada mais próxima, com colunas: Horário Planejado, Demanda, Origem, Destino, Placa, Motorista e Status.\n\n" +
          "Comportamento de Carregamento:\n\n" +
          "O Dashboard utiliza a lógica 'Load on Demand': na primeira visita da sessão, os dados são carregados apenas após o clique manual no botão 'Atualizar'. " +
          "Após essa ativação, a atualização automática é habilitada e as visitas subsequentes na mesma sessão carregam os dados automaticamente.",
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
        name: "Navegação e Abas",
        route: "-",
        objective:
          "O menu lateral organiza as telas em grupos (Coordenação, Monitoramento, etc.). O sistema de abas internas permite manter até 5 telas abertas simultaneamente com preservação de estado. Use os botões de expandir/compactar no topo do menu para gerenciar todos os grupos.",
      },
      {
        name: "Botão Pesquisar",
        route: "-",
        objective:
          "Em todas as telas de cadastro, o botão 'Pesquisar' sempre realiza uma nova consulta à API, mesmo que os filtros não tenham sido alterados. Isso garante que os dados exibidos estejam sempre atualizados.",
      },
      {
        name: "Padrão de Filtros nas Telas",
        route: "-",
        objective:
          "As telas do sistema possuem diferentes níveis de filtro de pesquisa:\n\n" +
          "• Telas sem filtro — Algumas telas de cadastro não possuem campos de filtro. O usuário clica diretamente em 'Pesquisar' para carregar a lista completa de registros. " +
          "Após o carregamento, é possível usar o campo 'Filtrar resultados' na barra de ferramentas para busca local em todas as colunas.\n\n" +
          "• Telas com filtros simples — Possuem um ou mais campos de filtro (texto, seleção, data) que são enviados ao servidor para refinar a consulta antes do carregamento.\n\n" +
          "• Telas com filtros avançados — Além dos filtros padrão, oferecem pesquisas avançadas com modais dedicados (Motorista, Veículo, Localidade, Atividade, Linha) " +
          "que permitem buscar por múltiplos critérios simultaneamente.",
      },
      {
        name: "Campos Obrigatórios",
        route: "-",
        objective:
          "Em toda a aplicação, campos e filtros obrigatórios são identificados com um asterisco vermelho (✱) ao lado do rótulo. " +
          "O sistema impede o salvamento ou a pesquisa caso campos obrigatórios não estejam preenchidos. " +
          "Além disso, em formulários e filtros com intervalos de datas, o sistema valida que a Data Início seja menor ou igual à Data Fim, " +
          "bloqueando a operação com uma mensagem de erro caso contrário.",
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
        extra:
          "Pesquisa Avançada de Veículo:\n\n" +
          "O campo de Veículo utiliza pesquisa avançada (ícone de lupa) que permite buscar por Placa e Código de Frota. " +
          "A seleção exibe Placa - Cód. Frota no campo.\n\n" +
          "A tela também permite criação de novas viagens diretamente pelo diálogo '+' com campos de Demanda, Placa (pesquisa avançada de veículo), " +
          "Origem e Destino (pesquisa avançada de localidade), horários planejados e tipo de viagem.",
      },
      {
        name: "Coordenação de Viagens",
        route: "/daily-trips-schedule",
        objective:
          "Visualizar e gerenciar o cronograma de viagens em formato Gantt interativo e listagem tabular, com filtros por período, grupo de frota, grupo de localidade e placas.",
        filters:
          "Data Início (obrigatório), Data Fim (obrigatório), Grupo de Frota (multi-seleção), Grupo de Localidade (dropdown), Placas (multi-seleção) e Demanda. Período máximo de 7 dias.",
        listing:
          "Gráfico de Gantt com veículos por linha e barras coloridas representando viagens planejadas, paradas e execução real. " +
          "Visão de lista com colunas: Demanda, Placa, Origem, Destino, Horários Planejados/Reais e Status.",
        creation:
          "Botão '+' para criar nova viagem com formulário completo.",
        edition:
          "Duplo clique na barra do Gantt ou na linha da tabela abre o painel lateral de edição.",
        extra:
          "• Suporte a zoom no Gantt (6h, 12h, 24h).\n" +
          "• Ordenação inteligente no Gantt: veículos com viagem no período aparecem primeiro (ordenados por placa), seguidos pelos veículos sem viagem (também ordenados por placa).\n" +
          "• Paginação server-side com seletor de registros por página.\n" +
          "• Exportação de dados em Excel e PDF.",
      },
    ],
  },
  {
    group: "Monitoramento",
    screens: [
      {
        name: "Chegadas e Partidas",
        route: "/departures-and-arrivals",
        objective:
          "Acompanhar em tempo real as chegadas e partidas de veículos em formato de painel de aeroporto (split-screen).",
        filters:
          "Localidade (seletor com busca), aplicado automaticamente ao painel de chegadas e partidas.",
        listing:
          "Painel dividido em duas seções:\n" +
          "• Chegadas (esquerda, tema azul) — Hora, Data, Localidade de Origem, Placa, Cód. Frota, Motorista e Status.\n" +
          "• Partidas (direita, tema âmbar) — Hora, Data, Localidade de Destino, Placa, Cód. Frota, Motorista e Status.",
        extra:
          "• Indicadores de Pontualidade (OnTime) — Badges no cabeçalho de cada painel exibem % no horário, quantidade de atrasados e pendentes (dados do hook compartilhado useOnTimeData).\n" +
          "• Lógica de cores por status: Vermelho (Atrasado > 15min), Amarelo (Atenção < 1h), Verde (Saiu - DEP) e Cinza (Chegou - ARR).\n" +
          "• Autoatualização a cada 5 minutos.\n" +
          "• Modo tela cheia (botão Expandir/Compactar).\n" +
          "• Adaptação dinâmica ao tema claro/escuro do sistema.",
      },
      {
        name: "Liberação de Viagens",
        route: "/release-driver",
        objective:
          "Consultar e liberar viagens para execução. Combina checklist de verificação com formulário de liberação do motorista e veículo.",
        filters:
          "Data da Viagem (obrigatório) e Local de Saída (obrigatório, com busca por nome). Os filtros devem ser preenchidos antes da pesquisa.",
        listing:
          "Exibe as viagens com colunas: Demanda, Placa, Motorista, Origem, Destino, Horários (Planejado/Real) e Status (badges coloridos).",
        extra:
          "Fluxo de Liberação em duas etapas:\n\n" +
          "1. Checklist — Botão 'Check' (azul pulsante quando pendente, verde quando concluído). Abre formulário com dados planejados " +
          "(campos somente leitura com fundo azul claro) e campos de execução. Botão de cópia rápida transfere dados planejados para execução.\n\n" +
          "2. Liberação — Botão 'Liberar' (disponível após checklist). Formulário de liberação com dados do motorista e veículo. " +
          "Após liberação, o botão assume tom neutro com texto 'Liberado'.\n\n" +
          "• Layout paisagem (920px) com campos em grid.\n" +
          "• Exportação em Excel disponível na barra de ferramentas.\n" +
          "• A pesquisa avançada de Motorista utiliza o modo 'forceActiveOnly' (apenas motoristas ativos).",
      },
    ],
  },
  {
    group: "Escala de Motoristas",
    screens: [
      {
        name: "Solicitação de Motoristas",
        route: "/drivers-request",
        objective: "Registrar e gerenciar solicitações de motoristas para atividades específicas.",
        filters: "Data Inicial (obrigatório), Data Final (obrigatório), Grupo de Localidade, Grupo de Frota, Motorista (pesquisa avançada), Atividade e Status. Período padrão: D-0 até D+30, máximo de 60 dias. O filtro de Status inicia em 'Pendente' por padrão.",
        listing: "Exibe Data Solicitada, Motorista (com tooltip de Base e Frotas), Atividade, Programação (horário início-fim), Observação, Data do Pedido e Status com badges coloridos (amarelo=Pendente, verde=Aprovado, vermelho=Negado). Colunas ordenáveis por clique no cabeçalho.",
        extra:
          "• Ações de Aprovação/Negação — Botões sempre visíveis na coluna Ações para solicitações com status Pendente.\n" +
          "• Confirmação via diálogo — Ao aprovar ou negar, uma caixa de confirmação é exibida antes de efetivar a ação.\n" +
          "• Exportação — Dados exportáveis em Excel (.xlsx) e PDF com descrição dos filtros aplicados.\n" +
          "• Paginação server-side com seletor de registros por página (10, 20, 50, 100).",
      },
      {
        name: "Circuitos de Motoristas",
        route: "/drivers-schedule",
        objective: "Gestão de circuitos de motoristas com Gráfico de Gantt interativo e painel de edição de circuitos.",
        filters: "Data Início, Data Fim, Grupo de Localidade, Motorista (pesquisa avançada com 'forceActiveOnly').",
        extra:
          "• Gráfico de Gantt com visualização de circuitos por motorista e período.\n" +
          "• Painel de edição flutuante com cabeçalho (Código, Status, datas planejadas e reais) e tabela de tarefas (viagens e atividades).\n" +
          "• Adição de viagens (com busca por DT e retorno automático) e atividades (com pesquisa avançada por tipo de atividade).\n" +
          "• Modal de detalhe da viagem em layout master-detail: metadados no topo e tabela de seções (trechos) na parte inferior.\n" +
          "• Filtros secundários em resultados: por STO/DT ou Código/Tipo de Atividade.\n" +
          "• Painel de viagens sem motorista com filtros internos, ordenação e paginação.",
      },
      {
        name: "Férias de Motoristas",
        route: "/driver-vacation",
        objective: "Gerenciar férias planejadas de motoristas com listagem por período e status (Em Andamento, Prevista, Encerrada).",
        filters: "Data de Referência (obrigatório) e Base de Motorista (opcional). A busca de motorista utiliza a pesquisa avançada com Nome de Escala, Cód. GPID, CPF, Base e Grupo de Frota.",
        listing: "Exibe Motorista, CPF, Base, Data Início, Data Fim e Status com badges coloridos (verde=Em Andamento, azul=Prevista, cinza=Encerrada).",
        creation: "Formulário com Motorista (pesquisa avançada com 'forceActiveOnly'), Data Início e Data Fim.",
        edition: "Clique no registro abre o painel de edição.",
        deletion: "Ícone de lixeira com confirmação.",
      },
      {
        name: "Treinamento de Motoristas",
        route: "/training-class",
        objective: "Gerenciar turmas de treinamento com motoristas vinculados, atividades e localidades.",
        filters: "Data de Referência e busca por nome da turma.",
        listing: "Exibe Nome da Turma, Instrutor, Atividade, Localidade, Período e quantidade de Motoristas.",
        creation: "Formulário com Nome, Descrição, Período, Instrutor, Atividade (pesquisa avançada) e Localidade (pesquisa avançada). Após salvar, permite adicionar motoristas à turma.",
        extra: "• Pesquisa avançada de Atividade com filtro por Tipo de Atividade e toggle Ativo.\n" +
          "• Pesquisa avançada de Localidade com filtros por Código, Nome, Grupo de Localidade, Tipo de Localidade e Cód. TMS.\n" +
          "• Pesquisa avançada de Motorista com filtros por Nome de Escala, Cód. GPID, Base e Grupo de Frota.\n" +
          "• Atribuição de curso ao motorista diretamente pela turma.",
      },
      {
        name: "Ocorrências de Motoristas",
        route: "/driver-occurrence",
        objective: "Registrar ocorrências e advertências de motoristas.",
        filters: "Data de Referência e busca por motorista.",
        listing: "Exibe Motorista, Data da Ocorrência, Responsável, Advertência e Descrição.",
        creation: "Formulário com Data, Motorista (pesquisa avançada), Responsável, Advertência (Sim/Não) e Descrição.",
        edition: "Clique no registro abre o painel de edição.",
      },
      {
        name: "Documentos do Motorista",
        route: "/driver-documents",
        objective: "Gerenciar documentos obrigatórios e informativos enviados aos motoristas, com controle de validade, upload de arquivos, envio em massa e rastreamento de leitura.",
        filters: "Nome do Documento, Status (Ativo, A Vencer, Vencido, Rascunho) e Obrigatório (Sim/Não).",
        listing: "Exibe Nome, Obrigatório (Sim/Não), Emissão, Validade, Arquivo, Tamanho, Enviados, Lidos, % Leitura e Status com badges coloridos.",
        creation: "Formulário com Nome, Descrição, Toggle de Obrigatoriedade, Data de Emissão, Data de Validade e Upload de arquivo (drag-and-drop, aceita PDF, DOC, XLS).",
        edition: "Clique no ícone de edição abre o painel com os campos preenchidos.",
        deletion: "Ícone de lixeira com confirmação obrigatória.",
        extra:
          "KPIs no topo da tela:\n\n" +
          "• Total de Documentos — Quantidade total de documentos cadastrados.\n" +
          "• Ativos — Documentos com status ativo.\n" +
          "• A Vencer (30 dias) — Documentos próximos do vencimento.\n" +
          "• Taxa Média de Leitura — Percentual médio de leitura entre documentos enviados.\n\n" +
          "Envio em Massa:\n\n" +
          "• Botão 'Enviar' no documento permite enviar para todos os motoristas ou filtrar por base.\n" +
          "• Após envio, o status do documento é atualizado para 'Ativo'.\n\n" +
          "Detalhes e Rastreamento:\n\n" +
          "• Botão 'Visualizar' abre painel com resumo do documento e barra de progresso de leitura.\n" +
          "• Tabela de destinatários com colunas: Motorista, CPF, Base, Data de Envio, Data de Leitura e Status.\n" +
          "• Filtro de destinatários por status (Todos, Lidos, Enviados, Pendentes).\n\n" +
          "Exportação de dados em Excel (.xlsx) e PDF disponível na barra de ferramentas.",
      },
      {
        name: "Publicação de Jornada",
        route: "/publish-journey",
        objective: "Pendente de liberação. Esta função será liberada em breve para o seu perfil.",
      },
    ],
  },
  {
    group: "Frequência de Localidade",
    screens: [
      {
        name: "Frequência de Localidade",
        route: "/location-frequency",
        objective: "Cadastrar e gerenciar as faixas horárias de carga e descarga por localidade e dia da semana.",
        filters: "Localidade (obrigatório, pesquisa avançada com LookupSearchField via modal).",
        listing: "Após pesquisar, exibe abas por dia da semana (Seg a Dom) com resumo de capacidade de carga (C) e descarga (D). Ao selecionar um dia, lista as faixas horárias com Início, Fim, Carga e Descarga.",
        creation: "Formulário inline na parte inferior da tabela com seletores de hora (Início/Fim) e campos numéricos para Carga e Descarga.",
        edition: "Edição inline dos campos de Carga e Descarga diretamente na tabela.",
        deletion: "Ícone de lixeira com confirmação obrigatória.",
        extra:
          "• Toolbar com botões Pesquisar, Limpar e Novo.\n" +
          "• Resumo visual por dia com badges de capacidade total.\n" +
          "• Validação de horário: início deve ser anterior ao fim.\n" +
          "• Atualização automática via API após adição ou exclusão.",
      },
    ],
  },
  {
    group: "Importações",
    screens: [
      {
        name: "Importação de Demandas",
        route: "/import-map",
        objective:
          "Importar demandas logísticas via upload de arquivo Excel (.xlsx, .xls, .csv). O usuário seleciona o Grupo de Localidade (dropdown dinâmico da API) e arrasta ou seleciona o arquivo. O sistema valida o arquivo via endpoint de check, exibe barra de progresso e o resultado da verificação.",
        filters:
          "Data Inicial e Data Final para consultar o histórico de importações. O período padrão é D-1 a D+1.",
        listing:
          "Tabela de histórico com colunas: Arquivo, Data/Hora, Status e Resultado do check. As colunas podem ser ordenadas clicando no cabeçalho (ascendente/descendente).",
        creation:
          "Upload de arquivo com seleção obrigatória de Grupo de Localidade. Clique em 'Importar' para enviar.",
      },
    ],
  },
  {
    group: "Planejamento",
    screens: [
      {
        name: "Planejamento de Veículos",
        route: "/vehicle-planning",
        objective: "Cadastrar e gerenciar vínculos de planejamento entre veículos e motoristas com frequência semanal e períodos de vigência.",
        filters: "Data de Referência (obrigatório), Grupo de Localidade (obrigatório), Grupo de Frota, Placa, Cód. Frota e Motorista (pesquisa avançada).",
        listing: "Exibe Veículo (Placa), Cód. Frota, Motorista, Data/Hora Início, Data/Hora Fim e Frequência Semanal (Seg a Dom com indicadores visuais).",
        creation: "Formulário com Veículo (pesquisa avançada), Motorista (pesquisa avançada), Data/Hora Início, Data/Hora Fim e checkboxes de frequência semanal (Seg a Dom).",
        edition: "Duplo clique no registro abre o formulário de edição com os dados preenchidos.",
        deletion: "Ícone de lixeira com confirmação.",
        extra:
          "• Botão 'Gerar Plan. de Veículos' para geração automática de vínculos a partir dos dados de referência.\n" +
          "• Paginação server-side com seletor de registros por página (10, 20, 50, 100).\n" +
          "• Exportação de dados em Excel (.xlsx) e PDF.\n" +
          "• Colunas ordenáveis por clique no cabeçalho.",
      },
      {
        name: "Planejamento Diário de Veículos",
        route: "/daily-vehicle-assignment",
        objective: "Gerenciar vínculos operacionais diários entre veículos e motoristas, com visualização em listagem, Gantt por Veículo e Gantt por Motorista.",
        filters: "Data Início (obrigatório), Data Final (obrigatório), Grupo de Localidade e Veículo (busca por placa/frota).",
        listing: "Três visualizações disponíveis via abas:\n" +
          "• Listagem — Tabela com Veículo, Cód. Frota, Motorista, Início, Fim e ações.\n" +
          "• Gantt Veículo — Gráfico de Gantt agrupado por veículo.\n" +
          "• Gantt Motorista — Gráfico de Gantt agrupado por motorista.",
        creation: "Formulário com Veículo (pesquisa avançada), Motorista (pesquisa avançada), Data/Hora Início e Data/Hora Fim.",
        edition: "Duplo clique no registro abre o formulário de edição.",
        deletion: "Ícone de lixeira com confirmação.",
        extra:
          "• Paginação server-side com seletor de registros por página.\n" +
          "• Exportação de dados em Excel (.xlsx) e PDF.",
      },
      {
        name: "Modelo de Planejamento",
        route: "/planning-model",
        objective: "Pendente de liberação. Esta função será liberada em breve para o seu perfil.",
      },
      {
        name: "Cenários",
        route: "/scenarios",
        objective: "Pendente de liberação. Esta função será liberada em breve para o seu perfil.",
      },
      {
        name: "Otimização de Viagens",
        route: "/trip-optimization",
        objective: "Pendente de liberação. Esta função será liberada em breve para o seu perfil.",
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
        objective: "Tela centralizada para consulta e geração de relatórios operacionais e gerenciais com parâmetros dinâmicos.",
        filters: "Seleção do relatório desejado (dropdown carregado da API). Parâmetros dinâmicos definidos por cada relatório (datas, códigos, textos).",
        extra:
          "• Tipos de saída: Visualizar (tabela em tela) ou Excel (download direto do arquivo .xlsx).\n" +
          "• Parâmetros são gerados automaticamente com base no tipo (date, string, number) definido pelo backend.\n" +
          "• Visualização em tela permite exportação posterior em Excel e PDF.\n" +
          "• Colunas da tabela de resultado são geradas dinamicamente a partir dos campos retornados pela API.",
      },
      {
        name: "Parâmetros Administrativos",
        route: "/admin-parameters",
        objective: "Configurar parâmetros globais do sistema e gerenciar o logotipo do cliente.",
        extra:
          "• Listagem de parâmetros do sistema (chave, valor, descrição) carregados da API.\n" +
          "• Upload de logotipo do cliente para personalização do sistema.\n" +
          "• Pré-visualização da imagem antes do envio.",
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
  "/course": "Curso",
  "/justification": "Justificativa",
  "/fleet-brand": "Marca de Frota",
  "/fleet-model": "Modelo de Frota",
  "/fleet-group": "Grupo de Frota",
  "/fleet-type": "Tipo de Frota",
  "/license": "Carteira",
  "/location-group": "Grupo de Localidade",
  "/location-type": "Tipo de Localidade",
  "/location": "Localidade",
  "/position": "Cargo de Motorista",
  "/regulation-rule": "Regra de Regulamentação",
  "/region": "Região",
  "/responsible-sector": "Setor Responsável",
  "/state": "Estado",
  "/timezone": "Fuso Horário",
  "/timezone-value": "Valor de Fuso Horário",
  "/trip-type": "Tipo de Viagem",
  "/stop-type": "Tipo de Parada",
  "/truck": "Veículo",
};

const schemaObjectives: Record<string, string> = {
  "/activity-truck": "Cadastrar e gerenciar as atividades disponíveis para veículos (caminhões), definindo código, descrição, obrigatoriedade de motorista e cor de identificação.",
  "/attribution": "Cadastrar tipos de atribuição utilizados no planejamento de rotas e viagens.",
  "/city": "Cadastrar e consultar cidades com vínculo a país e estado, incluindo coordenadas geográficas.",
  "/company": "Cadastrar empresas (clientes e fornecedores) com endereço e localização geográfica completa.",
  "/country": "Cadastrar países com códigos ISO (Alpha-2, Alpha-3 e Numérico).",
  "/course": "Cadastrar cursos e capacitações técnicas para motoristas, com tipo de restrição (Sem restrição, Alerta ou Bloqueio). Os cursos ficam disponíveis na aba 'Cursos' do cadastro de motorista.",
  "/justification": "Cadastrar justificativas para atrasos e cancelamentos de viagens, vinculando ao setor responsável.",
  "/fleet-brand": "Cadastrar marcas de veículos da frota (ex: Volvo, Scania, Mercedes).",
  "/fleet-model": "Cadastrar modelos de veículos da frota, vinculando à marca correspondente.",
  "/fleet-group": "Cadastrar grupos de frota para organização e filtragem de veículos, com quantidade de demandas.",
  "/fleet-type": "Cadastrar tipos de frota para classificação dos veículos (ex: Cavalo Mecânico, Carreta, Bitrem).",
  "/license": "Cadastrar carteiras (habilitações) com tipo de restrição (Sem restrição, Alerta ou Bloqueio). As carteiras ficam disponíveis na aba 'Carteiras' do cadastro de motorista.",
  "/location-group": "Cadastrar grupos de localidades para agrupamento e filtragem.",
  "/location-type": "Cadastrar tipos de localidade para classificação dos pontos logísticos (ex: Terminal, Pátio, Cliente). Inclui sinalizadores de Local de Operação e Local de Liberação.",
  "/location": "Cadastrar localidades (pontos de origem/destino) com coordenadas, códigos de integração (TMS e GPS), tipo e grupo.",
  "/position": "Cadastrar cargos de motoristas com prioridade e cor de identificação.",
  "/regulation-rule": "Cadastrar regras de regulamentação com valores inteiros, decimais e textuais, unidade (Minutos, Dias, Semanas, Código, Marcador) e status ativo/inativo. Utilizado para controle de conformidade com a legislação.",
  "/region": "Cadastrar regiões geográficas vinculadas a países.",
  "/responsible-sector": "Cadastrar setores responsáveis utilizados em justificativas.",
  "/state": "Cadastrar estados/províncias vinculados a países e opcionalmente a regiões.",
  "/timezone": "Cadastrar fusos horários disponíveis no sistema.",
  "/timezone-value": "Cadastrar valores de fuso horário com período de vigência (início e fim).",
  "/trip-type": "Cadastrar tipos de viagem com indicação de carga e cor de identificação.",
  "/stop-type": "Cadastrar tipos de parada com tempo padrão e indicação de jornada de motorista.",
  "/truck": "Cadastrar veículos da frota com dados de placa, modelo, marca, grupo de frota e informações operacionais.",
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
        ? `\n\nCampos obrigatórios (marcados com asterisco vermelho ✱): ${requiredFields.join(", ")}.`
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
    extra:
      "Pesquisa Avançada de Atividade:\n\n" +
      "A busca avançada de atividade (ícone de lupa) permite filtrar por Código, Tipo de Atividade (dropdown dinâmico) e Status Ativo (toggle Todos/Sim/Não).\n" +
      "Exibe colunas: Código, Descrição, Início e Fim (HH:mm), Tipo e Status.\n" +
      "Suporta paginação com seletor de quantidade de registros (10, 20, 50, 100).",
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
    creation: "Formulário completo organizado em abas: Geral (dados pessoais), Contato (endereço, telefone, e-mail) e Detalhes (observações). As abas de sub-entidades (Atribuições, Base, Cargo, Carteiras, Cursos, Férias Planejadas, Grupo de Frota, Linhas Dedicadas, Mensagens e Ocorrências) são habilitadas após preencher os dados obrigatórios (Nome, Sobrenome, Nome de Escala e CPF).",
    edition: "Duplo clique no registro abre o formulário de edição com todas as abas disponíveis.",
    deletion: "Ícone de lixeira com confirmação pelo nome do motorista.",
    extra:
      "Pesquisa Avançada de Motorista:\n\n" +
      "A pesquisa avançada (ícone de lupa) está disponível em todas as telas do sistema que possuem campo de Motorista. " +
      "Permite filtrar por Nome de Escala, Cód. GPID (com suporte a Ctrl+V para colar), CPF, Base de Motorista e Grupo de Frota.\n" +
      "Exibe colunas: Nome de Escala, Cód. Integração, CPF e Status (Ativo/Inativo) com badges coloridos.\n" +
      "Inclui toggle 'Ativo' para alternar entre motoristas Ativos e Inativos (padrão: Ativo). " +
      "Em telas operacionais como Férias, Circuitos e Liberação, o toggle é ocultado e apenas motoristas ativos são exibidos.\n\n" +
      "Sub-entidades do Motorista:\n\n" +
      "• Atribuições — Vínculos de atribuição com datas de vigência.\n" +
      "• Base — Locais de base do motorista.\n" +
      "• Cargo — Cargos exercidos com datas de vigência.\n" +
      "• Carteiras — Habilitações com tipo de restrição e datas de validade.\n" +
      "• Cursos — Capacitações técnicas com tipo de restrição e validade.\n" +
      "• Férias Planejadas — Registro de períodos de férias.\n" +
      "• Grupo de Frota — Grupos de frota vinculados ao motorista.\n" +
      "• Linhas Dedicadas — Rotas específicas vinculadas via pesquisa avançada de Linha.\n" +
      "• Mensagens — Comunicações registradas para o motorista.\n" +
      "• Ocorrências — Registro de condutas e advertências com data e responsável.",
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
    extra:
      "Função de Cópia: O botão de cópia duplica a linha com todas as seções, gerando um novo registro em modo de edição.\n\n" +
      "Pesquisa Avançada de Linha:\n\n" +
      "A busca avançada de linha (ícone de lupa) está disponível no cadastro de Linhas Dedicadas do motorista. " +
      "Permite filtrar por código e descrição da linha, exibindo origem, destino e quantidade de trechos.",
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
