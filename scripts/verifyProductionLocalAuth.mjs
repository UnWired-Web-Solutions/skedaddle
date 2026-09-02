const raw = process.env.LOCAL_AUTH_ACCOUNTS_JSON;
if (!raw) throw new Error("Managed local-auth configuration is unavailable to the verifier.");

const [account] = JSON.parse(raw);
if (!account?.username || !account?.password) {
  throw new Error("Managed local-auth configuration is not a usable account registry.");
}

const response = await fetch("https://skedaddle.manus.space/api/trpc/localAuth.login?batch=1", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ 0: { json: { username: account.username, password: account.password } } }),
});
const responseBody = await response.json();
const result = responseBody?.[0]?.result?.data?.json;

process.stdout.write(`${JSON.stringify({
  httpStatus: response.status,
  success: result?.success === true,
  reason: typeof result?.reason === "string" ? result.reason : null,
  returnedRole: typeof result?.user?.role === "string" ? result.user.role : null,
  passwordReturned: Object.prototype.hasOwnProperty.call(result?.user ?? {}, "password"),
})}\n`);
