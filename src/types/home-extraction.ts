/**
 * Home Insurance Extraction Types
 * Type definitions for home insurance quote data extraction
 *
 * Carrier Requirements Covered: Safeco, Auto-Owners, Cincinnati
 *
 * CONDITIONAL LOGIC NOTES:
 * - Spouse fields (spouseFirstName, spouseLastName, spouseDOB, spouseSSN) only shown if coApplicantPresent = 'Yes'
 * - Prior address fields (priorAddress, priorCity, priorState, priorZipCode) required if yearsAtCurrentAddress < 5
 * - dogBreed required if dog = 'Yes'
 * - wiringYear required if wiringUpdate = 'Yes'
 * - All update year fields required if corresponding update flag = 'Yes'
 * - daysRentedToOthers only shown if shortTermRental = 'Yes'
 * - windMitigation, stormShutters, impactGlass typically required for coastal/hurricane-prone areas
 */

import { ExtractionField } from './extraction'

// =============================================================================
// Field Configuration Types
// =============================================================================

export type HomeFieldInputType = 'text' | 'select' | 'date' | 'tel' | 'email' | 'number' | 'textarea' | 'checkbox'

export interface HomeFieldConfig {
  label: string
  inputType: HomeFieldInputType
  required: boolean
  options?: string[]
  placeholder?: string
  /** Field that controls whether this field is shown */
  conditionalOn?: string
  /** Value the conditional field must have to show this field */
  conditionalValue?: string | string[]
}

// =============================================================================
// Shared Options Constants
// =============================================================================

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]

const YES_NO_OPTIONS = ['Yes', 'No']

// =============================================================================
// Home Extraction Result Type - Personal Section
// =============================================================================

export interface HomeExtractionPersonal {
  firstName: ExtractionField
  lastName: ExtractionField
  // Carrier requirement: Safeco, Auto-Owners, Cincinnati
  maritalStatus: ExtractionField
  // Carrier requirement: All carriers - determines if spouse fields are shown
  coApplicantPresent: ExtractionField
  // Conditional: Only shown if coApplicantPresent = 'Yes'
  spouseFirstName: ExtractionField
  spouseLastName: ExtractionField
  spouseDOB: ExtractionField
  spouseSSN: ExtractionField
  // Carrier requirement: Cincinnati
  occupation: ExtractionField
  address: ExtractionField
  city: ExtractionField
  state: ExtractionField
  zipCode: ExtractionField
  yearsAtCurrentAddress: ExtractionField
  // Conditional: Required if yearsAtCurrentAddress < 5
  priorAddress: ExtractionField
  priorCity: ExtractionField
  priorState: ExtractionField
  priorZipCode: ExtractionField
  phone: ExtractionField
  email: ExtractionField
  applicantDOB: ExtractionField
  applicantSSN: ExtractionField
}

// =============================================================================
// Home Extraction Result Type - Property Section
// =============================================================================

export interface HomeExtractionProperty {
  purchaseDate: ExtractionField
  yearBuilt: ExtractionField
  squareFootage: ExtractionField
  numberOfStories: ExtractionField
  // Carrier requirement: Safeco, Auto-Owners
  bedroomCount: ExtractionField
  kitchenCount: ExtractionField
  kitchenStyle: ExtractionField
  bathroomCount: ExtractionField
  bathroomStyle: ExtractionField
  flooringPercentage: ExtractionField
  heatType: ExtractionField
  // Carrier requirement: All carriers
  dwellingType: ExtractionField
  // Carrier requirement: Safeco, Cincinnati
  constructionStyle: ExtractionField
  // Carrier requirement: Auto-Owners, Cincinnati
  constructionQuality: ExtractionField
  // Carrier requirement: Safeco
  homeUnderConstruction: ExtractionField
  exteriorConstruction: ExtractionField
  exteriorFeatures: ExtractionField
  fireplaceCount: ExtractionField
  fireplaceType: ExtractionField
  roofAge: ExtractionField
  roofConstruction: ExtractionField
  // Carrier requirement: Safeco, Cincinnati
  roofShape: ExtractionField
  foundation: ExtractionField
  finishedBasement: ExtractionField
  garageType: ExtractionField
  garageLocation: ExtractionField
  deckPatioDetails: ExtractionField
  condoOrTownhouse: ExtractionField
  specialFeatures: ExtractionField
  // Carrier requirement: Safeco, Auto-Owners
  distanceToFireDepartment: ExtractionField
  // Carrier requirement: Cincinnati
  waterSupplyType: ExtractionField
}

