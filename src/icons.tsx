import type { CSSProperties } from 'react';

export type IconName = 'arrow-up-right' | 'arrow-down' | 'arrow-right' | 'bookmark' | 'search' | 'x' | 'close' | 'heart' | 'repeat' | 'message' | 'eye' | 'link' | 'check' | 'spark' | 'code' | 'users' | 'globe' | 'info' | 'chevron' | 'leaf';
const paths: Record<IconName, React.ReactNode> = {
  'arrow-up-right': <><path d="M7 17 17 7M6 7h11v11" /></>,
  'arrow-down': <path d="M12 4v16m-6-6 6 6 6-6" />,
  'arrow-right': <path d="M4 12h16m-6-6 6 6-6 6" />,
  bookmark: <path d="M6 4h12v17l-6-4-6 4Z" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  x: <><path d="m4 3 12.5 18H21L8.5 3Z" /><path d="m20 3-7.7 8.7M11 13l-7 8" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  heart: <path d="M20.4 5.6a5 5 0 0 0-7.1 0L12 6.9l-1.3-1.3a5 5 0 0 0-7.1 7.1L12 21l8.4-8.3a5 5 0 0 0 0-7.1Z" />,
  repeat: <><path d="m16 3 4 4-4 4M4 11V7h16M8 21l-4-4 4-4m12 0v4H4" /></>,
  message: <path d="M21 11.5a9 9 0 0 1-9 9 10 10 0 0 1-4-.9L3 21l1.4-5a9 9 0 1 1 16.6-4.5Z" />,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  link: <><path d="m10 13 4-4m-5 7-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 10a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-2 2" transform="translate(1 0) scale(.9 1)" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  spark: <><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z" /><path d="M20 2v4m-2-2h4" /></>,
  code: <><path d="m7 7-5 5 5 5m10-10 5 5-5 5M14 4l-4 16" /></>,
  users: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 4v3" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.1" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  leaf: <><path d="M20 3C9 2 2 8 5 16c8 4 15-2 15-13Z" /><path d="M4 21 15 10" /></>
};

export function Icon({ name, size = 18, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>;
}

export function FrogMark({ className = '' }: { className?: string }) {
  return <svg className={className} width="40" height="40" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="18" fill="currentColor"/><g fill="#173923"><path d="M13 34c0-9 7-15 19-15s19 6 19 15v7c0 8-8 13-19 13S13 49 13 41Z"/><ellipse cx="22" cy="24" rx="10" ry="12"/><ellipse cx="42" cy="24" rx="10" ry="12"/></g><g stroke="currentColor" fill="none" strokeLinecap="round"><path d="M16 24h12M36 24h12" strokeWidth="5"/><path d="M23 40q9 6 18 0" strokeWidth="3"/></g></svg>;
}
