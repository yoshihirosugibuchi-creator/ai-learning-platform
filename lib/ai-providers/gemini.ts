/**
 * Gemini プロバイダー（スタブ実装）
 */

import type { AIProvider, AIScoringRequest, AIScoringResponse } from './types'

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini' as const

  isAvailable(): boolean {
    return false
  }

  async score(_request: AIScoringRequest): Promise<AIScoringResponse> {
    throw new Error('Gemini provider is not yet available')
  }
}
