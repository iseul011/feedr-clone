// 무료 트렌드 리서치 소스 모음 — Anthropic web_search(유료) 대체.
// 각 소스는 실패하거나 키가 없으면 null을 반환한다. 하나가 죽어도 나머지로 리서치는 계속된다.

export interface ResearchSection {
  source: string
  content: string
}

const TIMEOUT_MS = 10_000

async function get(url: string, headers?: Record<string, string>): Promise<Response> {
  return await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) })
}

function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))
  return m?.[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim() ?? ''
}

// ── 1. Google Trends 한국 급상승 검색어 RSS (무료, 무인증) ──────────────────

export function parseTrendsRss(xml: string, max = 10): string[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
  return items.slice(0, max).map((item) => {
    const title = tag(item, 'title')
    const traffic = tag(item, 'ht:approx_traffic')
    const news = tag(item, 'ht:news_item_title')
    return [title, traffic && `(검색량 ${traffic})`, news && `— 관련 뉴스: ${news}`]
      .filter(Boolean)
      .join(' ')
  })
}

async function googleTrends(): Promise<ResearchSection | null> {
  const res = await get('https://trends.google.com/trending/rss?geo=KR')
  if (!res.ok) return null
  const lines = parseTrendsRss(await res.text())
  if (!lines.length) return null
  return { source: '구글 트렌드 급상승 (한국, 오늘)', content: lines.join('\n') }
}

// ── 2. signal.bz 실시간 검색어 (비공식 무료 JSON — 언제든 끊길 수 있는 보조 소스) ──

async function signalBz(): Promise<ResearchSection | null> {
  const res = await get('https://api.signal.bz/news/realtime')
  if (!res.ok) return null
  const data = await res.json()
  const top = (data?.top10 ?? []) as { rank: number; keyword: string }[]
  if (!top.length) return null
  return {
    source: '실시간 검색어 top10 (signal.bz)',
    content: top.map((t) => `${t.rank}. ${t.keyword}`).join('\n'),
  }
}

// ── 3. 네이버 검색 API — 블로그/뉴스 최신 글 (무료 25,000회/일) ──────────────

