# Image Scanner PWA (TensorFlow.js)

This is a minimal Progressive Web App that lets you **capture or upload an image** in the browser,
then runs **on-device object detection** using **TensorFlow.js** and the **COCO-SSD** model.

It is designed to demonstrate:

- **PWA basics**: manifest, service worker, offline caching, installability.
- **Front-end camera / image access** via an `<input type="file" accept="image/*" capture="environment">`.
- **TensorFlow.js integration** for running inference entirely in the browser (no backend required).

## Tech Stack & Libraries

- **Frontend**: Vanilla HTML, CSS, and JavaScript (no framework).
- **TensorFlow.js**: `@tensorflow/tfjs` loaded via CDN.
- **Model**: `@tensorflow-models/coco-ssd` pre-trained object detection model.
- **PWA**: `manifest.webmanifest` and `service-worker.js` with a simple cache-first strategy for core assets.

## Running Locally

Because service workers require `https` or `http://localhost`, you need to serve the files via a local web server.

From the project folder (for example a directory named `pwa`):

```bash
# Option 1: Using Python
python -m http.server 4173

# Option 2: Using Node's serve (install once globally)
npm install -g serve
serve -l 4173 .
```

Then open `http://localhost:4173/` in your browser.

You should see the **Image Scanner** UI. The first load might take a few seconds while TensorFlow.js and the model download.

## Deploying (run online so anyone can use it)

The app uses **relative paths** and works on any host. Choose one:

**Option A: Netlify (easiest)**

1. Push this repo to GitHub.
2. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import an existing project**.
3. Connect your GitHub repo, pick this project. Leave build settings as default (publish directory: root).
4. Deploy. You get a URL like `https://your-site-name.netlify.app`.

**Option B: Vercel**

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
3. Import your GitHub repo. Deploy.
4. You get a URL like `https://your-project.vercel.app`.

**Option C: GitHub Pages**

1. Repo → **Settings** → **Pages**.
2. Source: **Deploy from a branch**. Branch: `main`, folder: `/ (root)`.
3. Save. App will be at `https://<username>.github.io/<repo-name>/`.

**Important:** The app must run over **HTTPS** (or localhost). Opening `file://index.html` will not work for camera or service workers.

## How It Works

- **Image capture / upload**:
  - The page exposes a single button ("Use Camera / Upload") that is backed by a file input:
    - On mobile browsers, `capture="environment"` will typically open the **rear camera** directly.
    - On desktop, it will open a standard file picker.
- **Image processing**:
  - The selected image file is converted to an `ImageBitmap`, drawn to an off-screen canvas, and then passed into the **COCO-SSD** model.
  - The visible `<canvas>` shows a scaled preview of the image.
- **Model inference**:
  - The COCO-SSD model returns a list of detected objects with:
    - `class`: the label (e.g. `person`, `bottle`).
    - `score`: confidence between 0 and 1.
  - The app filters out low-confidence predictions and displays the top detections with their **confidence percentages**.
- **PWA behavior**:
  - `service-worker.js` caches **core shell assets** (`index.html`, `style.css`, `app.js`, `manifest`) on install.
  - Subsequent visits can load instantly and continue to work offline (for previously cached assets).

## Files Overview

- `index.html`: Main UI, includes:
  - Buttons for image capture/upload and clearing.
  - `<canvas>` for preview and containers for detection results.
  - `<script>` tags to load TensorFlow.js and the COCO-SSD model from the CDN.
- `app.js`:
  - Loads the COCO-SSD model (`cocoSsd.load()`).
  - Handles file input change events.
  - Draws the image to a canvas and runs `model.detect(...)`.
  - Displays the **detected classes and confidence scores**.
  - Registers the service worker.
- `style.css`: Modern, responsive styling for the page and cards.
- `manifest.webmanifest`: PWA manifest with app metadata and icons.
- `service-worker.js`: Service worker implementing a simple cache-first strategy for static assets.


- **Approach**:
  - "Built a plain JS PWA that captures or uploads an image and performs on-device object detection using TensorFlow.js (COCO-SSD)."
  - "Implemented PWA features via a manifest and a cache-first service worker so the app is installable and loads offline after first visit."
- **Libraries used**:
  - `@tensorflow/tfjs` (CDN).
  - `@tensorflow-models/coco-ssd` (CDN).
    


