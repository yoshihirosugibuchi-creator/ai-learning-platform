import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * AI生成コースワークフロー管理API
 * GET /api/ai-course-generation/workflows - ワークフロー一覧取得
 * POST /api/ai-course-generation/workflows - 新規ワークフロー作成
 */

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    console.log(`📋 [Workflows] Fetching workflows for user: ${userId}`)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabaseAdmin
      .from('ai_course_workflows')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: workflows, error } = await query

    if (error) {
      console.error('❌ [Workflows] Database error:', error)
      return NextResponse.json(
        { error: 'ワークフローの取得に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [Workflows] Found ${workflows?.length || 0} workflows`)

    // 公開済みコースのステータスを取得するため、published_course_idを収集
    const publishedCourseIds = (workflows || [])
      .filter(w => w.published_course_id)
      .map(w => w.published_course_id as string)

    // コースステータスを一括取得
    let courseStatusMap: Record<string, string> = {}
    if (publishedCourseIds.length > 0) {
      const { data: courses } = await supabaseAdmin
        .from('learning_courses')
        .select('id, status')
        .in('id', publishedCourseIds)

      if (courses) {
        courseStatusMap = courses.reduce((acc, course) => {
          acc[course.id] = course.status
          return acc
        }, {} as Record<string, string>)
      }
    }

    // 設計書準拠のデータ構造にマッピング
    const mappedWorkflows = workflows?.map(workflow => ({
      id: workflow.id,
      status: workflow.status,
      course_basic_info: workflow.course_basic_info || {
        title: workflow.title || '',
        description: workflow.description || ''
      },
      source_materials: workflow.source_materials || [],
      outline_data: workflow.outline_data || null,
      category_mappings: workflow.category_mappings || [],
      content_data: workflow.content_data || null,
      current_step: workflow.current_step || '0',
      created_at: workflow.created_at,
      updated_at: workflow.updated_at,

      // 公開済みコース情報
      published_course_id: workflow.published_course_id || null,
      courseStatus: workflow.published_course_id
        ? courseStatusMap[workflow.published_course_id] || null
        : null,

      // 下位互換用のレガシーフィールド
      title: ((workflow.course_basic_info as { title?: string }) || {}).title || workflow.title || '',
      description: ((workflow.course_basic_info as { description?: string }) || {}).description || workflow.description || '',
      sources: workflow.source_materials || [],
      aiOutlineResponse: (workflow.outline_data as { ai_response_raw?: string } | null)?.ai_response_raw || null,
      // DBのcurrent_stepをそのまま使用（最後に作業していたステップに戻る）
      currentStep: parseInt(workflow.current_step || '0'),

      // 🔧 Step1で必要なフィールドを追加（course_basic_infoから抽出）
      difficultyId: ((workflow.course_basic_info as { difficulty?: string }) || {}).difficulty || '',
      estimatedDuration: ((workflow.course_basic_info as { estimated_duration?: string }) || {}).estimated_duration || '',
      learningObjectives: ((workflow.course_basic_info as { learning_objectives?: string[] }) || {}).learning_objectives || [],
      targetAudience: ((workflow.course_basic_info as { target_audience?: string }) || {}).target_audience || '',
      courseCategory: ((workflow.course_basic_info as { course_category?: string }) || {}).course_category || '',
      generationPreferences: ((workflow.course_basic_info as { generation_preferences?: Record<string, unknown> }) || {}).generation_preferences || workflow.generation_preferences || {
        sessionLength: 15,
        includeQuizzes: true,
        interactivityLevel: 'medium',
        contentStyle: 'formal'
      },
      categoryMappings: workflow.category_mappings || []
    })) || []

    return NextResponse.json({
      success: true,
      workflows: mappedWorkflows,
      count: mappedWorkflows.length
    })

  } catch (error) {
    console.error('❌ [Workflows] Error:', error)
    return NextResponse.json(
      { error: 'ワークフローの取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // 新しい構造とレガシー構造の両方をサポート
    const courseBasicInfo = body.course_basic_info || {
      title: body.title || '新しいAI生成コース',
      description: body.description || '',
      difficulty: body.difficulty || '',
      target_audience: body.target_audience || body.targetAudience || '',
      learning_objectives: body.learning_objectives || body.learningObjectives || [],
      estimated_duration: body.estimated_duration || body.estimatedDuration || '',
      course_category: body.course_category || body.courseCategory || ''
    }
    
    const sourceMaterials = body.source_materials || body.sources || []
    const aiOutlineResponse = body.aiOutlineResponse || null

    console.log(`📋 [Workflows] Creating workflow for user: ${userId}`)
    console.log(`📋 [Workflows] Title: ${courseBasicInfo.title}, Sources: ${sourceMaterials.length}`)

    // 設計書準拠のワークフローデータ準備
    const workflowData = {
      user_id: userId,
      status: sourceMaterials.length > 0 ? 'source_analysis' : 'draft',
      current_step: (sourceMaterials.length > 0 ? (aiOutlineResponse ? '2' : '1') : '0'),
      
      // 基本情報（設計書のcourse_basic_info）
      course_basic_info: courseBasicInfo,
      
      // 参考資料（設計書のsource_materials）
      source_materials: sourceMaterials,
      
      // アウトライン（設計書のoutline_data）
      outline_data: aiOutlineResponse ? { 
        ai_response_raw: aiOutlineResponse, 
        approved: false,
        generated_at: new Date().toISOString(),
        course: {
          title: courseBasicInfo.title,
          description: courseBasicInfo.description,
          estimatedDays: 7,
          difficulty: courseBasicInfo.difficulty || 'intermediate',
          targetAudience: courseBasicInfo.target_audience,
          learningObjectives: courseBasicInfo.learning_objectives
        },
        genres: []
      } : null,
      
      // その他のフィールド
      category_mappings: body.category_mappings || body.categoryMappings || [],
      content_data: null,
      current_prompt: null,
      generation_preferences: body.generation_preferences || {
        ai_mode: 'manual',
        depth: 'standard',
        style: 'practical',
        include_quizzes: true,
        session_length: 60,
        interactivity_level: 'medium'
      },
      
      // レガシー互換性のため（既存のテーブル列）
      title: courseBasicInfo.title.trim() || '新しいAI生成コース',
      description: courseBasicInfo.description.trim()
    }

    const { data: workflow, error } = await supabaseAdmin
      .from('ai_course_workflows')
      .insert(workflowData)
      .select()
      .single()

    if (error) {
      console.error('❌ [Workflows] Insert error:', error)
      return NextResponse.json(
        { error: 'ワークフローの作成に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [Workflows] Created workflow: ${workflow.id}`)

    // 統一レスポンスフォーマット
    const responseData = {
      id: workflow.id,
      status: workflow.status,
      course_basic_info: workflow.course_basic_info,
      source_materials: workflow.source_materials || [],
      outline_data: workflow.outline_data || null,
      category_mappings: workflow.category_mappings || [],
      content_data: workflow.content_data || null,
      generation_preferences: workflow.generation_preferences || {},
      current_step: workflow.current_step || '0',
      created_at: workflow.created_at,
      updated_at: workflow.updated_at,

      // 下位互換用
      title: ((workflow.course_basic_info as { title?: string }) || {}).title || workflow.title || '',
      description: ((workflow.course_basic_info as { description?: string }) || {}).description || workflow.description || '',
      sources: workflow.source_materials || [],
      aiOutlineResponse: (workflow.outline_data as { ai_response_raw?: string } | null)?.ai_response_raw || null,
      currentStep: parseInt(workflow.current_step || '0')
    }

    return NextResponse.json({
      success: true,
      workflow: responseData
    })

  } catch (error) {
    console.error('❌ [Workflows] Error:', error)
    return NextResponse.json(
      { error: 'ワークフローの作成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}