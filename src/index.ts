import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();
import { readdirSync, readFileSync } from "fs";
const secretsPath = "/run/secrets";
try {
  const files = readdirSync(secretsPath);
  for (const f of files) {
    const value = readFileSync(`${secretsPath}/${f}`, { encoding: "utf8" });
    const key = f.toUpperCase();
    const prevValue = process.env[key];
    if (prevValue && prevValue !== value) {
      console.log(`[swarmed] ${key} value overridden.`);
    } else {
      console.log(`[swarmed] loaded ${key}`);
    }
    process.env[key] = value;
  }
} catch (e) {
  console.warn("[swarmed] failed to load secrets:", e.toString());
}

import express from "express";
import expressAsyncHandler from "express-async-handler";
import morgan from "morgan";
import { OAuth2Client } from "google-auth-library";
import expressGraphql from "express-graphql";
import { TokenPayload } from "google-auth-library/build/src/auth/loginticket";
import { createUserFromPrincipal } from "./database";
import { schema } from "./graphql";

let { ZWSID, GOOGLE_CLIENT_ID, DATABASE_URL } = process.env;
GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID.trim();
ZWSID = ZWSID.trim();
DATABASE_URL = DATABASE_URL.trim();
if (!ZWSID) {
  throw new Error("Missing required ZWSID environment parameter");
}
if (!GOOGLE_CLIENT_ID) {
  throw new Error("Missing required GOOGLE_CLIENT_ID environment parameter");
}
if (!DATABASE_URL) {
  throw new Error("Missing required DATABASE_URL environment parameter");
}
const app = express();

// custom logging middleware
app.use(
  // combined: `:remote-addr - :remote-user [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"`
  morgan((tokens, req, res) => {
    const principal = (req as any).principal as TokenPayload;
    return [
      tokens["remote-addr"](req, res),
      tokens.date(req, res),
      tokens.method(req, res),
      tokens.url(req, res),
      tokens.status(req, res),
      tokens.res(req, res, "content-length"),
      "-",
      tokens["response-time"](req, res),
      "ms",
      !principal ? "-" : `${principal.sub}:${principal.email || "-"}`,
      tokens.referrer(req, res),
      tokens["user-agent"](req, res)
    ].join(" ");
  })
);

// parse incoming bodies middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// oauth2 middleware
app.use(
  expressAsyncHandler(async (req, res, next) => {
    if (req.method === "OPTIONS") {
      return next();
    }

    const auth = req.header("authorization") || "";
    const authParts = auth.split(" ", 2);
    if (authParts.length !== 2 || authParts[1] === "") {
      return res.status(401).json({ message: "Invalid authorization header" });
    }
    const verifier = new OAuth2Client(GOOGLE_CLIENT_ID);
    try {
      const ticket = await verifier.verifyIdToken({
        idToken: authParts[1],
        audience: GOOGLE_CLIENT_ID
      });
      (req as any).principal = ticket.getPayload();
      (req as any).user = await createUserFromPrincipal((req as any).principal);
      next();
    } catch (err) {
      console.error(err.stack);
      return res
        .status(401)
        .json({ message: "Invalid or expired authorization" });
    }
  })
);

// error middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "an error occurred" });
});

// cors middleware
app.use(
  "*",
  expressAsyncHandler(async (req, res, next) => {
    const origin = req.header("origin");
    if (
      origin &&
      (origin.includes("http://localhost:") ||
        origin.includes("https://house-rank.carlyzach.com"))
    ) {
      res.setHeader("access-control-allow-origin", origin);
      res.setHeader("access-control-allow-methods", "GET, POST");
      res.setHeader(
        "access-control-allow-headers",
        "authorization, content-type, accept, accept-language, content-language, referrer"
      );
      res.setHeader("access-control-allow-credentials", "true");
    }
    if (req.method !== "OPTIONS") {
      return next();
    }
    res.status(204).end();
  })
);

app.use("/graphql", (req, res, next) =>
  expressGraphql({
    schema,
    graphiql: true,
    pretty: true,
    context: {
      req,
      zwsid: ZWSID,
      principal: (req as any).principal,
      user: (req as any).user
    }
  })(req, res)
);

const PORT = +(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.info("listening on port :", PORT);
});
