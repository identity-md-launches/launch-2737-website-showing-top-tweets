import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { capturedAt, formatNumber, selectTweets, snapshotDate, topicIcons, topics, tweets, xSearch, type Sort, type Topic, type Tweet } from './data';
import { FrogMark, Icon, type IconName } from './icons';
import { readSaved, STORAGE_KEY, writeSaved } from './storage';

type View = 'discover' | 'saved';
type ModalState = { kind: 'about' } | { kind: 'copy'; tweet: Tweet } | null;
const PAGE_SIZE = 6;
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const authors = [...new Map(tweets.map(tweet => [tweet.handle, tweet])).values()];
const getView = (): View => location.hash === '#saved' ? 'saved' : 'discover';

function OutLink({ href, children, className = '', label }: { href: string; children: ReactNode; className?: string; label?: string }) {
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>{children}</a>;
}

function Avatar({ tweet }: { tweet: Tweet }) {
  return tweet.avatar ? <img className="avatar" src={`./${tweet.avatar}`} width="44" height="44" loading="lazy" alt="" /> : <span className="avatar avatar-fallback" aria-hidden="true">{tweet.author.slice(0, 1)}</span>;
}

function Metric({ name, icon, value }: { name: string; icon: IconName; value: number | null }) {
  return <span className={`metric metric-${icon}`} title={value === null ? `${name} not available in the archive` : `${value.toLocaleString()} ${name.toLowerCase()} at capture`}><Icon name={icon} size={16} /><span aria-hidden="true">{value === null ? 'N/A' : formatNumber(value)}</span><span className="sr-only">{value === null ? `${name} unavailable` : `${value.toLocaleString()} ${name.toLowerCase()}`}</span></span>;
}

function TweetCard({ tweet, saved, rank, onSave, onCopy }: { tweet: Tweet; saved: boolean; rank: number; onSave: () => void; onCopy: () => void }) {
  return <article className="tweet-card" data-tweet-id={tweet.id} aria-labelledby={`author-${tweet.id}`}>
    <div className="tweet-heading">
      <Avatar tweet={tweet} />
      <div className="tweet-person">
        <a id={`author-${tweet.id}`} className="author-name" href={`https://x.com/${tweet.handle}`} target="_blank" rel="noopener noreferrer">{tweet.author}</a>
        <div className="tweet-byline"><span>@{tweet.handle}</span><span aria-hidden="true">·</span><time dateTime={tweet.date} title={new Date(tweet.date).toUTCString()}>{dateFormat.format(new Date(tweet.date))}</time></div>
      </div>
      <span className="rank"><span className="sr-only">Position </span>{String(rank).padStart(2, '0')}</span>
      <OutLink href={tweet.url} className="tweet-x" label={`Open tweet by ${tweet.author} on X (new tab)`}><Icon name="x" size={19} /></OutLink>
    </div>
    <blockquote cite={tweet.url} className="tweet-text">{tweet.excerpt}{tweet.truncated && <><span aria-hidden="true">…</span><span className="sr-only"> (excerpt)</span></>}</blockquote>
    <div className="tweet-context">
      <span className="topic-label"><Icon name={topicIcons[tweet.topic as Topic]} size={14} />{tweet.topic}</span>
      <OutLink href={tweet.url} className="read-tweet" label={`Read ${tweet.truncated ? 'full ' : ''}tweet by ${tweet.author} on X (new tab)`}>Read {tweet.truncated ? 'full ' : ''}tweet<Icon name="arrow-up-right" size={14} /></OutLink>
    </div>
    <div className="tweet-bottom">
      <div className="tweet-metrics" role="group" aria-label="Engagement at capture">
        <Metric icon="heart" name="Likes" value={tweet.likes} />
        <Metric icon="repeat" name="Reposts" value={tweet.reposts} />
        <Metric icon="message" name="Replies" value={tweet.replies} />
        <Metric icon="eye" name="Views" value={tweet.views} />
      </div>
      <div className="tweet-actions">
        <button type="button" className="icon-button copy-button" title="Copy tweet link" aria-label={`Copy tweet link by ${tweet.author}`} onClick={onCopy}><Icon name="link" size={17} /></button>
        <button type="button" className={`icon-button save-button ${saved ? 'is-saved' : ''}`} title={saved ? 'Remove saved tweet' : 'Save tweet'} aria-label={`${saved ? 'Remove saved' : 'Save'} tweet by ${tweet.author}`} aria-pressed={saved} onClick={onSave}><Icon name="bookmark" size={18} /></button>
      </div>
    </div>
  </article>;
}

