import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_request: NextRequest) {
  try {
    console.log('🔍 user_xp_stats_v2 統計データ整合性調査開始')

    // 1. user_xp_stats_v2の現在の状況を取得
    const { data: xpStats, error: xpError } = await supabaseAdmin
      .from('user_xp_stats_v2')
      .select('*')
      .order('user_id')

    if (xpError) {
      throw new Error(`XP統計取得エラー: ${xpError.message}`)
    }

    console.log(`📊 XP統計レコード数: ${xpStats?.length || 0}`)

    const analysis = []

    // 各ユーザーの統計データ整合性をチェック
    for (const userStat of xpStats || []) {
      const userId = userStat.user_id
      console.log(`\n🔍 ユーザー ${userId} の統計整合性チェック`)

      const userAnalysis = {
        user_id: userId,
        xp_stats: {
          knowledge_cards_total: userStat.knowledge_cards_total,
          badges_total: userStat.badges_total,
          current_level: userStat.current_level,
          total_xp: userStat.total_xp
        },
        actual_data: {
          knowledge_cards_count: 0,
          badges_count: 0,
          calculated_level: 0
        },
        discrepancies: [] as string[]
      }

      try {
        // 2. 実際のナレッジカード数を取得
        const { data: knowledgeCards, error: kcError } = await supabaseAdmin
          .from('user_knowledge_collection_v2')
          .select('id')
          .eq('user_id', userId)

        if (!kcError && knowledgeCards) {
          userAnalysis.actual_data.knowledge_cards_count = knowledgeCards.length
          
          if (userStat.knowledge_cards_total !== knowledgeCards.length) {
            userAnalysis.discrepancies.push(
              `ナレッジカード数不一致: 統計=${userStat.knowledge_cards_total}, 実際=${knowledgeCards.length}`
            )
          }
        } else if (kcError) {
          userAnalysis.discrepancies.push(`ナレッジカード取得エラー: ${kcError.message}`)
        }

        // 3. 実際のバッジ数を取得
        const { data: badges, error: badgeError } = await supabaseAdmin
          .from('user_badges')
          .select('id')
          .eq('user_id', userId)

        if (!badgeError && badges) {
          userAnalysis.actual_data.badges_count = badges.length
          
          if (userStat.badges_total !== badges.length) {
            userAnalysis.discrepancies.push(
              `バッジ数不一致: 統計=${userStat.badges_total}, 実際=${badges.length}`
            )
          }
        } else if (badgeError) {
          userAnalysis.discrepancies.push(`バッジ取得エラー: ${badgeError.message}`)
        }

        // 4. レベル計算の確認（XPベース）
        // レベル計算ロジックを確認（仮定: 1000XPごとに1レベル）
        const calculatedLevel = Math.floor(userStat.total_xp / 1000)
        userAnalysis.actual_data.calculated_level = calculatedLevel
        
        if (userStat.current_level !== calculatedLevel) {
          userAnalysis.discrepancies.push(
            `レベル不一致: 統計=${userStat.current_level}, 計算=${calculatedLevel} (XP=${userStat.total_xp})`
          )
        }

      } catch (error) {
        userAnalysis.discrepancies.push(`分析エラー: ${error}`)
      }

      analysis.push(userAnalysis)
    }

    // 5. 統計サマリーを作成
    const totalUsers = analysis.length
    const usersWithDiscrepancies = analysis.filter(user => user.discrepancies.length > 0).length
    const knowledgeCardIssues = analysis.filter(user => 
      user.discrepancies.some(d => d.includes('ナレッジカード数不一致'))
    ).length
    const badgeIssues = analysis.filter(user => 
      user.discrepancies.some(d => d.includes('バッジ数不一致'))
    ).length
    const levelIssues = analysis.filter(user => 
      user.discrepancies.some(d => d.includes('レベル不一致'))
    ).length

    console.log(`\n📋 統計サマリー:`)
    console.log(`- 総ユーザー数: ${totalUsers}`)
    console.log(`- 不整合があるユーザー数: ${usersWithDiscrepancies}`)
    console.log(`- ナレッジカード数不一致: ${knowledgeCardIssues}ユーザー`)
    console.log(`- バッジ数不一致: ${badgeIssues}ユーザー`)
    console.log(`- レベル不一致: ${levelIssues}ユーザー`)

    // 6. XP計算関連の処理を調査
    console.log(`\n🔍 XP更新処理の調査`)
    
    // XP更新APIの確認
    const _xpUpdateMethods = [
      '/app/api/xp-save/quiz/route.ts',
      '/app/api/xp-save/course/route.ts',
      '/lib/xp-calculation.ts',
      '/hooks/useXPStats.ts'
    ]

    return NextResponse.json({
      success: true,
      summary: {
        total_users: totalUsers,
        users_with_discrepancies: usersWithDiscrepancies,
        knowledge_card_issues: knowledgeCardIssues,
        badge_issues: badgeIssues,
        level_issues: levelIssues,
        integrity_percentage: Math.round(((totalUsers - usersWithDiscrepancies) / totalUsers) * 100) || 100
      },
      user_analysis: analysis.slice(0, 10), // 最初の10ユーザーの詳細
      issues_only: analysis.filter(user => user.discrepancies.length > 0),
      recommendations: [
        '1. ナレッジカード獲得時の統計更新処理を確認',
        '2. バッジ獲得時の統計更新処理を確認',
        '3. レベル計算ロジックの一貫性を確認',
        '4. XP統計更新のトランザクション処理を確認',
        '5. データ修復処理の実装を検討'
      ],
      next_steps: [
        'XP更新APIの詳細調査',
        'ナレッジカード・バッジ獲得処理の調査',
        '統計修復処理の実装',
        '再発防止のための整合性チェック実装'
      ]
    })

  } catch (error) {
    console.error('❌ 統計整合性調査エラー:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}