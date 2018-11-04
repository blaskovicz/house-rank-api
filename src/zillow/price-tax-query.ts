import axios from "axios";
import moment from "moment";
import zillowError from "./zillow-error";
import { buildRequestConfig } from ".";
import * as database from "../database";
const logger = console;

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

export async function zillowPricingResolver(
  { zpid, house }: { zpid: string; house?: database.House },
  args,
  { zwsid },
  info
) {
  try {
    const savedHouse = house ? house : await database.houseByZpid(zpid);
    if (
      savedHouse.zillow_pricing_updated_at &&
      moment().isBefore(
        moment(savedHouse.zillow_pricing_updated_at)
          .add(2, "days")
          .add(Math.floor(Math.random() * 120), "minutes")
      ) &&
      savedHouse.zillow_pricing_info
    ) {
      logger.info(`[price-tax-query] cached zpid=${zpid}`);
      return savedHouse.zillow_pricing_info;
    }
  } catch (e) {}

  logger.info(`[price-tax-query] requesting zpid=${zpid}`);

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

  const property = zillowRes.data.data.property;
  try {
    await database.updateHousePricing(zpid, property);
  } catch (e) {
    logger.warn(`[price-tax-query] error saving zpid=${zpid} pricing info`, e);
  }
  return property;
}

export default function query(zpid: number | string): string {
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
