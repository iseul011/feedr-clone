import { youtube } from './youtube.ts'
import { threads } from './threads.ts'
import type { Provider, ProviderId } from './types.ts'

function stub(id: ProviderId): Provider {
  const notImplemented = () => {
    throw new Error(`${id} 연동은 아직 준비 중입니다`)
  }
  return {
    id,
    implemented: false,
    authUrl: notImplemented,
    exchangeCode: notImplemented,
    refresh: notImplemented,
    publish: notImplemented,
  }
}

export const providers: Record<ProviderId, Provider> = {
  youtube,
  threads,
  instagram: stub('instagram'),
  tiktok: stub('tiktok'),
  x: stub('x'),
  linkedin: stub('linkedin'),
  facebook: stub('facebook'),
}
