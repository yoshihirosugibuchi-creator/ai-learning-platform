/**
 * OpenAI プロバイダー（スタブ実装）
 */

import type { AIProvider, AIScoringRequest, AIScoringResponse } from './types'

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai' as const

  isAvailable(): boolean {
    return false
  }

  async score(_request: AIScoringRequest): Promise<AIScoringResponse> {
    throw new Error('OpenAI provider is not yet available')
  }
}
