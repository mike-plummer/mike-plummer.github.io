# mike-plummer.github.io

Personal website built with [Next.js](https://nextjs.org/) (static export), React 19, and TypeScript.

### [Stellar template](https://html5up.net/stellar)

## Requirements

- Node.js 20 LTS or later

## Dev Process

1. Make changes, preview with `npm run dev`
2. Commit & push changes to `develop`
3. Deploy changes with `npm run deploy` (builds to `out/` and publishes to the `master` branch via `gh-pages`)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local development server |
| `npm run build` | Build static site to `out/` |
| `npm run deploy` | Build and publish to GitHub Pages (`master` branch) |
| `npm run format` | Format TypeScript files with Prettier |

## Content

Markdown content lives in `content/`:

- `content/posts/` — blog posts (each in a dated folder with `index.md`)
- `content/skills/` — skill category pages
- `content/conferences/` — conference entries

## Project Structure

```
app/           # Next.js App Router pages
components/    # React components
content/       # Markdown content
lib/           # Content parsing and site config
public/        # Static assets (CNAME, images, etc.)
styles/        # Sass stylesheets (Stellar template)
```
