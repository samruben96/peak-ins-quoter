'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { ExtractionReview, QuoteType } from '@/components/extraction'
import { ExtractedDataType } from '@/types/database'
import { ArrowRight } from 'lucide-react'

interface ReviewPageClientProps {
  extractionId: string
  extractedData: ExtractedDataType
}

/**
 * Client component for the review page that handles quote type state
 * and provides navigation to the quote page with the selected type.
 */
export function ReviewPageClient({
  extractionId,
  extractedData,
}: ReviewPageClientProps) {
  const [selectedQuoteType, setSelectedQuoteType] = useState<QuoteType | null>(null)

  const handleQuoteTypeChange = useCallback((quoteType: QuoteType) => {
    setSelectedQuoteType(quoteType)
  }, [])

  // Build the quote URL with the selected type
  const quoteUrl = selectedQuoteType
    ? `/review/${extractionId}/quote?type=${selectedQuoteType}`
    : `/review/${extractionId}/quote`

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
          onQuoteTypeChange={handleQuoteTypeChange}
        />
      </ErrorBoundary>

      {/* Floating action button for proceeding to quote */}
      <div className="sticky bottom-6 mt-8 flex justify-end">
        <Link
          href={quoteUrl}
          className={!selectedQuoteType ? 'pointer-events-none' : ''}
        >
          <Button
            size="lg"
            className="shadow-lg gap-2"
            disabled={!selectedQuoteType}
          >
            Proceed to Quote
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </>
  )
}
