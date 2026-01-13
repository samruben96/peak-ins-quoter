'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HomeExtractionForm } from './HomeExtractionForm'
import { AutoExtractionForm } from './AutoExtractionForm'
import { QuoteTypeSelector, QuoteType } from './QuoteTypeSelector'
import { Home, Car } from 'lucide-react'
import {
  detectExtractionType,
  getHomeExtractionData,
  getAutoExtractionData,
  suggestQuoteType,
} from '@/lib/extraction/transform'
import { HomeExtractionResult, createEmptyHomeExtraction } from '@/types/home-extraction'
import { AutoExtractionResult, createEmptyAutoExtraction } from '@/types/auto-extraction'
import { CombinedUiExtractionData, ExtractedDataType } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

interface ExtractionReviewProps {
  extractionId: string
  /**
   * The initial extraction data in any supported format:
   * - HomeApiExtractionResult / AutoApiExtractionResult (from API extraction)
   * - HomeExtractionResult / AutoExtractionResult (UI form format)
   * - CombinedExtractionData / CombinedUiExtractionData (both types)
   * - ExtractionResult (legacy format)
   * - null (empty/pending extraction)
   */
  initialData: ExtractedDataType
  className?: string
  onQuoteTypeChange?: (quoteType: QuoteType) => void
}

/**
 * Extraction Review Component
 *
 * Provides a unified interface for reviewing extracted insurance data.
 * Supports Home, Auto, and combined Home+Auto quote types.
 *
 * Features:
 * - Auto-detects the quote type from extraction data
 * - Allows manual quote type selection/override
 * - Transforms legacy data formats to new structured formats
 * - Provides tabbed interface for combined Home+Auto quotes
 */