// =============================================================================
// Home Extraction Result Type - Occupancy/Use Section
// Carrier requirement: Safeco, Auto-Owners, Cincinnati
// =============================================================================

export interface HomeExtractionOccupancy {
  // Carrier requirement: All carriers
  dwellingOccupancy: ExtractionField
  // Carrier requirement: All carriers
  businessOnPremises: ExtractionField
  // Carrier requirement: All carriers
  shortTermRental: ExtractionField
  // Conditional: Only shown if shortTermRental = 'Yes'
  daysRentedToOthers: ExtractionField
  // Carrier requirement: Safeco, Cincinnati
  horsesOrLivestock: ExtractionField
  // Carrier requirement: All carriers
  numberOfFamilies: ExtractionField
}

// =============================================================================
// Home Extraction Result Type - Safety & Risk Section
// =============================================================================

export interface HomeExtractionSafetyRisk {
  alarmSystem: ExtractionField
  monitoredAlarm: ExtractionField
  pool: ExtractionField
  trampoline: ExtractionField
  enclosedYard: ExtractionField
  dog: ExtractionField
  // Conditional: Only shown if dog = 'Yes'
  dogBreed: ExtractionField
  // Carrier requirement: Safeco, Cincinnati - coastal/wind mitigation
  windMitigation: ExtractionField
  stormShutters: ExtractionField
  impactGlass: ExtractionField
}

// =============================================================================
// Home Extraction Result Type - Coverage Section
// =============================================================================

export interface HomeExtractionCoverage {
  dwellingCoverage: ExtractionField
  liabilityCoverage: ExtractionField
  medicalPayments: ExtractionField
  deductible: ExtractionField
}

// =============================================================================
// Home Extraction Result Type - Claims History Section
// =============================================================================

export interface HomeExtractionClaim {
  date: ExtractionField
  type: ExtractionField
  description: ExtractionField
  amount: ExtractionField
}

export interface HomeExtractionClaimsHistory {
  claims: HomeExtractionClaim[]
}

// =============================================================================
// Scheduled Items Types (Jewelry and Other Valuables)
// =============================================================================

export interface HomeExtractionJewelryItem {
  description: ExtractionField
  value: ExtractionField
}

export interface HomeExtractionValuableItem {
  description: ExtractionField
  value: ExtractionField
}

export interface HomeExtractionScheduledItems {
  jewelry: HomeExtractionJewelryItem[]
  otherValuables: HomeExtractionValuableItem[]
}

// =============================================================================
// Home Extraction Result Type - Insurance Details Section
// =============================================================================

export interface HomeExtractionInsuranceDetails {
  // Carrier requirement: Safeco, Auto-Owners
  propertySameAsMailing: ExtractionField
  // Carrier requirement: All carriers
  reasonForPolicy: ExtractionField
  // Carrier requirement: All carriers
  currentlyInsured: ExtractionField
  lienholderName: ExtractionField
  lienholderAddress: ExtractionField
  lienholderCity: ExtractionField
  lienholderState: ExtractionField
  lienholderZip: ExtractionField
  currentInsuranceCompany: ExtractionField
  policyNumber: ExtractionField
  effectiveDate: ExtractionField
  currentPremium: ExtractionField
  escrowed: ExtractionField
  insuranceCancelledDeclined: ExtractionField
  // Carrier requirement: Auto-Owners, Cincinnati
  maintenanceCondition: ExtractionField
  // Carrier requirement: All carriers
  numberOfLosses5Years: ExtractionField
  referredBy: ExtractionField
}

// =============================================================================
// Home Extraction Result Type - Updates Section
// =============================================================================

