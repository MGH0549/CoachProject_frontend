import { CairoDatePipe } from './cairo-date.pipe';
describe('Cairo date display', () => {
  const pipe = new CairoDatePipe();
  it('uses Cairo midnight rather than the browser local day', () => {
    const result = pipe.transform('2026-11-15T22:30:00Z');
    expect(result).toContain('16');
    expect(result).not.toMatch(/[٠-٩]/);
  });
  it('handles the daylight-saving boundary using a named timezone', () => {
    expect(pipe.transform('2026-04-23T22:30:00Z')).toContain('24');
  });
  it('handles empty and invalid dates', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform('invalid')).toBe('—');
  });
});
