'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ValidationSummary, RequiredFieldsAlert } from '@/components/quote'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Loader2,
  Send,
  Car,
  Users,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  User,
  Home,
  FileText,
  Shield,
  Edit2,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  transformExtractionToValidation,
  updateFieldInValidation,
  detectExtractionType,
  extractVehicles,
  extractDrivers,
  type ExtractedDataType,
} from '@/lib/quote/validation'
import type { HomeExtractionResult } from '@/types/home-extraction'
import type { AutoExtractionResult } from '@/types/auto-extraction'
import type { ExtractionResult, CombinedExtractionData } from '@/types/extraction'
import type { CombinedUiExtractionData } from '@/types/database'
import type { QuoteType, UIValidationResult, UIFieldValidation } from '@/types/quote'

// Union type for all possible extraction data formats
type ExtractedData = HomeExtractionResult | AutoExtractionResult | ExtractionResult | CombinedExtractionData | CombinedUiExtractionData

interface QuotePreviewClientProps {
  extractionId: string
  extractedData: ExtractedData
  quoteType: QuoteType
  storagePath: string
  supabaseUrl: string
}

// Category configuration for section display
// Keys must match the category values in field definitions (validation.ts)
const categoryConfig: Record<string, { icon: React.ElementType; label: string; order: number }> = {
  // Home categories
  'Personal Information': { icon: User, label: 'Personal Information', order: 1 },
  'Property Information': { icon: Home, label: 'Property Information', order: 2 },
  'Occupancy Information': { icon: Home, label: 'Occupancy & Use', order: 3 },
  'Safety Information': { icon: Shield, label: 'Safety & Risk', order: 4 },
  'Coverage Information': { icon: Shield, label: 'Coverage Details', order: 5 },
  'Insurance Information': { icon: FileText, label: 'Insurance Details', order: 6 },
  'Updates Information': { icon: FileText, label: 'Home Updates', order: 7 },
  'Claims Information': { icon: FileText, label: 'Claims History', order: 8 },
  'Scheduled Items': { icon: FileText, label: 'Scheduled Items', order: 9 },
  // Auto categories
  'Vehicle Information': { icon: Car, label: 'Vehicle Information', order: 10 },
  'Driver Information': { icon: Users, label: 'Driver Information', order: 11 },
  'Deductible Information': { icon: Shield, label: 'Deductibles', order: 12 },
  'Lienholder Information': { icon: FileText, label: 'Lienholder Details', order: 13 },
  'Prior Insurance': { icon: FileText, label: 'Prior Insurance', order: 14 },
  'Accidents/Tickets': { icon: FileText, label: 'Accidents & Tickets', order: 15 },
  // Legacy/fallback categories (lowercase for backward compatibility)
  personal: { icon: User, label: 'Personal Information', order: 1 },
  address: { icon: Home, label: 'Address Details', order: 2 },
  property: { icon: Home, label: 'Property Information', order: 3 },
  coverage: { icon: Shield, label: 'Coverage Details', order: 5 },
  vehicle: { icon: Car, label: 'Vehicle Information', order: 10 },
  driver: { icon: Users, label: 'Driver Information', order: 11 },
  other: { icon: FileText, label: 'Additional Information', order: 99 },
}

// Group fields by category
function groupFieldsByCategory(fields: UIFieldValidation[]): Map<string, UIFieldValidation[]> {
  const grouped = new Map<string, UIFieldValidation[]>()

  fields.forEach(field => {
    const category = field.category || 'other'
    if (!grouped.has(category)) {
      grouped.set(category, [])
    }
    grouped.get(category)!.push(field)
  })

  return grouped
}

// Field display component
interface FieldDisplayProps {
  field: UIFieldValidation
  onEdit: (fieldKey: string) => void
}

