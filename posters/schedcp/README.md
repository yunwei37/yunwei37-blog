# SchedCP Research Poster

A 24x36 inch research poster for SchedCP, generated using React + @react-pdf/renderer.

## Setup

```bash
npm install
```

## Generate Poster

```bash
npm run build
```

The PDF will be generated at `output/schedcp-poster.pdf`.

## Development

```bash
npm run dev
```

This will watch for changes and regenerate the poster automatically.

## Customization

- **Styles**: Edit `src/styles.ts` for colors, fonts, and layout
- **Content**: Edit `src/components/Poster.tsx` for poster content
- **Size**: Default is 24x36 inches (PAGE_WIDTH/PAGE_HEIGHT in styles.ts)

## Adding Images

To add images, use the `Image` component from @react-pdf/renderer:

```tsx
import { Image } from '@react-pdf/renderer';

<Image src="/path/to/image.png" style={{ width: 300, height: 200 }} />
```
