# Shadow Studio AI — WaveSpeed Backend Proxy

This folder contains the Node.js backend proxy for the Shadow Studio AI app.

## Requirements
- Node.js 20 or later
- A WaveSpeedAI API key

## Run locally
1. Open a terminal in the `server` folder.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and put your real key in `WAVESPEED_API_KEY` in `.env`.
4. Start the server: `npm start`
5. Check `http://localhost:8080/health`.

## Routes
- `GET /health` — service health and whether the API key is configured.
- `GET /api/status` — redirects to `/health`.
- `POST /api/generate-video` — submit an image-to-video request.
- `GET /api/predictions/:id/result` — poll a prediction result.

## Security
Never commit or share your real `.env` file or WaveSpeedAI API key. Configure `WAVESPEED_API_KEY` as a secret environment variable on your hosting provider.

## Important
This ZIP contains the backend proxy files only, not the Android app. The server code has been packaged but has not been tested against a live WaveSpeedAI account or deployed to a public URL.
