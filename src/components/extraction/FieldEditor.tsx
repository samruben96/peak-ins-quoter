'use client'

import { ExtractionField } from '@/types/extraction'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfidenceBadge } from './ConfidenceBadge'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Info } from 'lucide-react'

export type FieldInputType = 'text' | 'date' | 'tel' | 'email' | 'number' | 'select' | 'textarea' | 'checkbox'

interface FieldEditorProps {
  field: ExtractionField
  label: string
  fieldKey: string
  onChange: (value: string) => void
  type?: FieldInputType
  required?: boolean
  options?: string[]
  placeholder?: string
  className?: string
}

export function FieldEditor({
  field,
  label,
  fieldKey,
  onChange,
  type = 'text',
  required = false,
  options = [],
  placeholder,
  className,
}: FieldEditorProps) {
  // Use the field value directly - component is controlled by parent
  const value = field.value || ''

  const isLowConfidence = field.confidence === 'low'
  const isMediumConfidence = field.confidence === 'medium'
  const isFlagged = field.flagged
  const isEmpty = field.value === null || field.value === ''

  // Only show warnings for REQUIRED fields that have issues
  // Non-required fields should not show warning styling
  const needsAttention = required && (isFlagged || isLowConfidence || isEmpty)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  const handleSelectChange = (newValue: string) => {
    onChange(newValue)
  }

  // Determine visual styling based on confidence and flagged status
  // Only apply warning styles to REQUIRED fields
  const getFieldStyles = () => {
    if (!required) {
      // Non-required fields get no warning styling
      return ''
    }
    if (isFlagged || isEmpty) {
      return 'border-red-300 focus-visible:ring-red-500 bg-red-50/50'
    }
    if (isLowConfidence) {
      return 'border-orange-300 focus-visible:ring-orange-500 bg-orange-50/50'
    }
    if (isMediumConfidence) {
      return 'border-yellow-300 focus-visible:ring-yellow-500'
    }
    return ''
  }

  const getLabelStyles = () => {
    if (!required) {
      // Non-required fields get no warning styling on labels
      return ''
    }
    if (isFlagged || isEmpty) return 'text-red-600'
    if (isLowConfidence) return 'text-orange-600'
    if (isMediumConfidence) return 'text-yellow-700'
    return ''
  }

  const fieldStyles = getFieldStyles()
  const labelStyles = getLabelStyles()

  const renderInput = () => {
    if (type === 'select') {
      return (
        <Select value={value} onValueChange={handleSelectChange}>
          <SelectTrigger
            id={fieldKey}
            className={cn(
              fieldStyles,
              field.value === null && 'bg-muted'
            )}
          >
            <SelectValue placeholder={placeholder || 'Select...'} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (type === 'textarea') {
      return (
        <textarea
          id={fieldKey}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder || (field.value === null ? 'Not found' : undefined)}
          rows={3}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            fieldStyles,
            field.value === null && 'bg-muted'
          )}
        />
      )
    }

    return (
      <Input
        id={fieldKey}
        type={type}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder || (field.value === null ? 'Not found' : undefined)}
        className={cn(
          fieldStyles,
          field.value === null && 'bg-muted'
        )}
      />
    )
  }

  return (
    <div className={cn('space-y-2.5', className)}>
      {/* Label row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label
            htmlFor={fieldKey}
            className={cn(
              'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
              labelStyles
            )}
          >
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          {field.rawText && field.rawText !== field.value && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-muted transition-colors"
                    aria-label="View original text"
                  >
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">
                    <span className="font-medium">Original text:</span> {field.rawText}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <ConfidenceBadge confidence={field.confidence} flagged={field.flagged} />
      </div>

      {/* Input field */}
      {renderInput()}

      {/* Help text for REQUIRED fields that need attention */}
      {needsAttention && (
        <p
          className={cn(
            'text-xs leading-relaxed',
            (isFlagged || isEmpty) ? 'text-red-600' : 'text-orange-600'
          )}
        >
          {isEmpty
            ? 'This required field is missing a value'
            : isFlagged
            ? 'This required field needs review - data may be illegible'
            : 'Low confidence - please verify this required value'}
        </p>
      )}
    </div>
  )
}
