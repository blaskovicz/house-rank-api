import axios from "axios";
import zillowError from "./zillow-error";
import { buildRequestConfig } from ".";

// exposed query via our api
export const ZILLOW_PROPERTY_INFO_TYPE = `
type ZillowMortgageInfo {
  fifteenYearFixedRate: Float
  thirtyYearFixedRate: Float
  arm5Rate: Float
}
type ZillowAddressInfo {
  community: String
  subdivision: String
  unitPrefix: String
  unitNumber: String
  city: String
  latitude: Float
  longitude: Float
  state: String
  streetAddress: String
  zipcode: String
}
type ZillowListingTypeInfo {
  is_FSBO: Boolean
  is_FSBA: Boolean
  is_pending: Boolean
  is_newHome: Boolean
  is_foreclosure: Boolean
  is_bankOwned: Boolean
  is_forAuction: Boolean
  is_comingSoon: Boolean
}
type ZillowCategoryInfo {
  categoryName: String
  categoryFacts: [ZillowFactInfo]
}
type ZillowCategoryDetailsInfo {
  categoryGroupName: String
  categories: [ZillowCategoryInfo]
}
type ZillowFactInfo {
  factLabel: String
  factValue: String  
}
type ZillowHomeFactsInfo {
  aboveFactsAndFeaturesCategories: [ZillowCategoryInfo]
  atAGlanceFacts: [ZillowFactInfo]
  categoryDetails: [ZillowCategoryDetailsInfo]
}
type ZillowPhotoInfo {
  width: Float
  height: Float
  url: String
  caption: String
}
type ZillowForeclosureInfo {
  isBankOwned: Boolean
  wasREO: Boolean
  isForeclosedNFS: Boolean
  isAnyForeclosure: Boolean
  isPreforeclosure: Boolean
  wasNonRetailAuction: Boolean
  wasForeclosed: Boolean
  wasDefault: Boolean
}
type ZillowPropertyInfo {
  address: ZillowAddressInfo
  latitude: Float
  longitude: Float
  daysOnZillow: Int
  dateSold: Date
  datePosted: Date
  lastSoldPrice: Float
  isZillowOwned: Boolean
  currency: String
  city: String
  postingUrl: String
  propertyTypeDimension: String
  listingTypeDimension: String
  featuredListingTypeDimension: String
  brokerIdDimension: String
  keystoneHomeStatus: String
  rentalApplicationsAcceptedType: String
  yearBuilt: Int
  boroughId: ID
  brokerId: ID
  parcelId: ID
  brokerageName: String
  providerListingID: String
  postingProductType: String
  rentalRefreshTime: Date
  isFeatured: Boolean
  rentalDateAvailable: Date
  newConstructionType: String
  comingSoonOnMarketDate: Date
  listingStatusChangeDate: Date
  isPreforeclosureAuction: Boolean
  taxAssessedValue: Float
  taxAssessedYear: Int
  priceChange: Float
  isNonOwnerOccupied: Boolean
  isRecentStatusChange: Boolean
  forecast: String
  homeStatus: String
  homeType: String
  country: String
  description: String
  isUndisclosedAddress: Boolean
  isInstantOfferEnabled: Boolean
  rentZestimate: Float
  restimateHighPercent: String
  restimateLowPercent: String
  restimateMinus30: String
  state: String
  regionString: String
  streetAddress: String
  abbreviatedAddress: String
  lotSize: Float
  zestimate: Float
  zestimateHighPercent: String
  zestimateLowPercent: String
  zestimateMinus30: String
  zipcode: String
  zpid: String
  price: Float
  bedrooms: Float
  bathrooms: Float
  livingArea: Float
  hoaFee: Float
  propertyTaxRate: Float
  mortgageRates: ZillowMortgageInfo
  foreclosureTypes: ZillowForeclosureInfo
  smallPhotos: [ZillowPhotoInfo]
  mediumPhotos: [ZillowPhotoInfo]
  hugePhotos: [ZillowPhotoInfo]
  homeFacts: ZillowHomeFactsInfo
  listing_sub_type: ZillowListingTypeInfo
  nearbySales: [ZillowPropertyInfo]
  nearbyHomes: [ZillowPropertyInfo]
  comps: [ZillowPropertyInfo]
}
`;

