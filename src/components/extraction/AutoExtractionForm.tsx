'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { ExtractionField, ExtractionBooleanField } from '@/types/extraction'
import {
  AutoExtractionResult,
  AutoPersonalInfo,
  AutoAdditionalDriver,
  AutoVehicle,
  AutoCoverageInfo,
  AutoVehicleDeductible,
  AutoVehicleLienholder,
  AutoPriorInsurance,
  AutoAccidentOrTicket,
  AUTO_PERSONAL_FIELDS,
  AUTO_DRIVER_FIELDS,
  AUTO_VEHICLE_FIELDS,
  AUTO_COVERAGE_FIELDS,
  AUTO_DEDUCTIBLE_FIELDS,
  AUTO_LIENHOLDER_FIELDS,
  AUTO_PRIOR_INSURANCE_FIELDS,
  AUTO_ACCIDENT_TICKET_FIELDS,
  MARITAL_STATUS_OPTIONS,
  createEmptyAutoDriver,
  createEmptyAutoVehicle,
  createEmptyAutoDeductible,
  createEmptyAutoLienholder,
  createEmptyAutoAccidentOrTicket,
  getVehicleDisplayName,
  validateVIN,
  AutoFieldConfig,
} from '@/types/auto-extraction'
import { FormSection, calculateSectionStats } from './FormSection'
import { FieldEditor } from './FieldEditor'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Car,
  Plus,
  Trash2,
  AlertCircle,
  User,
  Shield,
  CreditCard,
  Building2,
  FileWarning,
  LucideIcon,
  Calendar,
  MapPin,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Section icon mapping for auto form
const AUTO_SECTION_ICONS: Record<string, LucideIcon> = {
  personal: User,
  drivers: User,
  vehicles: Car,
  coverage: Shield,
  deductibles: CreditCard,
  lienholders: Building2,
  priorInsurance: FileWarning,
  incidents: AlertTriangle,
}

/**
 * Memoized field renderer component for auto extraction form.
 * Prevents unnecessary re-renders when other fields change.
 */
interface AutoFieldRendererProps {
  field: ExtractionField | ExtractionBooleanField
  fieldKey: string
  config: AutoFieldConfig
  onChange: (value: string) => void
}

const AutoFieldRenderer = React.memo(function AutoFieldRenderer({
  field,
  fieldKey,
  config,
  onChange,
}: AutoFieldRendererProps) {
  // Adapt boolean fields for FieldEditor
  const adaptedField = useMemo(() => {
    const isBooleanField = typeof (field as ExtractionBooleanField).value === 'boolean' ||
      ((field as ExtractionBooleanField).value === null && config.inputType === 'select' && config.options?.includes('Yes'))

    if (isBooleanField) {
      return adaptBooleanField(field as ExtractionBooleanField)
    }
    return field as ExtractionField
  }, [field, config.inputType, config.options])

  return (
    <FieldEditor
      field={adaptedField}
      label={config.label}
      fieldKey={fieldKey}
      type={config.inputType === 'checkbox' ? 'select' : config.inputType}
      required={config.required}
      options={config.options}
      placeholder={config.placeholder}
      onChange={onChange}
    />
  )
})

interface AutoExtractionFormProps {
  extractionId: string
  initialData: AutoExtractionResult
  onSave?: (data: AutoExtractionResult) => Promise<void>
  className?: string
}

/**
 * Type guard to check if an object has ExtractionField-like structure
 */
function isExtractionLikeField(value: unknown): value is ExtractionField | ExtractionBooleanField {
  return (
    typeof value === 'object' &&
    value !== null &&
    'confidence' in value &&
    'flagged' in value &&
    'value' in value
  )
}

/**
 * Type-safe function to extract field statistics from a section object.
 * Iterates over all properties and calculates stats for ExtractionField-like values.
 */
function extractFieldStats(section: object): { total: number; completed: number; lowConfidence: number; flagged: number } {
  let total = 0
  let completed = 0
  let lowConfidence = 0
  let flagged = 0

  for (const value of Object.values(section)) {
    if (isExtractionLikeField(value)) {
      total++
      const hasValue = value.value !== null && value.value !== ''
      if (hasValue) completed++
      if (value.confidence === 'low' && !value.flagged) lowConfidence++
      if (value.flagged) flagged++
    }
  }

  return { total, completed, lowConfidence, flagged }
}

