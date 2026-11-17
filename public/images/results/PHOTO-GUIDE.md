# Add your results photos

Put your photos in this folder: `public/images/results/`.

Use these exact filenames:

1. `result-1.jpg` — first results card (rightmost on desktop).
2. `result-2.jpg` — second results card.
3. `result-3.jpg` — third results card (leftmost on desktop).

On phones, the cards stack in the same numbered order. They appear in the homepage Results section, below the coaching packages.

Each file should be one complete results photo. If you have separate before and after photos, combine each pair into one image first, with labels inside the image. The website shows the entire image without cropping. Landscape images around 1200 × 830 pixels work well; other proportions also fit. Export actual JPEG files, ideally below 500 KB each. Renaming a PNG to `.jpg` does not convert it.

You can add these files now. Refresh the local website after copying them. For the hosted website, rebuild and deploy to publish the photos. Until a file is added, its card shows a placeholder.

To use PNG/WebP, add more cards, or edit the Arabic captions and image descriptions, update the `results` array in `src/app/features/public/landing/landing.component.ts`. Match each `src` to its actual filename and each `alt` to the photo's contents. The neutral captions do not claim specific names, timelines, or weight changes.

Set each result's `duration` to the actual transformation time in Arabic, for example `12 أسبوعاً` or `4 أشهر`. A duration badge appears over that photo. Leave the value empty to hide the badge until the time is confirmed.
