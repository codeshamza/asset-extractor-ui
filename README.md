# Visual Asset Extractor UI

Premium React frontend for extracting visual assets from presentation slides. Connects to a FastAPI backend running Grounding DINO.

## Features

- 🎨 **Native Color Picker** — full browser color picker for background removal
- 📎 **Drag & Drop** — upload images or PDFs with drag-drop or click
- 🖼️ **Gallery Grid** — hover to download individual PNGs with transparent preview
- 📦 **ZIP Download** — client-side ZIP creation via JSZip
- 🌙 **Dark Theme** — premium design with Inter font, gradient accents

## Setup

```bash
npm install
cp .env.example .env    # Set your backend API URL
npm run dev
```

## Deploy to Netlify

1. Push to GitHub
2. Connect repo in Netlify
3. Set env var `VITE_API_URL` to your HF Spaces backend URL
4. Deploy — Netlify auto-builds from `netlify.toml`

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://your-space.hf.space` |
