// 簡単な通知システム
// バッチ処理失敗時のメール通知（オプション）

import { supabaseAdmin } from './supabase-admin'

// 通知設定
export const NOTIFICATION_CONFIG = {
  // メール通知の有効/無効（環境変数で制御）
  EMAIL_ENABLED: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
  
  // 通知対象（管理者メールアドレス）
  ADMIN_EMAIL: process.env.ADMIN_NOTIFICATION_EMAIL || '',
  
  // 通知のしきい値
  FAILURE_THRESHOLD: 2, // 連続2回失敗でメール送信
  
  // 通知間隔制限（同じエラーで連続送信を防ぐ）
  MIN_NOTIFICATION_INTERVAL_HOURS: 6
} as const

// 通知ログの型定義
export interface NotificationLog {
  id?: number
  notification_type: 'email' | 'webhook' | 'admin_alert'
  subject: string
  message: string
  recipient: string
  sent_at: string
  success: boolean
  error_message?: string
  related_batch_log_id?: number
}

/**
 * バッチ失敗時の通知送信
 */
export async function notifyBatchFailure(params: {
  batchLogId: number
  processDate: string
  processType: string
  errorMessage: string
  processedUsers: number
}): Promise<{
  success: boolean
  message: string
}> {
  
  try {
    // 1. 通知が有効かチェック
    if (!NOTIFICATION_CONFIG.EMAIL_ENABLED || !NOTIFICATION_CONFIG.ADMIN_EMAIL) {
      console.log('[通知] メール通知は無効化されています')
      return {
        success: true,
        message: 'メール通知は設定で無効化されています'
      }
    }

    // 2. 最近の失敗通知履歴をチェック（重複送信防止）
    const recentNotification = await checkRecentNotifications(
      params.processType,
      NOTIFICATION_CONFIG.MIN_NOTIFICATION_INTERVAL_HOURS
    )

    if (recentNotification.shouldSkip) {
      console.log('[通知] 最近同じ種類の通知を送信済みのためスキップ')
      return {
        success: true,
        message: `最近の通知送信により今回はスキップ (前回: ${recentNotification.lastSentAt})`
      }
    }

    // 3. 連続失敗回数をチェック
    const failureCount = await getConsecutiveFailureCount(params.processType)
    
    if (failureCount < NOTIFICATION_CONFIG.FAILURE_THRESHOLD) {
      console.log(`[通知] 失敗回数 ${failureCount} がしきい値 ${NOTIFICATION_CONFIG.FAILURE_THRESHOLD} 未満のため送信しない`)
      return {
        success: true,
        message: `失敗回数が通知しきい値 (${NOTIFICATION_CONFIG.FAILURE_THRESHOLD}) 未満`
      }
    }

    // 4. 通知メッセージ作成
    const subject = `[AI学習プラットフォーム] 日次バッチ処理失敗 (${params.processDate})`
    const message = createFailureNotificationMessage(params, failureCount)

    // 5. メール送信実行
    const emailResult = await sendNotificationEmail({
      to: NOTIFICATION_CONFIG.ADMIN_EMAIL,
      subject,
      message,
      batchLogId: params.batchLogId
    })

    // 6. 通知ログ記録
    await recordNotificationLog({
      notification_type: 'email',
      subject,
      message,
      recipient: NOTIFICATION_CONFIG.ADMIN_EMAIL,
      sent_at: new Date().toISOString(),
      success: emailResult.success,
      error_message: emailResult.error,
      related_batch_log_id: params.batchLogId
    })

    return emailResult

  } catch (error) {
    console.error('[通知] バッチ失敗通知エラー:', error)
    return {
      success: false,
      message: `通知送信エラー: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * 最近の通知履歴チェック（重複送信防止）
 */
async function checkRecentNotifications(
  processType: string,
  intervalHours: number
): Promise<{
  shouldSkip: boolean
  lastSentAt?: string
}> {
  
  try {
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - intervalHours)

    // notification_logs テーブルがない場合はコメントアウト済みの実装を想定
    // const { data: recentLogs } = await supabaseAdmin
    //   .from('notification_logs')
    //   .select('sent_at')
    //   .eq('notification_type', 'email')
    //   .ilike('subject', `%${processType}%`)
    //   .eq('success', true)
    //   .gte('sent_at', cutoffTime.toISOString())
    //   .order('sent_at', { ascending: false })
    //   .limit(1)

    // if (recentLogs && recentLogs.length > 0) {
    //   return {
    //     shouldSkip: true,
    //     lastSentAt: recentLogs[0].sent_at
    //   }
    // }

    return { shouldSkip: false }

  } catch (error) {
    console.error('[通知] 最近の通知履歴チェックエラー:', error)
    return { shouldSkip: false }
  }
}

/**
 * 連続失敗回数取得
 */
async function getConsecutiveFailureCount(processType: string): Promise<number> {
  try {
    const { data: recentLogs, error } = await supabaseAdmin
      .from('daily_analytics_batch_log')
      .select('status')
      .eq('process_type', processType)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error || !recentLogs) {
      console.error('[通知] 連続失敗回数取得エラー:', error)
      return 1
    }

    // 最新から連続で失敗している回数をカウント
    let consecutiveFailures = 0
    for (const log of recentLogs) {
      if (log.status === 'failed') {
        consecutiveFailures++
      } else {
        break
      }
    }

    return consecutiveFailures

  } catch (error) {
    console.error('[通知] 連続失敗回数計算エラー:', error)
    return 1
  }
}

/**
 * 失敗通知メッセージ作成
 */
function createFailureNotificationMessage(
  params: {
    batchLogId: number
    processDate: string
    processType: string
    errorMessage: string
    processedUsers: number
  },
  failureCount: number
): string {
  return `
AI学習プラットフォームの日次バッチ処理で障害が発生しました。

## 障害詳細
- **処理日**: ${params.processDate}
- **処理タイプ**: ${params.processType}
- **バッチID**: ${params.batchLogId}
- **処理ユーザー数**: ${params.processedUsers}人
- **連続失敗回数**: ${failureCount}回

## エラー内容
${params.errorMessage}

## 対応が必要な作業
1. 管理画面でエラー詳細を確認
2. 必要に応じて手動でバッチ再実行
3. 根本原因の調査と修正

## 管理画面
${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'}/admin/batch-analytics

---
このメールは自動送信されています。
AI学習プラットフォーム監視システム
`.trim()
}

/**
 * メール送信実行（簡易実装）
 */
async function sendNotificationEmail(params: {
  to: string
  subject: string
  message: string
  batchLogId: number
}): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  
  try {
    // メール送信サービスの実装
    // 利用可能なオプション:
    // 1. Resend API (推奨・簡単)
    // 2. SendGrid API
    // 3. AWS SES
    // 4. Nodemailer + SMTP

    // 環境に応じてコメントアウト解除・実装
    
    // Resend APIの例:
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
          to: params.to,
          subject: params.subject,
          text: params.message
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('[通知] メール送信成功:', result.id)
        return {
          success: true,
          message: `メール送信成功 (ID: ${result.id})`
        }
      } else {
        const error = await response.text()
        console.error('[通知] メール送信失敗:', error)
        return {
          success: false,
          message: 'メール送信失敗',
          error: error
        }
      }
    }

    // メール送信が設定されていない場合はログ出力のみ
    console.log('[通知] メール送信設定なし - ログ出力のみ')
    console.log('=== バッチ失敗通知 ===')
    console.log(`宛先: ${params.to}`)
    console.log(`件名: ${params.subject}`)
    console.log('内容:')
    console.log(params.message)
    console.log('====================')

    return {
      success: true,
      message: 'メール送信設定なし（ログ出力のみ）'
    }

  } catch (error) {
    console.error('[通知] メール送信例外:', error)
    return {
      success: false,
      message: 'メール送信例外',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * 通知ログ記録
 */
async function recordNotificationLog(log: Omit<NotificationLog, 'id'>): Promise<void> {
  try {
    // notification_logs テーブルが存在する場合の実装
    // const { error } = await supabaseAdmin
    //   .from('notification_logs')
    //   .insert(log)

    // if (error) {
    //   console.error('[通知] ログ記録エラー:', error.message)
    // }

    // テーブルがない場合はコンソールログのみ
    console.log('[通知] 通知ログ:', {
      type: log.notification_type,
      subject: log.subject,
      recipient: log.recipient,
      success: log.success,
      sent_at: log.sent_at
    })

  } catch (error) {
    console.error('[通知] 通知ログ記録例外:', error)
  }
}

/**
 * 通知システムのテスト送信
 */
export async function testNotificationSystem(): Promise<{
  success: boolean
  results: Array<{
    test: string
    success: boolean
    message: string
  }>
}> {
  
  const results = []

  // 1. 設定確認テスト
  const configTest = {
    test: '設定確認',
    success: NOTIFICATION_CONFIG.EMAIL_ENABLED && !!NOTIFICATION_CONFIG.ADMIN_EMAIL,
    message: NOTIFICATION_CONFIG.EMAIL_ENABLED 
      ? `メール通知有効 (宛先: ${NOTIFICATION_CONFIG.ADMIN_EMAIL})`
      : 'メール通知が無効化されています'
  }
  results.push(configTest)

  // 2. テスト通知送信
  if (configTest.success) {
    const testEmailResult = await sendNotificationEmail({
      to: NOTIFICATION_CONFIG.ADMIN_EMAIL,
      subject: '[テスト] 通知システム動作確認',
      message: `
これは通知システムのテストメールです。

送信日時: ${new Date().toLocaleString('ja-JP')}
システム: AI学習プラットフォーム

このメールを受信できている場合、通知システムは正常に動作しています。
`.trim(),
      batchLogId: 0
    })

    results.push({
      test: 'テストメール送信',
      success: testEmailResult.success,
      message: testEmailResult.message
    })
  }

  const overallSuccess = results.every(r => r.success)

  return {
    success: overallSuccess,
    results
  }
}

/**
 * 成功通知（日次サマリー）
 * 必要に応じて実装
 */
export async function notifyDailySummary(params: {
  date: string
  totalProcessedUsers: number
  executionTimeSeconds: number
  successfulBatches: number
  failedBatches: number
}): Promise<void> {
  
  // 成功時の日次サマリー通知（週1回程度の頻度で実装可能）
  console.log('[通知] 日次サマリー:', params)
  
  // 実装例:
  // - 毎週月曜日に前週のサマリーを送信
  // - 大きな問題がない場合はメール送信せず管理画面のみ
  // - 処理ユーザー数が異常に少ない場合のアラート
}