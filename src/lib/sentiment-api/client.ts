/**
 * AWS Comprehend Sentiment Analysis Client
 * @see https://docs.aws.amazon.com/comprehend/latest/dg/API_Reference.html
 */

import type {
  SentimentApiConfig,
  SentimentLabel,
  SentimentResult,
  SentimentScores,
  ComprehendSentimentResponse,
  ComprehendBatchSentimentResponse,
  ComprehendKeyPhrasesResponse,
  ComprehendEntitiesResponse,
  BatchAnalysisResult,
  CommentForAnalysis,
} from './types'
import { requiresResponse } from './types'

export class SentimentApiError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'SentimentApiError'
    this.code = code
  }
}

export class SentimentApiClient {
  private accessKeyId: string
  private secretAccessKey: string
  private region: string
  private endpoint: string

  constructor(config: SentimentApiConfig) {
    this.accessKeyId = config.accessKeyId
    this.secretAccessKey = config.secretAccessKey
    this.region = config.region
    this.endpoint = `https://comprehend.${config.region}.amazonaws.com`
  }

  /**
   * Sign AWS request using AWS Signature Version 4
   */
  private async signRequest(method: string, body: string, target: string): Promise<Headers> {
    const date = new Date()
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.slice(0, 8)

    const headers = new Headers({
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Date': amzDate,
      'X-Amz-Target': `Comprehend_20171127.${target}`,
      Host: `comprehend.${this.region}.amazonaws.com`,
    })

    // Create canonical request
    const canonicalUri = '/'
    const canonicalQueryString = ''
    const signedHeaders = 'content-type;host;x-amz-date;x-amz-target'

    const payloadHash = await this.sha256(body)
    const canonicalHeaders =
      `content-type:application/x-amz-json-1.1\n` +
      `host:comprehend.${this.region}.amazonaws.com\n` +
      `x-amz-date:${amzDate}\n` +
      `x-amz-target:Comprehend_20171127.${target}\n`

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n')

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256'
    const credentialScope = `${dateStamp}/${this.region}/comprehend/aws4_request`
    const canonicalRequestHash = await this.sha256(canonicalRequest)
    const stringToSign = [algorithm, amzDate, credentialScope, canonicalRequestHash].join('\n')

    // Calculate signature
    const kDate = await this.hmac(`AWS4${this.secretAccessKey}`, dateStamp)
    const kRegion = await this.hmac(kDate, this.region)
    const kService = await this.hmac(kRegion, 'comprehend')
    const kSigning = await this.hmac(kService, 'aws4_request')
    const signature = await this.hmacHex(kSigning, stringToSign)

    // Add authorization header
    const authHeader =
      `${algorithm} Credential=${this.accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`

    headers.set('Authorization', authHeader)

    return headers
  }

  /**
   * SHA256 hash
   */
  private async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * HMAC-SHA256
   */
  private async hmac(key: string | ArrayBuffer, message: string): Promise<ArrayBuffer> {
    const keyBuffer = typeof key === 'string' ? new TextEncoder().encode(key) : key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
  }

  /**
   * HMAC-SHA256 with hex output
   */
  private async hmacHex(key: ArrayBuffer, message: string): Promise<string> {
    const result = await this.hmac(key, message)
    return Array.from(new Uint8Array(result))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * Make a request to AWS Comprehend
   */
  private async request<T>(target: string, body: object): Promise<T> {
    const bodyStr = JSON.stringify(body)
    const headers = await this.signRequest('POST', bodyStr, target)

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: bodyStr,
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.Message || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new SentimentApiError(errorMessage, 'AWS_ERROR')
    }

    return response.json() as Promise<T>
  }

