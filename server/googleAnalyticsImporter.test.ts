import { describe, expect, it, vi } from "vitest";
import {
  fetchGA4PropertyMonthPages,
} from "./googleAnalyticsClient";
import { shouldRetainExistingCompleteSnapshot } from "./googleAnalyticsImporter";

describe("GA4 durable-import safeguards", () => {
  it("paginates a high-cardinality page-path response using deterministic offsets", async () => {
    const fullBatch = Array.from({ length: 25_000 }, () => ({}));
    const runReport = vi.fn()
      .mockResolvedValueOnce({ data: { rows: fullBatch, rowCount: "25001" } })
      .mockResolvedValueOnce({ data: { rows: [{}], rowCount: "25001" } });
    const client = { properties: { runReport } };

    const rows = await fetchGA4PropertyMonthPages(client, "123", "2026-07-01", "2026-07-31");

    expect(rows).toHaveLength(25_001);
    expect(runReport).toHaveBeenCalledTimes(2);
    expect(runReport.mock.calls.map(([request]) => request.requestBody.offset)).toEqual(["0", "25000"]);
    expect(runReport.mock.calls.map(([request]) => request.requestBody.limit)).toEqual(["25000", "25000"]);
  });

  it("retains a complete active snapshot when a later fetch has partial property coverage", () => {
    const partialCoverage = {
      propertiesExpected: 4,
      propertiesSucceeded: 3,
      failedProperties: [{ propertyId: "redacted", error: "request failed" }],
      complete: false,
    };

    expect(shouldRetainExistingCompleteSnapshot(partialCoverage, {
      propertiesExpected: 4,
      propertiesSucceeded: 4,
    })).toBe(true);
    expect(shouldRetainExistingCompleteSnapshot(partialCoverage, undefined)).toBe(false);
    expect(shouldRetainExistingCompleteSnapshot({ ...partialCoverage, complete: true }, {
      propertiesExpected: 4,
      propertiesSucceeded: 4,
    })).toBe(false);
  });
});
