import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateSuggestedId, findAvailableId } from '@/lib/id-generation-helper'

interface IdCheckRequest {
  id: string
  type: 'course' | 'genre' | 'theme' | 'session' | 'content' | 'quiz'
  excludeId?: string // 更新時に自分自身を除外
  title?: string // 自動提案用のタイトル
}

interface IdCheckResponse {
  available: boolean
  suggested?: string
  message: string
}

// 有効なテーブル名の型定義
type ValidTableName = 'learning_courses' | 'learning_genres' | 'learning_themes' | 'learning_sessions' | 'session_contents' | 'session_quizzes'

// 型ガード関数
const isValidTableName = (name: string): name is ValidTableName => {
  const validTables: ValidTableName[] = [
    'learning_courses', 
    'learning_genres', 
    'learning_themes', 
    'learning_sessions', 
    'session_contents', 
    'session_quizzes'
  ]
  return validTables.includes(name as ValidTableName)
}


/**
 * POST /api/admin/check-id
 * ID重複チェック・自動提案API
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, role } = await getCurrentUserRole(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    if (!role || (role !== 'admin' && role !== 'system_admin')) {
      return NextResponse.json(
        { error: '管理者のアクセス権限が必要です' },
        { status: 403 }
      )
    }

    const body: IdCheckRequest = await request.json()
    const { id, type, excludeId, title } = body

    if (!type) {
      return NextResponse.json(
        { error: 'Missing required field: type' },
        { status: 400 }
      )
    }

    // テーブル名マッピング（型安全）
    const tableMapping: Record<string, ValidTableName> = {
      course: 'learning_courses',
      genre: 'learning_genres', 
      theme: 'learning_themes',
      session: 'learning_sessions',
      content: 'session_contents',
      quiz: 'session_quizzes'
    }

    const tableName = tableMapping[type]
    if (!tableName || !isValidTableName(tableName)) {
      return NextResponse.json(
        { error: 'Invalid type parameter' },
        { status: 400 }
      )
    }

    let response: IdCheckResponse

    // IDが提供されている場合は重複チェック
    if (id) {
      let query = supabaseAdmin
        .from(tableName)
        .select('id')
        .eq('id', id)

      // 更新時は自分自身を除外
      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data: existing, error: checkError } = await query.single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('ID check error:', checkError)
        return NextResponse.json(
          { error: 'ID重複チェックに失敗しました' },
          { status: 500 }
        )
      }

      const available = !existing

      if (available) {
        response = {
          available: true,
          message: 'IDは使用可能です'
        }
      } else {
        // 重複している場合は代替提案
        let suggested: string | undefined
        if (title) {
          const baseId = await generateSuggestedId(title, type)
          suggested = await findAvailableId(tableName, baseId, excludeId)
        }

        response = {
          available: false,
          message: 'IDは既に使用されています',
          ...(suggested && { suggested })
        }
      }
    } else if (title) {
      // IDが未提供でタイトルがある場合は自動提案のみ
      const baseId = await generateSuggestedId(title, type)
      const suggested = await findAvailableId(tableName, baseId, excludeId)

      response = {
        available: true,
        suggested,
        message: 'IDを自動生成しました'
      }
    } else {
      return NextResponse.json(
        { error: 'Either id or title must be provided' },
        { status: 400 }
      )
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Check ID API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

