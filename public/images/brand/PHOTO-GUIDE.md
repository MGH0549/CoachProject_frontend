# Add your logo

Put your logo in this folder using this exact filename:

`public/images/brand/logo.png`

The logo appears beside the FORMA name on the homepage, sign-in and registration pages, legal pages, and dashboard.

Use a PNG with a transparent background if available, ideally at least 176 × 176 pixels with minimal empty space around the logo. The image fits inside a 44 × 44 pixel area without cropping. Until the file is added, the existing red brand mark remains visible.

For a JPEG, WebP, or SVG logo, use its actual file extension and update `logoPhoto` in `src/app/shared/brand/brand.component.ts`. Renaming a file does not convert its image format.

After replacing the logo, run `node scripts/generate-pwa-icons.mjs` to regenerate the browser tab, Android app, and Apple home-screen icons from the same photo. This command uses the project's Playwright dependency and requires its Chromium browser (`npx playwright install chromium` if needed). The maskable Android icon includes extra padding to keep the logo inside the safe area.

Refresh your local website, then rebuild and deploy to update the hosted website. Existing installed apps may take time to refresh their icon; reinstalling the app can refresh it sooner.
