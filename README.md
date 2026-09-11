# Lotus Prime AI Jewellery Mirror

A kiosk-ready jewellery virtual try-on demo built with Next.js, MediaPipe Face Landmarker, Canvas AR overlays, and optional Three.js GLB rendering.

## What works

- Full-screen luxury jewellery kiosk UI
- Webcam capture using the browser
- MediaPipe Face Landmarker live tracking
- 2D necklace, choker and earring overlays
- Position/scale/rotation smoothing
- GPU MediaPipe with CPU fallback
- Product switching without restarting the page
- Product price/SKU/purity/weight display
- WhatsApp enquiry links
- QR share modal
- Snapshot for 2D AR
- Fullscreen button
- Configurable inactivity reset
- Optional Three.js `.glb` 3D jewellery layer

## Requirements

- Node.js 20.9+ recommended
- Chrome or Edge
- Webcam
- Internet for the MediaPipe WASM/model assets used by this starter

## Run in VS Code

```bash
npm install
```

Copy `.env.example` to `.env.local` and edit store details.

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Allow camera permission.

## Important camera note

Browser camera APIs require `localhost` or HTTPS. In production, deploy to an HTTPS domain.

## Add real jewellery

1. Put transparent PNG/WebP/SVG assets in `public/jewellery/`.
2. Open `src/data/jewellery.ts`.
3. Add product data and tune:
   - `scaleMultiplier`
   - `offsetX`
   - `offsetY`
4. Test each SKU on multiple people.

For commercial accuracy, every product should be calibrated individually.

## Enable a 3D GLB product

1. Add an optimized model at `public/models/necklace.glb`.
2. Set `model3dUrl: "/models/necklace.glb"`.
3. Set `renderMode: "3d"`.
4. Set `active: true`.
5. Calibrate scale and offsets.

Three.js GLTFLoader is already included.

## Production recommendations

- Move product data to Supabase.
- Add `tenant_id`, `branch_id`, `device_id`.
- Store client WhatsApp/config per tenant.
- Use signed URLs for private product assets if required.
- Add consent before saving customer snapshots.
- Auto-delete customer snapshots after a short retention window.
- Cache catalogue assets for poor connectivity.
- Add remote health monitoring for kiosks.
- Pin dependency versions after your first successful production build.

## Suggested kiosk hardware

- 43-inch touch display
- Windows mini-PC, 8 GB RAM or better
- 1080p webcam centered above screen
- Stable Wi-Fi/Ethernet
- Good front lighting
- Chrome/Edge kiosk mode

## Windows Chrome kiosk example

```bat
"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk https://YOUR-DOMAIN.example
```

## 3D limitations

The starter includes the rendering pipeline, but not a real commercial jewellery GLB asset. Real 3D assets must be supplied by the jewellery client or created/converted from CAD/Blender. 3D snapshot compositing is intentionally not implemented in this starter; the live 3D view is the focus.
