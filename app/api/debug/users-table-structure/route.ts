import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  try {
    // Get table structure information
    const { data: tableStructure, error: structureError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'users')
      .eq('table_schema', 'public')

    if (structureError) {
      console.error('Error fetching table structure:', structureError)
    }

    // Get a sample user record to see actual data structure
    const { data: sampleUser, error: sampleError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single()

    if (sampleError) {
      console.error('Error fetching sample user:', sampleError)
    }

    return Response.json({
      tableStructure: tableStructure || [],
      sampleUser: sampleUser || null,
      structureError: structureError?.message || null,
      sampleError: sampleError?.message || null
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return Response.json({ 
      error: 'Failed to fetch table structure',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}