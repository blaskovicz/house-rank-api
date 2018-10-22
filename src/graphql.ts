import { GraphQLScalarType } from "graphql";
import { makeExecutableSchema } from "graphql-tools";
import { Kind } from "graphql/language";
import moment from "moment";
import * as database from "./database";
import { locationResolver } from "./location";
import {
  zillowAddressSearchResolver,
  ZILLOW_SEARCH_ADDRESS_TYPE
} from "./zillow/address-query";
import {
  zillowPropertyResolver,
  ZILLOW_PROPERTY_INFO_TYPE
} from "./zillow/for-sale-full-render-query";
import {
  zillowMapSearchResolver,
  ZILLOW_SEARCH_ADDRESS_EXTENDED_TYPE
} from "./zillow/map-address-query";
import {
  zillowPricingResolver,
  ZILLOW_PRICING_INFO_TYPE
} from "./zillow/price-tax-query";

const typeDefs = `
  scalar Date
  ${ZILLOW_PRICING_INFO_TYPE}
  ${ZILLOW_PROPERTY_INFO_TYPE}
  type Zillow {
    pricing: ZillowPricingInfo
    property: ZillowPropertyInfo    
  }
  ${ZILLOW_SEARCH_ADDRESS_TYPE}
  ${ZILLOW_SEARCH_ADDRESS_EXTENDED_TYPE}
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
  type Location {
    latitude: Float
    longitude: Float    
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
    location: Location
    ip: String
    user: User
    principal: Principal
    zillowProperty(zpid: String!): Zillow
    zillowAddressSearch(address: String!, citystatezip: String!): [ZillowAddress]
    zillowMapSearch(topRight: LatLongInput!, bottomLeft: LatLongInput!, zoom: Int): [ZillowAddressExtended]
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
    location: locationResolver,
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
    },
    zillowAddressSearch: zillowAddressSearchResolver,
    zillowMapSearch: zillowMapSearchResolver
  },
  Zillow: {
    pricing: zillowPricingResolver,
    property: zillowPropertyResolver
  },
  House: {
    zillow: async (house: database.House, args, context, info) => {
      // node between house and zillow data may optionally use cached house data
      const zillowProperty: any = { zpid: house.zpid };
      if (
        house.zillow_info_updated_at &&
        moment(house.zillow_info_updated_at)
          .add(1, "day")
          .isAfter(moment())
      ) {
        // cached value still valid
        zillowProperty.pricing = house.zillow_pricing_info;
        zillowProperty.property = house.zillow_property_info;
      } else {
        // cached value missing or stale, fetch
        try {
          const propertyP = zillowPropertyResolver(
            zillowProperty,
            args,
            context,
            info
          );
          const pricingP = zillowPricingResolver(
            zillowProperty,
            args,
            context,
            info
          );
          const [pricing, property] = [await pricingP, await propertyP];
          await database.updateHouse(house.zpid, pricing, property);
          zillowProperty.pricing = pricing;
          zillowProperty.property = property;
        } catch (e) {
          console.warn("failed to refresh cached house data", house, e);
        }
      }
      return zillowProperty;
    }
  },
  ZillowAddress: {
    zillow: ({ zpid }, args, context, info) => {
      // TODO cache here via House rows, but don't create tons of useless rows
      return { zpid };
    }
  },
  ZillowAddressExtended: {
    zillow: ({ zpid }, args, context, info) => {
      // TODO cache here via House rows, but don't create tons of useless rows
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
    ownedHouseLists: async ({ id }, args, context, info) => {
      return database.houseListsByOwnerId(id);
    },
    memberHouseLists: ({ id }, args, context, info) => {
      return database.houseListsViaMembershipByUserId(id);
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

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
  logger: console
});
