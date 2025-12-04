/**
 * Ollama Client Wrapper for SEO Brain
 *
 * Handles all communication with Ollama API
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:32b'

export interface OllamaGenerateOptions {
  prompt: string
  system?: string
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export class OllamaClient {
  private baseUrl: string
  private defaultModel: string

  constructor(baseUrl?: string, defaultModel?: string) {
    this.baseUrl = baseUrl || OLLAMA_BASE_URL
    this.defaultModel = defaultModel || OLLAMA_MODEL
  }

  /**
   * Generate text completion
   */
  async generate(options: OllamaGenerateOptions): Promise<string> {
    try {
      const requestBody: any = {
        model: options.model || this.defaultModel,
        prompt: options.prompt,
        stream: options.stream || false,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 2000,
        },
      }

      // Add system prompt if provided
      if (options.system) {
        requestBody.system = options.system
      }

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.response || ''
    } catch (error) {
      console.error('[Ollama] Generation error:', error)
      throw error
    }
  }

  /**
   * Generate JSON response (for structured data)
   */
  async generateJSON<T = any>(options: OllamaGenerateOptions): Promise<T> {
    const response = await this.generate(options)

    try {
      // Extract JSON from response (sometimes model wraps it in markdown)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      // Try parsing raw response
      return JSON.parse(response)
    } catch (error) {
      console.error('[Ollama] JSON parse error:', error)
      console.error('[Ollama] Raw response:', response)
      throw new Error('Failed to parse JSON from Ollama response')
    }
  }

  /**
   * Test connection to Ollama
   */
  async testConnection(): Promise<{ success: boolean; model?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const data = await response.json()
      const models = data.models || []

      // Check if default model is available
      const modelExists = models.some((m: any) => m.name === this.defaultModel)

      if (!modelExists) {
        return {
          success: false,
          error: `Model "${this.defaultModel}" not found. Available: ${models.map((m: any) => m.name).join(', ')}`,
        }
      }

      return {
        success: true,
        model: this.defaultModel,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }
    }
  }

  /**
   * Get available models
   */
  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      const data = await response.json()
      return data.models?.map((m: any) => m.name) || []
    } catch (error) {
      console.error('[Ollama] Failed to fetch models:', error)
      return []
    }
  }
}

/**
 * Create singleton instance
 */
export const ollamaClient = new OllamaClient()
