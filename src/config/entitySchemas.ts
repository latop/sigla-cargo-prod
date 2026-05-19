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
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 10, uppercase: true },
      { key: "description", label: "fields.description", type: "string", required: true, maxLength: 100, uppercase: true },
      { key: "flgDriverRequired", label: "fields.mandatoryDriver", type: "boolean", required: true },
      { key: "color", label: "fields.color", type: "color", required: true },
    ],
  },

  "/attribution": {
    endpoint: "Attribution",
    titleKey: "menu.attribution",
    feminine: true,
    fields: [
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 10, uppercase: true },
      { key: "description", label: "fields.description", type: "string", required: true, maxLength: 100, uppercase: true },
    ],
  },

  "/course": {
    endpoint: "Course",
    titleKey: "menu.course",
    fields: [
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 10, uppercase: true },
      { key: "description", label: "fields.description", type: "string", required: true, maxLength: 100, uppercase: true },
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
      { paramName: "Filter1Id", label: "fields.country", type: "lookup", lookupEndpoint: "Countries", lookupLabelFn: "codeName" },
      { paramName: "Filter2Id", label: "fields.state", type: "lookup", lookupEndpoint: "States", lookupLabelFn: "codeName" },
      { paramName: "Filter1String", label: "fields.city", type: "lookup", lookupEndpoint: "Cities", lookupLabelFn: "codeName", largeLookup: true, searchFilterParam: "Filter1String", sendName: true, colSpan: 2 },
    ],
    fields: [
      { key: "code", label: "fields.code", type: "string", maxLength: 3, nullable: true, uppercase: true },
      { key: "name", label: "fields.name", type: "string", required: true, maxLength: 100, uppercase: true },
      { key: "countryId", label: "fields.country", type: "lookup", required: true, lookupEndpoint: "Countries", lookupLabelFn: "codeName" },
      { key: "stateId", label: "fields.state", type: "lookup", nullable: true, lookupEndpoint: "States", lookupLabelFn: "codeName" },
      { key: "capital", label: "fields.capital", type: "boolean" },
      { key: "latitude", label: "fields.latitude", type: "number", required: true },
      { key: "longitude", label: "fields.longitude", type: "number", required: true },
    ],
  },

  "/company": {
    endpoint: "Companies",
    titleKey: "menu.company",
    feminine: true,
    formWidth: 720,
    fields: [
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 1 },
      { key: "name", label: "fields.company", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
      { key: "isSupplier", label: "fields.supplier", type: "boolean", nullable: true, formColSpan: 1 },
      { key: "address", label: "fields.address", type: "string", nullable: true, uppercase: true, hideInTable: true, formColSpan: 4 },
      { key: "cityId", label: "fields.city", type: "lookup", nullable: true, lookupEndpoint: "Cities", lookupLabelFn: "codeName", largeLookup: true, searchFilterParam: "Filter1String", hideInTable: true, formColSpan: 2 },
      { key: "stateId", label: "fields.state", type: "lookup", nullable: true, lookupEndpoint: "States", lookupLabelFn: "codeName", largeLookup: true, searchFilterParam: "Filter1String", hideInTable: true, formColSpan: 2 },
      { key: "regionId", label: "fields.region", type: "lookup", nullable: true, lookupEndpoint: "Regions", lookupLabelFn: "codeName", largeLookup: true, searchFilterParam: "Filter1String", hideInTable: true, formColSpan: 2 },
      { key: "countryId", label: "fields.country", type: "lookup", nullable: true, lookupEndpoint: "Countries", lookupLabelFn: "codeName", hideInTable: true, formColSpan: 2 },
    ],
  },

  "/country": {
    endpoint: "Countries",
    titleKey: "menu.country",
    fields: [
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 2, minLength: 2, uppercase: true, formColSpan: 2 },
      { key: "codeAlpha3", label: "fields.alpha3Code", type: "string", maxLength: 3, minLength: 3, nullable: true, uppercase: true, formColSpan: 2 },
      { key: "codeNum", label: "fields.numericCode", type: "number", formColSpan: 2 },
      { key: "name", label: "fields.name", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 6 },
    ],
  },

  "/justification": {
    endpoint: "Justification",
    titleKey: "menu.justification",
    feminine: true,
    formWidth: 720,
    filters: [
      { paramName: "Filter1String", label: "fields.code", type: "string" },
      { paramName: "Filter1Id", label: "fields.responsibleSector", type: "lookup", lookupEndpoint: "ResponsibleSector", lookupLabelFn: "codeDescription" },
      { paramName: "Filter2String", label: "fields.type", type: "select", options: [{ value: "A", label: "fields.delay" }, { value: "C", label: "fields.cancellation" }] },
    ],
    fields: [
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 10, uppercase: true, formColSpan: 2 },
      { key: "description", label: "fields.description", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
      { key: "responsibleSectorId", label: "fields.responsibleSector", type: "lookup", required: true, lookupEndpoint: "ResponsibleSector", lookupLabelFn: "codeDescription", tableLabelFn: "descriptionOnly", formColSpan: 3 },
      { key: "type", label: "fields.type", type: "select", required: true, options: [{ value: "A", label: "fields.delay" }, { value: "C", label: "fields.cancellation" }], formColSpan: 3 },
    ],
  },

  "/fleet-type": {
    endpoint: "FleetType",
    titleKey: "menu.fleetType",
    formWidth: 720,
    fields: [
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "description", label: "fields.description", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
      { key: "fleetGroupCode", label: "fields.fleetGroup", type: "string", displayOnly: true, nestedPath: "fleetGroup.code" },
      { key: "fleetGroupId", label: "fields.fleetGroup", type: "lookup", required: true, lookupEndpoint: "FleetGroup", lookupLabelFn: "codeDescription", hideInTable: true, formColSpan: 2 },
      { key: "fleetModelCode", label: "fields.fleetModel", type: "string", displayOnly: true, nestedPath: "fleetModel.code" },
      { key: "fleetModelId", label: "fields.fleetModel", type: "lookup", nullable: true, lookupEndpoint: "FleetModel", lookupLabelFn: "codeName", hideInTable: true, formColSpan: 2 },
      { key: "companyId", label: "fields.company", type: "lookup", nullable: true, lookupEndpoint: "Companies", lookupLabelFn: "codeName", hideInTable: true, formColSpan: 2 },
      { key: "standardUnit", label: "fields.defaultUnit", type: "string", nullable: true, maxLength: 20, uppercase: true, hideInTable: true, formColSpan: 2 },
      { key: "tare", label: "fields.tare", type: "number", nullable: true, hideInTable: true, formColSpan: 2 },
      { key: "capacity", label: "fields.capacity", type: "number", nullable: true, hideInTable: true, formColSpan: 2 },
      { key: "steeringGearType", label: "fields.direction", type: "string", nullable: true, maxLength: 50, uppercase: true, hideInTable: true, formColSpan: 3 },
      { key: "fuelType", label: "fields.fuelType", type: "string", nullable: true, maxLength: 50, uppercase: true, hideInTable: true, formColSpan: 3 },
      { key: "note", label: "fields.observation", type: "string", nullable: true, maxLength: 200, hideInTable: true, formColSpan: 6 },
    ],
  },

  "/fleet-brand": {
    endpoint: "FleetBrand",
    titleKey: "menu.fleetBrand",
    feminine: true,
    fields: [
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "name", label: "fields.name", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
    ],
  },

  "/fleet-model": {
    endpoint: "FleetModel",
    titleKey: "menu.fleetModel",
    formWidth: 720,
    filters: [
      { paramName: "Filter1String", label: "fields.code", type: "string", uppercase: true },
      { paramName: "Filter2String", label: "fields.name", type: "string", uppercase: true },
      { paramName: "Filter1Id", label: "fields.brand", type: "lookup", lookupEndpoint: "FleetBrand", lookupLabelFn: "codeName" },
    ],
    fields: [
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "name", label: "fields.name", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
      { key: "fleetBrandCode", label: "fields.brand", type: "string", displayOnly: true, nestedPath: "fleetBrand.code" },
      { key: "fleetBrandId", label: "fields.brand", type: "lookup", required: true, lookupEndpoint: "FleetBrand", lookupLabelFn: "codeName", hideInTable: true, formColSpan: 6 },
    ],
  },

  "/fleet-group": {
    endpoint: "FleetGroup",
    titleKey: "menu.fleetGroup",
    formWidth: 720,
    fields: [
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "description", label: "fields.description", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 3 },
      { key: "qtyDemands", label: "fields.demandQty", type: "number", required: true, formColSpan: 1 },
    ],
  },

  "/license": {
    endpoint: "License",
    titleKey: "menu.license",
    feminine: true,
    fields: [
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "description", label: "fields.description", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
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
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "description", label: "fields.description", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
    ],
  },

  "/location-type": {
    endpoint: "LocationType",
    titleKey: "menu.locationType",
    formWidth: 620,
    filters: [
      { paramName: "Filter1String", label: "fields.code", type: "string", uppercase: true },
      { paramName: "Filter1Bool", label: "fields.operationLocation", type: "bool" },
      { paramName: "Filter2Bool", label: "fields.releaseLocation", type: "bool" },
    ],
    fields: [
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "description", label: "fields.description", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
      { key: "isOperation", label: "fields.operation", type: "boolean", formColSpan: 1 },
      { key: "isRelease", label: "fields.release", type: "boolean", formColSpan: 1 },
    ],
  },

  "/position": {
    endpoint: "Position",
    titleKey: "menu.position",
    fields: [
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 20, uppercase: true },
      { key: "description", label: "fields.description", type: "string", required: true, maxLength: 100, uppercase: true },
      { key: "priority", label: "fields.priority", type: "number", required: true },
      { key: "colorRGB", label: "fields.color", type: "color", required: true, colorFormat: "decimal" },
    ],
  },

  "/regulation-rule": {
    endpoint: "RegulationRule",
    titleKey: "menu.regulationRule",
    feminine: true,
    formWidth: 720,
    fields: [
      { key: "ruleCode", label: "fields.ruleCode", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 3 },
      { key: "isActive", label: "fields.active", type: "boolean", formColSpan: 1 },
      { key: "unit", label: "fields.unit", type: "select", nullable: true, formColSpan: 2, options: [
        { value: "MINUTES", label: "regulationRule.minutes" },
        { value: "DAYS", label: "regulationRule.days" },
        { value: "WEEKS", label: "regulationRule.weeks" },
        { value: "CODE", label: "regulationRule.code" },
        { value: "FLAG", label: "regulationRule.flag" },
      ] },
      { key: "description", label: "fields.description", type: "string", required: true, maxLength: 200, uppercase: true, formColSpan: 6, hideInTable: true },
      { key: "valueInt", label: "fields.integerValue", type: "number", nullable: true, formColSpan: 2 },
      { key: "valueDecimal", label: "fields.decimalValue", type: "number", nullable: true, formColSpan: 2 },
      { key: "valueText", label: "fields.textValue", type: "string", nullable: true, maxLength: 200, formColSpan: 2 },
      { key: "notes", label: "fields.observations", type: "string", nullable: true, maxLength: 500, formColSpan: 6, hideInTable: true },
    ],
  },

  "/region": {
    endpoint: "Regions",
    titleKey: "menu.region",
    feminine: true,
    formWidth: 720,
    fields: [
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "name", label: "fields.name", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 3 },
      { key: "countryId", label: "fields.country", type: "lookup", required: true, lookupEndpoint: "Countries", lookupLabelFn: "codeName", formColSpan: 2 },
    ],
  },

  "/responsible-sector": {
    endpoint: "ResponsibleSector",
    titleKey: "menu.responsibleSector",
    fields: [
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 10, uppercase: true, formColSpan: 2 },
      { key: "description", label: "fields.description", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
    ],
  },

  "/planning-model": {
    endpoint: "PlanningModel",
    titleKey: "menu.planningModel",
    formWidth: 720,
    filters: [
      { paramName: "Filter1String", label: "fields.code", type: "string", uppercase: true },
      { paramName: "Filter2String", label: "fields.description", type: "string", uppercase: true },
    ],
    fields: [
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "description", label: "fields.description", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
      { key: "scenarioId", label: "fields.scenario", type: "lookup", required: true, lookupEndpoint: "Scenario", lookupLabelFn: "codeDescription", formColSpan: 3 },
      { key: "isActive", label: "fields.active", type: "boolean", formColSpan: 1 },
    ],
  },

  "/state": {
    endpoint: "States",
    titleKey: "menu.state",
    fields: [
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 2, uppercase: true },
      { key: "name", label: "fields.name", type: "string", required: true, maxLength: 100, uppercase: true },
      { key: "countryId", label: "fields.country", type: "lookup", required: true, lookupEndpoint: "Countries", lookupLabelFn: "codeName" },
      { key: "regionId", label: "fields.region", type: "lookup", nullable: true, lookupEndpoint: "Regions", lookupLabelFn: "codeName" },
    ],
  },

  "/timezone": {
    endpoint: "Timezone",
    titleKey: "menu.timezone",
    formWidth: 560,
    fields: [
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "description", label: "fields.description", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
    ],
  },

  "/timezone-value": {
    endpoint: "TimezoneValue",
    titleKey: "menu.timezoneValue",
    fields: [
      { key: "timezoneId", label: "fields.code", type: "lookup", required: true, lookupEndpoint: "Timezone", lookupLabelFn: "codeDescription", tableLabelFn: "codeOnly" },
      { key: "timezoneDescription", label: "fields.description", type: "string", displayOnly: true, nestedPath: "timezone.description" },
      { key: "value", label: "fields.value", type: "number", required: true, hideInTable: true },
      { key: "start", label: "fields.start", type: "datetime", required: true },
      { key: "end", label: "fields.end", type: "datetime", required: true },
    ],
  },

  "/trip-type": {
    endpoint: "TripType",
    titleKey: "menu.tripType",
    fields: [
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "description", label: "fields.description", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
      { key: "isLoaded", label: "fields.withLoad", type: "boolean", formColSpan: 2 },
      { key: "colorRGB", label: "fields.color", type: "color", required: true, colorFormat: "decimal", formColSpan: 4 },
    ],
  },

  "/location": {
    endpoint: "Location",
    titleKey: "menu.location",
    feminine: true,
    formWidth: 720,
    filters: [
      { paramName: "Filter1String", label: "fields.code", type: "string", uppercase: true },
      { paramName: "Filter3String", label: "fields.tmsCode", type: "string", uppercase: true, colSpan: 0.5 },
      { paramName: "Filter2String", label: "fields.gpsCode", type: "string", uppercase: false, colSpan: 0.5 },
      { paramName: "Filter1Id", label: "fields.locationGroupOf", type: "lookup", lookupEndpoint: "LocationGroup", lookupLabelFn: "codeDescription" },
      { paramName: "Filter2Id", label: "fields.locationTypeOf", type: "lookup", lookupEndpoint: "LocationType", lookupLabelFn: "codeDescription" },
      { paramName: "Filter1Bool", label: "fields.loadOperation", type: "bool" },
    ],
    fields: [
      { key: "code", label: "fields.code", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      { key: "name", label: "fields.name", type: "string", required: true, maxLength: 100, uppercase: true, formColSpan: 4 },
      { key: "cityName", label: "fields.city", type: "string", displayOnly: true, nestedPath: "city.name" },
      { key: "latitudeDisplay", label: "fields.latitude", type: "number", displayOnly: true, nestedPath: "latitude" },
      { key: "longitudeDisplay", label: "fields.longitude", type: "number", displayOnly: true, nestedPath: "longitude" },
      { key: "codeIntegration2", label: "fields.integrationTmsCode", type: "string", maxLength: 50, nullable: true, uppercase: true, formColSpan: 2 },
      { key: "codeIntegration1", label: "fields.integrationGpsCode", type: "string", maxLength: 50, nullable: true, uppercase: false, formColSpan: 2 },
      { key: "timezoneId", label: "fields.timezone", type: "lookup", nullable: true, lookupEndpoint: "Timezone", lookupLabelFn: "codeDescription", hideInTable: true, formColSpan: 2 },
      { key: "locationGroupId", label: "fields.locationGroup", type: "lookup", nullable: true, lookupEndpoint: "LocationGroup", lookupLabelFn: "codeDescription", tableLabelFn: "codeOnly", hideInTable: true, formColSpan: 2 },
      { key: "locationTypeId", label: "fields.locationType", type: "lookup", required: true, lookupEndpoint: "LocationType", lookupLabelFn: "codeDescription", tableLabelFn: "codeOnly", formColSpan: 2 },
      { key: "delayGPS", label: "fields.gpsDelay", type: "number", nullable: true, hideInTable: true, formColSpan: 2 },
      { key: "cityId", label: "fields.city", type: "lookup", nullable: true, lookupEndpoint: "Cities", lookupLabelFn: "codeName", largeLookup: true, searchFilterParam: "Filter1String", hideInTable: true, formColSpan: 2 },
      { key: "latitude", label: "fields.latitude", type: "number", required: true, hideInTable: true, formColSpan: 2 },
      { key: "longitude", label: "fields.longitude", type: "number", required: true, hideInTable: true, formColSpan: 2 },
    ],
  },

  "/stop-type": {
    endpoint: "StopType",
    titleKey: "menu.stopType",
    fields: [
      { key: "stopTypeCode", label: "fields.code", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 3 },
      { key: "stopTime", label: "fields.timeMin", type: "number", required: true, formColSpan: 3 },
      { key: "regulationType", label: "stopType.regulationType", type: "select", required: true, options: [{ value: "1", label: "stopType.meal" }, { value: "2", label: "stopType.rest" }, { value: "3", label: "stopType.break" }, { value: "4", label: "stopType.wait" }, { value: "5", label: "stopType.operationalStop" }], formColSpan: 3 },
      { key: "flgJourney", label: "fields.driverJourney", type: "select", required: true, options: [{ value: "S", label: "common.yes" }, { value: "N", label: "common.no" }], formColSpan: 3 },
    ],
  },

  "/truck": {
    endpoint: "Truck",
    titleKey: "menu.truck",
    formWidth: 720,
    filters: [
      { paramName: "Filter1String", label: "fields.vehiclePlate", type: "string", uppercase: true, minChars: 3 },
      { paramName: "Filter2String", label: "fields.vehicleFleetCode", type: "string", uppercase: true, minChars: 3 },
      { paramName: "Filter1Id", label: "fields.fleetType", type: "lookup", lookupEndpoint: "FleetType", lookupLabelFn: "codeDescription" },
      { paramName: "Filter2Id", label: "fields.fleetGroup", type: "lookup", lookupEndpoint: "FleetGroup", lookupLabelFn: "codeDescription" },
      { paramName: "Filter3Id", label: "fields.locationGroupOf", type: "lookup", lookupEndpoint: "LocationGroup", lookupLabelFn: "codeDescription" },
    ],
    fields: [
      // Table order: Placa, Cód Frota, Tipo Frota, Grupo Frota, Grupo Localidade, Chassi, Renavam
      // Form Line 1: Placa (2) | Cód. Frota (2) | Cód. Integração (1) | Ano Fab. (1)
      { key: "licensePlate", label: "fields.vehiclePlate", type: "string", required: true, maxLength: 8, uppercase: true, mask: "plate", formColSpan: 2 },
      { key: "fleetCode", label: "fields.vehicleFleetCode", type: "string", required: true, maxLength: 20, uppercase: true, formColSpan: 2 },
      // Table-only display columns (nested paths)
      { key: "fleetTypeCode", label: "fields.fleetType", type: "string", displayOnly: true, nestedPath: "fleetType.code" },
      { key: "fleetGroupCode", label: "fields.fleetGroup", type: "string", displayOnly: true, nestedPath: "fleetGroup.code" },
      { key: "locationGroupCode", label: "fields.locationGroupOf", type: "string", displayOnly: true, nestedPath: "locationGroup.code" },
      // Form Line 1 continued (hideInTable)
      { key: "integrationCode", label: "fields.integrationCode", type: "string", nullable: true, maxLength: 50, uppercase: true, hideInTable: true, formColSpan: 1 },
      { key: "manufactureYear", label: "fields.yearMfg", type: "string", nullable: true, maxLength: 4, mask: "year", hideInTable: true, formColSpan: 1 },
      // Form Line 2: UF (1) | Chassi (2) | Nº Série (2) | Recondicionado (1)
      { key: "stateId", label: "fields.uf", type: "lookup", nullable: true, lookupEndpoint: "States", lookupLabelFn: "codeName", tableLabelFn: "codeOnly", hideInTable: true, formColSpan: 1 },
      { key: "chassisNumber", label: "fields.chassis", type: "string", nullable: true, maxLength: 50, uppercase: true, formColSpan: 2 },
      { key: "serialNumber", label: "fields.serialNumber", type: "string", nullable: true, maxLength: 50, hideInTable: true, formColSpan: 2 },
      { key: "isRefurbished", label: "fields.reconditioned", type: "boolean", nullable: true, hideInTable: true, formColSpan: 1 },
      // Form Line 3: Renavam (2) | Val. Renavam (2) | Tara (1) | Capacidade (1)
      { key: "regulatoryNumber", label: "fields.renavam", type: "string", nullable: true, maxLength: 20, formColSpan: 2 },
      { key: "regulatoryValidity", label: "fields.renavamValue", type: "datetime", nullable: true, hideInTable: true, formColSpan: 2 },
      { key: "tare", label: "fields.tareKg", type: "number", nullable: true, hideInTable: true, formColSpan: 1 },
      { key: "capacity", label: "fields.capacityKg", type: "number", nullable: true, hideInTable: true, formColSpan: 1 },
      // Form Line 4: Grupo Localidade (3) | Tipo Frota (3)
      { key: "locationGroupId", label: "fields.locationGroupOf", type: "lookup", nullable: true, lookupEndpoint: "LocationGroup", lookupLabelFn: "codeDescription", hideInTable: true, formColSpan: 3 },
      { key: "fleetTypeId", label: "fields.fleetType", type: "lookup", nullable: true, lookupEndpoint: "FleetType", lookupLabelFn: "codeDescription", hideInTable: true, formColSpan: 3 },
      // Form Line 5: Data Início (3) | Data Fim (3)
      { key: "startDate", label: "fields.startDate", type: "date", nullable: true, hideInTable: true, formColSpan: 3 },
      { key: "endDate", label: "fields.endDate", type: "date", nullable: true, hideInTable: true, formColSpan: 3 },
      // Form Line 6: Observação (6)
      { key: "note", label: "fields.observation", type: "string", nullable: true, maxLength: 200, hideInTable: true, formColSpan: 6 },
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
