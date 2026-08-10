// deno test supabase/functions/_shared/gemini.test.ts
import { sanitizeSchema } from './gemini.ts'

Deno.test('스키마 정리: additionalProperties/$schema를 재귀적으로 제거한다', () => {
  const out = sanitizeSchema({
    type: 'object',
    additionalProperties: false,
    $schema: 'http://json-schema.org/draft-07/schema#',
    properties: {
      topics: {
        type: 'array',
        items: { type: 'object', additionalProperties: false, properties: { t: { type: 'string' } } },
      },
    },
    required: ['topics'],
  })
  const s = JSON.stringify(out)
  if (s.includes('additionalProperties') || s.includes('$schema')) {
    throw new Error(`제거 실패: ${s}`)
  }
  if (!s.includes('"required":["topics"]') || !s.includes('"type":"array"')) {
    throw new Error(`정상 필드가 보존되어야 함: ${s}`)
  }
})
