'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { ExtractionReview, QuoteType } from '@/components/extraction'
import { ExtractedDataType } from '@/types/database'
import { InsuranceType } from '@/types/extraction'
import { ArrowRight } from 'lucide-react'

interface ReviewPageClientProps {
  extractionId: string
  extractedData: ExtractedDataType
  insuranceType: InsuranceType
}

/**
 * Map InsuranceType to QuoteType for URL building
 * InsuranceType can be 'home' | 'auto' | 'both' | 'life' | 'health' | 'generic'
 * QuoteType is 'home' | 'auto' | 'both'
 */
function insuranceTypeToQuoteType(insuranceType: InsuranceType): QuoteType {
  if (insuranceType === 'home' || insuranceType === 'auto' || insuranceType === 'both') {
    return insuranceType
  }
  // Default to 'home' for legacy types
  return 'home'
}

/**
 * Client component for the review page that handles quote type state
 * and provides navigation to the quote page with the selected type.
 *
 * The quote type is determined by the insurance_type selected during upload,
 * so no additional quote type selection is needed on the review page.
 */
export function ReviewPageClient({
  extractionId,
  extractedData,
  insuranceType,
}: ReviewPageClientProps) {
  // Convert insurance type to quote type for the ExtractionReview component
  const quoteType = insuranceTypeToQuoteType(insuranceType)

  // Build the quote URL with the insurance type
  const quoteUrl = `/review/${extractionId}/quote?type=${quoteType}`

  return (
    <>
      <ErrorBoundary
        title="Error Loading Review"
        description="There was a problem loading the extraction review. Please try refreshing the page."
        onError={(error) => {
          // Log error for monitoring in production
          if (process.env.NODE_ENV === 'development') {
            console.error('ExtractionReview error:', error)
          }
        }}
      >
        <ExtractionReview
          extractionId={extractionId}
          initialData={extractedData}
          quoteType={quoteType}
        />
      </ErrorBoundary>

      {/* Floating action button for proceeding to quote */}
      <div className="sticky bottom-6 mt-8 flex justify-end">
        <Link href={quoteUrl}>
          <Button size="lg" className="shadow-lg gap-2">
            Proceed to Quote
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </>
  )
}