function Modal({ state, onClose }: { state: Exclude<ModalState, null>; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const copyInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    if (state.kind === 'copy') copyInput.current?.select();
    return () => { dialog?.close(); if (opener?.isConnected) opener.focus(); };
  }, [state]);
  return <dialog ref={ref} className="dialog" aria-labelledby="dialog-title" onCancel={onClose} onKeyDown={event => {
    if (event.key !== 'Tab') return;
    const targets = [...event.currentTarget.querySelectorAll<HTMLElement>('button, a[href], input, select, [tabindex="0"]')].filter(element => !element.hasAttribute('disabled'));
    const first = targets[0], last = targets[targets.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }} onClick={event => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose(); } }}>
    <div className="dialog-heading"><FrogMark /><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div>
    {state.kind === 'about' ? <>
      <h2 id="dialog-title">A little context for the pond.</h2>
      <p>Signal Pond is an independent collection of tweets about Identity MD, its builders, and its AI agent community.</p>
      <dl className="about-facts">
        <div><dt>A snapshot, with sources</dt><dd>These {tweets.length} tweets and their public engagement counts were captured on <time dateTime={capturedAt}>{snapshotDate}</time> from the <OutLink href="https://teapawt.org/surfcoderepeat">teapawt public X archive</OutLink>. Archives can lag behind X. This collection does not refresh automatically.</dd></div>
        <div><dt>What “top” means here</dt><dd>Most liked within this collection, using captured counts. It is a selected set, not a complete ranking of every Identity MD tweet. Reposts and latest are alternative sort orders. Missing counts are shown as N/A.</dd></div>
        <div><dt>Small excerpts, real voices</dt><dd>Longer tweets are shown as short excerpts. Open the original tweet for the full conversation, media, and current counts. Each tweet also has an <OutLink href="./sources.json">archived source in the source list</OutLink>.</dd></div>
        <div><dt>Saved stays with you</dt><dd>Bookmarks live in this browser. No account, wallet, analytics, or tracking. Clearing browser storage removes saved tweets. If storage is blocked, saves last only for the current visit.</dd></div>
      </dl>
      <button type="button" className="button button-primary" onClick={onClose}>Back to the tweets<Icon name="arrow-right" /></button>
    </> : <>
      <h2 id="dialog-title">Copy the tweet link</h2>
      <p>Automatic copying is unavailable. Select and copy this link, or open the tweet on X.</p>
      <label className="field-label" htmlFor="copy-link">Tweet link</label>
      <input ref={copyInput} id="copy-link" className="manual-copy" value={state.tweet.url} readOnly onFocus={e => e.currentTarget.select()} />
      <OutLink href={state.tweet.url} className="button button-primary">Open tweet on X<Icon name="arrow-up-right" /></OutLink>
    </>}
  </dialog>;
}

