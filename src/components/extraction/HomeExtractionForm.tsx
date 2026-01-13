'use client'

import { useState, useCallback, useMemo } from 'react'
import { ExtractionField } from '@/types/extraction'
import {
  HomeExtractionResult,
  HomeExtractionPersonal,
  HomeExtractionProperty,
  HomeExtractionOccupancy,
  HomeExtractionSafetyRisk,
  HomeExtractionCoverage,
  HomeExtractionInsuranceDetails,
  HomeExtractionUpdates,
  HomeExtractionClaim,
  HomeExtractionScheduledItems,
  HOME_PERSONAL_FIELDS,
  HOME_PROPERTY_FIELDS,
  HOME_OCCUPANCY_FIELDS,
  HOME_SAFETY_RISK_FIELDS,
  HOME_COVERAGE_FIELDS,
  HOME_INSURANCE_DETAILS_FIELDS,
  HOME_UPDATES_FIELDS,
  HOME_SECTIONS,
  HomeFieldConfig,
} from '@/types/home-extraction'
import { FieldEditor } from './FieldEditor'
import { FormSection, calculateSectionStats } from './FormSection'
import { ClaimsEditor } from './ClaimsEditor'
import { ScheduledItemsEditor } from './ScheduledItemsEditor'
import { AutoSaveIndicator } from './AutoSaveIndicator'
import { useAutoSave } from '@/hooks/use-auto-save'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  User,
  Home,
  Shield,
  FileCheck,
  Gem,
  ClipboardList,
  Building2,
  Wrench,
  KeyRound,
  Info,
  LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Section icon mapping
const SECTION_ICONS: Record<string, LucideIcon> = {
  personal: User,
  property: Home,
  occupancy: KeyRound,
  safetyRisk: Shield,
  coverage: FileCheck,
  scheduledItems: Gem,
  claimsHistory: ClipboardList,
  insuranceDetails: Building2,
  updates: Wrench,
}

interface HomeExtractionFormProps {
  extractionId: string
  initialData: HomeExtractionResult
  onSave?: (data: HomeExtractionResult) => Promise<void>
  className?: string
}

// Type guard to check if a section has standard fields (not claims or scheduled items)
type StandardSectionKey = Exclude<keyof HomeExtractionResult, 'claimsHistory' | 'scheduledItems'>
type StandardSectionData =
  | HomeExtractionPersonal
  | HomeExtractionProperty
  | HomeExtractionOccupancy
  | HomeExtractionSafetyRisk
  | HomeExtractionCoverage
  | HomeExtractionInsuranceDetails
  | HomeExtractionUpdates

// Field config map by section
const FIELD_CONFIG_MAP: Partial<Record<keyof HomeExtractionResult, Record<string, HomeFieldConfig>>> = {
  personal: HOME_PERSONAL_FIELDS,
  property: HOME_PROPERTY_FIELDS,
  occupancy: HOME_OCCUPANCY_FIELDS,
  safetyRisk: HOME_SAFETY_RISK_FIELDS,
  coverage: HOME_COVERAGE_FIELDS,
  insuranceDetails: HOME_INSURANCE_DETAILS_FIELDS,
  updates: HOME_UPDATES_FIELDS,
}

// Fields that should only show when coApplicantPresent is "Yes"
const SPOUSE_FIELDS = ['spouseFirstName', 'spouseLastName', 'spouseDOB', 'spouseSSN']

// Fields related to prior address (only show when yearsAtCurrentAddress < 5)
const PRIOR_ADDRESS_FIELDS = ['priorAddress', 'priorCity', 'priorState', 'priorZipCode', 'yearsAtPriorAddress']

