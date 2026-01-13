import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { convertPDFToImages } from '@/lib/pdf/converter'
import {
  extractHomeFromImages,
  extractAutoFromImages,
} from '@/lib/openrouter/client'
import type { InsuranceType, HomeApiExtractionResult, AutoApiExtractionResult, CombinedExtractionData } from '@/types'

/**
 * Supported insurance types for extraction
 */
type ExtractionInsuranceType = 'home' | 'auto' | 'both'

export async function POST(request: NextRequest) {
  console.log('[Extract API] POST request received')

  try {
    // Validate Content-Type header
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 415 }
      )
    }

    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('[Extract API] Unauthorized - no user or auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[Extract API] Authenticated user:', user.id)

    // Get extraction ID and insurance type from request with JSON parse error handling
    let body: unknown
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[Extract API] JSON parse error:', parseError)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }
    console.log('[Extract API] Request body:', body)

    const { extractionId, insuranceType = 'home' } = body as {
      extractionId?: string
      insuranceType?: ExtractionInsuranceType
    }

    if (!extractionId) {
      console.log('[Extract API] Missing extraction ID')
      return NextResponse.json({ error: 'Extraction ID required' }, { status: 400 })
    }
    console.log('[Extract API] Processing extraction:', extractionId, 'type:', insuranceType)

    // Validate insurance type
    const validTypes: ExtractionInsuranceType[] = ['home', 'auto', 'both']
    if (!validTypes.includes(insuranceType)) {
      return NextResponse.json(
        { error: `Invalid insurance type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Get extraction record and verify ownership
    const { data: extraction, error: fetchError } = await supabase
      .from('extractions')
      .select('*')
      .eq('id', extractionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !extraction) {
      return NextResponse.json({ error: 'Extraction not found' }, { status: 404 })
    }

    // Update status to processing and set insurance type
    await supabase
      .from('extractions')
      .update({
        status: 'processing',
        insurance_type: insuranceType,
      })
      .eq('id', extractionId)

    try {
      // Download PDF from storage
      console.log('[Extract API] Downloading PDF from:', extraction.storage_path)
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('fact-finders')
        .download(extraction.storage_path)

      if (downloadError || !fileData) {
        console.error('[Extract API] Download error:', downloadError)
        throw new Error(`Failed to download file: ${downloadError?.message || 'Unknown error'}`)
      }
      console.log('[Extract API] PDF downloaded, size:', fileData.size)

      // Convert PDF to images
      const arrayBuffer = await fileData.arrayBuffer()
      console.log('[Extract API] Converting PDF to images...')
      const conversionResult = await convertPDFToImages(arrayBuffer)

      if (conversionResult.pages.length === 0) {
        console.error('[Extract API] No pages found in PDF')
        throw new Error('No pages found in PDF')
      }
      console.log('[Extract API] Converted', conversionResult.pages.length, 'pages')

      // Extract base64 images from conversion result
      const images = conversionResult.pages.map(page => page.base64Image)
      console.log('[Extract API] Image sizes:', images.map(img => img.length))

      // Extract data using Claude Vision based on insurance type
      let extractedData: HomeApiExtractionResult | AutoApiExtractionResult | CombinedExtractionData
      let dbInsuranceType: InsuranceType = insuranceType

      switch (insuranceType) {
        case 'home':
          console.log(`[Extract API] Starting HOME extraction for ${images.length} pages`)
          extractedData = await extractHomeFromImages(images)
          break

        case 'auto':
          console.log(`[Extract API] Starting AUTO extraction for ${images.length} pages`)
          extractedData = await extractAutoFromImages(images)
          break

        case 'both':
          console.log(`[Extract API] Starting COMBINED (Home + Auto) extraction for ${images.length} pages`)
          // For combined extraction, run both extractions and merge shared fields
          const [homeResult, autoResult] = await Promise.all([
            extractHomeFromImages(images),
            extractAutoFromImages(images),
          ])

          // Create combined result with shared personal info
          // Use home personal info as the source of truth for shared fields,
          // but include auto-specific personal fields from the auto extraction
          extractedData = {
            shared: {
              ownerFirstName: homeResult.personal.firstName,
              ownerLastName: homeResult.personal.lastName,
              ownerDOB: homeResult.personal.dateOfBirth,
              spouseFirstName: homeResult.personal.spouseFirstName,
              spouseLastName: homeResult.personal.spouseLastName,
              spouseDOB: homeResult.personal.spouseDateOfBirth,
              streetAddress: homeResult.personal.streetAddress,
              city: homeResult.personal.city,
              state: homeResult.personal.state,
              zipCode: homeResult.personal.zipCode,
              priorStreetAddress: homeResult.personal.priorStreetAddress,
              priorCity: homeResult.personal.priorCity,
              priorState: homeResult.personal.priorState,
              priorZipCode: homeResult.personal.priorZipCode,
              yearsAtCurrentAddress: homeResult.personal.yearsAtCurrentAddress,
              phone: homeResult.personal.phone,
              email: homeResult.personal.email,
            },
            // Auto-specific personal fields stored separately at top level
            autoPersonal: {
              effectiveDate: autoResult.personal.effectiveDate,
              maritalStatus: autoResult.personal.maritalStatus,
              garagingAddressSameAsMailing: autoResult.personal.garagingAddressSameAsMailing,
              garagingStreetAddress: autoResult.personal.garagingStreetAddress,
              garagingCity: autoResult.personal.garagingCity,
              garagingState: autoResult.personal.garagingState,
              garagingZipCode: autoResult.personal.garagingZipCode,
              ownerDriversLicense: autoResult.personal.ownerDriversLicense,
              ownerLicenseState: autoResult.personal.ownerLicenseState,
              spouseDriversLicense: autoResult.personal.spouseDriversLicense,
              spouseLicenseState: autoResult.personal.spouseLicenseState,
              ownerOccupation: autoResult.personal.ownerOccupation,
              spouseOccupation: autoResult.personal.spouseOccupation,
              ownerEducation: autoResult.personal.ownerEducation,
              spouseEducation: autoResult.personal.spouseEducation,
              rideShare: autoResult.personal.rideShare,
              delivery: autoResult.personal.delivery,
            },
            home: {
              property: homeResult.property,
              safety: homeResult.safety,
              coverage: homeResult.coverage,
              claims: homeResult.claims,
              lienholder: homeResult.lienholder,
              updates: homeResult.updates,
            },
            auto: {
              additionalDrivers: autoResult.additionalDrivers,
              vehicles: autoResult.vehicles,
              coverage: autoResult.coverage,
              deductibles: autoResult.deductibles,
              lienholders: autoResult.lienholders,
              priorInsurance: autoResult.priorInsurance,
              accidentsOrTickets: autoResult.accidentsOrTickets,
            },
            quoteType: 'both',
          } satisfies CombinedExtractionData
          break

        default:
          // Fallback to legacy extraction (should not reach here due to validation)
          console.log(`[Extract API] Falling back to generic extraction`)
          extractedData = await extractHomeFromImages(images)
          dbInsuranceType = 'generic'
      }

      // Update extraction record with results
      const { error: updateError } = await supabase
        .from('extractions')
        .update({
          extracted_data: extractedData,
          insurance_type: dbInsuranceType,
          status: 'completed',
        })
        .eq('id', extractionId)

      if (updateError) {
        throw new Error('Failed to save extraction results')
      }

      return NextResponse.json({
        success: true,
        extractionId,
        insuranceType: dbInsuranceType,
        data: extractedData,
      })
    } catch (extractError) {
      // Update status to failed with proper error handling
      const { error: statusUpdateError } = await supabase
        .from('extractions')
        .update({ status: 'failed' })
        .eq('id', extractionId)

      if (statusUpdateError) {
        console.error('[Extract API] Failed to update extraction status to failed:', statusUpdateError)
      }

      // Log full error details server-side only (never expose to client)
      console.error('[Extract API] Extraction processing error:', extractError)
      if (extractError instanceof Error) {
        console.error('[Extract API] Error stack:', extractError.stack)
      }

      // Return generic error message to client - do not expose stack traces or internal details
      return NextResponse.json({
        error: 'Extraction processing failed',
      }, { status: 500 })
    }
  } catch (error) {
    // Log full error details server-side only
    console.error('[Extract API] Outer error:', error)
    if (error instanceof Error) {
      console.error('[Extract API] Outer error stack:', error.stack)
    }

    // Return generic error message to client
    return NextResponse.json({
      error: 'Internal server error',
    }, { status: 500 })
  }
}

// GET endpoint to check extraction status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const extractionId = searchParams.get('id')

    if (!extractionId) {
      return NextResponse.json({ error: 'Extraction ID required' }, { status: 400 })
    }

    const { data: extraction, error } = await supabase
      .from('extractions')
      .select('*')
      .eq('id', extractionId)
      .eq('user_id', user.id)
      .single()

    if (error || !extraction) {
      return NextResponse.json({ error: 'Extraction not found' }, { status: 404 })
    }

    return NextResponse.json({ extraction })
  } catch (error) {
    console.error('Get extraction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
