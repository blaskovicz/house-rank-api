import axios from "axios";
import zillowError from "./zillow-error";
import { buildRequestConfig } from ".";

export const ZILLOW_PRICING_INFO_TYPE = `
type ZillowTaxHistoryInfo {
  time: Date
  taxPaid: Float
  taxIncreaseRate: Float
  value: Float
  valueIncreaseRate: Float
}
type ZillowAgentPhoto {
  url: String
}
type ZillowAgentInfo {
  photo: ZillowAgentPhoto
  profileUrl: String
  name: String
}
type ZillowPriceHistoryInfo {
  time: Date
  price: Float
  priceChangeRate: Float
  event: String
  source: String
  buyerAgent: ZillowAgentInfo
  sellerAgent: ZillowAgentInfo
  postingIsRental: Boolean
}
type ZillowPricingInfo {
  zpid: String
  livingArea: Int
  countyFIPS: String
  parcelId: String
  taxHistory: [ZillowTaxHistoryInfo]
  priceHistory: [ZillowPriceHistoryInfo]
}
`;

export async function zillowPricingResolver({ zpid }, args, { zwsid }, info) {
  const zillowRes = await axios(
    buildRequestConfig({
      url: "https://www.zillow.com/graphql/",
      method: "POST",
      headers: {
        "content-type": "text/plain"
      },
      params: {
        "zws-id": zwsid
      },
      data: query(zpid)
    })
  );

  if (
    zillowRes.status !== 200 ||
    !zillowRes.data ||
    !zillowRes.data.data ||
    !zillowRes.data.data.property
  ) {
    throw zillowError(zillowRes);
  }
  return zillowRes.data.data.property;
}

export default function query(zpid: number): string {
  return JSON.stringify({
    variables: { zpid },
    query: `query PriceTaxQuery($zpid: ID!) {
      property(zpid: $zpid) {
        zpid
        livingArea
        countyFIPS
        parcelId
        taxHistory {
          time
          taxPaid
          taxIncreaseRate
          value
          valueIncreaseRate
        }
        priceHistory {
          time
          price
          priceChangeRate
          event
          source
          buyerAgent {
            photo {
              url
            }
            profileUrl
            name
          }
          sellerAgent {
            photo {
              url
            }
            profileUrl
            name
          }
          postingIsRental
        }
        currency
      }
    }`
  });
}