export async function zillowPropertyResolver({ zpid }, args, { zwsid }, info) {
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
    query: `
    fragment ZillowPropertyCoreInfo on Property {
      parcelId      
      latitude
      longitude
      lotSize
      zpid
      bedrooms
      bathrooms
      livingArea
      price
      yearBuilt
      homeType
      taxAssessedValue
      taxAssessedYear
      priceChange
      hoaFee
      lastSoldPrice
      currency
    }
    fragment ZillowAddressInfo on Property {
      address {
        city
        state
        zipcode
        streetAddress
        community
        subdivision
        unitPrefix
        unitNumber
      }
    }
    fragment ZillowListingTypeInfo on Property {
      datePosted
      comingSoonOnMarketDate
      keystoneHomeStatus
      isNonOwnerOccupied       
      listingTypeDimension
      featuredListingTypeDimension      
      homeStatus
      dateSold
      daysOnZillow          
      isZillowOwned
      listingStatusChangeDate
      isPreforeclosureAuction
      isRecentStatusChange            
      listing_sub_type {
        is_FSBO
        is_FSBA
        is_pending
        is_newHome
        is_foreclosure
        is_bankOwned
        is_forAuction
        is_comingSoon
      }
    }
    fragment ZillowPhotoInfo on Property {
      smallPhotos: photos(size: S, count: 1) {
        width
        height
        url
        caption
      }
      mediumPhotos: photos(size: M) {
        url
        width
        height
        caption
      }
      hugePhotos: photos(size: L) {
        url
        width
        height
        caption
      }
      photoCount
    }
    query ForSaleFullRenderQuery($zpid: ID!) {
        property(zpid: $zpid) {
          ...ZillowAddressInfo
          ...ZillowPhotoInfo
          ...ZillowPropertyCoreInfo
          ...ZillowListingTypeInfo          
          city
          propertyTypeDimension
          brokerIdDimension
          rentalApplicationsAcceptedType
          boroughId
          brokerId
          brokerageName
          providerListingID
          postingProductType
          rentalRefreshTime
          isFeatured
          rentalDateAvailable
          newConstructionType
          forecast
          country
          description
          isUndisclosedAddress
          isInstantOfferEnabled
          rentZestimate
          restimateHighPercent
          restimateLowPercent
          restimateMinus30
          state
          regionString
          streetAddress
          abbreviatedAddress
          zestimate
          zestimateHighPercent
          zestimateLowPercent
          zestimateMinus30
          zipcode
          propertyTaxRate
          mortgageRates {
            fifteenYearFixedRate
            thirtyYearFixedRate
            arm5Rate
          }
          parentRegion {
            name
          }                 
          homeTourHighlights {
            agentNotes {
              date
              review
              id
              status
              agent {
                name
                title
                profilePage
                photoUrl
                email
              }
            }
          }                    
          countyFIPS
          homeFacts {
            aboveFactsAndFeaturesCategories {
              categoryName
              categoryFacts {
                factLabel
                factValue
              }
            }
            atAGlanceFacts {
              factLabel
              factValue
            }
            categoryDetails {
              categoryGroupName
              categories {
                categoryName
                categoryFacts {
                  factLabel
                  factValue
                }
              }
            }
          }
          nearbyCities {
            regionUrl {
              path
            }
            name
            body {
              city
              state
            }
          }
          nearbyNeighborhoods {
            regionUrl {
              path
            }
            name
            body {
              neighborhood
              city
              state
            }
          }
          nearbyZipcodes {
            regionUrl {
              path
            }
            name
            body {
              zipcode
              city
              state
            }
          }
          nearbySales {
            ...ZillowAddressInfo
            ...ZillowListingTypeInfo
            ...ZillowPropertyCoreInfo
            ...ZillowPhotoInfo
          }          
          nearbyHomes(count: 15) {
            ...ZillowAddressInfo
            ...ZillowListingTypeInfo
            ...ZillowPropertyCoreInfo
            ...ZillowPhotoInfo
          }
          comps(count: 15) {
            ...ZillowAddressInfo
            ...ZillowListingTypeInfo
            ...ZillowPropertyCoreInfo
            ...ZillowPhotoInfo
          }                    
          listingSource
          listingAccount {
            zuid
            email
          }
          ownerAccount {
            zuid
          }
          lfaViewPropertyPageUrl
          listingOwnerConfigIDs
          postingPresentationTypes
          homeValues {
            region {
              shortName
              zindexSqFt
              zhvi {
                yoy
                value
              }
              link
            }
            parentRegion {
              shortName
              zhvi {
                yoy
                value
              }
              regionTypeName
              buyerSellerIndex {
                value
              }              
            }
          }
          foreclosureTypes {
            isBankOwned
            wasREO
            isForeclosedNFS
            isAnyForeclosure
            isPreforeclosure
            wasNonRetailAuction
            wasForeclosed
            wasDefault            
          }                   
          foreclosureDefaultFilingDate
          foreclosureAuctionFilingDate
          foreclosureLoanDate
          foreclosureLoanOriginator
          foreclosureLoanAmount
          foreclosurePriorSaleDate
          foreclosurePriorSaleAmount
          foreclosureBalanceReportingDate
          foreclosurePastDueBalance
          foreclosureUnpaidBalance
          foreclosureAuctionTime
          foreclosureAuctionDescription
          foreclosureAuctionCity
          foreclosureAuctionLocation
          foreclosureDate
          foreclosureAmount
          foreclosingBank
          foreclosureJudicialType
          festimate
          foreclosureMoreInfo {
            trusteeName
            trusteeAddress
            trusteePhone
            legalDescription
            subdivision
            recordedDocs {
              name
              number
              date
            }
            apn
          }
          brokerIdForTracking
          postingUrl
          latitude
          longitude
          openHouseSchedule {
            startTime
            endTime
          }
          tourViewCount
          showDescriptionDisclaimer
          whatILove
          vrModel {
            vrModelGuid
            revisionId
            cdnHost
          }
          hasVRModel
          hasPublicVideo
          primaryPublicVideo {
            videoIdEncoded
            postingClient
            sourceVideoWidth
            sourceVideoHeight
            sources {
              presetName
              src
              type
            }
          }  
          postingContact {
            name
            photo(size: PROFILE_120_120) {
              url
            }
          }                     
        }
      }`
  });
}
