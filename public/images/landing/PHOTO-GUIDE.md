# Add your five photos

Copy the photos into this folder (`public/images/landing/`) using these exact filenames:

1. `coach.jpg` — the main coach photo at the top of the homepage. Prefer a portrait, around 960 × 1000 pixels or larger.
2. `motivation-1.jpg` — first gallery photo: coach training or a motivational photo.
3. `motivation-2.jpg` — second gallery photo: training or motivation.
4. `motivation-3.jpg` — third gallery photo: training or motivation.
5. `motivation-4.jpg` — fourth gallery photo: training or motivation.

The four gallery photos appear between “How we start” and the coaching packages. Gallery order follows the Arabic page direction: right to left, then the next row. On phones, they stack in the order above.

Use landscape photos around 1000 × 800 pixels or larger for the gallery. Photos fill their frames with a centered crop, so keep faces and any important text away from the edges. Export optimized JPEGs, ideally below 500 KB each. Renaming a PNG or WebP to `.jpg` does not convert it; export it as JPEG instead.

If you prefer PNG or WebP, change the corresponding filename in `src/app/features/public/landing/landing.component.ts`. Update each photo's Arabic `alt` description there to match the actual photo. The main photo's alt text is in `landing.component.html`.

Missing photos show a text placeholder. After adding files, refresh the local website; if it is already hosted, rebuild and deploy to publish the photos. No API or database changes are needed.

The separate client-results cards retain their existing placeholders. Coach and motivational photos are not used as client transformation evidence.
