import axios from "axios";

// TODO: expose other fields for proxing if needed
export const ZILLOW_PROPERTY_INFO_TYPE = `
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
  latitude: Float
  longitude: Float
  id: String
  daysOnZillow: Int
  dateSold: Date
  datePosted: Date
  lastSoldPrice: Float
  isZillowOwned: Boolean
  currency: String
  city: String
  postingUrl: String
  propertyTypeDimension: String
  hdpTypeDimension: String
  listingTypeDimension: String
  featuredListingTypeDimension: String
  brokerIdDimension: String
  keystoneHomeStatus: String
  rentalApplicationsAcceptedType: String
  yearBuilt: Int
  boroughId: Int
  brokerId: Int
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
  foreclosureTypes: ZillowForeclosureInfo
  smallPhotos: [ZillowPhotoInfo]
  mediumPhotos: [ZillowPhotoInfo]
  hugePhotos: [ZillowPhotoInfo]
  homeFacts: ZillowHomeFactsInfo
}
`;

export async function zillowPropertyResolver({ zpid }, args, { zwsid }, info) {
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
      zwsid
    },
    data: query(zpid)
  });
  if (zillowRes.status !== 200 || !zillowRes.data) {
    throw zillowRes;
  }
  return zillowRes.data.data.property;
}

export default function query(zpid: number): string {
  return JSON.stringify({
    variables: { zpid },
    query: `query ForSaleFullRenderQuery($zpid: ID!) {
        property(zpid: $zpid) {
          id
          daysOnZillow
          dateSold
          lastSoldPrice
          isZillowOwned
          city
          propertyTypeDimension
          hdpTypeDimension
          listingTypeDimension
          featuredListingTypeDimension
          brokerIdDimension
          keystoneHomeStatus
          rentalApplicationsAcceptedType
          yearBuilt
          boroughId
          brokerId
          brokerageName
          providerListingID
          postingProductType
          rentalRefreshTime
          isFeatured
          rentalDateAvailable
          newConstructionType
          comingSoonOnMarketDate
          listingStatusChangeDate
          isPreforeclosureAuction
          taxAssessedValue
          taxAssessedYear
          priceChange
          isNonOwnerOccupied
          isRecentStatusChange
          forecast
          homeStatus
          homeType
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
          lotSize
          zestimate
          zestimateHighPercent
          zestimateLowPercent
          zestimateMinus30
          zipcode
          zpid
          price
          yearBuilt
          bedrooms
          bathrooms
          livingArea
          hoaFee
          propertyTaxRate
          mortgageRates {
            fifteenYearFixedRate
            thirtyYearFixedRate
            arm5Rate
          }          
          citySearchUrl {
            text
            path
          }
          parentRegion {
            name
          }          
          zipcodeSearchUrl {
            path
            text
          }
          apartmentsForRentInZipcodeSearchUrl {
            path
            text
          }
          housesForRentInZipcodeSearchUrl {
            path
            text
          }
          schoolSearchUrl {
            path
            text
          }
          stateSearchUrl {
            path
            text
          }          
          boroughSearchUrl {
            text
            path
          }
          communityUrl {
            path
            text
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
          parcelId
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
          hdpUrl
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
            bathrooms
            bedrooms
            dateSold
            hdpUrl
            homeStatus
            latitude
            livingArea
            longitude
            price
            zipcode
            zpid
            currency
          }          
          nearbyHomes(count: 15) {
            latitude
            longitude
            daysOnZillow
            homeStatus
            photoCount
            zpid
            hdpUrl
            bedrooms
            bathrooms
            livingArea
            price
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
            openHouseHours
            listing_sub_type {
              is_FSBO
              is_FSBA
              is_newHome
              is_pending
              is_foreclosure
              is_bankOwned
              is_forAuction
              is_comingSoon
            }
            isNonOwnerOccupied
            photos(size: S, count: 1) {
              width
              height
              url
            }
            currency
            isPremierBuilder
            homeStatus
            listing_sub_type {
              is_FSBA
              is_FSBO
              is_newHome
              is_pending
              is_foreclosure
              is_bankOwned
              is_forAuction
              is_comingSoon
            }
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
          comps(count: 15) {
            latitude
            longitude
            lotSize
            daysOnZillow
            homeStatus
            photoCount
            zpid
            hdpUrl
            bedrooms
            bathrooms
            livingArea
            price
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
            listing_sub_type {
              is_FSBO
              is_FSBA
              is_newHome
              is_pending
              is_foreclosure
              is_bankOwned
              is_forAuction
              is_comingSoon
            }
            isNonOwnerOccupied
            photos(size: S, count: 1) {
              width
              height
              url
            }
            currency
            isPremierBuilder
            homeStatus
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
          datePosted
          currency
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
          propertyUpdatePageLink
          moveHomeMapLocationLink
          propertyEventLogLink 
          editPropertyHistorylink
          brokerIdForTracking
          postingUrl
          latitude
          longitude
          smallPhotos: photos(size: S) {
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
          hugePhotos: photos(size: XXL) {
            url
            width
            height
            caption
          }          
          photoCount
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
