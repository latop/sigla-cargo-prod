

## Pacote de Atualização — v1.13.0

A partir de agora, sempre que você disser **"Faça o Pacote de Atualização"**, executarei automaticamente estas 4 etapas:

1. **Traduções** — Atualizar `pt.json`, `en.json`, `es.json` se houver novas chaves
2. **Manual do Usuário** — Atualizar `Manual.tsx` com novas funcionalidades
3. **Manual Técnico** — Atualizar `TechnicalManual.tsx` com detalhes técnicos
4. **Changelog + Versão** — Nova entrada no `Changelog.tsx` e bump do `APP_VERSION`

---

### Alterações desta versão (1.13.0)

**Changelog — Nova entrada no topo do array:**
- Ordenação de colunas (ascendente/descendente) na tabela de histórico de Importação de Demandas
- Botão Pesquisar sempre realiza nova consulta à API, mesmo sem alteração nos filtros (todas as telas de cadastro genérico)

**Manual Técnico (`TechnicalManual.tsx`):**
- Tela Importação de Demandas: adicionar "Ordenação por colunas no histórico" na lista de `features`
- Telas genéricas (seção geral ou nota): mencionar `searchTrigger` que invalida cache do React Query a cada clique em Pesquisar

**Manual do Usuário (`Manual.tsx`):**
- Importação de Demandas: mencionar na listagem que as colunas do histórico podem ser ordenadas clicando no cabeçalho
- Nota geral: o botão Pesquisar sempre atualiza os dados, mesmo sem alterar filtros

**Traduções:** Sem novas chaves de tradução necessárias (textos estão inline no Changelog).

**Versão:** `APP_VERSION` de `"1.12.0"` para `"1.13.0"`

