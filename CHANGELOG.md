# Changelog

## 2026-11-22

- Fix mobile progress cards expanding the viewport and preventing taps on the Strength tab; keep wide history tables scrolling inside their cards.
- Check production landing hydration for both guests and signed-in clients, and include the full desktop/mobile browser suite in `npm run verify`.
- Refresh inactive-account tests for both workout completion actions and scope accessibility audits to app-owned content, including embedded video titles.
- Show the last logged weight and reps on training exercise rows, with separate alternative history.
- Add a desktop training weight panel and mobile bottom sheet with previous-session prefill, per-exercise drafts, add/remove sets, numeric validation, save-and-complete, and completion without weights.
- Update rows immediately after save, confirm completion and badge weights above the prior personal best.
- Extend the generated API contract for optional workout sets and dated training history.
- Cover desktop/mobile interactions and a disposable PostgreSQL-backed live API browser flow.
