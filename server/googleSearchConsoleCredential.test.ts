import { describe, expect, it } from "vitest";
import {
  SKEDADDLE_SEARCH_CONSOLE_PROPERTY,
  verifySearchConsoleAccess,
} from "./googleSearchConsoleClient";

describe("Google Search Console service-account credential", () => {
  it.runIf(process.env.RUN_LIVE_API_TESTS === "1")("can list the authorised Skedaddle domain property", async () => {
    const result = await verifySearchConsoleAccess();
    expect(result.connected).toBe(true);
    expect(result.property).toBe(SKEDADDLE_SEARCH_CONSOLE_PROPERTY);
  }, 30_000);
});
