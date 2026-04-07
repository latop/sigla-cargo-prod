

## Refatorar Dashboard para usar `/dashboard/GetDashboardSummary`

Substituir as múltiplas chamadas de API (Gantt, Drivers count, Trucks count) por um único endpoint dedicado que retorna todos os dados agregados.

---

### O que muda

O Dashboard atual faz 4+ chamadas separadas (Gantt do dia, Gantt da semana, Drivers count, Trucks count) e calcula KPIs no frontend. O novo endpoint `/dashboard/GetDashboardSummary` já retorna tudo pronto.

### Mapeamento do DTO para o Dashboard

| Campo do DTO | Uso no Dashboard |
|---|---|
| `totalTrips` | KPI "Viagens Hoje" |
| `inProgress` | KPI "Em Execução" |
| `completed` | Donut status |
| `planned` | Donut status |
| `cancelled` | Donut status |
| `delayed` | KPI "Atrasadas" + Donut |
| `uniqueDrivers` | KPI "Motoristas Escalados" |
| `uniqueVehicles` | KPI "Veículos em Operação" |
| `onTimeRate` | Barra "Pontualidade" |
| `completionRate` | Barra "Conclusão" |
| `cancelRate` | Barra "Cancelamentos" |
| `tripCounts[]` | Gráfico de barras 7 dias (dtRef + qtyTrips) |
| `nextDepartures[]` | Tabela "Próximas Saídas" |
| `justificationsBySectors[]` | Gráfico "Justificativas por Setor" |

### Alterações técnicas

**`src/pages/Dashboard.tsx`**:

1. **Remover queries**: Eliminar `dashboard-gantt`, `dashboard-gantt-week`, `dashboard-drivers`, `dashboard-trucks`.

2. **Nova query única**: `dashboard-summary` chamando `GET /dashboard/GetDashboardSummary?tripDate={YYYY-MM-DD}&locationGroupCode={code}`. O `locationGroupCode` é enviado apenas quando selecionado (não "Todas").

3. **KPIs diretos**: Usar `summary.totalTrips`, `summary.inProgress`, `summary.uniqueDrivers`, `summary.uniqueVehicles`, `summary.delayed` diretamente — sem cálculos no frontend.

4. **Taxas diretas**: `summary.onTimeRate`, `summary.completionRate`, `summary.cancelRate` já vêm prontos.

5. **Donut "Status do Dia"**: Montar pieData a partir de `summary.planned`, `summary.inProgress`, `summary.completed`, `summary.delayed`, `summary.cancelled`.

6. **Gráfico de barras**: Mapear `summary.tripCounts` (array de `{dtRef, qtyTrips}`) diretamente para o barData, formatando dtRef como "Seg 20".

7. **Tabela "Próximas Saídas"**: Usar `summary.nextDepartures` diretamente. Campos: `startPlanned`, `demand`, `locationOrigCode`, `locationDestCode`, `licensePlate`, `nickName`, `statusTrip`.

8. **Justificativas por Setor**: Usar `summary.justificationsBySectors` (array de `{responsibleSectorCode, qtyJustifications}`).

9. **Navegação de dias**: Mantém o `dayOffset` existente, passando a data calculada como `tripDate`.

10. **Filtro LocationGroup**: Mantém os botões existentes, passando `locationGroupCode` quando selecionado. Query de LocationGroups permanece separada (para montar os botões de filtro).

11. **Seção "Circuitos & Jornadas"**: Permanece com dados mock (sem endpoint correspondente no DTO).

12. **Refresh/refetch**: `handleRefresh` invalida apenas `dashboard-summary` + `dashboard-location-groups`.