export interface HomeExtractionUpdates {
  hvacUpdate: ExtractionField
  // Conditional: Only shown if hvacUpdate = 'Yes'
  hvacYear: ExtractionField
  plumbingUpdate: ExtractionField
  // Conditional: Only shown if plumbingUpdate = 'Yes'
  plumbingYear: ExtractionField
  roofUpdate: ExtractionField
  // Conditional: Only shown if roofUpdate = 'Yes'
  roofYear: ExtractionField
  electricalUpdate: ExtractionField
  // Conditional: Only shown if electricalUpdate = 'Yes'
  electricalYear: ExtractionField
  circuitBreakers: ExtractionField
  // Carrier requirement: Cincinnati, Safeco
  wiringUpdate: ExtractionField
  // Conditional: Only shown if wiringUpdate = 'Yes'
  wiringYear: ExtractionField
}

// =============================================================================
// Complete Home Extraction Result
// =============================================================================

export interface HomeExtractionResult {
  personal: HomeExtractionPersonal
  property: HomeExtractionProperty
  occupancy: HomeExtractionOccupancy
  safetyRisk: HomeExtractionSafetyRisk
  coverage: HomeExtractionCoverage
  scheduledItems: HomeExtractionScheduledItems
  claimsHistory: HomeExtractionClaimsHistory
  insuranceDetails: HomeExtractionInsuranceDetails
  updates: HomeExtractionUpdates
}

// =============================================================================
// Field Configuration Maps
// =============================================================================

export const HOME_PERSONAL_FIELDS: Record<keyof HomeExtractionPersonal, HomeFieldConfig> = {
  // Primary applicant info
  firstName: { label: 'First Name', inputType: 'text', required: true },
  lastName: { label: 'Last Name', inputType: 'text', required: true },
  maritalStatus: {
    label: 'Marital Status',
    inputType: 'select',
    required: true,
    options: ['Single', 'Married', 'Divorced', 'Widowed', 'Domestic Partner']
  },
  applicantDOB: { label: 'Applicant Date of Birth', inputType: 'date', required: true },
  applicantSSN: { label: 'Applicant SSN', inputType: 'text', required: false, placeholder: 'XXX-XX-XXXX' },

  // Co-applicant/Spouse toggle and info
  coApplicantPresent: {
    label: 'Co-Applicant/Spouse Present',
    inputType: 'select',
    required: true,
    options: YES_NO_OPTIONS
  },
  // Conditional: Only shown if coApplicantPresent = 'Yes'
  spouseFirstName: {
    label: 'Spouse/Co-Applicant First Name',
    inputType: 'text',
    required: false,
    conditionalOn: 'coApplicantPresent',
    conditionalValue: 'Yes'
  },
  spouseLastName: {
    label: 'Spouse/Co-Applicant Last Name',
    inputType: 'text',
    required: false,
    conditionalOn: 'coApplicantPresent',
    conditionalValue: 'Yes'
  },
  spouseDOB: {
    label: 'Spouse/Co-Applicant Date of Birth',
    inputType: 'date',
    required: false,
    conditionalOn: 'coApplicantPresent',
    conditionalValue: 'Yes'
  },
  spouseSSN: {
    label: 'Spouse/Co-Applicant SSN',
    inputType: 'text',
    required: false,
    placeholder: 'XXX-XX-XXXX',
    conditionalOn: 'coApplicantPresent',
    conditionalValue: 'Yes'
  },

  // Occupation (Cincinnati requirement)
  occupation: {
    label: 'Occupation',
    inputType: 'text',
    required: false,
    placeholder: 'Cincinnati requires this field'
  },

  // Current address
  address: { label: 'Street Address', inputType: 'text', required: true },
  city: { label: 'City', inputType: 'text', required: true },
  state: { label: 'State', inputType: 'select', required: true, options: US_STATES },
  zipCode: { label: 'ZIP Code', inputType: 'text', required: true },
  yearsAtCurrentAddress: { label: 'Years at Current Address', inputType: 'number', required: false },

  // Prior address (conditional - needed if yearsAtCurrentAddress < 5)
  priorAddress: {
    label: 'Prior Street Address',
    inputType: 'text',
    required: false,
    placeholder: 'Required if less than 5 years at current address',
    conditionalOn: 'yearsAtCurrentAddress',
    conditionalValue: ['0', '1', '2', '3', '4']
  },
  priorCity: {
    label: 'Prior City',
    inputType: 'text',
    required: false,
    conditionalOn: 'yearsAtCurrentAddress',
    conditionalValue: ['0', '1', '2', '3', '4']
  },
  priorState: {
    label: 'Prior State',
    inputType: 'select',
    required: false,
    options: US_STATES,
    conditionalOn: 'yearsAtCurrentAddress',
    conditionalValue: ['0', '1', '2', '3', '4']
  },
  priorZipCode: {
    label: 'Prior ZIP Code',
    inputType: 'text',
    required: false,
    conditionalOn: 'yearsAtCurrentAddress',
    conditionalValue: ['0', '1', '2', '3', '4']
  },

  // Contact info
  phone: { label: 'Phone', inputType: 'tel', required: true },
  email: { label: 'Email', inputType: 'email', required: false },
}

