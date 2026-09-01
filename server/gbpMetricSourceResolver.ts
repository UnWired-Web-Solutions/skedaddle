import {
  assessGBPPeriodCoverage,
  toGBPReportingMetricType,
  type GBPPeriodCoverage,
} from "../shared/gbpDataSafety";

export type PersistedGBPMonthlyMetric = {
  year: number;
  month: number;
  metricType: string;
  value: number | null;
  coverageStatus: "complete" | "partial" | "unavailable";
  locationsExpected: number;
  locationsSucceeded: number;
};

export type LegacyGBPMonthlyMetric = {
  year: number;
  month: number;
  metricType: string;
  value: number;
};

export type ResolvedGBPMonthlyMetric = {
  year: number;
  month: number;
  metricType: string;
  value: number | null;
  coverage: GBPPeriodCoverage;
  source: GBPPeriodCoverage["source"];
};

function keyOf(row: { year: number; month: number; metricType: string }) {
  return `${row.year}|${row.month}|${toGBPReportingMetricType(row.metricType)}`;
}

/**
 * Resolves one metric-period at a time: complete API data wins, partial or
 * unavailable API attempts stay visible, and legacy spreadsheets are used only
 * before any live result exists for that metric-period.
 */
export function resolveGBPMonthlyMetricSources(input: {
  persisted: PersistedGBPMonthlyMetric[];
  legacy: LegacyGBPMonthlyMetric[];
}): ResolvedGBPMonthlyMetric[] {
  const persistedByKey = new Map<string, PersistedGBPMonthlyMetric>();
  const legacyByKey = new Map<string, LegacyGBPMonthlyMetric>();
  for (const row of input.persisted) {
    const key = keyOf(row);
    if (persistedByKey.has(key)) throw new Error(`Duplicate persisted GBP monthly metric: ${key}.`);
    persistedByKey.set(key, { ...row, metricType: toGBPReportingMetricType(row.metricType) });
  }
  for (const row of input.legacy) {
    const key = keyOf(row);
    if (legacyByKey.has(key)) throw new Error(`Duplicate legacy GBP monthly metric: ${key}.`);
    legacyByKey.set(key, { ...row, metricType: toGBPReportingMetricType(row.metricType) });
  }

  const keys = new Set([...Array.from(persistedByKey.keys()), ...Array.from(legacyByKey.keys())]);
  return Array.from(keys).map(key => {
    const persisted = persistedByKey.get(key);
    const legacy = legacyByKey.get(key);
    const coverage = assessGBPPeriodCoverage({
      liveRows: persisted?.value === null || persisted === undefined ? 0 : 1,
      liveCoverageStatus: persisted?.coverageStatus,
      locationsExpected: persisted?.locationsExpected,
      locationsSucceeded: persisted?.locationsSucceeded,
      hasLegacyRecord: Boolean(legacy),
    });
    const sourceRow = persisted ?? legacy;
    if (!sourceRow) throw new Error("GBP source resolver encountered an empty metric key.");
    return {
      year: sourceRow.year,
      month: sourceRow.month,
      metricType: sourceRow.metricType,
      value: coverage.source === "persisted_business_profile_api" || coverage.source === "partial"
        ? persisted?.value ?? null
        : coverage.source === "legacy_spreadsheet"
          ? legacy?.value ?? null
          : null,
      coverage,
      source: coverage.source,
    };
  }).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month !== b.month ? a.month - b.month : a.metricType.localeCompare(b.metricType));
}
