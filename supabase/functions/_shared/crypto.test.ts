// deno test --allow-env supabase/functions/_shared/crypto.test.ts
import { decrypt, encrypt } from './crypto.ts'

// 32바이트 테스트 키
Deno.env.set('TOKEN_ENC_KEY', btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))))

Deno.test('encrypt/decrypt roundtrip', async () => {
  const secret = 'ya29.a0AfH6-refresh-token-예시-한글포함'
  const stored = await encrypt(secret)
  if (stored === secret) throw new Error('not encrypted')
  const back = await decrypt(stored)
  if (back !== secret) throw new Error(`roundtrip mismatch: ${back}`)
})

Deno.test('same plaintext → different ciphertext (random IV)', async () => {
  const a = await encrypt('token')
  const b = await encrypt('token')
  if (a === b) throw new Error('IV reuse')
})

Deno.test('tampered ciphertext rejected', async () => {
  const stored = await encrypt('token')
  const bytes = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0))
  bytes[bytes.length - 1] ^= 0xff
  let s = ''
  for (const byte of bytes) s += String.fromCharCode(byte)
  try {
    await decrypt(btoa(s))
    throw new Error('tampering not detected')
  } catch (e) {
    if (e instanceof Error && e.message === 'tampering not detected') throw e
    // GCM 태그 검증 실패 = 정상
  }
})