export const HOME_PROPERTY_FIELDS: Record<keyof HomeExtractionProperty, HomeFieldConfig> = {
  purchaseDate: { label: 'Purchase Date', inputType: 'date', required: false },
  yearBuilt: { label: 'Year Built', inputType: 'number', required: true },
  squareFootage: { label: 'Square Footage', inputType: 'number', required: true },
  numberOfStories: { label: 'Number of Stories', inputType: 'select', required: true, options: ['1', '1.5', '2', '2.5', '3', '3+'] },
  bedroomCount: {
    label: 'Number of Bedrooms',
    inputType: 'select',
    required: true,
    options: ['1', '2', '3', '4', '5+']
  },
  kitchenCount: { label: 'Number of Kitchens', inputType: 'select', required: false, options: ['1', '2', '3+'] },
  kitchenStyle: { label: 'Kitchen Style', inputType: 'select', required: false, options: ['Basic', 'Standard', 'Custom', 'Designer'] },
  bathroomCount: { label: 'Number of Bathrooms', inputType: 'select', required: true, options: ['1', '1.5', '2', '2.5', '3', '3.5', '4', '4+'] },
  bathroomStyle: { label: 'Bathroom Style', inputType: 'select', required: false, options: ['Basic', 'Standard', 'Custom', 'Designer'] },
  flooringPercentage: { label: 'Flooring Percentage', inputType: 'text', required: false, placeholder: 'e.g., 60% hardwood, 40% carpet' },
  heatType: { label: 'Heat Type', inputType: 'select', required: true, options: ['Gas', 'Electric', 'Oil', 'Propane', 'Heat Pump', 'Radiant', 'Other'] },
  dwellingType: {
    label: 'Dwelling Type',
    inputType: 'select',
    required: true,
    options: ['Single Family', 'Condo', 'Townhouse', 'Mobile Home', 'Manufactured Home', 'Duplex', 'Triplex', 'Rowhouse', 'Other']
  },
  constructionStyle: {
    label: 'Construction Style',
    inputType: 'select',
    required: true,
    options: ['Ranch', 'Colonial', 'Cape Cod', 'Split Level', 'Contemporary', 'Victorian', 'Tudor', 'Craftsman', 'Mediterranean', 'Other']
  },
  constructionQuality: {
    label: 'Construction Quality',
    inputType: 'select',
    required: false,
    options: ['Economy', 'Standard', 'Custom', 'Premium']
  },
  homeUnderConstruction: {
    label: 'Home Under Construction',
    inputType: 'select',
    required: false,
    options: YES_NO_OPTIONS
  },
  exteriorConstruction: { label: 'Exterior Construction', inputType: 'select', required: true, options: ['Frame', 'Masonry', 'Frame/Masonry', 'Fire Resistive', 'Other'] },
  exteriorFeatures: { label: 'Exterior Features', inputType: 'textarea', required: false, placeholder: 'e.g., siding type, trim details' },
  fireplaceCount: { label: 'Number of Fireplaces', inputType: 'select', required: false, options: ['0', '1', '2', '3+'] },
  fireplaceType: { label: 'Fireplace Type', inputType: 'select', required: false, options: ['Wood Burning', 'Gas', 'Electric', 'Pellet', 'None'] },
  roofAge: { label: 'Age of Roof (Years)', inputType: 'number', required: true },
  roofConstruction: { label: 'Roof Construction', inputType: 'select', required: true, options: ['Asphalt Shingle', 'Wood Shingle', 'Metal', 'Tile', 'Slate', 'Flat/Built-up', 'Other'] },
  roofShape: {
    label: 'Roof Shape',
    inputType: 'select',
    required: false,
    options: ['Gable', 'Hip', 'Flat', 'Mansard', 'Gambrel', 'Shed', 'Other']
  },
  foundation: { label: 'Foundation Type', inputType: 'select', required: true, options: ['Basement', 'Crawl Space', 'Slab', 'Pier/Post', 'Other'] },
  finishedBasement: { label: 'Finished Basement', inputType: 'select', required: false, options: ['Yes', 'No', 'Partial', 'N/A'] },
  garageType: { label: 'Garage Type', inputType: 'select', required: false, options: ['None', '1 Car', '2 Car', '3 Car', '4+ Car', 'Carport'] },
  garageLocation: { label: 'Garage Location', inputType: 'select', required: false, options: ['Attached', 'Detached', 'Built-in', 'N/A'] },
  deckPatioDetails: { label: 'Deck/Patio/Porch Details', inputType: 'textarea', required: false },
  condoOrTownhouse: { label: 'Condo or Townhouse', inputType: 'select', required: false, options: YES_NO_OPTIONS },
  specialFeatures: { label: 'Special Features', inputType: 'textarea', required: false, placeholder: 'e.g., hot tub, wine cellar, smart home' },
  distanceToFireDepartment: {
    label: 'Distance to Fire Department',
    inputType: 'select',
    required: false,
    options: ['Under 5 miles', '5-10 miles', 'Over 10 miles']
  },
  waterSupplyType: {
    label: 'Water Supply Type',
    inputType: 'select',
    required: false,
    options: ['Public', 'Well', 'Cistern']
  },
}

