import {
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config'

// All PNG icons are generated from public/icon.svg during the build.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    apple: {
      ...minimal2023Preset.apple,
      padding: 0.1,
      resizeOptions: { background: '#12161f' },
    },
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: { background: '#12161f' },
    },
  },
  images: ['public/icon.svg'],
})
