import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import expressAsyncHandler from "express-async-handler";
import { readdirSync, readFileSync } from "fs";
import morgan from "morgan";
import nodeZillow from "node-zillow";
import axios from "axios";
import priceTaxQuery from "./zillow/price-tax-query";
import forSaleFullRenderQuery from "./zillow/for-sale-full-render-query";
import { OAuth2Client } from "google-auth-library";
import expressGraphql from "express-graphql";
import { TokenPayload } from "google-auth-library/build/src/auth/loginticket";
import { createUserFromPrincipal } from "./database";
import { schema } from "./graphql";

const secretsPath = "/run/secrets";
try {
  const files = readdirSync(secretsPath);
  for (const f of files) {
    const value = readFileSync(`${secretsPath}/${f}`, { encoding: "utf8" });
    const key = f.toUpperCase();
    const prevValue = process.env[key];
    if (prevValue && prevValue !== value) {
      console.log(`[swarmed] ${key} value overridden.`);
    }
    process.env[key] = value;
  }
} catch (e) {
  console.warn("Failed to load secrets:", e.toString());
}
const { ZWSID, GOOGLE_CLIENT_ID, DATABASE_URL } = process.env;
if (!ZWSID) {
  throw new Error("Missing required ZWSID environment parameter");
}
if (!GOOGLE_CLIENT_ID) {
  throw new Error("Missing required GOOGLE_CLIENT_ID environment parameter");
}
if (!DATABASE_URL) {
  throw new Error("Missing required DATABASE_URL environment parameter");
}
const zillow = new nodeZillow(ZWSID, { https: true });
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

// a homelist has many homes
// a homelist has many members (owner, viewer, or collaborator)

// list all home lists the user is a member of
// read a single home list
// create a home list
// add a home to home list
// remove a home from a home list
// delete a home list
// list members of a home list
// add a member to a home list
// delete a member from home list
// update a member's home list access

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

// search properties
app.get(
  "/api/v1/zillow/properties",
  expressAsyncHandler(async (req, res, next) => {
    let { address, citystatezip } = req.query;
    if (!citystatezip) {
      citystatezip = "10001";
    }
    if (!address) {
      address = "5 Washington Square S";
    }
    const zillowRes = await zillow.get("GetSearchResults", {
      address,
      citystatezip
    });

    if (!zillowRes.message || zillowRes.message.code !== "0") {
      return res.status(400).json(zillowRes);
    }

    res.json(zillowRes.response.results.result);
  })
);

// get single property
app.get(
  "/api/v1/zillow/properties/:zpid",
  expressAsyncHandler(async (req, res, next) => {
    const { zpid } = req.params;
    const responsePayload = { pricing: {}, property: {} };
    const zillowRes = await axios({
      validateStatus: status => status < 600,
      url: "https://www.zillow.com/graphql/",
      method: "POST",
      headers: {
        "content-type": "text/plain",
        "accept-language": "en-US,en;q=0.9",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36"
      },
      params: {
        zwsid: ZWSID
      },
      data: priceTaxQuery(zpid)
    });
    if (!zillowRes.data || zillowRes.status !== 200) {
      return res.status(400).json(zillowRes.data);
    }
    responsePayload.pricing = zillowRes.data.data.property;
    const zillowRes2 = await axios({
      validateStatus: status => status < 600,
      url: "https://www.zillow.com/graphql/",
      method: "POST",
      headers: {
        "content-type": "text/plain",
        "accept-language": "en-US,en;q=0.9",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36"
      },
      params: {
        zwsid: ZWSID
      },
      data: forSaleFullRenderQuery(zpid)
    });
    if (!zillowRes2.data || zillowRes2.status !== 200) {
      return res.status(400).json(zillowRes2.data);
    }
    responsePayload.property = zillowRes2.data.data.property;
    res.json(responsePayload);
  })
);

const PORT = +(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.info("listening on port :", PORT);
});
