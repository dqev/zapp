# Zapp Production Deployment Guide

This guide explains how to deploy Zapp to production on your domain `zapp.devchauhan.in` using **Vercel** for the frontend and **Hugging Face Spaces** for the WebSocket signaling server.

---

## 1. Architecture Overview

Both parts of the application are hosted on free tiers optimized for their specific runtime:

```
                  ┌──────────────────────┐
                  │   zapp.devchauhan.in  │
                  └──────────┬───────────┘
                             │ (Served by Vercel)
                             ▼
                    ┌─────────────────┐
                    │  Vite Frontend  │
                    └─────────────────┘
                             │
                      P2P Handshake (wss://devchauhann-zapp.hf.space)
                             │
                             ▼
                 ┌───────────────────────────┐
                 │ Hugging Face Docker Space │
                 └─────────────┬─────────────┘
                               │ (Persistent WebSockets + Health Checks)
                               ▼
                    ┌────────────────────┐
                    │  Signaling Server  │
                    └────────────────────┘
```

---

## 2. Deploying the Frontend to Vercel (Free)

Since the frontend is a static React Single Page Application (SPA), Vercel is the ideal option:

1. **Connect GitHub Repo:** Import your repository to **Vercel**.
2. **Set Root Directory:** Choose the **`frontend`** directory as the root.
3. **Configure Build Settings:**
   * **Framework Preset:** `Vite`
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
4. **Custom Domain:**
   * Add `zapp.devchauhan.in` in Vercel project settings.
   * Point your domain's CNAME/A records to Vercel via your DNS provider (e.g. Cloudflare).

---

## 3. Deploying the Signaling Server to Hugging Face Spaces (Free)

Hugging Face Spaces supports running custom **Docker** applications persistently:

1. **Create Docker Space:**
   * Create a new Space on Hugging Face (e.g. `devchauhann/zapp`).
   * Select **Docker** as the SDK.
2. **Repository Sync:**
   * Clone the Space repository:
     ```bash
     git clone https://huggingface.co/spaces/devchauhann/zapp
     ```
   * Place the following files inside the Space directory:
     * `server.js` (refactored Node.js WebSocket code wrapped in an HTTP server)
     * `package.json` (defining `ws` dependency and Node engine)
     * `Dockerfile` (installs dependencies, exposes port `7860`, and runs the server)
3. **Health Probes:**
   * Hugging Face requires the container to bind to port `7860` (injected via `PORT`).
   * The server must respond to standard HTTP GET requests (on `/health` or `/`) with a `200 OK` status, which keeping the Space in the **"Running"** state.
4. **WSS Endpoint:**
   * Once pushed, the Space starts building. The secure WebSocket connection is exposed directly at:
     ```
     wss://devchauhann-zapp.hf.space
     ```
   * The client hook `useWebRTC.ts` is configured to automatically connect to this Space address when running in production.
