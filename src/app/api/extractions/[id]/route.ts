import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ExtractedDataType } from '@/types/database'

/**
 * Validate UUID format (v4)
 * Returns true if the string is a valid UUID v4 format
 */
function isValidUUID(id: string): boolean {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidV4Regex.test(id)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Validate UUID format before database query
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid extraction ID format' }, { status: 400 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: extraction, error } = await supabase
      .from('extractions')
      .select('*')
      .eq('id', id)
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params

    // Validate UUID format before database query
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid extraction ID format' }, { status: 400 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse JSON with error handling
    let body: { extracted_data?: ExtractedDataType }
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('PATCH extraction JSON parse error:', parseError)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const { extracted_data } = body as { extracted_data: ExtractedDataType }

    const { data: extraction, error } = await supabase
      .from('extractions')
      .update({ extracted_data })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update extraction' }, { status: 500 })
    }

    return NextResponse.json({ extraction })
  } catch (error) {
    console.error('Update extraction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Validate UUID format before database query
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid extraction ID format' }, { status: 400 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get extraction to find storage path
    const { data: extraction } = await supabase
      .from('extractions')
      .select('storage_path')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (extraction?.storage_path) {
      // Delete file from storage
      await supabase.storage.from('fact-finders').remove([extraction.storage_path])
    }

    // Delete extraction record
    const { error } = await supabase
      .from('extractions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete extraction' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete extraction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
