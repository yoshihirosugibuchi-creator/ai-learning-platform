/**
 * AIプロバイダーファクトリ
 *
 * 解決順序:
 * 1. 問題個別設定 (scoring_ai_provider)
 * 2. 管理画面デフォルト (ai_system_config.case_study_scoring_provider)
 * 3. "huggingface" ハードコード
 */

import type { AIProvider, AIProviderName } from './types'
import { HuggingFaceProvider } from './huggingface'
import { OpenAIProvider } from './openai'
import { AnthropicProvider } from './anthropic'
import { GeminiProvider } from './gemini'

export type { AIProvider, AIProviderName, AIScoringRequest, AIScoringResponse } from './types'

const providers: Record<AIProviderName, AIProvider> = {
  huggingface: new HuggingFaceProvider(),
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  gemini: new GeminiProvider(),
}

/** 名前からプロバイダーを取得 */
export function getProvider(name: AIProviderName): AIProvider {
  const provider = providers[name]
  if (!provider) {
    throw new Error(`Unknown AI provider: ${name}`)
  }
  return provider
}

/** 利用可能なプロバイダー一覧を返す */
export function getAllProviders(): Array<{ name: AIProviderName; available: boolean }> {
  return Object.values(providers).map(p => ({
    name: p.name,
    available: p.isAvailable(),
  }))
}

/**
 * 問題に最適なプロバイダーを決定する
 *
 * @param problemProviderOverride 問題に設定された個別プロバイダー (NULL可)
 * @param systemDefault システムデフォルトプロバイダー (NULL可)
 */
export function getProviderForProblem(
  problemProviderOverride: string | null,
  systemDefault: string | null
): AIProvider {
  // 1. 問題個別設定
  if (problemProviderOverride && problemProviderOverride in providers) {
    const provider = providers[problemProviderOverride as AIProviderName]
    if (provider.isAvailable()) return provider
  }

  // 2. 管理画面デフォルト
  if (systemDefault && systemDefault in providers) {
    const provider = providers[systemDefault as AIProviderName]
    if (provider.isAvailable()) return provider
  }

  // 3. HuggingFace フォールバック
  const hf = providers.huggingface
  if (hf.isAvailable()) return hf

  throw new Error('No available AI scoring provider found')
}
