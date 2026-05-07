import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 20 * 60 * 1000; // 20분

function getCached(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'news';
  const days = parseInt(searchParams.get('days') || '1', 10);
  const maxItems = parseInt(searchParams.get('maxItems') || '50', 10);
  const theme = searchParams.get('theme');
  const location = searchParams.get('location');

  const cacheKey = `${action}-${days}-${maxItems}-${theme || 'none'}-${location || 'none'}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    let url: URL;

    switch (action) {
      case 'news':
        url = buildNewsURL(days, maxItems, theme, location);
        break;
      case 'trending':
        url = buildTrendingURL(days, maxItems, theme, location);
        break;
      default:
        url = buildNewsURL(days, maxItems, theme, location);
    }

    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'WorldMonitor/1.0' },
    });

    if (!response.ok) {
      throw new Error(`RSS fetch error: ${response.status}`);
    }

    const xmlText = await response.text();
    const data = parseRSS(xmlText);
    setCache(cacheKey, data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news data', data: [] },
      { status: 500 }
    );
  }
}

function buildNewsURL(days: number, maxItems: number, theme: string | null, location: string | null): URL {
  const url = new URL('https://news.google.com/rss');
  url.searchParams.set('q', `${theme ? theme + ' ' : ''}${location ? location + ' ' : ''}disaster OR earthquake OR wildfire OR hurricane OR tornado OR flood OR storm OR tsunami OR volcano`);
  url.searchParams.set('hl', 'ko');
  url.searchParams.set('gl', 'KR');
  url.searchParams.set('ceid', 'KR:ko');
  return url;
}

function buildTrendingURL(days: number, maxItems: number, theme: string | null, location: string | null): URL {
  const url = new URL('https://news.google.com/rss');
  url.searchParams.set('q', `${theme ? theme + ' ' : ''}${location ? location + ' ' : ''}disaster OR earthquake OR wildfire OR hurricane OR tornado OR flood OR storm OR tsunami OR volcano`);
  url.searchParams.set('hl', 'ko');
  url.searchParams.set('gl', 'KR');
  url.searchParams.set('ceid', 'KR:ko');
  url.searchParams.set('sort', 'date');
  return url;
}

function parseRSS(xml: string) {
  const items: any[] = [];
  const itemRegex = /<item>(.*?)<\/item>/gs;
  const titleRegex = /<title>(.*?)<\/title>/s;
  const linkRegex = /<link>(.*?)<\/link>/s;
  const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/s;
  const descriptionRegex = /<description>(.*?)<\/description>/s;

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const titleMatch = titleRegex.exec(content);
    const linkMatch = linkRegex.exec(content);
    const pubDateMatch = pubDateRegex.exec(content);
    const descriptionMatch = descriptionRegex.exec(content);

    const title = titleMatch ? titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '';
    const link = linkMatch ? linkMatch[1] : '';
    const pubDate = pubDateMatch ? pubDateMatch[1] : '';
    const description = descriptionMatch ? descriptionMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]*>/g, '').substring(0, 200) : '';

    items.push({
      title,
      link,
      pubDate,
      description,
    });
  }

  return {
    data: items.slice(0, 50),
  };
}
