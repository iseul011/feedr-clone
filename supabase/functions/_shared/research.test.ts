// deno test supabase/functions/_shared/research.test.ts
import { buildDigest, parseTrendsRss } from './research.ts'

const RSS = `<?xml version="1.0"?>
<rss><channel>
<item><title>홈카페 레시피</title><ht:approx_traffic>20,000+</ht:approx_traffic>
<ht:news_item><ht:news_item_title>여름 홈카페 열풍</ht:news_item_title></ht:news_item></item>
<item><title><![CDATA[집순이 브이로그]]></title></item>
</channel></rss>`

Deno.test('트렌드 RSS: 키워드·검색량·뉴스 제목을 뽑는다', () => {
  const lines = parseTrendsRss(RSS)
  if (lines.length !== 2) throw new Error(`2건이어야 함: ${JSON.stringify(lines)}`)
  if (!lines[0].includes('홈카페 레시피')) throw new Error(`키워드 누락: ${lines[0]}`)
  if (!lines[0].includes('20,000+')) throw new Error(`검색량 누락: ${lines[0]}`)
  if (!lines[0].includes('여름 홈카페 열풍')) throw new Error(`뉴스 제목 누락: ${lines[0]}`)
  if (lines[1] !== '집순이 브이로그') throw new Error(`CDATA 처리 실패: ${lines[1]}`)
})

Deno.test('트렌드 RSS: item 없으면 빈 배열', () => {
  if (parseTrendsRss('<rss></rss>').length !== 0) throw new Error('빈 배열이어야 함')
})

Deno.test('다이제스트: null 소스는 건너뛰고 섹션으로 합친다', () => {
  const out = buildDigest([{ source: 'A', content: 'a' }, null, { source: 'B', content: 'b' }])
  if (!out.includes('## A') || !out.includes('## B')) throw new Error(`섹션 누락: ${out}`)
})

Deno.test('다이제스트: 전부 실패하면 안내 문구', () => {
  if (!buildDigest([null, null]).includes('실패')) throw new Error('안내 문구가 나와야 함')
})
