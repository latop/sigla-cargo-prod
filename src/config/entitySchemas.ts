/**
 * Schema-driven configuration for Parameter CRUD entities.
 * Derived from the Swagger spec at /swagger/parameters/swagger.json
 */

export interface FilterSchema {
  /** Query parameter name sent to the API (e.g. "Filter1String") */
  paramName: string;
  /** Label shown in the UI */
  label: string;
  /** Type of filter */
  type: "string" | "lookup" | "bool" | "select";
  /** For select filters: fixed list of options { value, label } */
  options?: { value: string; label: string }[];
  /** For lookup filters: API endpoint to fetch options */
  lookupEndpoint?: string;
  /** For lookup filters: label function */
  lookupLabelFn?: "codeName" | "codeDescription";
  /** Grid column span (default 1) */
  colSpan?: number;
  /** Use autocomplete + modal search instead of regular dropdown */
  largeLookup?: boolean;
  /** Filter param name for server-side search */
  searchFilterParam?: string;
  /** Force uppercase on input (default true for string filters) */
  uppercase?: boolean;
  /** For largeLookup: send the item's name instead of its ID as the filter value */
  sendName?: boolean;
  /** Minimum characters required before searching */
  minChars?: number;
}

export interface FieldSchema {
  key: string;
  label: string;
  type: "string" | "boolean" | "number" | "color" | "lookup" | "datetime" | "date" | "select";
  /** Input mask: "plate" (AAA-#A##), "year" (4 digits) */
  mask?: "plate" | "year";
  /** For select fields: fixed list of options { value, label } */
  options?: { value: string; label: string }[];
  /** Map option value → badge CSS classes for colored badges in list */
  badgeColorMap?: Record<string, string>;
  tableLabelFn?: "codeName" | "codeDescription" | "codeOnly" | "descriptionOnly";
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  nullable?: boolean;
  /** API endpoint to fetch lookup options */
  lookupEndpoint?: string;
  /** Which fields to use for the lookup label: "codeName" → code - name, "codeDescription" → code - description */
  lookupLabelFn?: "codeName" | "codeDescription";
  /** Hide from table (default: show) */
  hideInTable?: boolean;
  /** Force uppercase on input */
  uppercase?: boolean;
  /** Use autocomplete + modal search instead of regular dropdown (for large datasets) */
  largeLookup?: boolean;
  /** Filter param name for server-side search in large lookups (e.g. "Filter1String") */
  searchFilterParam?: string;
  /** Column span in form grid (default 1, use 0.5 for half-width in a 4-col grid) */
  formColSpan?: number;
  /** For color fields: API stores as decimal integer instead of hex string */
  colorFormat?: "decimal";
  /** Display-only field: shown in table but not in forms */
  displayOnly?: boolean;
  /** Path to nested object property for display (e.g. "timezone.description") */
  nestedPath?: string;
}

export interface EntitySchema {
  /** API endpoint name (e.g. "Cities", "Countries") */
  endpoint: string;
  /** i18n key for the page title */
  titleKey: string;
  /** Feminine gender for "Nova" vs "Novo" */
  feminine?: boolean;
  /** Filter definitions for the search area */
  filters?: FilterSchema[];
  /** Field definitions (order matters for form/table layout) */
  fields: FieldSchema[];
  /** Custom width for the form panel (default 560) */
  formWidth?: number;
}

