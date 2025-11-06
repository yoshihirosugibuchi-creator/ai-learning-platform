import { NextRequest, NextResponse } from 'next/server'
import { syncAllFallbackData, syncXPSettings, syncQuizQuestions, syncLearningCourses, syncWisdomCards, syncStaticData } from '@/scripts/sync-all-fallback-data'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isSystemAdmin } from '@/lib/auth-helpers'

export async function POST(request: NextRequest) {
  console.log('🌐 API POST /admin/fallback-sync が呼び出されました')
  console.log('🔗 URL:', request.url)
  console.log('🔑 Authorization header exists:', !!request.headers.get('authorization'))
  
  try {
    // 現在のユーザーを取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '認証トークンが必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // システム管理者権限チェック  
    console.log(`👤 ユーザー認証成功: ${user.id} (${user.email})`)
    
    try {
      const hasAdminPermission = await isSystemAdmin(user.id)
      console.log(`🔐 システム管理者権限チェック結果: ${hasAdminPermission}`)
      
      if (!hasAdminPermission) {
        console.log(`❌ 権限不足でアクセス拒否: ${user.id} (${user.email})`)
        return NextResponse.json(
          { success: false, error: 'システム管理者権限が必要です' },
          { status: 403 }
        )
      }
      
      console.log(`✅ 権限チェック通過: ${user.id}`)
    } catch (permError) {
      console.error(`❌ 権限チェック処理エラー:`, permError)
      return NextResponse.json(
        { success: false, error: '権限確認中にエラーが発生しました' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const syncType = searchParams.get('type') || 'all'

    console.log(`==========================================`)
    console.log(`🔄 フォールバック同期開始: ${syncType}`)
    console.log(`👤 実行ユーザー: ${user.email}`)
    console.log(`==========================================`)

    let result

    switch (syncType) {
      case 'xp':
        result = await syncXPSettings()
        break
      case 'quiz':
        result = await syncQuizQuestions()
        break
      case 'hints':
        // ヒント機能はクイズ問題に統合済み
        result = await syncQuizQuestions()
        break
      case 'courses':
        result = await syncLearningCourses()
        break
      case 'wisdom':
        result = await syncWisdomCards()
        break
      case 'static':
        result = await syncStaticData()
        break
      case 'all':
      default:
        result = await syncAllFallbackData()
        break
    }

    if ('successful' in result) {
      // 全体同期の場合
      return NextResponse.json({
        success: true,
        message: `フォールバック同期完了 (${result.successful}/${result.totalSynced}件成功)`,
        data: result
      })
    } else {
      // 個別同期の場合
      return NextResponse.json({
        success: result.success,
        message: result.success 
          ? `${result.dataType}の同期が完了しました (${result.recordCount}件)`
          : `${result.dataType}の同期に失敗しました: ${result.error}`,
        data: result
      })
    }

  } catch (error) {
    console.error('❌ フォールバック同期API エラー:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: '同期処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : JSON.stringify(error)
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // 認証チェック（GETでも必要）
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '認証トークンが必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // システム管理者権限チェック
    const hasAdminPermission = await isSystemAdmin(user.id)
    if (!hasAdminPermission) {
      return NextResponse.json(
        { error: 'システム管理者権限が必要です' },
        { status: 403 }
      )
    }

    // フォールバック状況確認API
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'status') {
      // 各フォールバックファイルの最終更新時刻を取得
      const fs = await import('fs')
      const path = await import('path')

      const fallbackFiles = [
        { 
          name: 'XP/SKP設定', 
          path: 'lib/xp-settings-fallback.generated.ts',
          type: 'typescript' 
        },
        { 
          name: 'クイズ問題＋ヒント統合', 
          path: 'public/questions.json',
          type: 'json' 
        },
        { 
          name: 'コース学習', 
          path: 'public/data/learning-courses-fallback.json',
          type: 'json' 
        },
        { 
          name: '格言カード', 
          path: 'public/data/wisdom-cards-fallback.json',
          type: 'json' 
        },
        { 
          name: 'カテゴリー', 
          path: 'public/data/categories-fallback.json',
          type: 'json' 
        }
      ]

      const status = await Promise.all(
        fallbackFiles.map(async (file) => {
          try {
            const fullPath = path.join(process.cwd(), file.path)
            const stats = fs.statSync(fullPath)
            
            // ファイル内容から生成時刻を取得
            let generatedAt = null
            try {
              const content = fs.readFileSync(fullPath, 'utf8')
              if (file.type === 'typescript') {
                const match = content.match(/generatedAt: '([^']+)'/)
                if (match) generatedAt = match[1]
              } else {
                const data = JSON.parse(content)
                generatedAt = data.metadata?.generatedAt || data.generatedAt
              }
            } catch (parseError) {
              console.warn(`ファイル解析エラー ${file.path}:`, parseError)
            }

            return {
              name: file.name,
              path: file.path,
              exists: true,
              lastModified: stats.mtime.toISOString(),
              generatedAt: generatedAt || stats.mtime.toISOString(),
              sizeKB: Math.round(stats.size / 1024),
              status: 'ok'
            }
          } catch (error) {
            return {
              name: file.name,
              path: file.path,
              exists: false,
              lastModified: null,
              generatedAt: null,
              sizeKB: 0,
              status: 'missing',
              error: error instanceof Error ? error.message : JSON.stringify(error)
            }
          }
        })
      )

      return NextResponse.json({
        success: true,
        fallbackStatus: status,
        summary: {
          total: status.length,
          existing: status.filter(s => s.exists).length,
          missing: status.filter(s => !s.exists).length
        }
      })
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Invalid action parameter' 
    }, { status: 400 })

  } catch (error) {
    console.error('❌ フォールバック状況確認エラー:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: '状況確認中にエラーが発生しました',
        details: error instanceof Error ? error.message : JSON.stringify(error)
      },
      { status: 500 }
    )
  }
}