export const HOME_OCCUPANCY_FIELDS: Record<keyof HomeExtractionOccupancy, HomeFieldConfig> = {
  dwellingOccupancy: {
    label: 'Dwelling Occupancy',
    inputType: 'select',
    required: true,
    options: ['Owner Occupied', 'Tenant Occupied', 'Vacant', 'Secondary/Seasonal']
  },
  businessOnPremises: {
    label: 'Business Conducted on Premises',
    inputType: 'select',
    required: true,
    options: YES_NO_OPTIONS
  },
  shortTermRental: {
    label: 'Short-Term Rental (Airbnb, VRBO, etc.)',
    inputType: 'select',
    required: true,
    options: YES_NO_OPTIONS
  },
  // Conditional: Only shown if shortTermRental = 'Yes'
  daysRentedToOthers: {
    label: 'Days Rented to Others Per Year',
    inputType: 'select',
    required: false,
    options: ['None', '1-30', '31-90', '91-180', '181+'],
    conditionalOn: 'shortTermRental',
    conditionalValue: 'Yes'
  },
  horsesOrLivestock: {
    label: 'Horses or Livestock on Property',
    inputType: 'select',
    required: false,
    options: YES_NO_OPTIONS
  },
  numberOfFamilies: {
    label: 'Number of Families in Dwelling',
    inputType: 'select',
    required: true,
    options: ['1', '2', '3', '4+']
  },
}