export function HomeExtractionForm({
  extractionId: _extractionId,
  initialData,
  onSave,
  className,
}: HomeExtractionFormProps) {
  const [data, setData] = useState<HomeExtractionResult>(initialData)

  // Auto-save hook - handles debouncing and status tracking
  const {
    status: autoSaveStatus,
    lastSavedAt,
    error: autoSaveError,
    saveNow,
    resetStatus,
  } = useAutoSave({
    data,
    onSave: onSave || (async () => {}),
    debounceMs: 1500,
    enabled: !!onSave,
    onSaveSuccess: () => {
      toast.success('Changes saved', { duration: 2000 })
    },
    onSaveError: () => {
      toast.error('Failed to save changes')
    },
  })

  // Derive isSaving and hasChanges from auto-save status for backward compatibility
  const isSaving = autoSaveStatus === 'saving'
  const hasChanges = autoSaveStatus === 'pending' || autoSaveStatus === 'error'

  // Calculate overall form statistics
  const formStats = useMemo(() => {
    let totalFields = 0
    let completedFields = 0
    let lowConfidenceFields = 0
    let flaggedFields = 0

    // Calculate stats for all standard sections
    const standardSections: StandardSectionKey[] = [
      'personal',
      'property',
      'occupancy',
      'safetyRisk',
      'coverage',
      'insuranceDetails',
      'updates',
    ]

    for (const sectionKey of standardSections) {
      const sectionData = data[sectionKey] as StandardSectionData
      const stats = calculateSectionStats(sectionData)
      totalFields += stats.total
      completedFields += stats.completed
      lowConfidenceFields += stats.lowConfidence
      flaggedFields += stats.flagged
    }

    // Add claims count
    totalFields += data.claimsHistory.claims.length * 4 // 4 fields per claim
    completedFields += data.claimsHistory.claims.filter(
      (c) => c.date.value && c.type.value
    ).length * 2

    // Add scheduled items count
    const scheduledItemsCount =
      data.scheduledItems.jewelry.length + data.scheduledItems.otherValuables.length
    totalFields += scheduledItemsCount * 2 // description + value per item
    completedFields +=
      data.scheduledItems.jewelry.filter(
        (j) => j.description.value && j.value.value
      ).length * 2 +
      data.scheduledItems.otherValuables.filter(
        (v) => v.description.value && v.value.value
      ).length * 2

    return {
      total: totalFields,
      completed: completedFields,
      lowConfidence: lowConfidenceFields,
      flagged: flaggedFields,
      completionPercentage:
        totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0,
    }
  }, [data])

  // Handle field change for standard sections
  const handleFieldChange = useCallback(
    (
      category: StandardSectionKey,
      field: string,
      value: string
    ) => {
      setData((prev) => {
        const categoryData = prev[category] as unknown as Record<string, ExtractionField>
        const existingField = categoryData[field]
        return {
          ...prev,
          [category]: {
            ...categoryData,
            [field]: {
              ...existingField,
              value,
              confidence: 'high' as const,
              flagged: false,
            },
          },
        }
      })
      // Auto-save detects changes automatically via data comparison
    },
    []
  )

  // Handle claims changes
  const handleClaimsChange = useCallback((claims: HomeExtractionClaim[]) => {
    setData((prev) => ({
      ...prev,
      claimsHistory: { claims },
    }))
    // Auto-save detects changes automatically
  }, [])

  // Handle scheduled items changes
  const handleScheduledItemsChange = useCallback(
    (scheduledItems: HomeExtractionScheduledItems) => {
      setData((prev) => ({
        ...prev,
        scheduledItems,
      }))
      // Auto-save detects changes automatically
    },
    []
  )

  // Manual save handler (force save, bypasses debounce)
  const handleSave = async () => {
    if (!onSave) return
    await saveNow()
  }

  // Check if spouse fields should be visible
  const showSpouseFields = data.personal.coApplicantPresent.value === 'Yes'

  // Check if dog breed field should be visible
  const showDogBreed = data.safetyRisk.dog.value === 'Yes'

  // Check if days rented field should be visible (short-term rental)
  const showDaysRented = data.occupancy.shortTermRental.value === 'Yes'

  // Check if prior address fields should be shown (only when < 5 years at current address)
  const shouldShowPriorAddress = useMemo(() => {
    const yearsStr = data.personal.yearsAtCurrentAddress?.value
    if (!yearsStr) return false // Don't show if no value entered yet
    const years = parseFloat(yearsStr)
    return !isNaN(years) && years < 5
  }, [data.personal.yearsAtCurrentAddress?.value])

  // Helper to check if a field should be visible based on conditional logic
  const isFieldVisible = (sectionKey: string, fieldKey: string): boolean => {
    // Personal section: spouse fields conditional on coApplicantPresent
    if (sectionKey === 'personal' && SPOUSE_FIELDS.includes(fieldKey)) {
      return showSpouseFields
    }

    // Personal section: prior address fields only show when yearsAtCurrentAddress < 5
    if (sectionKey === 'personal' && PRIOR_ADDRESS_FIELDS.includes(fieldKey)) {
      return shouldShowPriorAddress
    }

    // Safety section: dogBreed conditional on dog
    if (sectionKey === 'safetyRisk' && fieldKey === 'dogBreed') {
      return showDogBreed
    }

    // Occupancy section: daysRentedToOthers conditional on shortTermRental
    if (sectionKey === 'occupancy' && fieldKey === 'daysRentedToOthers') {
      return showDaysRented
    }

    return true
  }

  // Helper to check if prior address hint should show
  const shouldShowPriorAddressHint = (sectionKey: string, fieldKey: string): boolean => {
    return sectionKey === 'personal' && PRIOR_ADDRESS_FIELDS.includes(fieldKey) && shouldShowPriorAddress
  }

  // Render fields for a standard section with conditional logic
  const renderSectionFields = (sectionKey: StandardSectionKey) => {
    const sectionData = data[sectionKey] as StandardSectionData
    const fieldConfig = FIELD_CONFIG_MAP[sectionKey]

    if (!fieldConfig) return null

    // Filter visible fields
    const visibleFields = Object.entries(fieldConfig).filter(([fieldKey]) =>
      isFieldVisible(sectionKey, fieldKey)
    )

    // Check if we need to show the prior address info alert (only when fields are visible)
    const showPriorAddressAlert = sectionKey === 'personal' && shouldShowPriorAddress

    return (
      <div className="space-y-6">
        {/* Prior address requirement alert */}
        {showPriorAddressAlert && (
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Prior address information is required when the applicant has been at the current address for less than 5 years.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleFields.map(([fieldKey, config]) => {
            const field = sectionData[fieldKey as keyof typeof sectionData] as ExtractionField
            const showHint = shouldShowPriorAddressHint(sectionKey, fieldKey)

            return (
              <div key={`${sectionKey}-${fieldKey}`} className="relative">
                <FieldEditor
                  field={field}
                  label={config.label}
                  fieldKey={`${sectionKey}-${fieldKey}`}
                  type={config.inputType}
                  required={config.required || showHint}
                  options={config.options}
                  placeholder={config.placeholder}
                  onChange={(value) =>
                    handleFieldChange(sectionKey, fieldKey, value)
                  }
                />
                {showHint && !field.value && (
                  <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Required - less than 5 years at current address
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Get section stats for a standard section
  const getSectionStats = (sectionKey: StandardSectionKey) => {
    const sectionData = data[sectionKey] as StandardSectionData
    return calculateSectionStats(sectionData)
  }

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header with auto-save indicator and overall stats */}
      <div className="p-6 bg-card border rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Home Insurance Extraction</h2>
                  <p className="text-sm text-muted-foreground">Review and verify extracted data</p>
                </div>
              </div>
              {/* Auto-save status indicator */}
              <AutoSaveIndicator
                status={autoSaveStatus}
                lastSavedAt={lastSavedAt}
                error={autoSaveError}
                onRetry={saveNow}
                onDismiss={resetStatus}
              />
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
              {formStats.flagged === 0 && formStats.lowConfidence === 0 && formStats.completed > 0 && (
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                  <CheckCircle2 className="w-3 h-3 mr-1.5" />
                  All fields verified
                </Badge>
              )}
            </div>
          </div>

          {/* Force save button - useful when user wants to save immediately */}
          {hasChanges && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Now
            </Button>
          )}
        </div>
      </div>

      {/* Form Sections */}
      <div className="space-y-6">
        {HOME_SECTIONS.map((section) => {
          const SectionIcon = SECTION_ICONS[section.key]

          if (section.key === 'claimsHistory') {
            // Special handling for claims section
            return (
              <FormSection
                key={section.key}
                title={section.title}
                description={section.description}
                icon={SectionIcon}
                defaultOpen={data.claimsHistory.claims.length > 0}
                stats={{
                  total: data.claimsHistory.claims.length,
                  completed: data.claimsHistory.claims.filter(
                    (c) => c.date.value && c.type.value
                  ).length,
                  lowConfidence: 0,
                  flagged: data.claimsHistory.claims.filter((c) =>
                    Object.values(c).some((f) => f.flagged)
                  ).length,
                }}
              >
                <ClaimsEditor
                  claims={data.claimsHistory.claims}
                  onChange={handleClaimsChange}
                />
              </FormSection>
            )
          }

          if (section.key === 'scheduledItems') {
            // Special handling for scheduled items section
            return (
              <ScheduledItemsEditor
                key={section.key}
                scheduledItems={data.scheduledItems}
                onChange={handleScheduledItemsChange}
              />
            )
          }

          // Standard section rendering
          const sectionKey = section.key as StandardSectionKey
          return (
            <FormSection
              key={section.key}
              title={section.title}
              description={section.description}
              icon={SectionIcon}
              defaultOpen={true}
              stats={getSectionStats(sectionKey)}
            >
              {renderSectionFields(sectionKey)}
            </FormSection>
          )
        })}
      </div>

      {/* Bottom status and save button for long forms */}
      <div className="flex items-center justify-between pt-6 border-t mt-8">
        <AutoSaveIndicator
          status={autoSaveStatus}
          lastSavedAt={lastSavedAt}
          error={autoSaveError}
          onRetry={saveNow}
          onDismiss={resetStatus}
        />
        {hasChanges && (
          <Button onClick={handleSave} disabled={isSaving} variant="outline">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Now
          </Button>
        )}
      </div>
    </div>
  )
}
