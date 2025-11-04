# Presentations

This directory contains Slidev presentation projects that are automatically built and deployed with the main blog.

## How It Works

1. **Automatic Discovery**: The CI workflow automatically discovers all subdirectories in `presentation/` that contain a `package.json` file
2. **Base Path Configuration**: Each presentation is configured with the correct base path (`/presentation/{name}/`) for subdirectory deployment
3. **Build & Deploy**: Presentations are built and deployed to `https://www.yunwei37.com/presentation/{name}/`

## Adding a New Presentation

1. Create a new subdirectory in `presentation/`
2. Initialize a Slidev project:
   ```bash
   cd presentation
   mkdir my-new-talk
   cd my-new-talk
   pnpm init
   pnpm add -D @slidev/cli @slidev/theme-default
   ```
3. Create a `slides.md` file with your presentation content
4. Add build script to `package.json`:
   ```json
   {
     "scripts": {
       "build": "slidev build",
       "dev": "slidev --open"
     }
   }
   ```
5. (Optional) Create a `vite.config.ts` with the base path:
   ```typescript
   import { defineConfig } from 'vite'

   export default defineConfig({
     base: '/presentation/my-new-talk/',
   })
   ```
   Note: If you don't create this file, the CI will automatically create it for you.

6. Commit and push - the CI will automatically build and deploy your presentation!

## Local Development

To work on a presentation locally:

```bash
cd presentation/{your-presentation}
pnpm install
pnpm run dev
```

To test the production build locally:

```bash
pnpm run build
# Serve the dist directory with a web server
python3 -m http.server 8000 --directory dist
```

## Presentation Metadata

Add metadata to the frontmatter of your `slides.md` file to control how it appears on the homepage:

```yaml
---
title: My Awesome Talk
info: |
  ## Description of your talk
  More details here
duration: 30min
---
```

The homepage will automatically display:
- Title
- Duration (if specified)
- Info/description (if specified)

## Current Presentations

- **gptoss-safetytax**: GPT-OSS & Safety Tax presentation
