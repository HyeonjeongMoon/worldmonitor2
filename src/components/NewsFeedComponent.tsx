'use client';

import { useEffect, useState } from 'react';

interface NewsItem {
  title: string;
  url: string;
  pubDate: string;
  description: string;
  theme?: string;
}

export default function NewsFeedComponent() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 60000);
    return () => clearInterval(interval);
  }, [filter]);

  const extractTheme = (title: string): string => {
    const themes = [
      { keyword: 'earthquake', label: '지진' },
      { keyword: 'wildfire', label: '산불' },
      { keyword: 'hurricane', label: '허리케인' },
      { keyword: 'tornado', label: '토네이도' },
      { keyword: 'flood', label: '홍수' },
      { keyword: 'tsunami', label: '쓰나미' },
      { keyword: 'volcano', label: '화산' },
      { keyword: 'storm', label: '폭풍' },
    ];
    const lowerTitle = title.toLowerCase();
    for (const theme of themes) {
      if (lowerTitle.includes(theme.keyword)) return theme.label;
    }
    return '기타';
  };

  const fetchNews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        action: 'news',
        days: '1',
        maxItems: '50',
      });
      if (filter !== 'all') {
        params.set('theme', filter);
      }

      const response = await fetch(`/api/news?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }

      const data = await response.json();
      const items: NewsItem[] = (data.data || []).map((item: any) => ({
        title: item.title || 'No headline',
        url: item.link || '#',
        pubDate: item.pubDate || '',
        description: item.description || '',
        theme: extractTheme(item.title),
      }));

      setNews(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const filteredNews = filter === 'all' ? news : news.filter((item) => item.theme === filter);

  const themes = Array.from(new Set(news.map((item) => item.theme).filter((t): t is string => Boolean(t))));

  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>Live News Feed</h2>
        <button
          onClick={fetchNews}
          style={{
            padding: '5px 10px',
            background: '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '5px 10px',
            background: filter === 'all' ? '#0066cc' : '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          All
        </button>
        {themes.map((theme) => (
          <button
            key={theme}
            onClick={() => setFilter(theme)}
            style={{
              padding: '5px 10px',
              background: filter === theme ? '#0066cc' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {theme}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: '#888' }}>Loading...</div>}
      {error && <div style={{ color: '#ff4444' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredNews.map((item, index) => (
          <a
            key={index}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              padding: '10px',
              background: '#1a1a1a',
              borderRadius: '4px',
              textDecoration: 'none',
              color: '#fff',
              borderLeft: '3px solid #0066cc',
            }}
          >
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '5px' }}>
              {item.theme}
              {item.pubDate && ` • ${new Date(item.pubDate).toLocaleDateString()}`}
            </div>
            <div style={{ fontSize: '14px', marginBottom: '5px' }}>{item.title}</div>
            <div style={{ fontSize: '11px', color: '#666' }}>{item.description}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
