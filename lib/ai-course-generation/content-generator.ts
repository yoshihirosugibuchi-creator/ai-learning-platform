/**
 * AIコンテンツ生成エンジン
 * セッション別詳細コンテンツ・クイズ・ナレッジカードを生成
 */

import type { CourseGenerationWorkflow } from './types'
import { contentPromptBuilder, type SessionContentRequest } from './content-prompt-builder'

export interface SessionContentData {
  session_id: string
  content_type: 'text' | 'example' | 'key_points'
  title: string
  content: string | object
  duration: number
  display_order: number
}

export interface SessionQuizData {
  session_id: string
  question: string
  options: string[]
  correct_answer: number
  explanation: string
  display_order: number
}

export interface ContentGenerationResult {
  session_contents: SessionContentData[]
  session_quizzes: SessionQuizData[]
  key_learning_points: string[]
  recommended_next_actions: string[]
}

export interface ContentGenerationOptions {
  mode: 'manual' | 'api'
  includeQuizzes: boolean
  contentDepth: 'basic' | 'standard' | 'detailed'
  languageStyle: 'formal' | 'casual' | 'technical'
}

export class ContentGenerator {
  
  /**
   * セッション別コンテンツ生成
   */
  async generateSessionContent(
    workflow: CourseGenerationWorkflow,
    sessionRequest: SessionContentRequest,
    options: ContentGenerationOptions = {
      mode: 'manual',
      includeQuizzes: true,
      contentDepth: 'standard',
      languageStyle: 'formal'
    }
  ): Promise<{
    success: boolean
    result?: ContentGenerationResult
    prompt?: string
    error?: string
  }> {
    
    try {
      console.log(`📝 [ContentGenerator] セッションコンテンツ生成開始: ${sessionRequest.sessionTitle}`)
      
      // プロンプト生成
      const promptData = contentPromptBuilder.buildSessionContentPrompt(workflow, sessionRequest)
      console.log(`📋 [ContentGenerator] プロンプト生成完了 (${Math.ceil(promptData.prompt.length / 1000)}KB)`)
      
      if (options.mode === 'manual') {
        // 手動モード: プロンプトを返してユーザーがClaude Web Interfaceで実行
        return {
          success: true,
          prompt: promptData.prompt,
          result: undefined
        }
      } else {
        // APIモード: 将来のClaude API実装
        return await this.generateWithAPI(promptData.prompt, sessionRequest)
      }
      
    } catch (error) {
      console.error(`❌ [ContentGenerator] セッションコンテンツ生成エラー:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 手動AIレスポンス処理
   */
  async processManualAIResponse(
    sessionRequest: SessionContentRequest,
    aiResponse: string
  ): Promise<{
    success: boolean
    result?: ContentGenerationResult
    error?: string
  }> {
    
    try {
      console.log(`📥 [ContentGenerator] 手動AIレスポンス処理開始: ${sessionRequest.sessionTitle}`)
      
      // JSON形式検証・解析
      const parsedResponse = JSON.parse(aiResponse)
      
      // 必須フィールド検証
      if (!parsedResponse.session_contents || !Array.isArray(parsedResponse.session_contents)) {
        throw new Error('session_contents配列が見つかりません')
      }
      
      if (!parsedResponse.session_quizzes || !Array.isArray(parsedResponse.session_quizzes)) {
        throw new Error('session_quizzes配列が見つかりません')
      }
      
      // データ変換・正規化
      const sessionContents: SessionContentData[] = parsedResponse.session_contents.map((content: unknown, index: number) => {
        const contentObj = content as Record<string, unknown>
        return {
          session_id: sessionRequest.sessionId,
          content_type: this.validateContentType(contentObj.content_type as string),
          title: String(contentObj.title || `コンテンツ${index + 1}`),
          content: this.processContentData(contentObj.content, contentObj.content_type as string),
          duration: Math.max(1, parseInt(String(contentObj.duration)) || 3),
          display_order: parseInt(String(contentObj.display_order)) || index
        }
      })
      
      const sessionQuizzes: SessionQuizData[] = parsedResponse.session_quizzes.map((quiz: unknown, index: number) => {
        const quizObj = quiz as Record<string, unknown>
        return {
          session_id: sessionRequest.sessionId,
          question: String(quizObj.question || ''),
          options: Array.isArray(quizObj.options) ? quizObj.options.map(String) : [],
          correct_answer: Math.max(0, Math.min(3, parseInt(String(quizObj.correct_answer)) || 0)),
          explanation: String(quizObj.explanation || ''),
          display_order: parseInt(String(quizObj.display_order)) || index
        }
      })
      
      // バリデーション
      this.validateSessionContents(sessionContents)
      this.validateSessionQuizzes(sessionQuizzes)
      
      const result: ContentGenerationResult = {
        session_contents: sessionContents,
        session_quizzes: sessionQuizzes,
        key_learning_points: Array.isArray(parsedResponse.key_learning_points) 
          ? parsedResponse.key_learning_points.map(String)
          : [`${sessionRequest.sessionTitle}の重要ポイント`],
        recommended_next_actions: Array.isArray(parsedResponse.recommended_next_actions)
          ? parsedResponse.recommended_next_actions.map(String)
          : [`${sessionRequest.sessionTitle}の実践`]
      }
      
      console.log(`✅ [ContentGenerator] AIレスポンス処理完了`)
      console.log(`📝 コンテンツ数: ${result.session_contents.length}`)
      console.log(`❓ クイズ数: ${result.session_quizzes.length}`)
      
      return {
        success: true,
        result
      }
      
    } catch (error) {
      console.error(`❌ [ContentGenerator] AIレスポンス処理エラー:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 複数セッション一括コンテンツ生成
   */
  async generateBatchContent(
    workflow: CourseGenerationWorkflow,
    sessionRequests: SessionContentRequest[],
    options: ContentGenerationOptions = {
      mode: 'manual',
      includeQuizzes: true,
      contentDepth: 'standard',
      languageStyle: 'formal'
    }
  ): Promise<{
    success: boolean
    results: Array<{
      sessionId: string
      sessionTitle: string
      success: boolean
      result?: ContentGenerationResult
      prompt?: string
      error?: string
    }>
    totalPrompts?: string[]
  }> {
    
    console.log(`🚀 [ContentGenerator] 一括コンテンツ生成開始: ${sessionRequests.length}セッション`)
    
    const results = []
    const totalPrompts = []
    
    for (const sessionRequest of sessionRequests) {
      const result = await this.generateSessionContent(workflow, sessionRequest, options)
      
      results.push({
        sessionId: sessionRequest.sessionId,
        sessionTitle: sessionRequest.sessionTitle,
        success: result.success,
        result: result.result,
        prompt: result.prompt,
        error: result.error
      })
      
      if (result.prompt) {
        totalPrompts.push(`\n# ${sessionRequest.sessionTitle}\n\n${result.prompt}`)
      }
    }
    
    const successCount = results.filter(r => r.success).length
    console.log(`📊 [ContentGenerator] 一括生成完了: ${successCount}/${sessionRequests.length}成功`)
    
    return {
      success: successCount === sessionRequests.length,
      results,
      totalPrompts: options.mode === 'manual' ? totalPrompts : undefined
    }
  }

  // プライベートメソッド
  private validateContentType(type: string): 'text' | 'exercise' | 'image' | 'video' {
    const validTypes = ['text', 'exercise', 'image', 'video']
    return validTypes.includes(type) ? (type as 'text' | 'exercise' | 'image' | 'video') : 'text'
  }

  private processContentData(content: unknown, contentType: string): string | object {
    if (contentType === 'exercise' && typeof content === 'object' && content !== null) {
      return content // 演習は構造化データを保持
    }
    return String(content || '')
  }

  private validateSessionContents(contents: SessionContentData[]): void {
    if (contents.length === 0) {
      throw new Error('セッションコンテンツが空です')
    }

    for (const content of contents) {
      if (!content.title || !content.content) {
        throw new Error(`無効なコンテンツデータ: ${content.title}`)
      }
    }
  }

  private validateSessionQuizzes(quizzes: SessionQuizData[]): void {
    for (const quiz of quizzes) {
      if (!quiz.question || !quiz.options || quiz.options.length < 2) {
        throw new Error(`無効なクイズデータ: ${quiz.question}`)
      }
      
      if (quiz.correct_answer >= quiz.options.length) {
        throw new Error(`正解選択肢が範囲外: ${quiz.question}`)
      }
    }
  }

  private async generateWithAPI(_prompt: string, _sessionRequest: SessionContentRequest): Promise<{
    success: boolean
    result?: ContentGenerationResult
    error?: string
  }> {
    // TODO: Claude API統合実装
    console.log('🔮 [ContentGenerator] Claude API統合は未実装です')
    
    return {
      success: false,
      error: 'Claude API統合は未実装です。手動モードを使用してください。'
    }
  }
}

export const contentGenerator = new ContentGenerator()