var express = require("express");
var bodyParser = require("body-parser");

var graphqlHTTP = require("express-graphql");
var { buildSchema } = require("graphql");

// Construct a schema, using GraphQL schema language
var schema = buildSchema(`
  type Query {
    hello: String
  }
`);

// The root provides a resolver function for each API endpoint
var root = {
  hello: () => {
    return "Hello world!";
  }
};

var app = express();
app.use(bodyParser.json());

app.use("*", (req, res, next) => {
  const origin = req.header("origin");
  if (
    origin.includes("http://localhost:") ||
    origin.includes("https://house-rank.carlyzach.com")
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
});
app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true
  })
);
app.listen(3001);
console.log("Running a GraphQL API server at localhost:3001/graphql");