export function ExtractionReview({
  extractionId,
  initialData,
  className,
  onQuoteTypeChange,
}: ExtractionReviewProps) {
  // Debug logging - only in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[ExtractionReview] Received initialData:', initialData)
    console.log('[ExtractionReview] initialData keys:', initialData ? Object.keys(initialData) : 'null')
  }

  // Detect initial quote type from data
  const detectedType = useMemo(() => {
    const type = detectExtractionType(initialData)
    if (process.env.NODE_ENV === 'development') {
      console.log('[ExtractionReview] Detected type:', type)
    }
    return type
  }, [initialData])

  const suggestedType = useMemo(() => {
    const type = suggestQuoteType(initialData)
    if (process.env.NODE_ENV === 'development') {
      console.log('[ExtractionReview] Suggested type:', type)
    }
    return type
  }, [initialData])

  // Quote type state - use detected type if available, otherwise use suggested
  const [quoteType, setQuoteType] = useState<QuoteType>(() => {
    // Map API types to UI types
    if (detectedType === 'home' || detectedType === 'home_api') {
      return 'home'
    }
    if (detectedType === 'auto' || detectedType === 'auto_api') {
      return 'auto'
    }
    if (detectedType === 'both') {
      return 'both'
    }
    return suggestedType
  })

  // Track which tab is active for "both" mode
  const [activeTab, setActiveTab] = useState<'home' | 'auto'>('home')

  // Initialize home extraction data
  const [homeData, setHomeData] = useState<HomeExtractionResult>(() => {
    const data = getHomeExtractionData(initialData)
    if (process.env.NODE_ENV === 'development') {
      console.log('[ExtractionReview] Home data from getHomeExtractionData:', data)
      console.log('[ExtractionReview] Home data personal.firstName:', data?.personal?.firstName)
    }
    return data || createEmptyHomeExtraction()
  })

  // Initialize auto extraction data
  const [autoData, setAutoData] = useState<AutoExtractionResult>(() => {
    const data = getAutoExtractionData(initialData)
    if (process.env.NODE_ENV === 'development') {
      console.log('[ExtractionReview] Auto data from getAutoExtractionData:', data)
      console.log('[ExtractionReview] Auto data personal.ownerFirstName:', data?.personal?.ownerFirstName)
    }
    return data || createEmptyAutoExtraction()
  })

  // Notify parent of initial quote type on mount
  useEffect(() => {
    onQuoteTypeChange?.(quoteType)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Save handler for home data
  const handleSaveHome = useCallback(
    async (data: HomeExtractionResult) => {
      const supabase = createClient()

      const { error } = await supabase
        .from('extractions')
        .update({
          extracted_data: data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', extractionId)

      if (error) {
        console.error('Error saving home extraction:', error)
        throw error
      }

      setHomeData(data)
    },
    [extractionId]
  )

  // Save handler for auto data
  const handleSaveAuto = useCallback(
    async (data: AutoExtractionResult) => {
      const supabase = createClient()

      const { error } = await supabase
        .from('extractions')
        .update({
          extracted_data: data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', extractionId)

      if (error) {
        console.error('Error saving auto extraction:', error)
        throw error
      }

      setAutoData(data)
    },
    [extractionId]
  )

  // Save handler for combined data (both quote types)
  const handleSaveCombined = useCallback(
    async (type: 'home' | 'auto', data: HomeExtractionResult | AutoExtractionResult) => {
      const supabase = createClient()

      // For combined mode, we store both datasets
      const combinedData: CombinedUiExtractionData = {
        quoteType: 'both',
        home: type === 'home' ? (data as HomeExtractionResult) : homeData,
        auto: type === 'auto' ? (data as AutoExtractionResult) : autoData,
      }

      const { error } = await supabase
        .from('extractions')
        .update({
          extracted_data: combinedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', extractionId)

      if (error) {
        console.error('Error saving combined extraction:', error)
        throw error
      }

      if (type === 'home') {
        setHomeData(data as HomeExtractionResult)
      } else {
        setAutoData(data as AutoExtractionResult)
      }
    },
    [extractionId, homeData, autoData]
  )

  // Handle quote type change
  const handleQuoteTypeChange = useCallback((newType: QuoteType) => {
    setQuoteType(newType)
    // Notify parent of quote type change
    onQuoteTypeChange?.(newType)
    // Reset active tab when switching to "both"
    if (newType === 'both') {
      setActiveTab('home')
    }
  }, [onQuoteTypeChange])

  // Render content based on quote type
  const renderContent = () => {
    switch (quoteType) {
      case 'home':
        return (
          <HomeExtractionForm
            extractionId={extractionId}
            initialData={homeData}
            onSave={handleSaveHome}
            className={className}
          />
        )

      case 'auto':
        return (
          <AutoExtractionForm
            extractionId={extractionId}
            initialData={autoData}
            onSave={handleSaveAuto}
            className={className}
          />
        )

      case 'both':
        return (
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'home' | 'auto')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
              <TabsTrigger value="home" className="flex items-center gap-2 text-base">
                <Home className="h-4 w-4" />
                Home Insurance
              </TabsTrigger>
              <TabsTrigger value="auto" className="flex items-center gap-2 text-base">
                <Car className="h-4 w-4" />
                Auto Insurance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="home" className="mt-0">
              <HomeExtractionForm
                extractionId={extractionId}
                initialData={homeData}
                onSave={(data) => handleSaveCombined('home', data)}
                className={className}
              />
            </TabsContent>

            <TabsContent value="auto" className="mt-0">
              <AutoExtractionForm
                extractionId={extractionId}
                initialData={autoData}
                onSave={(data) => handleSaveCombined('auto', data)}
                className={className}
              />
            </TabsContent>
          </Tabs>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      {/* Quote Type Selector Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-card border rounded-xl shadow-sm">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">Quote Type</h3>
          <p className="text-sm text-muted-foreground">
            Select the type of insurance quote to generate
          </p>
        </div>
        <QuoteTypeSelector value={quoteType} onChange={handleQuoteTypeChange} />
      </div>

      {/* Form Content */}
      <div className="space-y-6">
        {renderContent()}
      </div>
    </div>
  )
}