export const entitySchemas: Record<string, EntitySchema> = {
  "/activity-truck": {
    endpoint: "ActivityTruck",
    titleKey: "menu.activityTruck",
    feminine: true,
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 10, uppercase: true },
      { key: "description", label: "Descrição", type: "string", required: true, maxLength: 100, uppercase: true },
      { key: "flgDriverRequired", label: "Motorista Obrigatório", type: "boolean", required: true },
      { key: "color", label: "Cor", type: "color", required: true },
    ],
  },

  "/attribution": {
    endpoint: "Attribution",
    titleKey: "menu.attribution",
    feminine: true,
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 10, uppercase: true },
      { key: "description", label: "Descrição", type: "string", required: true, maxLength: 100, uppercase: true },
    ],
  },

  "/course": {
    endpoint: "Course",
    titleKey: "menu.course",
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 10, uppercase: true },
      { key: "description", label: "Descrição", type: "string", required: true, maxLength: 100, uppercase: true },
      { key: "restrictionType", label: "license.restrictionType", type: "select", required: true, options: [
        { value: "0", label: "license.none" },
        { value: "1", label: "license.alert" },
        { value: "2", label: "license.block" },
      ], badgeColorMap: {
        "0": "bg-muted text-muted-foreground border-border",
        "1": "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
        "2": "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
      }},
    ],
  },

  "/city": {
    endpoint: "Cities",
    titleKey: "menu.city",
    feminine: true,
    filters: [
      { paramName: "Filter1Id", label: "País", type: "lookup", lookupEndpoint: "Countries", lookupLabelFn: "codeName" },
      { paramName: "Filter2Id", label: "Estado", type: "lookup", lookupEndpoint: "States", lookupLabelFn: "codeName" },
      { paramName: "Filter1String", label: "Cidade", type: "lookup", lookupEndpoint: "Cities", lookupLabelFn: "codeName", largeLookup: true, searchFilterParam: "Filter1String", sendName: true, colSpan: 2 },
    ],
    fields: [
      { key: "code", label: "Código", type: "string", maxLength: 3, nullable: true, uppercase: true },
      { key: "name", label: "Nome", type: "string", required: true, maxLength: 100, uppercase: true },
      { key: "countryId", label: "País", type: "lookup", required: true, lookupEndpoint: "Countries", lookupLabelFn: "codeName" },
      { key: "stateId", label: "Estado", type: "lookup", nullable: true, lookupEndpoint: "States", lookupLabelFn: "codeName" },
      { key: "capital", label: "Capital", type: "boolean" },
      { key: "latitude", label: "Latitude", type: "number", required: true },
      { key: "longitude", label: "Longitude", type: "number", required: true },
    ],
  },

  "/company": {
    endpoint: "Companies",
    titleKey: "menu.company",
    feminine: true,
    formWidth: 720,
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 1 },
      { key: "name", label: "Empresa", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
      { key: "isSupplier", label: "Fornecedor", type: "boolean", nullable: true, formColSpan: 1 },
      { key: "address", label: "Endereço", type: "string", nullable: true, uppercase: true, hideInTable: true, formColSpan: 4 },
      { key: "cityId", label: "Cidade", type: "lookup", nullable: true, lookupEndpoint: "Cities", lookupLabelFn: "codeName", largeLookup: true, searchFilterParam: "Filter1String", hideInTable: true, formColSpan: 2 },
      { key: "stateId", label: "Estado", type: "lookup", nullable: true, lookupEndpoint: "States", lookupLabelFn: "codeName", largeLookup: true, searchFilterParam: "Filter1String", hideInTable: true, formColSpan: 2 },
      { key: "regionId", label: "Região", type: "lookup", nullable: true, lookupEndpoint: "Regions", lookupLabelFn: "codeName", largeLookup: true, searchFilterParam: "Filter1String", hideInTable: true, formColSpan: 2 },
      { key: "countryId", label: "País", type: "lookup", nullable: true, lookupEndpoint: "Countries", lookupLabelFn: "codeName", hideInTable: true, formColSpan: 2 },
    ],
  },

  "/country": {
    endpoint: "Countries",
    titleKey: "menu.country",
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 2, minLength: 2, uppercase: true, formColSpan: 2 },
      { key: "codeAlpha3", label: "Código Alpha3", type: "string", maxLength: 3, minLength: 3, nullable: true, uppercase: true, formColSpan: 2 },
      { key: "codeNum", label: "Cód. Numérico", type: "number", formColSpan: 2 },
      { key: "name", label: "Nome", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 6 },
    ],
  },

  "/justification": {
    endpoint: "Justification",
    titleKey: "menu.justification",
    feminine: true,
    formWidth: 720,
    filters: [
      { paramName: "Filter1String", label: "Código", type: "string" },
      { paramName: "Filter1Id", label: "Setor Responsável", type: "lookup", lookupEndpoint: "ResponsibleSector", lookupLabelFn: "codeDescription" },
      { paramName: "Filter2String", label: "Tipo", type: "select", options: [{ value: "A", label: "Atraso" }, { value: "C", label: "Cancelamento" }] },
    ],
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 10, uppercase: true, formColSpan: 2 },
      { key: "description", label: "Descrição", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
      { key: "responsibleSectorId", label: "Setor Responsável", type: "lookup", required: true, lookupEndpoint: "ResponsibleSector", lookupLabelFn: "codeDescription", tableLabelFn: "descriptionOnly", formColSpan: 3 },
      { key: "type", label: "Tipo", type: "select", required: true, options: [{ value: "A", label: "Atraso" }, { value: "C", label: "Cancelamento" }], formColSpan: 3 },
    ],
  },

  "/fleet-type": {
    endpoint: "FleetType",
    titleKey: "menu.fleetType",
    formWidth: 720,
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "description", label: "Descrição", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
      { key: "fleetGroupCode", label: "Grupo de Frota", type: "string", displayOnly: true, nestedPath: "fleetGroup.code" },
      { key: "fleetGroupId", label: "Grupo de Frota", type: "lookup", required: true, lookupEndpoint: "FleetGroup", lookupLabelFn: "codeDescription", hideInTable: true, formColSpan: 2 },
      { key: "fleetModelCode", label: "Modelo de Frota", type: "string", displayOnly: true, nestedPath: "fleetModel.code" },
      { key: "fleetModelId", label: "Modelo de Frota", type: "lookup", nullable: true, lookupEndpoint: "FleetModel", lookupLabelFn: "codeName", hideInTable: true, formColSpan: 2 },
      { key: "companyId", label: "Empresa", type: "lookup", nullable: true, lookupEndpoint: "Companies", lookupLabelFn: "codeName", hideInTable: true, formColSpan: 2 },
      { key: "standardUnit", label: "Unid. Padrão", type: "string", nullable: true, maxLength: 20, uppercase: true, hideInTable: true, formColSpan: 2 },
      { key: "tare", label: "Tara", type: "number", nullable: true, hideInTable: true, formColSpan: 2 },
      { key: "capacity", label: "Capacidade", type: "number", nullable: true, hideInTable: true, formColSpan: 2 },
      { key: "steeringGearType", label: "Direção", type: "string", nullable: true, maxLength: 50, uppercase: true, hideInTable: true, formColSpan: 3 },
      { key: "fuelType", label: "Tipo de Combust.", type: "string", nullable: true, maxLength: 50, uppercase: true, hideInTable: true, formColSpan: 3 },
      { key: "note", label: "Observação", type: "string", nullable: true, maxLength: 200, hideInTable: true, formColSpan: 6 },
    ],
  },

  "/fleet-brand": {
    endpoint: "FleetBrand",
    titleKey: "menu.fleetBrand",
    feminine: true,
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "name", label: "Nome", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
    ],
  },

  "/fleet-model": {
    endpoint: "FleetModel",
    titleKey: "menu.fleetModel",
    formWidth: 720,
    filters: [
      { paramName: "Filter1String", label: "Código", type: "string", uppercase: true },
      { paramName: "Filter2String", label: "Nome", type: "string", uppercase: true },
      { paramName: "Filter1Id", label: "Marca", type: "lookup", lookupEndpoint: "FleetBrand", lookupLabelFn: "codeName" },
    ],
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "name", label: "Nome", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
      { key: "fleetBrandCode", label: "Marca", type: "string", displayOnly: true, nestedPath: "fleetBrand.code" },
      { key: "fleetBrandId", label: "Marca", type: "lookup", required: true, lookupEndpoint: "FleetBrand", lookupLabelFn: "codeName", hideInTable: true, formColSpan: 6 },
    ],
  },

  "/fleet-group": {
    endpoint: "FleetGroup",
    titleKey: "menu.fleetGroup",
    formWidth: 720,
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "description", label: "Descrição", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 3 },
      { key: "qtyDemands", label: "Qtd. Demandas", type: "number", required: true, formColSpan: 1 },
    ],
  },

  "/license": {
    endpoint: "License",
    titleKey: "menu.license",
    feminine: true,
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "description", label: "Descrição", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
      { key: "restrictionType", label: "license.restrictionType", type: "select", required: true, formColSpan: 2, options: [
        { value: "0", label: "license.none" },
        { value: "1", label: "license.alert" },
        { value: "2", label: "license.block" },
      ], badgeColorMap: {
        "0": "bg-muted text-muted-foreground border-border",
        "1": "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
        "2": "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
      } },
    ],
  },

  "/location-group": {
    endpoint: "LocationGroup",
    titleKey: "menu.locationGroup",
    formWidth: 560,
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "description", label: "Descrição", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
    ],
  },

  "/location-type": {
    endpoint: "LocationType",
    titleKey: "menu.locationType",
    formWidth: 620,
    filters: [
      { paramName: "Filter1String", label: "Código", type: "string", uppercase: true },
      { paramName: "Filter1Bool", label: "Local de Operação", type: "bool" },
      { paramName: "Filter2Bool", label: "Local de Liberação", type: "bool" },
    ],
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "description", label: "Descrição", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
      { key: "isOperation", label: "Operação", type: "boolean", formColSpan: 1 },
      { key: "isRelease", label: "Liberação", type: "boolean", formColSpan: 1 },
    ],
  },

  "/position": {
    endpoint: "Position",
    titleKey: "menu.position",
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 20, uppercase: true },
      { key: "description", label: "Descrição", type: "string", required: true, maxLength: 100, uppercase: true },
      { key: "priority", label: "Prioridade", type: "number", required: true },
      { key: "colorRGB", label: "Cor", type: "color", required: true, colorFormat: "decimal" },
    ],
  },

  "/regulation-rule": {
    endpoint: "RegulationRule",
    titleKey: "menu.regulationRule",
    feminine: true,
    formWidth: 720,
    fields: [
      { key: "ruleCode", label: "Código da Regra", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 3 },
      { key: "isActive", label: "Ativo", type: "boolean", formColSpan: 1 },
      { key: "unit", label: "Unidade", type: "select", nullable: true, formColSpan: 2, options: [
        { value: "MINUTES", label: "regulationRule.minutes" },
        { value: "DAYS", label: "regulationRule.days" },
        { value: "WEEKS", label: "regulationRule.weeks" },
        { value: "CODE", label: "regulationRule.code" },
        { value: "FLAG", label: "regulationRule.flag" },
      ] },
      { key: "description", label: "Descrição", type: "string", required: true, maxLength: 200, uppercase: true, formColSpan: 6, hideInTable: true },
      { key: "valueInt", label: "Valor Inteiro", type: "number", nullable: true, formColSpan: 2 },
      { key: "valueDecimal", label: "Valor Decimal", type: "number", nullable: true, formColSpan: 2 },
      { key: "valueText", label: "Valor Texto", type: "string", nullable: true, maxLength: 200, formColSpan: 2 },
      { key: "notes", label: "Observações", type: "string", nullable: true, maxLength: 500, formColSpan: 6, hideInTable: true },
    ],
  },

  "/region": {
    endpoint: "Regions",
    titleKey: "menu.region",
    feminine: true,
    formWidth: 720,
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "name", label: "Nome", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 3 },
      { key: "countryId", label: "País", type: "lookup", required: true, lookupEndpoint: "Countries", lookupLabelFn: "codeName", formColSpan: 2 },
    ],
  },

  "/responsible-sector": {
    endpoint: "ResponsibleSector",
    titleKey: "menu.responsibleSector",
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 10, uppercase: true, formColSpan: 2 },
      { key: "description", label: "Descrição", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
    ],
  },

  "/planning-model": {
    endpoint: "PlanningModel",
    titleKey: "menu.planningModel",
    formWidth: 720,
    filters: [
      { paramName: "Filter1String", label: "Código", type: "string", uppercase: true },
      { paramName: "Filter2String", label: "Descrição", type: "string", uppercase: true },
    ],
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "description", label: "Descrição", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
      { key: "scenarioId", label: "Cenário", type: "lookup", required: true, lookupEndpoint: "Scenario", lookupLabelFn: "codeDescription", formColSpan: 3 },
      { key: "isActive", label: "Ativo", type: "boolean", formColSpan: 1 },
    ],
  },

  "/state": {
    endpoint: "States",
    titleKey: "menu.state",
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 2, uppercase: true },
      { key: "name", label: "Nome", type: "string", required: true, maxLength: 100, uppercase: true },
      { key: "countryId", label: "País", type: "lookup", required: true, lookupEndpoint: "Countries", lookupLabelFn: "codeName" },
      { key: "regionId", label: "Região", type: "lookup", nullable: true, lookupEndpoint: "Regions", lookupLabelFn: "codeName" },
    ],
  },

  "/timezone": {
    endpoint: "Timezone",
    titleKey: "menu.timezone",
    formWidth: 560,
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "description", label: "Descrição", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
    ],
  },

  "/timezone-value": {
    endpoint: "TimezoneValue",
    titleKey: "menu.timezoneValue",
    fields: [
      { key: "timezoneId", label: "Código", type: "lookup", required: true, lookupEndpoint: "Timezone", lookupLabelFn: "codeDescription", tableLabelFn: "codeOnly" },
      { key: "timezoneDescription", label: "Descrição", type: "string", displayOnly: true, nestedPath: "timezone.description" },
      { key: "value", label: "Valor", type: "number", required: true, hideInTable: true },
      { key: "start", label: "Início", type: "datetime", required: true },
      { key: "end", label: "Fim", type: "datetime", required: true },
    ],
  },

  "/trip-type": {
    endpoint: "TripType",
    titleKey: "menu.tripType",
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "description", label: "Descrição", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
      { key: "isLoaded", label: "Com Carga", type: "boolean", formColSpan: 2 },
      { key: "colorRGB", label: "Cor", type: "color", required: true, colorFormat: "decimal", formColSpan: 4 },
    ],
  },

  "/location": {
    endpoint: "Location",
    titleKey: "menu.location",
    feminine: true,
    formWidth: 720,
    filters: [
      { paramName: "Filter1String", label: "Código", type: "string", uppercase: true },
      { paramName: "Filter2String", label: "Cód. TMS", type: "string", uppercase: true, colSpan: 0.5 },
      { paramName: "Filter3String", label: "Cód. GPS", type: "string", uppercase: false, colSpan: 0.5 },
      { paramName: "Filter1Id", label: "Grupo de Localidade", type: "lookup", lookupEndpoint: "LocationGroup", lookupLabelFn: "codeDescription" },
      { paramName: "Filter2Id", label: "Tipo de Localidade", type: "lookup", lookupEndpoint: "LocationType", lookupLabelFn: "codeDescription" },
      { paramName: "Filter1Bool", label: "Operação Carga", type: "bool" },
    ],
    fields: [
      { key: "code", label: "Código", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "name", label: "Nome", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
      { key: "cityName", label: "Cidade", type: "string", displayOnly: true, nestedPath: "city.name" },
      { key: "latitudeDisplay", label: "Latitude", type: "number", displayOnly: true, nestedPath: "latitude" },
      { key: "longitudeDisplay", label: "Longitude", type: "number", displayOnly: true, nestedPath: "longitude" },
      { key: "codeIntegration2", label: "Cód. Integração TMS", type: "string", maxLength: 50, nullable: true, uppercase: true, formColSpan: 2 },
      { key: "codeIntegration1", label: "Cód. Integração GPS", type: "string", maxLength: 50, nullable: true, uppercase: false, formColSpan: 2 },
      { key: "timezoneId", label: "Fuso Horário", type: "lookup", nullable: true, lookupEndpoint: "Timezone", lookupLabelFn: "codeDescription", hideInTable: true, formColSpan: 2 },
      { key: "locationGroupId", label: "Grupo Localidade", type: "lookup", nullable: true, lookupEndpoint: "LocationGroup", lookupLabelFn: "codeDescription", tableLabelFn: "codeOnly", hideInTable: true, formColSpan: 2 },
      { key: "locationTypeId", label: "Tipo Localidade", type: "lookup", required: true, lookupEndpoint: "LocationType", lookupLabelFn: "codeDescription", tableLabelFn: "codeOnly", formColSpan: 2 },
      { key: "delayGPS", label: "Delay GPS", type: "number", nullable: true, hideInTable: true, formColSpan: 2 },
      { key: "cityId", label: "Cidade", type: "lookup", nullable: true, lookupEndpoint: "Cities", lookupLabelFn: "codeName", largeLookup: true, searchFilterParam: "Filter1String", hideInTable: true, formColSpan: 2 },
      { key: "latitude", label: "Latitude", type: "number", required: true, hideInTable: true, formColSpan: 2 },
      { key: "longitude", label: "Longitude", type: "number", required: true, hideInTable: true, formColSpan: 2 },
    ],
  },

  "/stop-type": {
    endpoint: "StopType",
    titleKey: "menu.stopType",
    fields: [
      { key: "stopTypeCode", label: "Código", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 3 },
      { key: "stopTime", label: "Tempo (min)", type: "number", required: true, formColSpan: 3 },
      { key: "regulationType", label: "stopType.regulationType", type: "select", required: true, options: [{ value: "1", label: "stopType.meal" }, { value: "2", label: "stopType.rest" }, { value: "3", label: "stopType.break" }, { value: "4", label: "stopType.wait" }, { value: "5", label: "stopType.operationalStop" }], formColSpan: 3 },
      { key: "flgJourney", label: "Jornada Motorista", type: "select", required: true, options: [{ value: "S", label: "common.yes" }, { value: "N", label: "common.no" }], formColSpan: 3 },
    ],
  },

  "/truck": {
    endpoint: "Truck",
    titleKey: "menu.truck",
    formWidth: 720,
    filters: [
      { paramName: "Filter1String", label: "Placa do Veículo", type: "string", uppercase: true, minChars: 3 },
      { paramName: "Filter2String", label: "Cód. Frota Veículo", type: "string", uppercase: true, minChars: 3 },
      { paramName: "Filter1Id", label: "Tipo de Frota", type: "lookup", lookupEndpoint: "FleetType", lookupLabelFn: "codeDescription" },
      { paramName: "Filter2Id", label: "Grupo de Frota", type: "lookup", lookupEndpoint: "FleetGroup", lookupLabelFn: "codeDescription" },
      { paramName: "Filter3Id", label: "Grupo de Localidade", type: "lookup", lookupEndpoint: "LocationGroup", lookupLabelFn: "codeDescription" },
    ],
    fields: [
      // Table order: Placa, Cód Frota, Tipo Frota, Grupo Frota, Grupo Localidade, Chassi, Renavam
      // Form Line 1: Placa (2) | Cód. Frota (2) | Cód. Integração (1) | Ano Fab. (1)
      { key: "licensePlate", label: "Placa do Veículo", type: "string", required: true, maxLength: 8, uppercase: true, mask: "plate", formColSpan: 2 },
      { key: "fleetCode", label: "Cód. Frota Veículo", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      // Table-only display columns (nested paths)
      { key: "fleetTypeCode", label: "Tipo de Frota", type: "string", displayOnly: true, nestedPath: "fleetType.code" },
      { key: "fleetGroupCode", label: "Grupo de Frota", type: "string", displayOnly: true, nestedPath: "fleetGroup.code" },
      { key: "locationGroupCode", label: "Grupo de Localidade", type: "string", displayOnly: true, nestedPath: "locationGroup.code" },
      // Form Line 1 continued (hideInTable)
      { key: "integrationCode", label: "Cód. Integração", type: "string", nullable: true, maxLength: 50, uppercase: true, hideInTable: true, formColSpan: 1 },
      { key: "manufactureYear", label: "Ano Fab.", type: "string", nullable: true, maxLength: 4, mask: "year", hideInTable: true, formColSpan: 1 },
      // Form Line 2: UF (1) | Chassi (2) | Nº Série (2) | Recondicionado (1)
      { key: "stateId", label: "UF", type: "lookup", nullable: true, lookupEndpoint: "States", lookupLabelFn: "codeName", tableLabelFn: "codeOnly", hideInTable: true, formColSpan: 1 },
      { key: "chassisNumber", label: "Chassi", type: "string", nullable: true, maxLength: 50, uppercase: true, formColSpan: 2 },
      { key: "serialNumber", label: "Nº de Série", type: "string", nullable: true, maxLength: 50, hideInTable: true, formColSpan: 2 },
      { key: "isRefurbished", label: "Recond.", type: "boolean", nullable: true, hideInTable: true, formColSpan: 1 },
      // Form Line 3: Renavam (2) | Val. Renavam (2) | Tara (1) | Capacidade (1)
      { key: "regulatoryNumber", label: "Renavam", type: "string", nullable: true, maxLength: 20, formColSpan: 2 },
      { key: "regulatoryValidity", label: "Val. Renavam", type: "datetime", nullable: true, hideInTable: true, formColSpan: 2 },
      { key: "tare", label: "Tara (kg)", type: "number", nullable: true, hideInTable: true, formColSpan: 1 },
      { key: "capacity", label: "Capacidade (kg)", type: "number", nullable: true, hideInTable: true, formColSpan: 1 },
      // Form Line 4: Grupo Localidade (3) | Tipo Frota (3)
      { key: "locationGroupId", label: "Grupo de Localidade", type: "lookup", nullable: true, lookupEndpoint: "LocationGroup", lookupLabelFn: "codeDescription", hideInTable: true, formColSpan: 3 },
      { key: "fleetTypeId", label: "Tipo de Frota", type: "lookup", nullable: true, lookupEndpoint: "FleetType", lookupLabelFn: "codeDescription", hideInTable: true, formColSpan: 3 },
      // Form Line 5: Data Início (3) | Data Fim (3)
      { key: "startDate", label: "Data Início", type: "date", nullable: true, hideInTable: true, formColSpan: 3 },
      { key: "endDate", label: "Data Fim", type: "date", nullable: true, hideInTable: true, formColSpan: 3 },
      // Form Line 6: Observação (6)
      { key: "note", label: "Observação", type: "string", nullable: true, maxLength: 200, hideInTable: true, formColSpan: 6 },
    ],
  },
};

/** Get display label for a lookup item */
export const getLookupLabel = (
  item: Record<string, unknown>,
  labelFn: "codeName" | "codeDescription" | "codeOnly" | "descriptionOnly" = "codeDescription",
): string => {
  const code = item.code as string | undefined;
  const name = item.name as string | undefined;
  const desc = item.description as string | undefined;
  if (labelFn === "descriptionOnly") {
    return desc || name || String(item.id || "--");
  }
  if (labelFn === "codeOnly") {
    return code || String(item.id || "--");
  }
  if (labelFn === "codeName") {
    return [code, name].filter(Boolean).join(" - ") || String(item.id || "--");
  }
  return [code, desc].filter(Boolean).join(" - ") || String(item.id || "--");
};
