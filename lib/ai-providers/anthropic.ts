/**
 * Anthropic (Claude) プロバイダー（スタブ実装）
 */

import type { AIProvider, AIScoringRequest, AIScoringResponse } from './types'

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic' as const

  isAvailable(): boolean {
    return false
  }

  async score(_request: AIScoringRequest): Promise<AIScoringResponse> {
    throw new Error('Anthropic provider is not yet available')
  }
}
