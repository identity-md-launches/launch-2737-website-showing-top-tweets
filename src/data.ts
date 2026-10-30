import snapshot from './tweets.json';
import type { IconName } from './icons';

export const topics = ['All tweets', 'AI agents', 'Builders', 'Community', 'Ecosystem'] as const;
export type Topic = typeof topics[number];
export type Sort = 'likes' | 'reposts' | 'latest';
export type Tweet = typeof snapshot.tweets[number];
export const tweets: Tweet[] = snapshot.tweets;
export const capturedAt = snapshot.capturedAt;
export const topicIcons: Record<Topic, IconName> = { 'All tweets': 'spark', 'AI agents': 'spark', Builders: 'code', Community: 'users', Ecosystem: 'globe' };
export const snapshotDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(capturedAt));
export const xSearch = 'https://x.com/search?q=%22Identity%20MD%22%20OR%20%22identity.md%22&f=top';

export function selectTweets({ query, topic, sort, savedOnly, savedIds }: { query: string; topic: Topic; sort: Sort; savedOnly: boolean; savedIds: string[] }) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return tweets.filter(tweet => {
    const haystack = `${tweet.excerpt} ${tweet.author} @${tweet.handle} ${tweet.topic}`.toLocaleLowerCase();
    return (!savedOnly || savedIds.includes(tweet.id)) && (topic === 'All tweets' || tweet.topic === topic) && terms.every(term => haystack.includes(term));
  }).sort((a, b) => {
    if (sort === 'latest') return b.date.localeCompare(a.date);
    return (b[sort] ?? -1) - (a[sort] ?? -1) || b.date.localeCompare(a.date);
  });
}

export function formatNumber(value: number | null) {
  if (value === null) return '—';
  return new Intl.NumberFormat('en', { notation: value >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}
