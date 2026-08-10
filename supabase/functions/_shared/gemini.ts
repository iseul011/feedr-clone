// Gemini API 클라이언트 — Anthropic SDK 대체 (무료 티어 운영을 위해).
// 단발 생성(generateText)과 함수 호출 에이전트 루프(runGeminiAgent)를 제공한다.

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export interface GeminiTool {
  name: string
  description: string
  // deno-lint-ignore no-explicit-any
  inputSchema: Record<string, any>
  // deno-lint-ignore no-explicit-any
  run: (input: any) => Promise<string> | string
}

function modelId(): string {
  return Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.6-flash'
}

// Gemini 스키마는 OpenAPI 서브셋 — additionalProperties/$schema는 거부되므로 제거
// deno-lint-ignore no-explicit-any
export function sanitizeSchema(schema: any): any {
  if (Array.isArray(schema)) return schema.map(sanitizeSchema)
  if (schema === null || typeof schema !== 'object') return schema
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(schema)) {
    if (k === 'additionalProperties' || k === '$schema') continue
    out[k] = sanitizeSchema(v)
  }
  return out
}

// deno-lint-ignore no-explicit-any
async function call(body: unknown): Promise<any> {
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다')
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}/${modelId()}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.status === 429 && attempt < 2) {
      // 무료 티어 분당 한도(10 RPM) — 잠시 대기 후 재시도
      await new Promise((r) => setTimeout(r, 20_000))
      continue
    }
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`gemini api error: ${JSON.stringify(data).slice(0, 500)}`)
    return data
  }
}

interface Part {
  text?: string
  functionCall?: { name: string; args?: Record<string, unknown> }
}

// deno-lint-ignore no-explicit-any
function partsOf(data: any): Part[] {
  const parts = data.candidates?.[0]?.content?.parts
  if (!parts) {
    const block = data.promptFeedback?.blockReason
    throw new Error(block ? `요청이 차단되었습니다 (${block})` : 'gemini 빈 응답')
  }
  return parts as Part[]
}

export async function generateText(opts: {
  system: string
  prompt: string
  maxOutputTokens?: number
}): Promise<string> {
  const data = await call({
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
    generationConfig: { maxOutputTokens: opts.maxOutputTokens ?? 4096 },
  })
  return partsOf(data)
    .map((p) => p.text ?? '')
    .join('')
    .trim()
}

// 함수 호출 루프: 도구 호출이 없을 때까지 반복하고 마지막 텍스트를 보고서로 반환
export async function runGeminiAgent(opts: {
  system: string
  prompt: string
  tools: GeminiTool[]
  maxIterations?: number
  maxOutputTokens?: number
}): Promise<string> {
  const contents: unknown[] = [{ role: 'user', parts: [{ text: opts.prompt }] }]
  const declarations = opts.tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: sanitizeSchema(t.inputSchema),
  }))
  const byName = new Map(opts.tools.map((t) => [t.name, t]))

  for (let i = 0; i < (opts.maxIterations ?? 30); i++) {
    const data = await call({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents,
      tools: [{ functionDeclarations: declarations }],
      generationConfig: { maxOutputTokens: opts.maxOutputTokens ?? 8192 },
    })
    const parts = partsOf(data)
    contents.push({ role: 'model', parts })

    const calls = parts.filter((p) => p.functionCall)
    if (!calls.length) {
      return parts.map((p) => p.text ?? '').join('').trim()
    }
    const responses = []
    for (const c of calls) {
      const { name, args } = c.functionCall!
      const tool = byName.get(name)
      const result = tool
        ? await Promise.resolve(tool.run(args ?? {})).catch(
          (e) => `도구 실행 실패: ${e instanceof Error ? e.message : String(e)}`,
        )
        : `알 수 없는 도구: ${name}`
      responses.push({ functionResponse: { name, response: { result } } })
    }
    contents.push({ role: 'user', parts: responses })
  }
  throw new Error('에이전트가 최대 반복 횟수 안에 끝나지 않았습니다')
}