function FieldDisplay({ field, onEdit }: FieldDisplayProps) {
  const hasValue = field.value !== null && field.value !== ''

  return (
    <div
      className={cn(
        'group flex items-start justify-between p-3 rounded-lg border transition-colors',
        field.flagged && 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20',
        field.status === 'missing' && field.required && 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20',
        !field.flagged && field.status !== 'missing' && 'border-border hover:bg-muted/50'
      )}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{field.label}</span>
          {field.required && (
            <span className="text-xs text-red-500">*</span>
          )}
          {field.flagged && (
            <Badge variant="outline" className="text-xs border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
              Review
            </Badge>
          )}
          {field.confidence && field.confidence !== 'high' && hasValue && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                field.confidence === 'medium' && 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400',
                field.confidence === 'low' && 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400'
              )}
            >
              {field.confidence} confidence
            </Badge>
          )}
        </div>
        {hasValue ? (
          <p className="text-sm text-foreground">{field.value}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Not provided</p>
        )}
        {field.errorMessage && (
          <p className="text-xs text-red-600 dark:text-red-400">{field.errorMessage}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
        onClick={() => onEdit(field.key)}
        aria-label={`Edit ${field.label}`}
      >
        <Edit2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Section component for grouped fields
interface FieldSectionProps {
  category: string
  fields: UIFieldValidation[]
  onEdit: (fieldKey: string) => void
  defaultExpanded?: boolean
}

function FieldSection({ category, fields, onEdit, defaultExpanded = true }: FieldSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const config = categoryConfig[category] || categoryConfig.other
  const Icon = config.icon

  const validCount = fields.filter(f => f.status === 'valid').length
  const totalCount = fields.length

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="py-4 px-5 cursor-pointer select-none hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{config.label}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {validCount} of {totalCount} fields complete
              </p>
            </div>
          </div>
          <ChevronDown
            className={cn(
              'h-5 w-5 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="px-5 pb-5 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fields.map(field => (
              <FieldDisplay
                key={field.key}
                field={field}
                onEdit={onEdit}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// Editable field component for dialog
interface EditableFieldProps {
  field: UIFieldValidation
  value: string
  onChange: (value: string) => void
}

function EditableField({ field, value, onChange }: EditableFieldProps) {
  if (field.options && field.options.length > 0) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {field.options.map(option => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Input
      type={field.inputType || 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Enter ${field.label.toLowerCase()}`}
      autoFocus
    />
  )
}

/**
 * Quote Preview Client - Streamlined quote preview and submission
 *
 * This component receives the quote type from the URL params (selected on review page)
 * and immediately displays the final preview for submission.
 * No redundant quote type selection step.
 */
export function QuotePreviewClient({
  extractionId,
  extractedData,
  quoteType,
}: QuotePreviewClientProps) {
  const router = useRouter()
  const [validationResult, setValidationResult] = useState<UIValidationResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingField, setEditingField] = useState<UIFieldValidation | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Detect the extraction data type
  const extractedDataType: ExtractedDataType = useMemo(
    () => detectExtractionType(extractedData),
    [extractedData]
  )

  // Extract vehicles and drivers for Auto quotes
  const vehicles = useMemo(() => {
    if (extractedDataType === 'auto' || extractedDataType === 'combined') {
      return extractVehicles(extractedData as AutoExtractionResult)
    }
    return []
  }, [extractedData, extractedDataType])

  const drivers = useMemo(() => {
    if (extractedDataType === 'auto' || extractedDataType === 'combined') {
      return extractDrivers(extractedData as AutoExtractionResult)
    }
    return []
  }, [extractedData, extractedDataType])

  // Transform extraction data immediately on mount since we have the quote type
  useEffect(() => {
    const result = transformExtractionToValidation(extractedData, quoteType)
    setValidationResult(result)
  }, [extractedData, quoteType])

  // Handle field value changes
  const handleFieldChange = useCallback(
    (fieldKey: string, value: string) => {
      if (!validationResult) return

      const updatedResult = updateFieldInValidation(validationResult, fieldKey, value)
      setValidationResult(updatedResult)
    },
    [validationResult]
  )

  // Open edit dialog for a specific field
  const handleEditField = useCallback(
    (fieldKey: string) => {
      if (!validationResult) return

      const field =
        validationResult.requiredFields.find((f) => f.key === fieldKey) ||
        validationResult.optionalFields.find((f) => f.key === fieldKey) ||
        validationResult.flaggedFields.find((f) => f.key === fieldKey)

      if (field) {
        setEditingField(field)
        setEditValue(field.value || '')
        setIsEditDialogOpen(true)
      }
    },
    [validationResult]
  )

  // Save edit from dialog
  const handleDialogSave = useCallback(() => {
    if (editingField) {
      handleFieldChange(editingField.key, editValue)
      setIsEditDialogOpen(false)
      setEditingField(null)
      setEditValue('')
      toast.success('Field updated successfully')
    }
  }, [editingField, editValue, handleFieldChange])

  // Submit quote for processing
  const handleSubmit = async () => {
    if (!validationResult?.isValid) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/quotes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractionId,
          quoteType,
          extractedDataType,
          fields: [
            ...validationResult.requiredFields,
            ...validationResult.optionalFields,
          ],
          // Include vehicles and drivers for auto quotes
          ...(quoteType !== 'home' && { vehicles, drivers }),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit quote')
      }

      const result = await response.json()
      toast.success('Quote submitted successfully!')
      router.push(`/quotes/${result.quoteId}`)
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Failed to submit quote. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Combine all fields for display
  const allFields = useMemo(() => {
    if (!validationResult) return []
    return [
      ...validationResult.requiredFields,
      ...validationResult.optionalFields,
    ]
  }, [validationResult])

  // Group fields by category
  const groupedFields = useMemo(() => {
    const grouped = groupFieldsByCategory(allFields)
    // Sort categories by order
    const sortedEntries = Array.from(grouped.entries()).sort((a, b) => {
      const orderA = categoryConfig[a[0]]?.order || 99
      const orderB = categoryConfig[b[0]]?.order || 99
      return orderA - orderB
    })
    return new Map(sortedEntries)
  }, [allFields])

  // Get missing required fields for the alert
  const missingRequiredFields = useMemo(() => {
    if (!validationResult) return []
    return validationResult.requiredFields.filter(
      (field) => field.status === 'missing' || !field.value || field.value.trim() === ''
    )
  }, [validationResult])

  // Loading state while validation is being computed
  if (!validationResult) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Preparing quote preview...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary
      title="Error Loading Quote Preview"
      description="There was a problem loading the quote preview. Please try refreshing the page or go back to edit."
      onError={(error) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('QuotePreviewClient error:', error)
        }
      }}
    >
    <div className="min-h-screen pb-24">
      {/* Main content - centered with max width */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Quote Summary</h1>
          <p className="text-muted-foreground">
            Review all extracted data before submitting your {quoteType === 'both' ? 'Home + Auto' : quoteType === 'home' ? 'Home' : 'Auto'} quote request.
          </p>
        </div>

        {/* Validation Summary Card */}
        <ValidationSummary
          validationResult={validationResult}
          quoteType={quoteType}
        />

        {/* Required Fields Alert - shown when there are missing required fields */}
        {missingRequiredFields.length > 0 && (
          <RequiredFieldsAlert
            missingFields={missingRequiredFields}
            extractionId={extractionId}
            onFieldClick={handleEditField}
          />
        )}

        {/* Vehicles Summary (for Auto quotes) */}
        {(quoteType === 'auto' || quoteType === 'both') && vehicles.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="py-4 px-5 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center">
                  <Car className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    Vehicles ({vehicles.length})
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{vehicle.displayName}</span>
                      {vehicle.vin && (
                        <span className="text-xs text-muted-foreground">
                          VIN: ...{vehicle.vin.slice(-6)}
                        </span>
                      )}
                    </div>
                    {vehicle.isComplete ? (
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Complete
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400 gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Incomplete
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Drivers Summary (for Auto quotes) */}
        {(quoteType === 'auto' || quoteType === 'both') && drivers.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="py-4 px-5 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                  <Users className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    Additional Drivers ({drivers.length})
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {drivers.map((driver) => (
                  <div
                    key={driver.index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{driver.displayName}</span>
                      {driver.dateOfBirth && (
                        <span className="text-xs text-muted-foreground">
                          DOB: {driver.dateOfBirth}
                        </span>
                      )}
                    </div>
                    {driver.isComplete ? (
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Complete
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400 gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Incomplete
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Field Sections by Category */}
        <div className="space-y-4">
          {Array.from(groupedFields.entries()).map(([category, fields], index) => (
            <FieldSection
              key={category}
              category={category}
              fields={fields}
              onEdit={handleEditField}
              defaultExpanded={index < 3} // First 3 sections expanded by default
            />
          ))}
        </div>

        {/* Flagged Fields Alert (if any) */}
        {validationResult.flaggedFields.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardHeader className="py-4 px-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                  <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-amber-800 dark:text-amber-200">
                    {validationResult.flaggedFields.length} Field{validationResult.flaggedFields.length !== 1 ? 's' : ''} Flagged for Review
                  </CardTitle>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                    These fields may need verification due to low confidence or ambiguous data.
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}
      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t shadow-lg z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Status indicator */}
            <div className="hidden sm:flex items-center gap-2">
              {validationResult?.isValid ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    Ready to submit
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/40">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    {validationResult.totalRequired - validationResult.completedRequired} required field{validationResult.totalRequired - validationResult.completedRequired !== 1 ? 's' : ''} missing
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 ml-auto">
              <Link href={`/review/${extractionId}`}>
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Edit</span>
                </Button>
              </Link>
              <Button
                size="lg"
                className="gap-2 min-w-[140px]"
                onClick={handleSubmit}
                disabled={!validationResult?.isValid || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Submit Quote</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Field Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Field</DialogTitle>
            <DialogDescription>
              Update the value for {editingField?.label}
            </DialogDescription>
          </DialogHeader>
          {editingField && (
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="field-value">{editingField.label}</Label>
                <EditableField
                  field={editingField}
                  value={editValue}
                  onChange={setEditValue}
                />
              </div>
              {editingField.rawText && editingField.rawText !== editingField.value && (
                <div className="rounded-lg bg-muted/50 border p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Original Extracted Text
                  </p>
                  <p className="text-sm italic text-foreground/80">
                    {editingField.rawText}
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleDialogSave}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </ErrorBoundary>
  )
}
