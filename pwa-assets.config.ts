import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

const brandBlue = '#2B59A3';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // The source icon is already a rounded square, so the regular icons need no padding.
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    // Maskable and Apple icons get a full-bleed brand background with the motif in the safe zone.
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0.3,
      resizeOptions: { background: brandBlue },
    },
    apple: { ...minimal2023Preset.apple, padding: 0.3, resizeOptions: { background: brandBlue } },
  },
  images: ['public/icon.svg'],
});
