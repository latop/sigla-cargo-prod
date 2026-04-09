

# Fix: Gantt da Coordenação não preenche espaço vertical

## Problema

Na aba Gantt da Coordenação, o conteúdo não ocupa toda a altura disponível, deixando um grande espaço em branco abaixo do footer de paginação. A aba Listagem funciona corretamente.

## Causa raiz

O `TabsContent` do Gantt tem `flex-1 min-h-0` mas falta a propriedade CSS necessária para que o Radix TabsContent participe corretamente do layout flex. O componente `TabsContent` do Radix não tem `display: flex` nem `flex-direction: column` por padrão, então o `flex-1` funciona para dar altura, mas o filho `<div className="h-full">` não consegue herdar a altura corretamente.

## Correção

**Arquivo: `src/pages/TripSchedulePage.tsx`**

- Na `TabsContent value="gantt"`, adicionar `flex flex-col` para que o layout flex se propague ao filho:
  - De: `className="mt-0 flex-1 min-h-0"`
  - Para: `className="mt-0 flex-1 min-h-0 flex flex-col"`

- No `<div>` interno que envolve o `TripGanttChart`, mudar de `h-full overflow-hidden` para `flex-1 min-h-0 overflow-hidden` para garantir que ele ocupe todo o espaço flex disponível.

Isso é uma correção de 2 linhas que faz o Gantt preencher toda a altura disponível, igual à Listagem.

