// AES-256-GCM 토큰 암호화. 키: TOKEN_ENC_KEY (base64, 32바이트)
// 저장 포맷: base64(iv(12) || ciphertext || tag) — SubtleCrypto가 tag를 ct 뒤에 붙임

function b64decode(s: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>
}

function b64encode(b: Uint8Array): string {
  let s = ''
  for (const byte of b) s += String.fromCharCode(byte)
  return btoa(s)
}

async function getKey(): Promise<CryptoKey> {
  const raw = b64decode(Deno.env.get('TOKEN_ENC_KEY')!)
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function encrypt(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await getKey(),
    new TextEncoder().encode(plain),
  )
  const out = new Uint8Array(12 + ct.byteLength)
  out.set(iv)
  out.set(new Uint8Array(ct), 12)
  return b64encode(out)
}

export async function decrypt(stored: string): Promise<string> {
  const data = b64decode(stored)
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: data.slice(0, 12) },
    await getKey(),
    data.slice(12),
  )
  return new TextDecoder().decode(plain)
}
