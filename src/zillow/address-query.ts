import nodeZillow from "node-zillow";
import zillowError from "./zillow-error";

export const ZILLOW_SEARCH_ADDRESS_TYPE = `
type ZillowAddress {
  zpid: String
  city: String
  latitude: Float
  longitude: Float
  state: String
  street: String
  zipcode: String
  zillow: Zillow
}
`;

interface AddressProperty {
  street: string[];
  zipcode: string[];
  city: string[];
  state: string[];
  latitude: string[];
  longitude: string[];
}

export interface ZillowAddress {
  zpid: string;
  city: string;
  latitude: number;
  longitude: number;
  state: string;
  street: string;
  zipcode: string;
}

function mapZillowAddress({
  zpid,
  address
}: {
  zpid: string[];
  address: AddressProperty[];
}): ZillowAddress {
  if (!address || address.length === 0) {
    return;
  }
  const { city, street, zipcode, state, latitude, longitude } = address[0];
  if (
    !zpid ||
    !city ||
    !latitude ||
    !longitude ||
    !state ||
    !street ||
    !zipcode
  ) {
    return;
  }
  return {
    zpid: zpid[0],
    city: city[0],
    latitude: +latitude[0],
    longitude: +longitude[0],
    state: state[0],
    street: street[0],
    zipcode: zipcode[0]
  };
}

export async function zillowAddressSearchResolver(
  obj,
  args,
  { zwsid },
  info
): Promise<ZillowAddress[]> {
  let { address, citystatezip } = args;
  if (!citystatezip) {
    citystatezip = "10001";
  }
  if (!address) {
    address = "5 Washington Square S";
  }

  const zillow = new nodeZillow(zwsid, { https: true });
  const zillowRes = await zillow.get("GetSearchResults", {
    address,
    citystatezip
  });
  if (!zillowRes.message || zillowRes.message.code !== "0") {
    throw zillowError(zillowRes);
  }
  return zillowRes.response.results.result
    .map(mapZillowAddress)
    .filter(address => address !== undefined);
}
