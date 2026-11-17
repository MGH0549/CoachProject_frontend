# Add your five photos

Copy the photos into this folder (`public/images/landing/`) using these exact filenames:

1. `coach.jpg` — the hero background behind the centered homepage text. Prefer a wide photo, around 1920 × 1200 pixels or larger. The image fills the hero with a crop focused near the upper center; adjust `.hero-background`'s `object-position` in `landing.component.css` if needed.
2. `motivation-1.jpg` — first gallery photo: coach training or a motivational photo.
3. `motivation-2.jpg` — second gallery photo: training or motivation.
4. `motivation-3.jpg` — third gallery photo: training or motivation.
5. `motivation-4.jpg` — fourth gallery photo: training or motivation.

The four gallery photos appear between “How we start” and the coaching packages. Gallery order follows the Arabic page direction: right to left, then the next row. On phones, they stack in the order above.

Use landscape photos around 1000 × 800 pixels or larger for the gallery. Photos fill their frames with a centered crop, so keep faces and any important text away from the edges. Export optimized JPEGs, ideally below 500 KB each. Renaming a PNG or WebP to `.jpg` does not convert it; export it as JPEG instead.

If you prefer PNG or WebP, change the corresponding filename in `src/app/features/public/landing/landing.component.ts`. Update each gallery photo's Arabic `alt` description there to match the actual photo. The hero background is decorative and uses empty alt text.

Missing gallery photos show a text placeholder; a missing hero photo leaves a dark background with readable text. After adding files, refresh the local website; if it is already hosted, rebuild and deploy to publish the photos. No API or database changes are needed.

For client transformation photos, use `public/images/results/` and follow its `PHOTO-GUIDE.md`. Coach and motivational photos are not used as client transformation evidence.