export function App() {
  const initialSaved = useMemo(readSaved, []);
  const [view, setView] = useState<View>(getView);
  const [savedIds, setSavedIds] = useState(initialSaved.ids);
  const [storageAvailable, setStorageAvailable] = useState(initialSaved.available);
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<Topic>('All tweets');
  const [sort, setSort] = useState<Sort>('likes');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [modal, setModal] = useState<ModalState>(null);
  const [message, setMessage] = useState('');
  const [noticeId, setNoticeId] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultList = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onHash = () => {
      if (location.hash === '#tweets') return;
      setView(getView()); setQuery(''); setTopic('All tweets'); setLimit(PAGE_SIZE);
    };
    const onStorage = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) setSavedIds(readSaved().ids); };
    addEventListener('hashchange', onHash); addEventListener('storage', onStorage);
    return () => { removeEventListener('hashchange', onHash); removeEventListener('storage', onStorage); };
  }, []);

  const filtered = selectTweets({ query, topic, sort, savedOnly: view === 'saved', savedIds });
  const visibleTweets = filtered.slice(0, limit);
  const activeFilters = query.trim() !== '' || topic !== 'All tweets';
  const resetFilters = () => { setQuery(''); setTopic('All tweets'); setLimit(PAGE_SIZE); searchRef.current?.focus(); };
  const chooseTopic = (next: Topic) => { setTopic(next); setLimit(PAGE_SIZE); };
  const notify = (text: string) => { setMessage(text); setNoticeId(value => value + 1); };

  function toggleSave(tweet: Tweet) {
    const wasSaved = savedIds.includes(tweet.id);
    const next = wasSaved ? savedIds.filter(id => id !== tweet.id) : [...savedIds, tweet.id];
    setSavedIds(next);
    const stored = writeSaved(next); setStorageAvailable(stored);
    notify(wasSaved ? 'Tweet removed from saved.' : stored ? 'Tweet saved in this browser.' : 'Tweet saved for this visit. Browser storage is unavailable.');
    if (wasSaved && view === 'saved') requestAnimationFrame(() => resultList.current?.focus());
  }

  async function copyTweet(tweet: Tweet) {
    try { await navigator.clipboard.writeText(tweet.url); notify('Tweet link copied.'); }
    catch { setModal({ kind: 'copy', tweet }); }
  }

  function showMore() {
    const firstNew = limit;
    setLimit(value => value + PAGE_SIZE);
    requestAnimationFrame(() => {
      const nextCard = resultList.current?.querySelectorAll('article')[firstNew];
      nextCard?.querySelector<HTMLAnchorElement>('.author-name')?.focus({ preventScroll: true });
      nextCard?.scrollIntoView({ block: 'nearest' });
    });
  }

  return <>
    <a className="skip-link" href="#tweets">Skip to tweets</a>
    <header className="site-header">
      <div className="header-inner">
        <a href="#discover" className="brand" aria-label="Signal Pond home"><FrogMark /><span>signal pond<span className="brand-period">.</span></span></a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#discover" className={view === 'discover' ? 'nav-link active' : 'nav-link'} aria-current={view === 'discover' ? 'page' : undefined}><Icon name="spark" size={17} />Discover</a>
          <a href="#saved" className={view === 'saved' ? 'nav-link active' : 'nav-link'} aria-current={view === 'saved' ? 'page' : undefined}><Icon name="bookmark" size={17} />Saved{savedIds.length > 0 && <span className="saved-count">{savedIds.length}</span>}</a>
        </nav>
        <div className="header-utilities"><button type="button" className="about-button" onClick={() => setModal({ kind: 'about' })}>About the pond</button><OutLink href={xSearch} className="header-x" label="Find Identity MD on X (new tab)"><Icon name="x" size={18} /><Icon name="arrow-up-right" size={14} /></OutLink></div>
      </div>
    </header>

    <main className="site-main">
      {view === 'discover' ? <section className="hero" aria-labelledby="page-title">
        <div className="hero-art"><img src="./assets/pepe-ai.webp" alt="Pepe equipped with an AI chip, a cybernetic arm, and two friendly robot companions." width="1200" height="800" fetchPriority="high" /></div>
        <div className="hero-copy">
          <h1 id="page-title">The swarm<br />is <span>talking.</span></h1>
          <p>Top tweets from the Identity MD ecosystem.</p>
          <a className="button button-primary" href="#tweets">Explore tweets<Icon name="arrow-down" size={17} /></a>
          <div className="hero-footnote"><span className="mini-avatars" aria-hidden="true">{authors.slice(0, 3).map(tweet => <img key={tweet.handle} src={`./${tweet.avatar}`} width="24" height="24" alt="" />)}</span><span>{authors.length} voices. One curious community.</span></div>
        </div>
        <div className="hero-caption" aria-hidden="true"><span className="tiny-dot" />Frogs. Armed with AI.</div>
      </section> : <section className="saved-intro"><span className="saved-intro-icon"><Icon name="bookmark" size={32} /></span><div><h1 id="page-title">Worth keeping.</h1><p>Saved tweets, right here in this browser.</p></div></section>}

      <div className="content-grid">
        <section className="feed" id="tweets" aria-labelledby="feed-title">
          <div className="feed-heading"><h2 id="feed-title">{view === 'saved' ? 'Saved tweets' : 'Catch the signal'}<span className="count-badge">{view === 'saved' ? savedIds.length : tweets.length}</span></h2><label className="sort-control"><span className="sr-only">Sort tweets</span><select value={sort} onChange={e => { setSort(e.target.value as Sort); setLimit(PAGE_SIZE); }}><option value="likes">Most liked</option><option value="reposts">Most reposted</option><option value="latest">Latest first</option></select><Icon name="chevron" size={15} /></label></div>
          <div className="snapshot-note"><span className="snapshot-dot" /><span>Public snapshot · {snapshotDate}</span><button type="button" aria-label="About this snapshot and ranking" onClick={() => setModal({ kind: 'about' })}><Icon name="info" size={15} /></button></div>
          <div className="search-wrap"><label htmlFor="tweet-search">Search tweets</label><div className="search-field"><Icon name="search" size={19} /><input ref={searchRef} id="tweet-search" type="search" name="query" autoComplete="off" placeholder="Keywords, people, or ideas…" value={query} onChange={e => { setQuery(e.target.value); setLimit(PAGE_SIZE); }} />{query && <button type="button" className="icon-button" aria-label="Clear search" onClick={() => { setQuery(''); searchRef.current?.focus(); }}><Icon name="close" size={16} /></button>}</div></div>
          <div className="topic-filters" role="group" aria-label="Filter tweets by topic">{topics.map(item => <button type="button" key={item} className={`filter-chip ${topic === item ? 'selected' : ''}`} aria-pressed={topic === item} onClick={() => chooseTopic(item)}>{item === 'All tweets' && <Icon name="spark" size={15} />}{item}</button>)}</div>
          {activeFilters && <div className="filter-summary"><span>{filtered.length} {filtered.length === 1 ? 'tweet' : 'tweets'} found{topic !== 'All tweets' ? ` in ${topic}` : ''}</span><button type="button" className="text-button" onClick={resetFilters}>Reset filters<Icon name="close" size={14} /></button></div>}
          {!storageAvailable && view === 'saved' && <p className="storage-note"><Icon name="info" />Browser storage is unavailable. Saved tweets stay for this visit only.</p>}
          <div ref={resultList} className="tweet-list" role="group" tabIndex={-1} aria-label="Tweets">
            {visibleTweets.map((tweet, i) => <TweetCard key={tweet.id} tweet={tweet} rank={i + 1} saved={savedIds.includes(tweet.id)} onSave={() => toggleSave(tweet)} onCopy={() => void copyTweet(tweet)} />)}
            {filtered.length === 0 && <div className="empty-state"><span className="empty-icon"><Icon name={view === 'saved' && !activeFilters ? 'bookmark' : 'search'} size={28} /></span><h3>{view === 'saved' && !activeFilters ? 'Keep a little signal.' : 'Quiet in this corner.'}</h3><p>{view === 'saved' && !activeFilters ? 'Save a tweet with the bookmark icon. It will be waiting here when you return.' : `No tweets match${query.trim() ? ` “${query.trim()}”` : ' these filters'}. Try another search or reset the filters.`}</p>{activeFilters ? <button type="button" className="button button-primary" onClick={resetFilters}>Reset filters<Icon name="arrow-right" /></button> : <a href="#discover" className="button button-primary">Explore tweets<Icon name="arrow-right" /></a>}</div>}
          </div>
          {filtered.length > limit ? <button type="button" className="load-more" onClick={showMore}>Show {Math.min(PAGE_SIZE, filtered.length - limit)} more tweets<Icon name="arrow-down" size={17} /></button> : filtered.length > 0 && <div className="end-of-feed"><Icon name="leaf" size={17} /><span>You're all caught up with this snapshot.</span></div>}
          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{filtered.length} {filtered.length === 1 ? 'tweet' : 'tweets'}{view === 'saved' ? ' saved' : ' found'}; showing {visibleTweets.length}.</div>
        </section>

        <aside className="sidebar" aria-label="Explore Identity MD">
          <section className="sidebar-section topics-section"><h2>Around the pond<Icon name="globe" size={18} /></h2><p>Follow a thread of curiosity.</p><div className="topic-list">{topics.filter(item => item !== 'All tweets').map(item => <button type="button" key={item} className={`topic-row ${topic === item ? 'chosen' : ''}`} onClick={() => { chooseTopic(item); document.getElementById('tweets')?.scrollIntoView({ block: 'start' }); }} aria-pressed={topic === item}><span className="topic-row-icon"><Icon name={topicIcons[item]} size={19} /></span><span>{item}</span><span className="topic-total">{tweets.filter(tweet => tweet.topic === item).length}</span><Icon name="arrow-up-right" size={15} /></button>)}</div></section>
          <section className="sidebar-section voices-section"><h2>Voices in the swarm<Icon name="users" size={18} /></h2><div className="voice-list">{authors.slice(0, 4).map(tweet => <button type="button" className="voice-row" key={tweet.handle} onClick={() => { setQuery(`@${tweet.handle}`); chooseTopic('All tweets'); searchRef.current?.focus(); }}><Avatar tweet={tweet} /><span><strong>{tweet.author}</strong><span>@{tweet.handle}</span></span><Icon name="arrow-up-right" size={16} /></button>)}</div></section>
          <section className="swarm-card"><div className="swarm-mark"><FrogMark /><Icon name="spark" size={23} /></div><h2>Small frogs.<br />Big possibilities.</h2><p>Meet the humans and AI agents building Identity MD together.</p><OutLink href="https://imd.fun" className="swarm-link">Explore Identity MD<Icon name="arrow-up-right" size={17} /></OutLink></section>
          <p className="sidebar-note"><Icon name="info" size={15} />An independent community project.<br />No affiliation with Identity MD or X.</p>
        </aside>
      </div>
    </main>

    <footer className="site-footer"><div className="footer-brand"><FrogMark /><span>A little pond for big ideas.</span></div><div><button type="button" onClick={() => setModal({ kind: 'about' })}>Sources & about</button><span className="footer-divider">·</span><OutLink href={xSearch}>Continue on X<Icon name="arrow-up-right" size={14} /></OutLink></div></footer>
    <div className={`toast ${message ? 'toast-visible' : ''}`} role="status" aria-live="polite" aria-atomic="true">{message && <><Icon name="check" size={18} /><span key={noticeId}>{message}</span><button type="button" className="icon-button" aria-label="Dismiss notification" onClick={() => setMessage('')}><Icon name="close" size={16} /></button></>}</div>
    {modal && <Modal state={modal} onClose={() => setModal(null)} />}
  </>;
}
