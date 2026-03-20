

## Pacote de Atualização — v1.14.0

### Resumo das alterações desta sprint
Melhorias no painel de edição de Circuitos de Motoristas (CircuitEditPanel):
- Altura do painel reduzida de 65vh para 50vh
- Modal de detalhe da viagem (API GetDailyTripDetail) com layout master-detail e seções
- Fonte menor nos campos de data/hora (DatePickerField com inputClassName)
- Ícones de ações alinhados à direita
- Campos do cabeçalho (Iní./Fim Plan., Iní./Fim Real.) padronizados em tamanho
- Scroll horizontal posicionado na parte inferior da tabela de tasks
- Largura das colunas Linha/Origem/Destino reduzida; Iní./Fim Plan. aumentada
- Largura do painel aumentada para 1300px

---

### 1. Sincronização de Traduções (pt/en/es)
Nenhuma nova chave de tradução foi adicionada nesta sprint — as alterações são puramente visuais e de layout no CircuitEditPanel. **Sem alterações nos arquivos de tradução.**

### 2. Manual do Usuário (`src/pages/Manual.tsx`)
- **Atualizar** a entrada "Escala de Motoristas" (linha ~186-189) de "Pendente de liberação" para documentação real:
  - Tela: Circuitos de Motoristas
  - Objetivo: Gestão de circuitos de motoristas com Gráfico de Gantt e edição de circuitos
  - Filtros: Data Início, Data Fim, Grupo de Localidade, Motorista
  - Funcionalidades: Gráfico Gantt, painel de edição com tasks (viagens/atividades), detalhe de viagem com seções, adição/remoção de viagens e atividades

### 3. Manual Técnico (`src/pages/TechnicalManual.tsx`)
- **Atualizar** a entrada "Escala de Motoristas" (linha ~190-199) de `ComingSoonPage.tsx` para documentação técnica real:
  - component: `DriverCircuitPage.tsx`
  - Endpoints: `GET /gantt/GetDriverCircuitByPeriodGantt`, `GET /gantt/GetDailyTripDetail`, `POST/PUT/DELETE` circuitos
  - sharedComponents: `CircuitGanttChart`, `CircuitEditPanel`, `FloatingPanel`, `DatePickerField`, `LookupSearchField`
  - Features: Gantt de circuitos, edição de circuitos com tasks, modal de detalhe master-detail, scroll horizontal inferior, ícones alinhados à direita

### 4. Changelog (`src/pages/Changelog.tsx`)
- **Incrementar** `APP_VERSION` de `"1.13.0"` para `"1.14.0"`
- **Adicionar** nova entrada no topo do array `changelog`:

```
version: "1.14.0"
date: "2026-03-20"
type: "improvement"
changes:
  - Painel de edição de circuitos: altura reduzida, largura aumentada e scroll horizontal na parte inferior
  - Modal de detalhe da viagem com layout master-detail exibindo seções (trechos)
  - Campos de data/hora do cabeçalho padronizados no mesmo tamanho dos demais campos
  - Colunas de Linha/Origem/Destino compactadas e Iní./Fim Plan. ampliadas na tabela de tasks
  - Ícones de ações alinhados à direita e fonte reduzida nos campos de data
```
(Cada change com tradução pt/en/es)

### Arquivos Impactados
| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Changelog.tsx` | APP_VERSION → 1.14.0, nova entrada |
| `src/pages/Manual.tsx` | Escala de Motoristas: documentação real |
| `src/pages/TechnicalManual.tsx` | Escala de Motoristas: documentação técnica |