function naverHeaders(): Record<string, string> | null {
  const id = Deno.env.get('NAVER_CLIENT_ID')
  const secret = Deno.env.get('NAVER_CLIENT_SECRET')
  if (!id || !secret) return null
  return { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': secret }
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
}

async function naverSearch(keywords: string[]): Promise<ResearchSection | null> {
  const headers = naverHeaders()
  if (!headers) return null
  const parts: string[] = []
  for (const kw of keywords.slice(0, 4)) {
    for (const kind of ['blog', 'news'] as const) {
      const res = await get(
        `https://openapi.naver.com/v1/search/${kind}.json?query=${encodeURIComponent(kw)}&display=5&sort=date`,
        headers,
      )
      if (!res.ok) continue
      const items = ((await res.json()).items ?? []) as { title: string; pubDate?: string; postdate?: string }[]
      if (!items.length) continue
      parts.push(
        `[${kw} · 최신 ${kind === 'blog' ? '블로그' : '뉴스'}]\n` +
          items.map((i) => `- ${stripTags(i.title)}`).join('\n'),
      )
    }
  }
  if (!parts.length) return null
  return { source: '네이버 검색 (니치 키워드 최신 글)', content: parts.join('\n\n') }
}

// ── 4. 네이버 데이터랩 — 키워드 검색량 추이 (무료 1,000회/일) ────────────────

async function naverDataLab(keywords: string[]): Promise<ResearchSection | null> {
  const headers = naverHeaders()
  if (!headers || !keywords.length) return null
  const end = new Date()
  const start = new Date(end.getTime() - 30 * 86400_000)
  const day = (d: Date) => d.toISOString().slice(0, 10)
  const res = await fetch('https://openapi.naver.com/v1/datalab/search', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: day(start),
      endDate: day(end),
      timeUnit: 'week',
      keywordGroups: keywords.slice(0, 5).map((k) => ({ groupName: k, keywords: [k] })),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) return null
  const results = ((await res.json()).results ?? []) as {
    title: string
    data: { period: string; ratio: number }[]
  }[]
  const lines = results
    .filter((r) => r.data.length >= 2)
    .map((r) => {
      const first = r.data[0].ratio
      const last = r.data[r.data.length - 1].ratio
      const dir = last > first * 1.1 ? '상승' : last < first * 0.9 ? '하락' : '유지'
      return `- ${r.title}: 최근 한 달 검색량 ${dir} (${first.toFixed(0)} → ${last.toFixed(0)}, 상대값)`
    })
  if (!lines.length) return null
  return { source: '네이버 데이터랩 (키워드 검색량 추이)', content: lines.join('\n') }
}

// ── 5. YouTube 인기 영상 (무료 10,000유닛/일, mostPopular=1유닛) ─────────────

async function youtubeTrending(): Promise<ResearchSection | null> {
  const key = Deno.env.get('YOUTUBE_API_KEY')
  if (!key) return null
  const res = await get(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&regionCode=KR&maxResults=10&key=${key}`,
  )
  if (!res.ok) return null
  const items = ((await res.json()).items ?? []) as { snippet: { title: string; channelTitle: string } }[]
  if (!items.length) return null
  return {
    source: 'YouTube 인기 영상 (한국, 오늘)',
    content: items.map((i) => `- ${i.snippet.title} (${i.snippet.channelTitle})`).join('\n'),
  }
}

// ── 6. Threads 공식 keyword_search (무료 2,200쿼리/일) ───────────────────────
// threads_keyword_search 스코프의 앱 리뷰 승인 전에는 본인 게시물만 반환된다.
// 승인되면 같은 코드로 공개 게시물 검색이 열린다 — 실패/빈 결과는 조용히 스킵.

async function threadsSearch(accessToken: string, keywords: string[]): Promise<ResearchSection | null> {
  const parts: string[] = []
  for (const kw of keywords.slice(0, 3)) {
    const res = await get(
      `https://graph.threads.net/v1.0/keyword_search?q=${encodeURIComponent(kw)}&search_type=TOP&fields=text,username&limit=10&access_token=${accessToken}`,
    )
    if (!res.ok) continue
    const items = ((await res.json()).data ?? []) as { text?: string; username?: string }[]
    const lines = items
      .filter((i) => i.text)
      .slice(0, 5)
      .map((i) => `- @${i.username}: ${i.text!.slice(0, 120).replace(/\n/g, ' ')}`)
    if (lines.length) parts.push(`[${kw}]\n${lines.join('\n')}`)
  }
  if (!parts.length) return null
  return { source: 'Threads 인기 게시물 검색', content: parts.join('\n\n') }
}

// ── 7. Gemini 검색 그라운딩 — 자유형 웹 리서치 (Flash 무료 1,500회/일) ────────

async function geminiResearch(question: string): Promise<ResearchSection | null> {
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) return null
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: question }] }],
        tools: [{ google_search: {} }],
      }),
      signal: AbortSignal.timeout(30_000),
    },
  )
  if (!res.ok) return null
  const data = await res.json()
  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? '')
    .join('')
    .trim()
  if (!text) return null
  return { source: 'Gemini 웹 리서치', content: text.slice(0, 2000) }
}

// ── 종합 ─────────────────────────────────────────────────────────────────────

export interface ResearchInput {
  keywords: string[]
  question?: string
  threadsToken?: string
}

export function buildDigest(sections: (ResearchSection | null)[]): string {
  const ok = sections.filter((s): s is ResearchSection => s !== null)
  if (!ok.length) return '리서치 소스가 모두 실패했거나 설정되지 않았습니다.'
  return ok.map((s) => `## ${s.source}\n${s.content}`).join('\n\n')
}

export async function gatherResearch(input: ResearchInput): Promise<string> {
  const tasks: Promise<ResearchSection | null>[] = [
    googleTrends().catch(() => null),
    signalBz().catch(() => null),
    naverSearch(input.keywords).catch(() => null),
    naverDataLab(input.keywords).catch(() => null),
    youtubeTrending().catch(() => null),
  ]
  if (input.threadsToken) tasks.push(threadsSearch(input.threadsToken, input.keywords).catch(() => null))
  if (input.question) tasks.push(geminiResearch(input.question).catch(() => null))
  return buildDigest(await Promise.all(tasks))
}
