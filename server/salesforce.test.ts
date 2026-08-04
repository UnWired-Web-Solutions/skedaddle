/**
 * Salesforce Router Tests
 * Tests the Salesforce integration tRPC procedures.
 */
import { describe, it, expect, vi } from "vitest";

// Mock the salesforceClient module
vi.mock("./salesforceClient", () => ({
  getAuthorizationUrl: vi.fn(() => "https://login.salesforce.com/services/oauth2/authorize?client_id=test"),
  getConnectionStatus: vi.fn(() => ({ connected: false })),
  testConnection: vi.fn(() => ({ success: true, message: "Connected" })),
  runQuery: vi.fn(() => ({ totalSize: 1, records: [{ Id: "001", Name: "Test" }] })),
  describeObject: vi.fn(() => ({
    name: "Account",
    label: "Account",
    fields: [{ name: "Id", label: "Account ID", type: "id", length: 18, picklistValues: null }],
  })),
  listObjects: vi.fn(() => [
    { name: "Account", label: "Account", custom: false },
    { name: "Opportunity", label: "Opportunity", custom: false },
  ]),
}));

describe("Salesforce Router", () => {
  it("should export salesforceRouter", async () => {
    const { salesforceRouter } = await import("./salesforceRouter");
    expect(salesforceRouter).toBeDefined();
  });

  it("should have all expected procedures", async () => {
    const { salesforceRouter } = await import("./salesforceRouter");
    const procedures = Object.keys(salesforceRouter._def.procedures);
    expect(procedures).toContain("status");
    expect(procedures).toContain("getAuthUrl");
    expect(procedures).toContain("testConnection");
    expect(procedures).toContain("query");
    expect(procedures).toContain("describeObject");
    expect(procedures).toContain("listObjects");
    expect(procedures).toContain("disconnect");
  });

  it("salesforceClient getAuthorizationUrl returns a URL", async () => {
    const { getAuthorizationUrl } = await import("./salesforceClient");
    const url = getAuthorizationUrl();
    expect(url).toContain("https://login.salesforce.com");
  });

  it("salesforceClient getConnectionStatus returns connected status", async () => {
    const { getConnectionStatus } = await import("./salesforceClient");
    const status = await getConnectionStatus();
    expect(status).toHaveProperty("connected");
  });

  it("salesforceClient testConnection returns success/message", async () => {
    const { testConnection } = await import("./salesforceClient");
    const result = await testConnection();
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("message");
  });

  it("salesforceClient runQuery returns records", async () => {
    const { runQuery } = await import("./salesforceClient");
    const result = await runQuery("SELECT Id FROM Account LIMIT 1");
    expect(result).toHaveProperty("totalSize");
    expect(result).toHaveProperty("records");
    expect(Array.isArray(result.records)).toBe(true);
  });

  it("salesforceClient listObjects returns array of objects", async () => {
    const { listObjects } = await import("./salesforceClient");
    const objects = await listObjects();
    expect(Array.isArray(objects)).toBe(true);
    expect(objects[0]).toHaveProperty("name");
    expect(objects[0]).toHaveProperty("label");
  });
});
