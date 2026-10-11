/**
 * API contract types (01-ARCHITECTURE §9).
 *
 * Hand-written until the backend publishes `api/docs/openapi.json`; then
 * `pnpm gen:api` produces `schema.d.ts` and these become aliases of the
 * generated components (CI fails if the generated file drifts).
 */

export type Uuid = string
/** ISO-8601 UTC timestamp. */
export type Timestamp = string

// --- Auth -------------------------------------------------------------------

export interface User {
  id: Uuid
  email: string
  created_at: Timestamp
}

export interface Credentials {
  email: string
  password: string
}

export interface AccessToken {
  access_token: string
  token_type: "Bearer"
  /** Seconds. */
  expires_in: number
}

export interface AuthResponse extends AccessToken {
  user: User
}

// --- PDFs -------------------------------------------------------------------

export type PdfStatus = "pending" | "processing" | "ready" | "failed"

export interface Pdf {
  id: Uuid
  name: string
  size_bytes: number
  page_count: number | null
  chunk_count: number | null
  status: PdfStatus
  error: string | null
  created_at: Timestamp
  ingested_at: Timestamp | null
  /**
   * Not in the 01 §9 contract yet; the library card shows it when present
   * (04 §4.2 meta line "3 conversations").
   */
  conversation_count?: number
}

export interface PdfDetail extends Pdf {
  download_url: string
  download_url_expires_at: Timestamp
}

export interface Page<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

// --- Conversations ------------------------------------------------------------

export type Axis = "llm" | "retriever" | "memory"

export interface Components {
  llm: string
  retriever: string
  memory: string
}

export interface ConversationSummary {
  id: Uuid
  pdf_id: Uuid
  title: string
  components: Components
  pinned: boolean
  message_count: number
  last_message_at: Timestamp | null
  created_at: Timestamp
}

export type Conversation = ConversationSummary

export interface ConversationDetail extends Conversation {
  messages: Message[]
}

export interface CreateConversation {
  title?: string
  components?: Partial<Components>
}

// --- Messages -----------------------------------------------------------------

export type MessageRole = "human" | "assistant" | "system"

export type FinishReason =
  "stop" | "end_turn" | "max_tokens" | "client_disconnect" | "error"

export interface Source {
  chunk_id: string
  page: number
  /** Cosine similarity in [0, 1]. */
  score: number
  snippet: string
}

export interface Usage {
  model: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  cost_usd: number
}

export interface Score {
  value: 1 | -1
  comment: string | null
}

export interface Message {
  id: Uuid
  conversation_id: Uuid
  seq: number
  role: MessageRole
  content: string
  sources?: Source[] | null
  usage?: Usage | null
  latency_ms?: number | null
  finish_reason?: FinishReason | null
  created_at: Timestamp
  score?: Score | null
}

export interface SendMessageResponse {
  user_message: Message
  assistant_message: Message
}

// --- Streaming (01 §8.3) --------------------------------------------------------

export interface StreamMessageStart {
  user_message_id: Uuid
  assistant_message_id: Uuid
  seq: number
}

export type StreamUsage = Omit<Usage, "model"> & { model?: string }

export interface StreamMessageEnd {
  assistant_message: Message
}

// --- Scores & experiments ---------------------------------------------------------

export interface ScoreRequest {
  value: 1 | -1
  comment?: string
}

export interface ScoreResponse {
  message_id: Uuid
  value: 1 | -1
  comment: string | null
}

export interface Arm {
  id: string
  description: string
  enabled: boolean
}

export type ComponentCatalog = Record<Axis, Arm[]>

export interface CombinationStats {
  llm: string
  retriever: string
  memory: string
  conversations: number
  scores: number
  /** Mean of thumbs in [-1, 1]; null when there are no scores. */
  mean: number | null
  up: number
  down: number
}

export interface MarginalStats {
  arm: string
  scores: number
  mean: number | null
  up: number
  down: number
}

export interface ExperimentSummary {
  combinations: CombinationStats[]
  marginals: Record<Axis, MarginalStats[]>
  generated_at: Timestamp
}

// --- Usage ------------------------------------------------------------------------

export interface UsagePeriod {
  tokens: number
  cost_usd: number
  messages: number
}

export interface UsageMe {
  today: UsagePeriod
  month: UsagePeriod
  limits: { daily_tokens: number }
}