export const HOME_SAFETY_RISK_FIELDS: Record<keyof HomeExtractionSafetyRisk, HomeFieldConfig> = {
  alarmSystem: { label: 'Alarm System', inputType: 'select', required: false, options: YES_NO_OPTIONS },
  monitoredAlarm: { label: 'Monitored Alarm', inputType: 'select', required: false, options: YES_NO_OPTIONS },
  pool: { label: 'Pool', inputType: 'select', required: false, options: YES_NO_OPTIONS },
  trampoline: { label: 'Trampoline', inputType: 'select', required: false, options: YES_NO_OPTIONS },
  enclosedYard: { label: 'Enclosed Yard', inputType: 'select', required: false, options: YES_NO_OPTIONS },
  dog: { label: 'Dog', inputType: 'select', required: false, options: YES_NO_OPTIONS },
  // Conditional: Only shown if dog = 'Yes'
  dogBreed: {
    label: 'Dog Breed',
    inputType: 'text',
    required: false,
    placeholder: 'Specify if Yes above',
    conditionalOn: 'dog',
    conditionalValue: 'Yes'
  },
  windMitigation: {
    label: 'Wind Mitigation Level',
    inputType: 'select',
    required: false,
    options: ['None', 'Basic', 'Moderate', 'Superior'],
    placeholder: 'Required for coastal/hurricane-prone areas'
  },
  stormShutters: {
    label: 'Storm Shutters',
    inputType: 'select',
    required: false,
    options: YES_NO_OPTIONS
  },
  impactGlass: {
    label: 'Impact-Resistant Glass',
    inputType: 'select',
    required: false,
    options: YES_NO_OPTIONS
  },
}

export const HOME_COVERAGE_FIELDS: Record<keyof HomeExtractionCoverage, HomeFieldConfig> = {
  dwellingCoverage: { label: 'Dwelling Coverage', inputType: 'text', required: true, placeholder: 'e.g., $350,000' },
  liabilityCoverage: { label: 'Liability Coverage', inputType: 'select', required: true, options: ['$100,000', '$300,000', '$500,000', '$1,000,000'] },
  medicalPayments: { label: 'Medical Payments (Med Pay)', inputType: 'select', required: false, options: ['$1,000', '$2,500', '$5,000', '$10,000'] },
  deductible: { label: 'Deductible', inputType: 'select', required: true, options: ['$500', '$1,000', '$2,500', '$5,000', '$10,000'] },
}

export const HOME_CLAIM_FIELDS: Record<keyof HomeExtractionClaim, HomeFieldConfig> = {
  date: { label: 'Claim Date', inputType: 'date', required: true },
  type: { label: 'Claim Type', inputType: 'select', required: true, options: [
    'Water Damage', 'Fire', 'Theft', 'Wind/Hail', 'Liability', 'Other'
  ]},
  description: { label: 'Description', inputType: 'text', required: false },
  amount: { label: 'Claim Amount', inputType: 'text', required: false, placeholder: 'e.g., $5,000' },
}

export const HOME_JEWELRY_FIELDS: Record<keyof HomeExtractionJewelryItem, HomeFieldConfig> = {
  description: { label: 'Item Description', inputType: 'text', required: true, placeholder: 'e.g., Diamond engagement ring' },
  value: { label: 'Appraised Value', inputType: 'text', required: true, placeholder: 'e.g., $5,000' },
}

export const HOME_VALUABLE_FIELDS: Record<keyof HomeExtractionValuableItem, HomeFieldConfig> = {
  description: { label: 'Item Description', inputType: 'text', required: true, placeholder: 'e.g., Antique grandfather clock' },
  value: { label: 'Appraised Value', inputType: 'text', required: true, placeholder: 'e.g., $3,000' },
}

