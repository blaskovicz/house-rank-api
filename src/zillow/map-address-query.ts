import zillowError from "./zillow-error";
import axios from "axios";
import { ZillowAddress } from "./address-query";
import { buildRequestConfig } from ".";
const logger = console;

export const ZILLOW_SEARCH_ADDRESS_EXTENDED_TYPE = `
input MinMaxInput {
  min: Float
  max: Float
}
input LatLongInput {
  latitude: Float
  longitude: Float    
}
type LatLong {
  latitude: Float
  longitude: Float    
}
type ZillowAddressExtended {
  zpid: String
  city: String
  latitude: Float
  longitude: Float
  state: String
  street: String
  zipcode: String
  zillow: Zillow
  price: Float
  dateSold: Float
  bathrooms: Float
  bedrooms: Float
  livingArea: Float
  yearBuilt: Int
  lotSize: Float
  homeType: String
  homeStatus: String
  photoCount: Int
  imageLink: String
  daysOnZillow: Float
  isFeatured: Boolean
  brokerId: Int
  zestimate: Float
  isUnmappable: Boolean
  mediumImageLink: String
  homeStatusForHDP: String
  priceForHDP: Float
  festimate: Float
  hiResImageLink: String
  currency: String
  country: String
  streetAddress: String
}
`;

export interface LatLongInput {
  latitude: number;
  longitude: number;
}

export interface MinMaxInput {
  min: number;
  max: number;
}

export interface ZillowAddressExtended extends ZillowAddress {
  price: number;
  dateSold: number;
  bathrooms: number;
  bedrooms: number;
  livingArea: number;
  yearBuilt: number;
  lotSize: number;
  homeType: string;
  homeStatus: string;
  photoCount: number;
  imageLink: string;
  daysOnZillow: number;
  isFeatured: boolean;
  brokerId: number;
  zestimate: number;
  isUnmappable: boolean;
  mediumImageLink: string;
  homeStatusForHDP: string;
  priceForHDP: number;
  festimate: number;
  hiResImageLink: string;
  currency: string;
  country: string;
  streetAddress: string; // alias for street
  // listing_sub_type: {
  //   [key: string]: boolean;
  // }
}

function mapZillowAddressExtended(property: any[]): ZillowAddressExtended {
  if (!property || property.length < 8) {
    return;
  }

  const p1 = property[8];
  if (!p1 || p1.length < 11) {
    return;
  }
  const {
    zpid,
    streetAddress,
    zipcode,
    city,
    state,
    latitude,
    longitude,
    price,
    dateSold,
    bathrooms,
    bedrooms,
    livingArea,
    yearBuilt,
    lotSize,
    homeType,
    homeStatus,
    photoCount,
    imageLink,
    daysOnZillow,
    isFeatured,
    brokerId,
    zestimate,
    isUnmappable,
    mediumImageLink,
    homeStatusForHDP,
    priceForHDP,
    festimate,
    hiResImageLink,
    currency,
    country
  } = p1[11];
  if (
    !zpid ||
    !city ||
    !latitude ||
    !longitude ||
    !state ||
    !streetAddress ||
    !zipcode
  ) {
    return;
  }
  return {
    zpid,
    city,
    latitude,
    longitude,
    state,
    zipcode,
    price,
    dateSold,
    bathrooms,
    bedrooms,
    livingArea,
    yearBuilt,
    lotSize,
    homeType,
    homeStatus,
    photoCount,
    imageLink,
    daysOnZillow,
    isFeatured,
    brokerId,
    zestimate,
    isUnmappable,
    mediumImageLink,
    homeStatusForHDP,
    priceForHDP,
    festimate,
    hiResImageLink,
    currency,
    country,
    streetAddress,
    street: streetAddress
  };
}

export async function zillowMapSearchResolver(
  obj,
  {
    topRight,
    bottomLeft,
    zoom,
    livingArea,
    price,
    bathrooms,
    bedrooms,
    lotSize,
    yearBuilt,
    includePending,
    includeForSale = true,
    includeRecentlySold,
    includePreForeclosure,
    includeForeclosure
  }: {
    topRight: LatLongInput;
    bottomLeft: LatLongInput;
    zoom?: number;
    livingArea?: MinMaxInput;
    price?: MinMaxInput;
    bathrooms?: MinMaxInput;
    bedrooms?: MinMaxInput;
    lotSize?: MinMaxInput;
    yearBuilt?: MinMaxInput;
    includePending?: boolean;
    includeForSale?: boolean;
    includeRecentlySold?: boolean;
    includePreForeclosure?: boolean;
    includeForeclosure?: boolean;
  },
  { zwsid },
  info
): Promise<ZillowAddressExtended[]> {
  // TODO: utilize node-zillow once updated
  // https://github.com/ralucas/node-zillow/issues/13

  const params = {
    rect: buildParamRect(bottomLeft, topRight),
    zoom: +(zoom || 12),
    "zws-id": zwsid,
    spt: "homes",
    status: `${buildBinParam(includeForSale)}0${buildBinParam(
      includeRecentlySold
    )}000`,
    lt: "111101",
    ht: "111111",
    pr: buildMinMax(price),
    mp: ",", // ??
    bd: buildMinMax(bedrooms),
    ba: buildMinMax(bathrooms),
    sf: buildMinMax(livingArea),
    lot: buildMinMax(lotSize),
    yr: buildMinMax(yearBuilt),
    singlestory: "0",
    hoa: "0,",
    pho: "0",
    pets: "0",
    parking: "0",
    laundry: "0",
    "income-restricted": "0",
    "fr-bldg": "0",
    "condo-bldg": "0",
    "furnished-apartments": "0",
    "cheap-apartments": "0",
    "studio-apartments": "0",
    pnd: buildBinParam(includePending),
    red: "0",
    zso: "0",
    days: "any",
    ds: "all",
    pmf: buildBinParam(includeForeclosure),
    pf: buildBinParam(includePreForeclosure),
    sch: "100111",
    p: "1",
    sort: "globalrelevanceex",
    search: "maplist",
    rt: "6",
    listright: "true",
    isMapSearch: "true"
  };

  logger.info(`[map-address-query] requesting ${params.rect}`);

  const zillowRes = await axios(
    buildRequestConfig({
      params,
      url: "https://www.zillow.com/search/GetResults.htm"
    })
  );

  if (
    zillowRes.status !== 200 ||
    !zillowRes.data ||
    !zillowRes.data.map ||
    !zillowRes.data.map.properties
  ) {
    throw zillowError(zillowRes);
  }

  return (zillowRes.data.map.properties as any[]).map(mapZillowAddressExtended);
}

function buildBinParam(input?: boolean): number {
  if (typeof input !== "boolean" || !input) {
    return 0;
  }
  return 1;
}

function buildMinMax(input?: MinMaxInput): string {
  let param = "";
  if (input && typeof input.min === "number" && input.min >= 0) {
    param += `${input.min}`;
  }
  param += ",";
  if (input && typeof input.max === "number" && input.max >= 0) {
    param += `${input.max}`;
  }
  return param;
}

function buildParamRect(
  bottomLeft: LatLongInput,
  topRight: LatLongInput
): string {
  let rect: string = "";
  let tokenLength: number = 0;
  for (const char of `${bottomLeft.longitude},${bottomLeft.latitude},${
    topRight.longitude
  },${topRight.latitude}`) {
    if (char === ".") {
      continue;
    } else if (char === "-") {
      tokenLength -= 1;
    } else if (char === ",") {
      tokenLength = -1;
    } else if (tokenLength === 8) {
      continue;
    }
    rect += char;
    tokenLength += 1;
  }
  return rect;
}
