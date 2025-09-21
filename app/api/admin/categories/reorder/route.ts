import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { categories } = body

    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'Categories array is required' },
        { status: 400 }
      )
    }

    // Validate each category item
    for (const category of categories) {
      if (!category.category_id || typeof category.display_order !== 'number') {
        return NextResponse.json(
          { error: 'Each category must have category_id and display_order' },
          { status: 400 }
        )
      }
    }

    console.log('🔄 Updating category display order:', categories.map(c => `${c.category_id}: ${c.display_order}`))

    // Update categories in batch
    const updatePromises = categories.map(category => 
      supabase
        .from('categories')
        .update({ 
          display_order: category.display_order,
          updated_at: new Date().toISOString()
        })
        .eq('category_id', category.category_id)
    )

    const results = await Promise.all(updatePromises)

    // Check for errors
    const errors = results.filter(result => result.error)
    if (errors.length > 0) {
      console.error('❌ Error updating category order:', errors[0].error)
      return NextResponse.json(
        { error: 'Failed to update category order' },
        { status: 500 }
      )
    }

    console.log('✅ Successfully updated category display order')

    return NextResponse.json({
      success: true,
      message: `Updated display order for ${categories.length} categories`,
      updated_categories: categories.length
    })

  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}