export const HOME_INSURANCE_DETAILS_FIELDS: Record<keyof HomeExtractionInsuranceDetails, HomeFieldConfig> = {
  propertySameAsMailing: {
    label: 'Property Address Same as Mailing',
    inputType: 'select',
    required: false,
    options: YES_NO_OPTIONS
  },
  reasonForPolicy: {
    label: 'Reason for Policy',
    inputType: 'select',
    required: true,
    options: ['New Purchase', 'Existing Home', 'Refinance']
  },
  currentlyInsured: {
    label: 'Currently Insured',
    inputType: 'select',
    required: true,
    options: ['Yes - Same Carrier', 'Yes - Different Carrier', 'No - New Purchase', 'No - Lapse']
  },
  lienholderName: { label: 'Lienholder Name', inputType: 'text', required: false },
  lienholderAddress: { label: 'Lienholder Address', inputType: 'text', required: false },
  lienholderCity: { label: 'Lienholder City', inputType: 'text', required: false },
  lienholderState: { label: 'Lienholder State', inputType: 'select', required: false, options: US_STATES },
  lienholderZip: { label: 'Lienholder ZIP', inputType: 'text', required: false },
  currentInsuranceCompany: { label: 'Current Insurance Company', inputType: 'text', required: false },
  policyNumber: { label: 'Policy Number', inputType: 'text', required: false },
  effectiveDate: { label: 'Effective Date', inputType: 'date', required: true },
  currentPremium: { label: 'Current Premium', inputType: 'text', required: false, placeholder: 'e.g., $1,200/year' },
  escrowed: { label: 'Escrowed', inputType: 'select', required: false, options: YES_NO_OPTIONS },
  insuranceCancelledDeclined: { label: 'Insurance Cancelled/Declined/Non-Renewed', inputType: 'select', required: false, options: YES_NO_OPTIONS },
  maintenanceCondition: {
    label: 'Property Maintenance Condition',
    inputType: 'select',
    required: false,
    options: ['Excellent', 'Good', 'Average', 'Fair', 'Poor']
  },
  numberOfLosses5Years: {
    label: 'Number of Losses in Past 5 Years',
    inputType: 'select',
    required: false,
    options: ['0', '1', '2', '3', '4', '5+']
  },
  referredBy: { label: 'Referred By', inputType: 'text', required: false },
}

export const HOME_UPDATES_FIELDS: Record<keyof HomeExtractionUpdates, HomeFieldConfig> = {
  hvacUpdate: { label: 'HVAC Updated', inputType: 'select', required: false, options: YES_NO_OPTIONS },
  hvacYear: {
    label: 'HVAC Update Year',
    inputType: 'number',
    required: false,
    conditionalOn: 'hvacUpdate',
    conditionalValue: 'Yes'
  },
  plumbingUpdate: { label: 'Plumbing Updated', inputType: 'select', required: false, options: YES_NO_OPTIONS },
  plumbingYear: {
    label: 'Plumbing Update Year',
    inputType: 'number',
    required: false,
    conditionalOn: 'plumbingUpdate',
    conditionalValue: 'Yes'
  },
  roofUpdate: { label: 'Roof Updated', inputType: 'select', required: false, options: YES_NO_OPTIONS },
  roofYear: {
    label: 'Roof Update Year',
    inputType: 'number',
    required: false,
    conditionalOn: 'roofUpdate',
    conditionalValue: 'Yes'
  },
  electricalUpdate: { label: 'Electrical Updated', inputType: 'select', required: false, options: YES_NO_OPTIONS },
  electricalYear: {
    label: 'Electrical Update Year',
    inputType: 'number',
    required: false,
    conditionalOn: 'electricalUpdate',
    conditionalValue: 'Yes'
  },
  circuitBreakers: { label: 'Circuit Breakers', inputType: 'select', required: false, options: YES_NO_OPTIONS },
  wiringUpdate: { label: 'Wiring Updated', inputType: 'select', required: false, options: YES_NO_OPTIONS },
  // Conditional: Only shown if wiringUpdate = 'Yes'
  wiringYear: {
    label: 'Wiring Update Year',
    inputType: 'number',
    required: false,
    conditionalOn: 'wiringUpdate',
    conditionalValue: 'Yes'
  },
}

// =============================================================================
// Section Configuration
// =============================================================================

export interface HomeSectionConfig {
  key: keyof HomeExtractionResult
  title: string
  description: string
  icon?: string
}

export const HOME_SECTIONS: HomeSectionConfig[] = [
  {
    key: 'personal',
    title: 'Personal Information',
    description: 'Applicant and co-applicant/spouse contact details',
  },
  {
    key: 'property',
    title: 'Property Information',
    description: 'Home construction, features, and characteristics',
  },
  {
    key: 'occupancy',
    title: 'Occupancy & Use',
    description: 'Dwelling usage, rental status, and business activities',
  },
  {
    key: 'safetyRisk',
    title: 'Safety & Risk Features',
    description: 'Security systems, hazards, and wind mitigation',
  },
  {
    key: 'coverage',
    title: 'Coverage Information',
    description: 'Requested coverage amounts and limits',
  },
  {
    key: 'scheduledItems',
    title: 'Scheduled Items',
    description: 'Jewelry and other high-value personal property',
  },
  {
    key: 'claimsHistory',
    title: 'Claims History',
    description: 'Claims in the last 5 years',
  },
  {
    key: 'insuranceDetails',
    title: 'Lienholder & Insurance Details',
    description: 'Mortgage, current insurance, and property condition',
  },
  {
    key: 'updates',
    title: 'Home Updates',
    description: 'Recent system renovations and improvements',
  },
]

