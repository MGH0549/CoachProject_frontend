export function youtubeId(value: string): string | null {
  const text = value.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:') return null;
    let id: string | null = null;
    if (url.hostname === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
    if (
      ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(
        url.hostname,
      )
    )
      id =
        url.searchParams.get('v') ||
        url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] ||
        null;
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
