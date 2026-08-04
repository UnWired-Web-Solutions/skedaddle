/**
 * Salesforce Connection Management Page (Admin Only)
 * Allows connecting/disconnecting Salesforce, testing the connection,
 * and exploring the schema for data queries.
 */
import PortalLayout from "@/components/PortalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  CloudOff,
  Database,
  Loader2,
  RefreshCw,
  Search,
  Unplug,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSearch } from "wouter";

export default function SalesforceConnect() {
  const { user } = useAuth();
  const searchParams = useSearch();
  const params = new URLSearchParams(searchParams);
  const justConnected = params.get("connected") === "true";
  const connectionError = params.get("error");

  const [selectedObject, setSelectedObject] = useState("");
  const [soqlQuery, setSoqlQuery] = useState("");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryError, setQueryError] = useState("");

  // tRPC queries
  const statusQuery = trpc.salesforce.status.useQuery();
  const authUrlQuery = trpc.salesforce.getAuthUrl.useQuery();
  const testQuery = trpc.salesforce.testConnection.useQuery(undefined, {
    enabled: false,
  });
  const objectsQuery = trpc.salesforce.listObjects.useQuery(undefined, {
    enabled: false,
  });
  const describeQuery = trpc.salesforce.describeObject.useQuery(
    { objectName: selectedObject },
    { enabled: !!selectedObject }
  );

  // Mutations
  const queryMutation = trpc.salesforce.query.useMutation({
    onSuccess: (data) => {
      setQueryResult(data);
      setQueryError("");
    },
    onError: (err) => {
      setQueryError(err.message);
      setQueryResult(null);
    },
  });
  const disconnectMutation = trpc.salesforce.disconnect.useMutation({
    onSuccess: () => {
      statusQuery.refetch();
    },
  });

  // Show success toast on redirect back
  useEffect(() => {
    if (justConnected) {
      statusQuery.refetch();
    }
  }, [justConnected]);

  const isConnected = statusQuery.data?.connected === true;

  return (
    <PortalLayout>
      <div className="px-6 py-8 max-w-5xl">
        {/* Page Header */}
        <div className="mb-8">
          <div
            className="text-xs font-semibold tracking-widest uppercase mb-1"
            style={{ color: "oklch(0.42 0.09 145)", fontFamily: "Inter, sans-serif" }}
          >
            Integration Settings
          </div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.18 0.015 65)" }}
          >
            Salesforce Connection
          </h1>
          <p
            className="text-sm"
            style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}
          >
            Connect to Skedaddle's Salesforce instance to pull PA inspections, revenue data, species breakdown, and close rates.
          </p>
          <div className="mt-3" style={{ borderTop: "2px solid oklch(0.32 0.09 145)", width: "48px" }} />
        </div>

        {/* Status Banner */}
        {justConnected && (
          <div
            className="mb-6 p-4 rounded-sm flex items-center gap-3"
            style={{ background: "oklch(0.95 0.06 145)", border: "1px solid oklch(0.85 0.08 145)" }}
          >
            <CheckCircle2 size={20} style={{ color: "oklch(0.42 0.12 145)" }} />
            <span style={{ color: "oklch(0.28 0.09 145)", fontFamily: "Inter, sans-serif", fontSize: "14px" }}>
              Salesforce connected successfully! You can now query data.
            </span>
          </div>
        )}
        {connectionError && (
          <div
            className="mb-6 p-4 rounded-sm flex items-center gap-3"
            style={{ background: "oklch(0.95 0.06 27)", border: "1px solid oklch(0.85 0.12 27)" }}
          >
            <AlertCircle size={20} style={{ color: "oklch(0.55 0.20 27)" }} />
            <span style={{ color: "oklch(0.40 0.15 27)", fontFamily: "Inter, sans-serif", fontSize: "14px" }}>
              Connection failed: {connectionError}. Please try again.
            </span>
          </div>
        )}

        {/* Connection Status Card */}
        <div
          className="rounded-sm border p-6 mb-6"
          style={{ background: "oklch(1 0 0)", borderColor: "oklch(0.88 0.012 80)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <Cloud size={24} style={{ color: "oklch(0.42 0.12 145)" }} />
              ) : (
                <CloudOff size={24} style={{ color: "oklch(0.55 0.02 80)" }} />
              )}
              <div>
                <h2
                  className="text-lg font-bold"
                  style={{ fontFamily: "Inter, sans-serif", color: "oklch(0.18 0.015 65)" }}
                >
                  {isConnected ? "Connected" : "Not Connected"}
                </h2>
                {isConnected && statusQuery.data?.connected && (
                  <p className="text-xs" style={{ color: "oklch(0.52 0.016 80)" }}>
                    Instance: {statusQuery.data.connection.instanceUrl} · Org: {statusQuery.data.connection.sfOrgId}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {isConnected ? (
                <>
                  <button
                    onClick={() => testQuery.refetch()}
                    className="px-3 py-1.5 text-xs font-semibold rounded-sm flex items-center gap-1.5 transition-colors"
                    style={{
                      background: "oklch(0.95 0.02 145)",
                      color: "oklch(0.32 0.09 145)",
                      border: "1px solid oklch(0.85 0.04 145)",
                    }}
                  >
                    <RefreshCw size={12} /> Test
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Disconnect Salesforce? You'll need to re-authorize to pull data again.")) {
                        disconnectMutation.mutate();
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-sm flex items-center gap-1.5 transition-colors"
                    style={{
                      background: "oklch(0.97 0.01 27)",
                      color: "oklch(0.55 0.15 27)",
                      border: "1px solid oklch(0.88 0.05 27)",
                    }}
                  >
                    <Unplug size={12} /> Disconnect
                  </button>
                </>
              ) : (
                <a
                  href={authUrlQuery.data?.url ?? "#"}
                  className="px-4 py-2 text-sm font-semibold rounded-sm flex items-center gap-2 transition-transform active:scale-[0.97]"
                  style={{
                    background: "oklch(0.32 0.09 145)",
                    color: "oklch(1 0 0)",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  <Cloud size={16} /> Connect Salesforce
                </a>
              )}
            </div>
          </div>

          {/* Test Result */}
          {testQuery.data && (
            <div
              className="mt-3 p-3 rounded-sm text-xs"
              style={{
                background: testQuery.data.success ? "oklch(0.97 0.02 145)" : "oklch(0.97 0.02 27)",
                color: testQuery.data.success ? "oklch(0.32 0.09 145)" : "oklch(0.45 0.15 27)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {testQuery.data.success ? "✓" : "✗"} {testQuery.data.message}
            </div>
          )}
        </div>

        {/* Schema Explorer (only when connected) */}
        {isConnected && (
          <div
            className="rounded-sm border p-6 mb-6"
            style={{ background: "oklch(1 0 0)", borderColor: "oklch(0.88 0.012 80)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Database size={18} style={{ color: "oklch(0.42 0.09 145)" }} />
              <h2
                className="text-base font-bold"
                style={{ fontFamily: "Inter, sans-serif", color: "oklch(0.18 0.015 65)" }}
              >
                Schema Explorer
              </h2>
            </div>

            <div className="flex gap-3 mb-4">
              <button
                onClick={() => objectsQuery.refetch()}
                className="px-3 py-1.5 text-xs font-semibold rounded-sm flex items-center gap-1.5"
                style={{
                  background: "oklch(0.95 0.02 145)",
                  color: "oklch(0.32 0.09 145)",
                  border: "1px solid oklch(0.85 0.04 145)",
                }}
              >
                <Search size={12} /> Load Objects
              </button>
              {objectsQuery.data && (
                <select
                  value={selectedObject}
                  onChange={(e) => setSelectedObject(e.target.value)}
                  className="text-xs px-2 py-1.5 rounded-sm border"
                  style={{ borderColor: "oklch(0.88 0.012 80)", fontFamily: "Inter, sans-serif" }}
                >
                  <option value="">Select an object...</option>
                  {objectsQuery.data
                    .filter((o) => o.custom)
                    .map((obj) => (
                      <option key={obj.name} value={obj.name}>
                        {obj.label} ({obj.name})
                      </option>
                    ))}
                  <option disabled>── Standard Objects ──</option>
                  {objectsQuery.data
                    .filter((o) => !o.custom)
                    .slice(0, 50)
                    .map((obj) => (
                      <option key={obj.name} value={obj.name}>
                        {obj.label} ({obj.name})
                      </option>
                    ))}
                </select>
              )}
            </div>

            {/* Object Fields */}
            {describeQuery.data && (
              <div className="mb-4">
                <h3 className="text-xs font-bold mb-2" style={{ color: "oklch(0.32 0.09 145)" }}>
                  {describeQuery.data.label} — Fields ({describeQuery.data.fields.length})
                </h3>
                <div className="max-h-60 overflow-y-auto border rounded-sm" style={{ borderColor: "oklch(0.92 0.008 80)" }}>
                  <table className="w-full text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
                    <thead>
                      <tr style={{ background: "oklch(0.97 0.005 80)" }}>
                        <th className="text-left px-2 py-1 font-semibold">Field Name</th>
                        <th className="text-left px-2 py-1 font-semibold">Label</th>
                        <th className="text-left px-2 py-1 font-semibold">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {describeQuery.data.fields.map((f) => (
                        <tr key={f.name} className="border-t" style={{ borderColor: "oklch(0.95 0.005 80)" }}>
                          <td className="px-2 py-1 font-mono">{f.name}</td>
                          <td className="px-2 py-1">{f.label}</td>
                          <td className="px-2 py-1">{f.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SOQL Query Console (only when connected) */}
        {isConnected && (
          <div
            className="rounded-sm border p-6"
            style={{ background: "oklch(1 0 0)", borderColor: "oklch(0.88 0.012 80)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Search size={18} style={{ color: "oklch(0.42 0.09 145)" }} />
              <h2
                className="text-base font-bold"
                style={{ fontFamily: "Inter, sans-serif", color: "oklch(0.18 0.015 65)" }}
              >
                SOQL Query Console
              </h2>
            </div>

            <textarea
              value={soqlQuery}
              onChange={(e) => setSoqlQuery(e.target.value)}
              placeholder="SELECT Id, Name, Amount FROM Opportunity WHERE IsWon = true LIMIT 10"
              className="w-full h-24 p-3 text-xs font-mono rounded-sm border resize-none"
              style={{ borderColor: "oklch(0.88 0.012 80)", background: "oklch(0.98 0.003 80)" }}
            />

            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => {
                  if (soqlQuery.trim()) {
                    queryMutation.mutate({ soql: soqlQuery.trim() });
                  }
                }}
                disabled={queryMutation.isPending || !soqlQuery.trim()}
                className="px-4 py-2 text-xs font-semibold rounded-sm flex items-center gap-1.5 transition-transform active:scale-[0.97] disabled:opacity-50"
                style={{
                  background: "oklch(0.32 0.09 145)",
                  color: "oklch(1 0 0)",
                }}
              >
                {queryMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                Run Query
              </button>
              {queryResult && (
                <span className="text-xs" style={{ color: "oklch(0.52 0.016 80)" }}>
                  {queryResult.totalSize} record{queryResult.totalSize !== 1 ? "s" : ""} returned
                </span>
              )}
            </div>

            {queryError && (
              <div className="mt-3 p-3 rounded-sm text-xs" style={{ background: "oklch(0.97 0.02 27)", color: "oklch(0.45 0.15 27)" }}>
                Error: {queryError}
              </div>
            )}

            {queryResult && queryResult.records.length > 0 && (
              <div className="mt-4 max-h-80 overflow-auto border rounded-sm" style={{ borderColor: "oklch(0.92 0.008 80)" }}>
                <table className="w-full text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
                  <thead>
                    <tr style={{ background: "oklch(0.97 0.005 80)" }}>
                      {Object.keys(queryResult.records[0])
                        .filter((k) => k !== "attributes")
                        .map((key) => (
                          <th key={key} className="text-left px-2 py-1 font-semibold whitespace-nowrap">
                            {key}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.records.slice(0, 50).map((record: any, i: number) => (
                      <tr key={i} className="border-t" style={{ borderColor: "oklch(0.95 0.005 80)" }}>
                        {Object.entries(record)
                          .filter(([k]) => k !== "attributes")
                          .map(([key, val]) => (
                            <td key={key} className="px-2 py-1 whitespace-nowrap">
                              {val === null ? "—" : String(val)}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Setup Instructions (only when not connected) */}
        {!isConnected && (
          <div
            className="rounded-sm border p-6"
            style={{ background: "oklch(0.98 0.005 80)", borderColor: "oklch(0.88 0.012 80)" }}
          >
            <h2
              className="text-base font-bold mb-3"
              style={{ fontFamily: "Inter, sans-serif", color: "oklch(0.18 0.015 65)" }}
            >
              Setup Instructions
            </h2>
            <ol
              className="text-sm space-y-2 list-decimal list-inside"
              style={{ color: "oklch(0.40 0.016 80)", fontFamily: "Inter, sans-serif" }}
            >
              <li>A Salesforce admin (Barry) creates a <strong>Connected App</strong> in Salesforce Setup</li>
              <li>The Connected App's <strong>Consumer Key</strong> and <strong>Consumer Secret</strong> are added to this portal's environment</li>
              <li>The admin clicks <strong>"Connect Salesforce"</strong> above and logs in with their Salesforce credentials</li>
              <li>Once authorized, the portal can pull data (revenue, PAs, species, close rates) indefinitely</li>
            </ol>
            <div
              className="mt-4 p-3 rounded-sm text-xs"
              style={{ background: "oklch(0.95 0.02 210)", color: "oklch(0.35 0.08 210)" }}
            >
              <strong>Callback URL for Connected App:</strong>{" "}
              <code className="font-mono">
                {window.location.origin}/api/oauth/salesforce/callback
              </code>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
