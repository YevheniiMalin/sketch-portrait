# Stroke — Photo to Pencil Sketch

A small, dependency-free website that turns photos and drawings into pencil sketches.

- Upload an image or drag and drop it.
- Adjust pencil strength and stroke width.
- Switch between the original and sketch, then download a watermark-free PNG.
- Images stay on your device: processing runs entirely in a browser Web Worker.
- Responsive English interface. No accounts, paid APIs, or analytics.

## Run locally

With Node.js installed, run `node server.cjs` and open http://localhost:8080. Alternatively, serve `dist` with any static HTTP server. Opening `index.html` via `file://` can block the Web Worker.

## Limits

Files up to 25 MB. Format support depends on your browser; JPG, PNG, and WebP are recommended. HEIC may need conversion. Large images are resized to 2400 pixels on their longest edge. The filter preserves the original composition; it does not generate a new portrait or automatically crop faces. Animated images use one frame. Transparency becomes white.

## Processing

The image is converted to grayscale. Three linear-time box-blur passes approximate a Gaussian blur. Color-dodge blending brings out contours, while a little original tone preserves shading. Processing happens off the main UI thread.

## Deployment

The GitHub Actions workflow deploys `dist` to GitHub Pages. In the repository's Pages settings, choose **GitHub Actions** as the source. All asset paths are relative, so the site also works under a repository subpath or any other static host.

## Checks

Run `node --check dist/app.js`, `node --check dist/worker.js`, and `node test.cjs`.
