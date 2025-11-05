// Vercel Cron Jobs診断API
// cron jobsの設定と実行状況を詳細に診断

import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/debug/cron-diagnosis
 * Vercel Cron Jobs の診断情報を出力
 */
export async function GET(request: NextRequest) {
  try {
    // 環境情報
    const environment = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL
    }

    // 現在時刻（UTC & JST）
    const now = new Date()
    const utcTime = now.toISOString()
    const jstTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).toISOString()

    // Cron設定情報
    const cronConfig = {
      schedule: "0 17 * * *", // vercel.jsonから
      description: "毎日17:00 UTC = 日本時間 2:00 AM",
      next_execution_utc: getNextCronExecution(),
      next_execution_jst: getNextCronExecutionJST()
    }

    // 環境変数チェック
    const envCheck = {
      CRON_SECRET: !!process.env.CRON_SECRET,
      SYSTEM_AUTH_TOKEN: !!process.env.SYSTEM_AUTH_TOKEN,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }

    // リクエストヘッダー情報
    const headers = {
      'user-agent': request.headers.get('user-agent'),
      'x-vercel-cron': request.headers.get('x-vercel-cron'),
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
      'authorization': request.headers.get('authorization') ? 'Bearer ***' : null
    }

    // Cron endpoint テスト
    const cronTestResult = await testCronEndpoint()

    return NextResponse.json({
      success: true,
      diagnosis_time: utcTime,
      environment,
      time_info: {
        current_utc: utcTime,
        current_jst: jstTime,
        utc_hour: now.getUTCHours(),
        jst_hour: new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getHours()
      },
      cron_config: cronConfig,
      environment_variables: envCheck,
      request_headers: headers,
      cron_test: cronTestResult,
      recommendations: generateRecommendations(envCheck, cronTestResult)
    })

  } catch (error) {
    console.error('[診断] エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Cron診断中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * 次回cron実行時刻計算（UTC）
 */
function getNextCronExecution(): string {
  const now = new Date()
  const next = new Date(now)
  
  // 明日の17:00 UTCに設定
  next.setUTCDate(next.getUTCDate() + 1)
  next.setUTCHours(17, 0, 0, 0)
  
  // 今日の17:00がまだ来ていない場合は今日
  if (now.getUTCHours() < 17) {
    next.setUTCDate(now.getUTCDate())
  }
  
  return next.toISOString()
}

/**
 * 次回cron実行時刻計算（JST）
 */
function getNextCronExecutionJST(): string {
  const nextUTC = new Date(getNextCronExecution())
  return new Date(nextUTC.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).toISOString()
}

/**
 * Cronエンドポイントテスト
 */
async function testCronEndpoint(): Promise<any> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    
    // HEADリクエストでヘルスチェック
    const headResponse = await fetch(`${baseUrl}/api/cron/daily-analytics`, {
      method: 'HEAD',
      headers: {
        'x-vercel-cron': '1'
      }
    })

    return {
      success: headResponse.ok,
      status: headResponse.status,
      headers: Object.fromEntries(headResponse.headers.entries()),
      available: headResponse.status !== 404
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      available: false
    }
  }
}

/**
 * 推奨事項生成
 */
function generateRecommendations(envCheck: any, cronTest: any): string[] {
  const recommendations: string[] = []

  if (!envCheck.CRON_SECRET) {
    recommendations.push('CRON_SECRET環境変数が設定されていません')
  }
  
  if (!envCheck.SYSTEM_AUTH_TOKEN) {
    recommendations.push('SYSTEM_AUTH_TOKEN環境変数が設定されていません')
  }

  if (!cronTest.success) {
    recommendations.push('Cronエンドポイントのテストが失敗しました')
  }

  if (!cronTest.available) {
    recommendations.push('Cronエンドポイントにアクセスできません')
  }

  if (recommendations.length === 0) {
    recommendations.push('設定は正常です。Vercel Dashboardでcron jobsが有効化されているか確認してください')
  }

  return recommendations
}