// Helper to convert boolean field value for display
function boolFieldToString(field: ExtractionBooleanField | ExtractionField): string {
  if ('value' in field) {
    if (typeof field.value === 'boolean') {
      return field.value ? 'Yes' : 'No'
    }
    return field.value || ''
  }
  return ''
}

// Helper to create ExtractionField-like object from boolean field for FieldEditor
function adaptBooleanField(field: ExtractionBooleanField): ExtractionField {
  return {
    value: field.value === null ? null : (field.value ? 'Yes' : 'No'),
    confidence: field.confidence,
    flagged: field.flagged,
    rawText: field.rawText,
  }
}

/**
 * Auto Insurance Extraction Review Form
 * Displays extracted auto insurance data with editable fields organized by section
 */
export function AutoExtractionForm({
  extractionId: _extractionId,
  initialData,
  onSave,
  className,
}: AutoExtractionFormProps) {
  const [data, setData] = useState<AutoExtractionResult>(initialData)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Calculate overall form statistics using type-safe extractFieldStats
  const formStats = useMemo(() => {
    let totalFields = 0
    let completedFields = 0
    let lowConfidenceFields = 0
    let flaggedFields = 0

    // Personal section - use type-safe extraction
    const personalStats = extractFieldStats(data.personal)
    totalFields += personalStats.total
    completedFields += personalStats.completed
    lowConfidenceFields += personalStats.lowConfidence
    flaggedFields += personalStats.flagged

    // Coverage section
    const coverageStats = extractFieldStats(data.coverage)
    totalFields += coverageStats.total
    completedFields += coverageStats.completed
    lowConfidenceFields += coverageStats.lowConfidence
    flaggedFields += coverageStats.flagged

    // Prior Insurance section
    const priorInsuranceStats = extractFieldStats(data.priorInsurance)
    totalFields += priorInsuranceStats.total
    completedFields += priorInsuranceStats.completed
    lowConfidenceFields += priorInsuranceStats.lowConfidence
    flaggedFields += priorInsuranceStats.flagged

    // Array sections - typed properly
    const arraySections = [
      data.additionalDrivers,
      data.vehicles,
      data.deductibles,
      data.lienholders,
      data.accidentsOrTickets,
    ] as const

    for (const arr of arraySections) {
      for (const item of arr) {
        const stats = extractFieldStats(item)
        totalFields += stats.total
        completedFields += stats.completed
        lowConfidenceFields += stats.lowConfidence
        flaggedFields += stats.flagged
      }
    }

    return {
      total: totalFields,
      completed: completedFields,
      lowConfidence: lowConfidenceFields,
      flagged: flaggedFields,
      completionPercentage:
        totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0,
    }
  }, [data])

  // Get vehicle options for dropdowns
  const vehicleOptions = useMemo(() => {
    return data.vehicles.map((vehicle, index) => getVehicleDisplayName(vehicle, index))
  }, [data.vehicles])

  // Get driver options for dropdowns
  const driverOptions = useMemo(() => {
    const options: string[] = []

    const ownerName = [data.personal.ownerFirstName.value, data.personal.ownerLastName.value]
      .filter(Boolean)
      .join(' ')
    options.push(ownerName || 'Owner')

    const spouseName = [data.personal.spouseFirstName.value, data.personal.spouseLastName.value]
      .filter(Boolean)
      .join(' ')
    if (spouseName) {
      options.push(`${spouseName} (Spouse)`)
    }

    data.additionalDrivers.forEach((driver, index) => {
      const name = [driver.firstName.value, driver.lastName.value].filter(Boolean).join(' ')
      options.push(name || `Additional Driver ${index + 1}`)
    })

    return options
  }, [data.personal, data.additionalDrivers])

  // Boolean field keys for personal section
  const personalBooleanFields: (keyof AutoPersonalInfo)[] = [
    'rideShare',
    'delivery',
    'garagingAddressSameAsMailing',
  ]

  // Handle personal field changes
  const handlePersonalChange = useCallback(
    (fieldKey: keyof AutoPersonalInfo, value: string) => {
      setData((prev) => {
        const field = prev.personal[fieldKey]
        // Handle boolean fields
        const isBooleanField = personalBooleanFields.includes(fieldKey)
        if (isBooleanField || ('value' in field && typeof (field as ExtractionBooleanField).value === 'boolean')) {
          return {
            ...prev,
            personal: {
              ...prev.personal,
              [fieldKey]: {
                ...field,
                value: value === 'Yes' ? true : value === 'No' ? false : null,
                confidence: 'high' as const,
                flagged: false,
              },
            },
          }
        }
        return {
          ...prev,
          personal: {
            ...prev.personal,
            [fieldKey]: {
              ...field,
              value,
              confidence: 'high' as const,
              flagged: false,
            },
          },
        }
      })
      setHasChanges(true)
    },
    []
  )

  // Boolean field keys for coverage section
  const coverageBooleanFields: (keyof AutoCoverageInfo)[] = [
    'towing',
    'rental',
    'offRoadVehicleLiability',
  ]

  // Handle coverage field changes
  const handleCoverageChange = useCallback((fieldKey: keyof AutoCoverageInfo, value: string) => {
    setData((prev) => {
      const field = prev.coverage[fieldKey]
      // Handle boolean fields (towing, rental, offRoadVehicleLiability)
      if (coverageBooleanFields.includes(fieldKey)) {
        return {
          ...prev,
          coverage: {
            ...prev.coverage,
            [fieldKey]: {
              ...field,
              value: value === 'Yes' ? true : value === 'No' ? false : null,
              confidence: 'high' as const,
              flagged: false,
            },
          },
        }
      }
      return {
        ...prev,
        coverage: {
          ...prev.coverage,
          [fieldKey]: {
            ...field,
            value,
            confidence: 'high' as const,
            flagged: false,
          },
        },
      }
    })
    setHasChanges(true)
  }, [])

  // Handle prior insurance field changes
  const handlePriorInsuranceChange = useCallback(
    (fieldKey: keyof AutoPriorInsurance, value: string) => {
      setData((prev) => ({
        ...prev,
        priorInsurance: {
          ...prev.priorInsurance,
          [fieldKey]: {
            ...prev.priorInsurance[fieldKey],
            value,
            confidence: 'high' as const,
            flagged: false,
          },
        },
      }))
      setHasChanges(true)
    },
    []
  )

  // Array handlers
  const handleAddDriver = useCallback(() => {
    setData((prev) => ({
      ...prev,
      additionalDrivers: [...prev.additionalDrivers, createEmptyAutoDriver()],
    }))
    setHasChanges(true)
  }, [])

  const handleRemoveDriver = useCallback((index: number) => {
    setData((prev) => ({
      ...prev,
      additionalDrivers: prev.additionalDrivers.filter((_, i) => i !== index),
    }))
    setHasChanges(true)
  }, [])

  const handleDriverFieldChange = useCallback(
    (index: number, fieldKey: keyof AutoAdditionalDriver, value: string) => {
      setData((prev) => ({
        ...prev,
        additionalDrivers: prev.additionalDrivers.map((driver, i) => {
          if (i !== index) return driver
          const field = driver[fieldKey]
          // Handle boolean field (goodStudentDiscount)
          if (fieldKey === 'goodStudentDiscount') {
            return {
              ...driver,
              [fieldKey]: {
                ...field,
                value: value === 'Yes' ? true : value === 'No' ? false : null,
                confidence: 'high' as const,
                flagged: false,
              },
            }
          }
          return {
            ...driver,
            [fieldKey]: {
              ...field,
              value,
              confidence: 'high' as const,
              flagged: false,
            },
          }
        }),
      }))
      setHasChanges(true)
    },
    []
  )

  const handleAddVehicle = useCallback(() => {
    setData((prev) => ({
      ...prev,
      vehicles: [...prev.vehicles, createEmptyAutoVehicle()],
    }))
    setHasChanges(true)
  }, [])

  const handleRemoveVehicle = useCallback((index: number) => {
    setData((prev) => ({
      ...prev,
      vehicles: prev.vehicles.filter((_, i) => i !== index),
    }))
    setHasChanges(true)
  }, [])

  const handleVehicleFieldChange = useCallback(
    (index: number, fieldKey: keyof AutoVehicle, value: string) => {
      setData((prev) => ({
        ...prev,
        vehicles: prev.vehicles.map((vehicle, i) => {
          if (i !== index) return vehicle
          return {
            ...vehicle,
            [fieldKey]: {
              ...vehicle[fieldKey],
              value,
              confidence: 'high' as const,
              flagged: false,
            },
          }
        }),
      }))
      setHasChanges(true)
    },
    []
  )

  const handleAddDeductible = useCallback(() => {
    setData((prev) => ({
      ...prev,
      deductibles: [...prev.deductibles, createEmptyAutoDeductible()],
    }))
    setHasChanges(true)
  }, [])

  const handleRemoveDeductible = useCallback((index: number) => {
    setData((prev) => ({
      ...prev,
      deductibles: prev.deductibles.filter((_, i) => i !== index),
    }))
    setHasChanges(true)
  }, [])

  const handleDeductibleFieldChange = useCallback(
    (index: number, fieldKey: keyof AutoVehicleDeductible, value: string) => {
      setData((prev) => ({
        ...prev,
        deductibles: prev.deductibles.map((ded, i) => {
          if (i !== index) return ded
          const field = ded[fieldKey]
          // Handle boolean field (limitedTNCCoverage)
          if (fieldKey === 'limitedTNCCoverage') {
            return {
              ...ded,
              [fieldKey]: {
                ...field,
                value: value === 'Yes' ? true : value === 'No' ? false : null,
                confidence: 'high' as const,
                flagged: false,
              },
            }
          }
          return {
            ...ded,
            [fieldKey]: {
              ...field,
              value,
              confidence: 'high' as const,
              flagged: false,
            },
          }
        }),
      }))
      setHasChanges(true)
    },
    []
  )

  const handleAddLienholder = useCallback(() => {
    setData((prev) => ({
      ...prev,
      lienholders: [...prev.lienholders, createEmptyAutoLienholder()],
    }))
    setHasChanges(true)
  }, [])

  const handleRemoveLienholder = useCallback((index: number) => {
    setData((prev) => ({
      ...prev,
      lienholders: prev.lienholders.filter((_, i) => i !== index),
    }))
    setHasChanges(true)
  }, [])

  const handleLienholderFieldChange = useCallback(
    (index: number, fieldKey: keyof AutoVehicleLienholder, value: string) => {
      setData((prev) => ({
        ...prev,
        lienholders: prev.lienholders.map((lien, i) => {
          if (i !== index) return lien
          return {
            ...lien,
            [fieldKey]: {
              ...lien[fieldKey],
              value,
              confidence: 'high' as const,
              flagged: false,
            },
          }
        }),
      }))
      setHasChanges(true)
    },
    []
  )

  const handleAddIncident = useCallback(() => {
    setData((prev) => ({
      ...prev,
      accidentsOrTickets: [...prev.accidentsOrTickets, createEmptyAutoAccidentOrTicket()],
    }))
    setHasChanges(true)
  }, [])

  const handleRemoveIncident = useCallback((index: number) => {
    setData((prev) => ({
      ...prev,
      accidentsOrTickets: prev.accidentsOrTickets.filter((_, i) => i !== index),
    }))
    setHasChanges(true)
  }, [])

  const handleIncidentFieldChange = useCallback(
    (index: number, fieldKey: keyof AutoAccidentOrTicket, value: string) => {
      setData((prev) => ({
        ...prev,
        accidentsOrTickets: prev.accidentsOrTickets.map((incident, i) => {
          if (i !== index) return incident
          return {
            ...incident,
            [fieldKey]: {
              ...incident[fieldKey],
              value,
              confidence: 'high' as const,
              flagged: false,
            },
          }
        }),
      }))
      setHasChanges(true)
    },
    []
  )

  // Save handler
  const handleSave = async () => {
    if (!onSave) return

    setIsSaving(true)
    try {
      await onSave(data)
      setHasChanges(false)
      toast.success('Changes saved successfully')
    } catch {
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  // Vehicle validation
  const validateVehicleItem = useCallback(
    (vehicle: AutoVehicle): { isValid: boolean; errors: Record<string, string> } => {
      const errors: Record<string, string> = {}

      if (vehicle.vin.value) {
        const vinValidation = validateVIN(vehicle.vin.value)
        if (!vinValidation.isValid) {
          errors.vin = vinValidation.message || 'Invalid VIN'
        }
      }

      return { isValid: Object.keys(errors).length === 0, errors }
    },
    []
  )

  // Render field helper using memoized component
  const renderField = useCallback(
    (
      field: ExtractionField | ExtractionBooleanField,
      fieldKey: string,
      config: AutoFieldConfig,
      onChange: (value: string) => void
    ) => (
      <AutoFieldRenderer
        key={fieldKey}
        field={field}
        fieldKey={fieldKey}
        config={config}
        onChange={onChange}
      />
    ),
    []
  )

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header with save button and overall stats */}
      <div className="p-6 bg-card border rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Car className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Auto Insurance Extraction</h2>
                <p className="text-sm text-muted-foreground">Review and verify extracted data</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {formStats.completed} of {formStats.total} fields completed
                </span>
                <span className="font-medium text-foreground">{formStats.completionPercentage}%</span>
              </div>
              <Progress value={formStats.completionPercentage} className="h-2" />
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-2">
              {formStats.flagged > 0 && (
                <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                  <AlertTriangle className="w-3 h-3 mr-1.5" />
                  {formStats.flagged} flagged
                </Badge>
              )}
              {formStats.lowConfidence > 0 && (
                <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
                  <AlertTriangle className="w-3 h-3 mr-1.5" />
                  {formStats.lowConfidence} to review
                </Badge>
              )}
              {formStats.flagged === 0 &&
                formStats.lowConfidence === 0 &&
                formStats.completed > 0 && (
                  <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                    <CheckCircle2 className="w-3 h-3 mr-1.5" />
                    All fields verified
                  </Badge>
                )}
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            size="lg"
            className="shrink-0"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Form Sections */}
      <div className="space-y-6">
        {/* 1. Personal Information */}
        <FormSection
          title="Personal Information"
          description="Policy details, owner/spouse info, addresses, and driving information"
          icon={AUTO_SECTION_ICONS.personal}
          defaultOpen={true}
          stats={extractFieldStats(data.personal)}
        >
          <div className="space-y-8">
            {/* Policy Effective Date */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium text-muted-foreground">Policy Effective Date</h4>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {renderField(
                  data.personal.effectiveDate,
                  'personal-effectiveDate',
                  AUTO_PERSONAL_FIELDS.effectiveDate,
                  (value) => handlePersonalChange('effectiveDate', value)
                )}
              </div>
            </div>

            {/* Owner Info */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-4">Owner Information</h4>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {(['ownerFirstName', 'ownerLastName', 'ownerDOB', 'maritalStatus', 'ownerDriversLicense', 'ownerLicenseState', 'ownerOccupation', 'ownerEducation'] as (keyof AutoPersonalInfo)[]).map((key) =>
                  renderField(
                    data.personal[key],
                    `personal-${key}`,
                    AUTO_PERSONAL_FIELDS[key],
                    (value) => handlePersonalChange(key, value)
                  )
                )}
              </div>
            </div>

            {/* Spouse Info - Conditional: Only show if married or domestic partner */}
            {(data.personal.maritalStatus.value === 'Married' || data.personal.maritalStatus.value === 'Domestic Partner') && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Spouse/Partner Information</h4>
                  <Badge variant="outline" className="text-xs">
                    Required for {data.personal.maritalStatus.value}
                  </Badge>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {(['spouseFirstName', 'spouseLastName', 'spouseDOB', 'spouseDriversLicense', 'spouseLicenseState', 'spouseOccupation', 'spouseEducation'] as (keyof AutoPersonalInfo)[]).map((key) =>
                    renderField(
                      data.personal[key],
                      `personal-${key}`,
                      AUTO_PERSONAL_FIELDS[key],
                      (value) => handlePersonalChange(key, value)
                    )
                  )}
                </div>
              </div>
            )}

            {/* Mailing Address */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium text-muted-foreground">Mailing Address</h4>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {(['streetAddress', 'city', 'state', 'zipCode', 'yearsAtCurrentAddress'] as (keyof AutoPersonalInfo)[]).map((key) =>
                  renderField(
                    data.personal[key],
                    `personal-${key}`,
                    AUTO_PERSONAL_FIELDS[key],
                    (value) => handlePersonalChange(key, value)
                  )
                )}
              </div>
            </div>

            {/* Garaging Address - Conditional section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Car className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium text-muted-foreground">Garaging Address</h4>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-4">
                {renderField(
                  data.personal.garagingAddressSameAsMailing,
                  'personal-garagingAddressSameAsMailing',
                  AUTO_PERSONAL_FIELDS.garagingAddressSameAsMailing,
                  (value) => handlePersonalChange('garagingAddressSameAsMailing', value)
                )}
              </div>
              {/* Show garaging address fields only if not same as mailing */}
              {data.personal.garagingAddressSameAsMailing.value === false && (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-4 border-t border-dashed">
                  {(['garagingStreetAddress', 'garagingCity', 'garagingState', 'garagingZipCode'] as (keyof AutoPersonalInfo)[]).map((key) =>
                    renderField(
                      data.personal[key],
                      `personal-${key}`,
                      AUTO_PERSONAL_FIELDS[key],
                      (value) => handlePersonalChange(key, value)
                    )
                  )}
                </div>
              )}
            </div>

            {/* Prior Address - Conditional with visual indicator */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h4 className="text-sm font-medium text-muted-foreground">Prior Address</h4>
                {/* Show warning indicator when years at current < 5 */}
                {data.personal.yearsAtCurrentAddress.value &&
                 parseInt(data.personal.yearsAtCurrentAddress.value) < 5 && (
                  <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 text-xs">
                    <Info className="w-3 h-3 mr-1" />
                    Required: Less than 5 years at current
                  </Badge>
                )}
                {(!data.personal.yearsAtCurrentAddress.value ||
                  parseInt(data.personal.yearsAtCurrentAddress.value) >= 5) && (
                  <span className="text-xs text-muted-foreground">
                    (Required if less than 5 years at current address)
                  </span>
                )}
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {(['priorStreetAddress', 'priorCity', 'priorState', 'priorZipCode'] as (keyof AutoPersonalInfo)[]).map((key) =>
                  renderField(
                    data.personal[key],
                    `personal-${key}`,
                    AUTO_PERSONAL_FIELDS[key],
                    (value) => handlePersonalChange(key, value)
                  )
                )}
              </div>
            </div>

            {/* Contact & Driving */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-4">Contact & Driving Information</h4>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {(['phone', 'email', 'rideShare', 'delivery'] as (keyof AutoPersonalInfo)[]).map((key) =>
                  renderField(
                    data.personal[key],
                    `personal-${key}`,
                    AUTO_PERSONAL_FIELDS[key],
                    (value) => handlePersonalChange(key, value)
                  )
                )}
              </div>
            </div>
          </div>
        </FormSection>

        {/* 2. Additional Drivers */}
        <FormSection
          title="Additional Drivers"
          description="Other household drivers to be covered"
          icon={AUTO_SECTION_ICONS.drivers}
          defaultOpen={data.additionalDrivers.length > 0}
          stats={{
            total: data.additionalDrivers.length * Object.keys(AUTO_DRIVER_FIELDS).length,
            completed: data.additionalDrivers.reduce((acc, d) => acc + Object.values(d).filter(f => f.value !== null && f.value !== '').length, 0),
            lowConfidence: 0,
            flagged: data.additionalDrivers.reduce((acc, d) => acc + Object.values(d).filter(f => f.flagged).length, 0),
          }}
        >
          <div className="space-y-6">
            {data.additionalDrivers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-lg bg-muted/30">
                <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-4">No additional drivers. Add any household members who will be driving.</p>
                <Button onClick={handleAddDriver} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Driver
                </Button>
              </div>
            ) : (
              <>
                {data.additionalDrivers.map((driver, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium">
                          {[driver.firstName.value, driver.lastName.value].filter(Boolean).join(' ') || `Driver ${index + 1}`}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDriver(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {(Object.entries(AUTO_DRIVER_FIELDS) as [keyof AutoAdditionalDriver, AutoFieldConfig][]).map(([key, config]) => {
                          // For vehicle assigned, use dynamic options
                          const options = key === 'vehicleAssigned' ? vehicleOptions : config.options
                          return renderField(
                            driver[key],
                            `driver-${index}-${key}`,
                            { ...config, options },
                            (value) => handleDriverFieldChange(index, key, value)
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button onClick={handleAddDriver} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Driver
                </Button>
              </>
            )}
          </div>
        </FormSection>

        {/* 3. Vehicles/Automobiles */}
        <FormSection
          title="Automobiles"
          description="Vehicle information and usage"
          icon={AUTO_SECTION_ICONS.vehicles}
          defaultOpen={true}
          stats={{
            total: data.vehicles.length * Object.keys(AUTO_VEHICLE_FIELDS).length,
            completed: data.vehicles.reduce((acc, v) => acc + Object.values(v).filter(f => f.value !== null && f.value !== '').length, 0),
            lowConfidence: 0,
            flagged: data.vehicles.reduce((acc, v) => acc + Object.values(v).filter(f => f.flagged).length, 0),
          }}
        >
          <div className="space-y-6">
            {data.vehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-lg bg-muted/30">
                <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-4">At least one vehicle is required.</p>
                <Button onClick={handleAddVehicle} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Vehicle
                </Button>
              </div>
            ) : (
              <>
                {data.vehicles.map((vehicle, index) => {
                  const validation = validateVehicleItem(vehicle)
                  return (
                    <Card key={index} className={cn(!validation.isValid && 'border-orange-300')}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-medium">
                            {getVehicleDisplayName(vehicle, index)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveVehicle(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            disabled={data.vehicles.length <= 1}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                          {(Object.entries(AUTO_VEHICLE_FIELDS) as [keyof AutoVehicle, AutoFieldConfig][]).map(([key, config]) =>
                            renderField(
                              vehicle[key],
                              `vehicle-${index}-${key}`,
                              config,
                              (value) => handleVehicleFieldChange(index, key, value)
                            )
                          )}
                        </div>
                        {!validation.isValid && (
                          <div className="mt-3 pt-3 border-t">
                            {Object.entries(validation.errors).map(([field, error]) => (
                              <p key={field} className="text-xs text-red-600">{error}</p>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
                <Button onClick={handleAddVehicle} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Vehicle
                </Button>
              </>
            )}
          </div>
        </FormSection>

        {/* 4. Coverage Options */}
        <FormSection
          title="Coverage Options"
          description="Liability limits and additional coverage"
          icon={AUTO_SECTION_ICONS.coverage}
          defaultOpen={true}
          stats={extractFieldStats(data.coverage)}
        >
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.entries(AUTO_COVERAGE_FIELDS) as [keyof AutoCoverageInfo, AutoFieldConfig][]).map(([key, config]) =>
              renderField(
                data.coverage[key],
                `coverage-${key}`,
                config,
                (value) => handleCoverageChange(key, value)
              )
            )}
          </div>
        </FormSection>

        {/* 5. Deductibles by Vehicle */}
        <FormSection
          title="Deductibles by Vehicle"
          description="Comprehensive and collision deductibles for each vehicle"
          icon={AUTO_SECTION_ICONS.deductibles}
          defaultOpen={data.deductibles.length > 0}
          stats={{
            total: data.deductibles.length * Object.keys(AUTO_DEDUCTIBLE_FIELDS).length,
            completed: data.deductibles.reduce((acc, d) => acc + Object.values(d).filter(f => f.value !== null && f.value !== '').length, 0),
            lowConfidence: 0,
            flagged: data.deductibles.reduce((acc, d) => acc + Object.values(d).filter(f => f.flagged).length, 0),
          }}
        >
          <div className="space-y-6">
            {data.deductibles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-lg bg-muted/30">
                <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-4">Add deductibles for each vehicle needing comprehensive or collision coverage.</p>
                <Button onClick={handleAddDeductible} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Deductible
                </Button>
              </div>
            ) : (
              <>
                {data.deductibles.map((deductible, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium">
                          {deductible.vehicleReference.value || `Deductible ${index + 1}`}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDeductible(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                      <div className="grid gap-6 sm:grid-cols-3">
                        {(Object.entries(AUTO_DEDUCTIBLE_FIELDS) as [keyof AutoVehicleDeductible, AutoFieldConfig][]).map(([key, config]) => {
                          const options = key === 'vehicleReference' ? vehicleOptions : config.options
                          return renderField(
                            deductible[key],
                            `deductible-${index}-${key}`,
                            { ...config, options },
                            (value) => handleDeductibleFieldChange(index, key, value)
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button onClick={handleAddDeductible} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Deductible
                </Button>
              </>
            )}
          </div>
        </FormSection>

        {/* 6. Lienholder Information */}
        <FormSection
          title="Lienholder Information"
          description="Finance or lease company details by vehicle"
          icon={AUTO_SECTION_ICONS.lienholders}
          defaultOpen={data.lienholders.length > 0}
          stats={{
            total: data.lienholders.length * Object.keys(AUTO_LIENHOLDER_FIELDS).length,
            completed: data.lienholders.reduce((acc, l) => acc + Object.values(l).filter(f => f.value !== null && f.value !== '').length, 0),
            lowConfidence: 0,
            flagged: data.lienholders.reduce((acc, l) => acc + Object.values(l).filter(f => f.flagged).length, 0),
          }}
        >
          <div className="space-y-6">
            {data.lienholders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-lg bg-muted/30">
                <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-4">Add lienholder information for financed or leased vehicles.</p>
                <Button onClick={handleAddLienholder} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Lienholder
                </Button>
              </div>
            ) : (
              <>
                {data.lienholders.map((lienholder, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium">
                          {lienholder.lienholderName.value || `Lienholder ${index + 1}`}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLienholder(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {(Object.entries(AUTO_LIENHOLDER_FIELDS) as [keyof AutoVehicleLienholder, AutoFieldConfig][]).map(([key, config]) => {
                          const options = key === 'vehicleReference' ? vehicleOptions : config.options
                          return renderField(
                            lienholder[key],
                            `lienholder-${index}-${key}`,
                            { ...config, options },
                            (value) => handleLienholderFieldChange(index, key, value)
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button onClick={handleAddLienholder} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Lienholder
                </Button>
              </>
            )}
          </div>
        </FormSection>

        {/* 7. Prior Insurance */}
        <FormSection
          title="Prior Insurance"
          description="Current or previous insurance policy information"
          icon={AUTO_SECTION_ICONS.priorInsurance}
          defaultOpen={false}
          stats={extractFieldStats(data.priorInsurance)}
        >
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.entries(AUTO_PRIOR_INSURANCE_FIELDS) as [keyof AutoPriorInsurance, AutoFieldConfig][]).map(([key, config]) =>
              renderField(
                data.priorInsurance[key],
                `priorInsurance-${key}`,
                config,
                (value) => handlePriorInsuranceChange(key, value)
              )
            )}
          </div>
        </FormSection>

        {/* 8. Accidents or Tickets */}
        <FormSection
          title="Accidents or Tickets"
          description="Incidents in the last 5 years"
          icon={AUTO_SECTION_ICONS.incidents}
          defaultOpen={data.accidentsOrTickets.length > 0}
          stats={{
            total: data.accidentsOrTickets.length * Object.keys(AUTO_ACCIDENT_TICKET_FIELDS).length,
            completed: data.accidentsOrTickets.reduce((acc, i) => acc + Object.values(i).filter(f => f.value !== null && f.value !== '').length, 0),
            lowConfidence: 0,
            flagged: data.accidentsOrTickets.reduce((acc, i) => acc + Object.values(i).filter(f => f.flagged).length, 0),
          }}
        >
          <div className="space-y-6">
            {data.accidentsOrTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-lg bg-muted/30">
                <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-4">No accidents or tickets in the last 5 years.</p>
                <Button onClick={handleAddIncident} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Incident
                </Button>
              </div>
            ) : (
              <>
                {data.accidentsOrTickets.map((incident, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium">
                          {incident.type.value ? `${incident.type.value} - ${incident.date.value || 'Date unknown'}` : `Incident ${index + 1}`}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveIncident(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {(Object.entries(AUTO_ACCIDENT_TICKET_FIELDS) as [keyof AutoAccidentOrTicket, AutoFieldConfig][]).map(([key, config]) => {
                          const options = key === 'driverName' ? driverOptions : config.options
                          return renderField(
                            incident[key],
                            `incident-${index}-${key}`,
                            { ...config, options },
                            (value) => handleIncidentFieldChange(index, key, value)
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button onClick={handleAddIncident} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Incident
                </Button>
              </>
            )}
          </div>
        </FormSection>
      </div>

      {/* Bottom save button for long forms */}
      <div className="flex justify-end pt-6 border-t mt-8">
        <Button onClick={handleSave} disabled={!hasChanges || isSaving} size="lg">
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save All Changes
        </Button>
      </div>
    </div>
  )
}
