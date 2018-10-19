import zillowError from "./zillow-error";
import axios from "axios";
import { ZillowAddress } from "./address-query";

export const ZILLOW_SEARCH_ADDRESS_EXTENDED_TYPE = `
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

export interface LatLong {
  latitude: number;
  longitude: number;
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
    zoom
  }: { topRight: LatLong; bottomLeft: LatLong; zoom?: number },
  { zwsid },
  info
): Promise<ZillowAddressExtended[]> {
  // TODO: utilize node-zillow once updated
  // https://github.com/ralucas/node-zillow/issues/13
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
  const params = {
    rect,
    zoom: +(zoom || 12),
    "zws-id": zwsid,
    spt: "homes",
    status: "100000",
    lt: "111101",
    ht: "111111",
    pr: ",",
    mp: ",", // ??
    bd: "1,",
    ba: "0,",
    sf: ",",
    lot: ",",
    yr: ",",
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
    pnd: "1", // include pending: 1 (true) or 0 (false)
    red: "0",
    zso: "0",
    days: "any",
    ds: "all",
    pmf: "0",
    pf: "0",
    sch: "100111",
    p: "1",
    sort: "globalrelevanceex",
    search: "maplist",
    rt: "6",
    listright: "true",
    isMapSearch: "true"
  };
  const zillowRes = await axios({
    params,
    url: "https://www.zillow.com/search/GetResults.htm",
    validateStatus: status => status < 600,
    method: "GET",
    headers: {
      "accept-language": "en-US,en;q=0.9",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36"
    }
  });

  if (zillowRes.status !== 200 || !zillowRes.data) {
    throw zillowError(zillowRes);
  }
  // delete zillowRes.data.list.pagination;
  // delete zillowRes.data.list.listHTML;
  // delete zillowRes.data.list.sortControlHTML;
  // console.log(params, zillowRes.data.list);
  return (zillowRes.data.map.properties as any[]).map(mapZillowAddressExtended);
}
