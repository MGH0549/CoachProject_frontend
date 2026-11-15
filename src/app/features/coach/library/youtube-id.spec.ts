import { youtubeId } from './youtube-id';
describe('YouTube video identifiers', () => {
  it('extracts an ID from supported YouTube URLs', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('rejects scripts, foreign hosts, and malformed IDs', () => {
    for (const value of [
      'javascript:alert(1)',
      'https://evil.test/watch?v=dQw4w9WgXcQ',
      'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ',
      'bad-id',
    ])
      expect(youtubeId(value)).toBeNull();
  });
});