// =============================================================================
// Helper Functions
// =============================================================================

export function createEmptyExtractionField(value: string | null = null): ExtractionField {
  return {
    value,
    confidence: 'low',
    flagged: value === null,
    rawText: undefined,
  }
}

export function createEmptyHomeExtraction(): HomeExtractionResult {
  const createFieldsFromConfig = <T>(
    config: Record<string, HomeFieldConfig>
  ): T => {
    const result: Record<string, ExtractionField> = {}
    for (const key of Object.keys(config)) {
      result[key] = createEmptyExtractionField()
    }
    return result as unknown as T
  }

  return {
    personal: createFieldsFromConfig<HomeExtractionPersonal>(HOME_PERSONAL_FIELDS),
    property: createFieldsFromConfig<HomeExtractionProperty>(HOME_PROPERTY_FIELDS),
    occupancy: createFieldsFromConfig<HomeExtractionOccupancy>(HOME_OCCUPANCY_FIELDS),
    safetyRisk: createFieldsFromConfig<HomeExtractionSafetyRisk>(HOME_SAFETY_RISK_FIELDS),
    coverage: createFieldsFromConfig<HomeExtractionCoverage>(HOME_COVERAGE_FIELDS),
    scheduledItems: { jewelry: [], otherValuables: [] },
    claimsHistory: { claims: [] },
    insuranceDetails: createFieldsFromConfig<HomeExtractionInsuranceDetails>(HOME_INSURANCE_DETAILS_FIELDS),
    updates: createFieldsFromConfig<HomeExtractionUpdates>(HOME_UPDATES_FIELDS),
  }
}

export function createEmptyClaim(): HomeExtractionClaim {
  return {
    date: createEmptyExtractionField(),
    type: createEmptyExtractionField(),
    description: createEmptyExtractionField(),
    amount: createEmptyExtractionField(),
  }
}

export function createEmptyJewelryItem(): HomeExtractionJewelryItem {
  return {
    description: createEmptyExtractionField(),
    value: createEmptyExtractionField(),
  }
}

export function createEmptyValuableItem(): HomeExtractionValuableItem {
  return {
    description: createEmptyExtractionField(),
    value: createEmptyExtractionField(),
  }
}

/**
 * Utility function to check if a conditional field should be displayed
 * @param fieldConfig - The field configuration to check
 * @param sectionData - The current section's extraction data
 * @returns true if the field should be displayed, false otherwise
 */
export function shouldShowField(
  fieldConfig: HomeFieldConfig,
  sectionData: Record<string, ExtractionField>
): boolean {
  if (!fieldConfig.conditionalOn) {
    return true
  }

  const conditionalField = sectionData[fieldConfig.conditionalOn]
  if (!conditionalField || !conditionalField.value) {
    return false
  }

  const conditionalValue = fieldConfig.conditionalValue
  if (Array.isArray(conditionalValue)) {
    return conditionalValue.includes(conditionalField.value)
  }

  return conditionalField.value === conditionalValue
}

/**
 * Get all fields that should be visible based on current section data
 * @param fieldsConfig - The field configuration map for a section
 * @param sectionData - The current section's extraction data
 * @returns Array of field keys that should be displayed
 */
export function getVisibleFields<T extends Record<string, HomeFieldConfig>>(
  fieldsConfig: T,
  sectionData: Record<string, ExtractionField>
): (keyof T)[] {
  return (Object.keys(fieldsConfig) as (keyof T)[]).filter(key =>
    shouldShowField(fieldsConfig[key], sectionData)
  )
}
