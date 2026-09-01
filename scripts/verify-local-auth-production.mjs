const productionUrl = process.argv[2] ?? "https://skedaddle.manus.space";
const rawRegistry = process.env.LOCAL_AUTH_ACCOUNTS_JSON;

if (!rawRegistry) {
  throw new Error("Managed local authentication registry is unavailable.");
}

const accounts = JSON.parse(rawRegistry);
const account = accounts.find((candidate) => candidate.role === "admin") ?? accounts[0];
if (!account?.username || !account?.password) {
  throw new Error("Managed local authentication registry has no usable account.");
}

async function callLogin(username, password) {
  const response = await fetch(`${productionUrl}/api/trpc/localAuth.login?batch=1`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ 0: { json: { username, password } } }),
  });
  if (!response.ok) throw new Error(`Local authentication endpoint returned HTTP ${response.status}.`);
  const body = await response.json();
  const envelope = Array.isArray(body) ? body[0] : body;
  return envelope?.result?.data?.json ?? envelope?.result?.data ?? envelope;
}

const accepted = await callLogin(account.username, account.password);
if (accepted?.success !== true || !accepted.user || "password" in accepted.user) {
  throw new Error("Managed local authentication success contract failed.");
}

const rejected = await callLogin(account.username, "not-the-managed-password");
if (rejected?.success !== false || rejected?.reason !== "invalid_credentials" || "user" in rejected) {
  throw new Error("Managed local authentication rejection contract failed.");
}

console.log("published_local_auth_contract=PASSED");
