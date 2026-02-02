import { logger } from "../logger";
import http from "node:http";
import https from "node:https";

export type AuthTokens = {
  identityToken: string;
  sessionToken: string;
};

const DEFAULT_AUTH_URL = "http://example.com/auth/login";
const DEFAULT_TIMEOUT_MS = 5_000;


const readEnvBool = (raw: unknown): boolean | null => {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(v)) return true;
  if (["0", "false", "no", "n", "off"].includes(v)) return false;
  return null;
};

const postJson = async (
  url: string,
  payload: unknown,
  timeoutMs: number,
  insecure: boolean,
): Promise<{ status: number; bodyText: string }> => {
  const u = new URL(url);
  const body = JSON.stringify(payload);
  

  const isHttps = u.protocol === "https:";
  const transport = isHttps ? https : http;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body).toString(),
    Accept: "application/json",
  };

  const agent =
    isHttps && insecure
      ? new https.Agent({ rejectUnauthorized: false })
      : undefined;
  

  return await new Promise((resolve, reject) => {
    const req = transport.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port ? Number(u.port) : undefined,
        path: `${u.pathname}${u.search}`,
        method: "POST",
        headers,
        agent,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on("end", () => {
          const bodyText = Buffer.concat(chunks).toString("utf8");
          resolve({ status: res.statusCode ?? 0, bodyText });
        });
      },
    );

    req.on("error", reject);

    
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("timeout"));
    });
    

    req.write(body);
    req.end();
  });
};

export const fetchAuthTokens = async (
  username: string,
  uuid: string,
): Promise<AuthTokens> => {
  const authUrl = (process.env.VITE_AUTH_URL || process.env.AUTH_URL || "").trim() ||
    DEFAULT_AUTH_URL;
  

  const timeoutMsRaw =
    (process.env.VITE_AUTH_TIMEOUT_MS || process.env.AUTH_TIMEOUT_MS || "").trim();
  const timeoutMs = timeoutMsRaw ? Number(timeoutMsRaw) : DEFAULT_TIMEOUT_MS;

  const insecure =
    readEnvBool(process.env.VITE_AUTH_INSECURE) ??
    readEnvBool(process.env.AUTH_INSECURE) ??
    false;

  const effectiveTimeout =
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS;

  if (insecure) {
    logger.warn(
      "VITE_AUTH_INSECURE enabled: TLS certificate verification is disabled for auth requests.",
    );
  }
  

  try {
    const { status, bodyText } = await postJson(
      authUrl,
      { username, uuid },
      effectiveTimeout,
      insecure,
    );

    if (status !== 200) {
      const snippet = (bodyText || "").slice(0, 400);
      throw new Error(
        `Auth server error (${status}).` +
        (snippet ? ` Response: ${snippet}` : ""),
      );
    }

    let data: any;
    try {
      data = JSON.parse(bodyText);
    } catch {
      const snippet = (bodyText || "").slice(0, 400);
      throw new Error(
        "Auth server did not return valid JSON." +
        (snippet ? ` Response: ${snippet}` : ""),
      );
    }
    

    const identityToken =
      typeof data?.identityToken === "string" ? data.identityToken : null;
    const sessionToken =
      typeof data?.sessionToken === "string" ? data.sessionToken : null;

    if (!identityToken || !sessionToken) {
      throw new Error("Auth server JSON missing identityToken/sessionToken.");
    }
    

    return { identityToken, sessionToken };
  } catch (e) {
    if (e instanceof Error && e.message === "timeout") {
      throw new Error(`Auth request timed out after ${effectiveTimeout}ms.`);
    }
    throw e instanceof Error ? e : new Error(String(e));
  }
};
