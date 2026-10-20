import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { error, info } from "./logging.js";

// Custom inbound JWT validation ("authorizeJWT" in the architecture diagram).
//
// We intentionally do NOT use @microsoft/agents-hosting's built-in
// `authorizeJWT` / AuthConfiguration-driven validation here. Per the team's
// production setup, the pinned SDK version (1.6.1) does not reliably support
// the env-var-driven AuthConfiguration for this deployment's identity model,
// so a custom validator is used instead. This mirrors that real setup.
//
// Validates:
//   - token signature against Bot Framework's published JWKS
//   - issuer is the Bot Framework token issuer
//   - audience matches this bot's app/client ID

const BOT_FRAMEWORK_ISSUER = "https://api.botframework.com";
const BOT_FRAMEWORK_OPENID_JWKS_URI = "https://login.botframework.com/v1/.well-known/keys";

const client = jwksClient({
  jwksUri: BOT_FRAMEWORK_OPENID_JWKS_URI,
  cache: true,
  cacheMaxAge: 60 * 60 * 1000,
  rateLimit: true
});

function getSigningKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  if (!header.kid) {
    callback(new Error("Token header is missing kid"));
    return;
  }

  client.getSigningKey(header.kid, (err, key) => {
    if (err || !key) {
      callback(err ?? new Error("Unable to resolve signing key"));
      return;
    }

    callback(null, key.getPublicKey());
  });
}

export function authorizeBotFrameworkJwt(expectedAudience: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = (req.headers["x-ms-request-id"] as string) ?? (req.headers["x-request-id"] as string);
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      error("authorizeJWT missing bearer token", new Error("Missing Authorization header"), { requestId });
      res.status(401).json({ error: "Missing or invalid Authorization header" });
      return;
    }

    const token = authHeader.slice("Bearer ".length);

    jwt.verify(
      token,
      getSigningKey,
      {
        issuer: BOT_FRAMEWORK_ISSUER,
        audience: expectedAudience || undefined,
        algorithms: ["RS256"]
      },
      (err, decoded) => {
        if (err) {
          error("authorizeJWT verification failed", err, { requestId });
          res.status(401).json({ error: "Invalid Bot Framework JWT" });
          return;
        }

        info("authorizeJWT verified inbound Bot Framework JWT", {
          requestId,
          aud: (decoded as jwt.JwtPayload)?.aud,
          iss: (decoded as jwt.JwtPayload)?.iss
        });

        next();
      }
    );
  };
}