  /**
   * Detect sentiment for a single text
   */
  async detectSentiment(text: string, language: string = 'en'): Promise<SentimentResult> {
    // Truncate text if too long (Comprehend limit is 5000 bytes)
    const truncatedText = text.slice(0, 4500)

    const response = await this.request<ComprehendSentimentResponse>('DetectSentiment', {
      Text: truncatedText,
      LanguageCode: language,
    })

    // Get key phrases
    const keyPhrasesResponse = await this.request<ComprehendKeyPhrasesResponse>(
      'DetectKeyPhrases',
      {
        Text: truncatedText,
        LanguageCode: language,
      }
    )

    // Get entities
    const entitiesResponse = await this.request<ComprehendEntitiesResponse>('DetectEntities', {
      Text: truncatedText,
      LanguageCode: language,
    })

    // Map sentiment to score key
    const sentimentToKey: Record<SentimentLabel, keyof SentimentScores> = {
      POSITIVE: 'Positive',
      NEGATIVE: 'Negative',
      NEUTRAL: 'Neutral',
      MIXED: 'Mixed',
    }

    return {
      text: truncatedText,
      sentiment: response.Sentiment,
      confidence: response.SentimentScore[sentimentToKey[response.Sentiment]],
      scores: {
        positive: response.SentimentScore.Positive,
        negative: response.SentimentScore.Negative,
        neutral: response.SentimentScore.Neutral,
        mixed: response.SentimentScore.Mixed,
      },
      keyPhrases: keyPhrasesResponse.KeyPhrases.map((kp) => kp.Text).slice(0, 10),
      entities: entitiesResponse.Entities.map((e) => ({
        text: e.Text,
        type: e.Type,
        score: e.Score,
      })).slice(0, 10),
      language,
    }
  }

  /**
   * Batch detect sentiment for multiple texts
   * AWS Comprehend supports up to 25 documents per batch
   */
  async batchDetectSentiment(
    texts: string[],
    language: string = 'en'
  ): Promise<BatchAnalysisResult> {
    const results: SentimentResult[] = []
    const errors: Array<{ index: number; error: string }> = []

    // Process in batches of 25
    const batchSize = 25
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize).map((t) => t.slice(0, 4500))

      try {
        const response = await this.request<ComprehendBatchSentimentResponse>(
          'BatchDetectSentiment',
          {
            TextList: batch,
            LanguageCode: language,
          }
        )

        // Process successful results
        for (const result of response.ResultList) {
          const originalIndex = i + result.Index
          // Map sentiment to score key
          const scoreKey = (result.Sentiment.charAt(0) +
            result.Sentiment.slice(1).toLowerCase()) as
            | 'Positive'
            | 'Negative'
            | 'Neutral'
            | 'Mixed'
          results.push({
            text: texts[originalIndex]!,
            sentiment: result.Sentiment,
            confidence: result.SentimentScore[scoreKey],
            scores: {
              positive: result.SentimentScore.Positive,
              negative: result.SentimentScore.Negative,
              neutral: result.SentimentScore.Neutral,
              mixed: result.SentimentScore.Mixed,
            },
            keyPhrases: [], // Batch doesn't include key phrases
            entities: [],
            language,
          })
        }

        // Process errors
        for (const error of response.ErrorList) {
          errors.push({
            index: i + error.Index,
            error: error.ErrorMessage,
          })
        }
      } catch (error) {
        // Mark entire batch as failed
        for (let j = 0; j < batch.length; j++) {
          errors.push({
            index: i + j,
            error: error instanceof Error ? error.message : 'Batch processing failed',
          })
        }
      }
    }

    return {
      analyzed: results.length,
      failed: errors.length,
      results,
      errors,
    }
  }

  /**
   * Analyze comments with full sentiment, key phrases, and entities
   */
  async analyzeComments(
    comments: CommentForAnalysis[],
    language: string = 'en'
  ): Promise<Array<SentimentResult & { commentId: string; requiresResponse: boolean }>> {
    const results: Array<SentimentResult & { commentId: string; requiresResponse: boolean }> = []

    // Process one at a time to get full analysis
    // In production, you might want to batch sentiment and fetch key phrases separately
    for (const comment of comments) {
      try {
        const result = await this.detectSentiment(comment.text, language)
        results.push({
          ...result,
          commentId: comment.id,
          requiresResponse: requiresResponse(result.sentiment, result.confidence),
        })
      } catch (error) {
        // Log error but continue with other comments
        console.error(`Failed to analyze comment ${comment.id}:`, error)
      }
    }

    return results
  }

  /**
   * Validate API credentials
   */
  async validateCredentials(): Promise<boolean> {
    try {
      await this.detectSentiment('test', 'en')
      return true
    } catch {
      return false
    }
  }
}

/**
 * Create a SentimentApiClient from environment variables
 */
export function createSentimentClientFromEnv(): SentimentApiClient | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const region = process.env.AWS_REGION ?? 'eu-west-1'

  if (!accessKeyId || !secretAccessKey) {
    console.warn('Sentiment API: AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY not configured')
    return null
  }

  return new SentimentApiClient({
    accessKeyId,
    secretAccessKey,
    region,
  })
}
