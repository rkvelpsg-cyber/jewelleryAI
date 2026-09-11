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
- Pose-aware shoulder anchoring for necklaces and chokers
- Directional near/far earring perspective with confidence-aware tracking
- Cover-aware mirrored coordinate mapping
- Cached 2D assets and separate left/right earring assets
- Tracking-loss hold and fade behavior
- Local assistant commands, browser speech recognition, and short text-to-speech
- Typed product event bus and recommendation foundation

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

For mobile testing, do not open the development server using an ordinary LAN URL such as `http://192.168.x.x:3000`. Mobile browsers treat that as an insecure origin and block camera access. Use an HTTPS tunnel/domain, or a local HTTPS certificate, then allow camera permission for that exact origin. The camera startup first requests the preferred front-camera resolution and automatically retries with `video: true` when a mobile browser rejects those constraints.

If the camera is busy, close the phone camera, video-call apps, QR scanners, and other browser tabs using the camera. Safari and Chrome must also have camera permission enabled in the site settings.

## Architecture and operating cost

The normal try-on path stays in the browser: camera -> MediaPipe Face/Pose -> local positioning -> Canvas/Three.js -> product events. Changing products swaps a cached local asset and keeps the camera and trackers alive. No webcam video or face landmarks are sent to a cloud service, and no image-generation API is called when browsing products. Deterministic assistant commands run locally first; `src/lib/assistant/provider.ts` is reserved for an optional server-side conversational provider.

## Fitting behavior

Necklaces use left shoulder, right shoulder, and chin anchors. Their normalized position is derived from shoulder center, shoulder width, shoulder angle, and the product `fitProfile`. Profiles include choker, short, medium, long, haaram, and bridal-set placement. Earrings use independent face-side anchors and apply a restrained directional yaw response to scale and opacity.

The overlay uses the same CSS `object-fit: cover` geometry and mirror flag as the camera. During a brief tracking loss the last stable transform is held, then faded between 400 ms and 1000 ms before being hidden. A face-based necklace fallback remains available when shoulder confidence drops.

## Local assistant

The kiosk assistant supports `next`, `previous`, necklace/choker/earring categories, `lighter`, `heavier`, price limits such as `under one lakh`, `similar`, `save`, `send to phone`, and deterministic price/weight/purity answers. Browser speech recognition and speech synthesis are used when supported. Cloud LLM access is not required for these actions.

## Add real jewellery

1. Put transparent PNG/WebP/SVG assets in `public/jewellery/`.
2. Open `src/data/jewellery.ts`.
3. Add product data and tune:
   - `scaleMultiplier`
   - `offsetX`
   - `offsetY`
   - `fitProfile`
   - `physicalWidthMm` / `physicalHeightMm`
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
- Keep `NEXT_PUBLIC_ENABLE_LLM=false` unless a server-side provider is implemented and configured.
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

## Calibration and environment

Copy `.env.example` to `.env.local`. Useful flags are `NEXT_PUBLIC_ENABLE_CALIBRATION=true`, `NEXT_PUBLIC_ENABLE_VOICE=true`, `NEXT_PUBLIC_ENABLE_3D=true`, and `NEXT_PUBLIC_ENABLE_LLM=false`. `NEXT_PUBLIC_TENANT_ID`, `NEXT_PUBLIC_BRANCH_ID`, and `NEXT_PUBLIC_DEVICE_ID` prepare event data for future multi-tenant analytics.

Calibration values are product-specific. Start with the defaults in `src/data/jewellery.ts`, then tune necklace `verticalAnchorRatio` and `scaleMultiplier`, or the two earring offset pairs, under real camera height and lighting.

## Privacy and offline behavior

Camera frames remain in the browser. Saved snapshots are generated locally only when the customer chooses Save Look; the current demo does not persist biometric data. Catalogue browsing, local commands, and cached 2D overlays continue without a cloud LLM. Remote MediaPipe model/WASM URLs still require an initial network load unless the deployment provides those assets locally.
