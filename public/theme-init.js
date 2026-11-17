// Apply the saved preference before the page paints. Dark remains the default.
try {
  const theme = localStorage.getItem('forma-theme') === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'light' ? '#f7f7f8' : '#0a0a0a');
} catch {
  document.documentElement.dataset.theme = 'dark';
}
