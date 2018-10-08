import * as database from "./database";
import priceTaxQuery, {
  ZILLOW_PRICING_INFO_TYPE,
  zillowPricingResolver
} from "./zillow/price-tax-query";
import forSaleFullRenderQuery, {
  ZILLOW_PROPERTY_INFO_TYPE,
  zillowPropertyResolver
} from "./zillow/for-sale-full-render-query";
import { GraphQLScalarType } from "graphql";
import { Kind } from "graphql/language";
import { makeExecutableSchema } from "graphql-tools";

const typeDefs = `
  scalar Date
  ${ZILLOW_PRICING_INFO_TYPE}
  ${ZILLOW_PROPERTY_INFO_TYPE}
  type Zillow {
    pricing: ZillowPricingInfo
    property: ZillowPropertyInfo    
  }
  type House {
    id: Int
    zpid: String
    zillow: Zillow
  }
  type HouseList {
    id: Int
    name: String!
    owner: User!
    members: [User]
    houses: [House]
  }
  type Principal {
    email: String
    name: String
    familyName: String
    givenName: String
    picture: String
  }
  type User {
    id: Int
    provider: String
    provider_id: String
    email: String
    created_at: Date
    ownedHouseLists: [HouseList]
    memberHouseLists: [HouseList]
  }
  type Mutation {
    deleteHouseList(listId: Int!): HouseList
    createHouseList(name: String!): HouseList
    addHouseToList(zpid: String!, listId: Int!): House
    removeHouseFromList(zpid: String!, listId: Int!): House
    addUserToList(email: String!, listId: Int!): User
    removeUserFromList(id: Int!, listId: Int!): User
  }
  type Query {
    ip: String
    user: User
    principal: Principal
    zillowProperty(zpid: String!): Zillow
  }
  schema {
    query: Query
    mutation: Mutation
  }
`;

// https://www.apollographql.com/docs/graphql-tools/resolvers.html#Resolver-function-signature
const resolvers = {
  Mutation: {
    deleteHouseList: async (obj, { listId }, context, info) => {
      await database.hasHouseListAccessRW(listId, context.user.id);
      return database.deleteHouseList(listId);
    },
    createHouseList: (obj, { name }, context, info) => {
      return database.createHouseList(name, context.user.id);
    },
    addHouseToList: async (obj, { listId, zpid }, context, info) => {
      await database.hasHouseListAccessRW(listId, context.user.id);
      return database.addHouseToList(zpid, listId);
    },
    removeHouseFromList: async (obj, { listId, zpid }, context, info) => {
      await database.hasHouseListAccessRW(listId, context.user.id);
      return database.removeHouseFromList(zpid, listId);
    },
    addUserToList: async (obj, { listId, email }, context, info) => {
      await database.hasHouseListAccessRW(listId, context.user.id);
      return database.addUserToList(email, listId);
    },
    removeUserFromList: async (obj, { listId, id }, context, info) => {
      await database.hasHouseListAccessRW(listId, context.user.id);
      return database.removeUserFromList(id, listId);
    }
  },
  Query: {
    ip: (obj, args, context, info) => {
      return context.req.ip;
    },
    principal: (obj, args, context, info) => {
      const { principal } = context;
      return {
        email: principal.email,
        name: principal.name,
        familyName: principal.family_name,
        givenName: principal.given_name,
        picture: principal.picture
      };
    },
    user: (obj, args, context, info) => {
      return context.user;
    },
    zillowProperty: (obj, { zpid }, context, info) => {
      return { zpid };
    }
  },
  Zillow: {
    pricing: zillowPricingResolver,
    property: zillowPropertyResolver
  },
  House: {
    zillow: ({ zpid }, args, context, info) => {
      return { zpid };
    }
  },
  HouseList: {
    owner: (obj, args, context, info) => {
      return database.userById(obj.owner_id);
    },
    members: (obj, args, context, info) => {
      return database.usersViaMembershipByHouseListID(obj.id);
    },
    houses: (obj, args, context, info) => {
      return database.housesViaMembershipByHouseListID(obj.id);
    }
  },
  User: {
    ownedHouseLists: async (obj, args, context, info) => {
      return database.houseListsByOwnerId(obj.id);
    },
    memberHouseLists: (obj, args, context, info) => {
      return database.houseListsViaMembershipByUserId(obj.id);
    }
  },
  Date: new GraphQLScalarType({
    name: "Date",
    description: "Date custom scalar type",
    parseValue(value) {
      return new Date(value); // value from the client
    },
    serialize(value) {
      if (typeof value.getTime === "function") {
        return value.getTime(); // value sent to the client
      }
      return value;
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return new Date(ast.value); // ast value is always in string format
      }
      return null;
    }
  })
};

export const schema = makeExecutableSchema({ typeDefs, resolvers });
