const $ = id => document.getElementById(id);
const original = $('original'), result = $('result');
let worker, ready = false, version = 0, fileVersion = 0, timer, filename = 'portrait', sourcePending = null;
function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
function setBusy(value) { $('busy').hidden = !value; $('download').disabled = value || !ready; }
function showView(view) {
  original.hidden = !ready || view !== 'original'; result.hidden = !ready || view !== 'sketch';
  $('show-original').setAttribute('aria-pressed', String(view === 'original'));
  $('show-sketch').setAttribute('aria-pressed', String(view === 'sketch'));
}
function ensureWorker() {
  if (worker) return;
  worker = new Worker('worker.js');
  worker.onmessage = ({ data }) => {
    if (data.id !== version) return;
    if (data.error) { setBusy(false); $('download').disabled = true; status('Could not process this image. Please try another photo.', true); return; }
    result.width = data.width; result.height = data.height;
    result.getContext('2d').putImageData(new ImageData(data.pixels, data.width, data.height), 0, 0);
    ready = true; $('empty').hidden = true; $('settings').disabled = false;
    $('show-original').disabled = $('show-sketch').disabled = false;
    showView($('show-original').getAttribute('aria-pressed') === 'true' ? 'original' : 'sketch');
    setBusy(false); status('Your sketch is ready to download.');
  };
  worker.onerror = () => { worker.terminate(); worker = null; ready = false; setBusy(false); $('settings').disabled = true; status('Processing failed. Please upload the image again.', true); };
}
function render() {
  clearTimeout(timer); ensureWorker(); setBusy(true); status('Creating your pencil sketch…');
  worker.postMessage({ id: ++version, source: sourcePending, strength: +$('strength').value, detail: +$('detail').value });
  sourcePending = null;
}
async function loadFile(file) {
  if (!file) return;
  if (file.size > 25 * 1024 * 1024) { status('This file is too large. Choose an image under 25 MB.', true); return; }
  if (file.type && !file.type.startsWith('image/')) { status('Choose a photo or drawing, such as JPG, PNG, or WebP.', true); return; }
  const request = ++fileVersion; ++version; clearTimeout(timer);
  $('settings').disabled = true; $('show-original').disabled = $('show-sketch').disabled = true;
  setBusy(true); status('Opening your image…');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode();
    if (request !== fileVersion) return;
    const scale = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
    original.width = Math.max(1, Math.round(img.naturalWidth * scale)); original.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = original.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, original.width, original.height); ctx.drawImage(img, 0, 0, original.width, original.height);
    sourcePending = ctx.getImageData(0, 0, original.width, original.height);
    filename = file.name.replace(/\.[^.]+$/, '') || 'portrait';
    $('filename').textContent = file.name; $('filename').hidden = false; $('upload-title').textContent = 'Choose another image';
    $('dimensions').textContent = `${original.width} × ${original.height} PX${scale < 1 ? ' · RESIZED TO 2400 PX' : ''}`;
    $('workspace-title').textContent = 'Your pencil sketch';
    if (worker) { worker.terminate(); worker = null; }
    render();
  } catch (error) {
    if (request !== fileVersion) return;
    setBusy(false); $('settings').disabled = !ready; $('show-original').disabled = $('show-sketch').disabled = !ready;
    status('Could not open this file. Try JPG, PNG, or WebP. HEIC is not supported in every browser.', true);
  } finally { URL.revokeObjectURL(url); }
}
$('file').addEventListener('change', event => { loadFile(event.target.files[0]); event.target.value = ''; });
for (const type of ['dragenter', 'dragover']) $('dropzone').addEventListener(type, event => { event.preventDefault(); $('dropzone').classList.add('dragging'); });
for (const type of ['dragleave', 'drop']) $('dropzone').addEventListener(type, event => { event.preventDefault(); $('dropzone').classList.remove('dragging'); });
$('dropzone').addEventListener('drop', event => loadFile(event.dataTransfer.files[0]));
window.addEventListener('dragover', event => event.preventDefault());
window.addEventListener('drop', event => event.preventDefault());
for (const id of ['strength', 'detail']) $(id).addEventListener('input', () => {
  $(id + '-value').value = $(id).value + '%'; ++version; setBusy(true); clearTimeout(timer); timer = setTimeout(render, 120);
});
$('show-original').addEventListener('click', () => showView('original'));
$('show-sketch').addEventListener('click', () => showView('sketch'));
$('download').addEventListener('click', () => {
  if (!ready || !$('busy').hidden) return;
  const name = filename;
  result.toBlob(blob => {
    if (!blob) { status('Could not save the PNG. Please try again.', true); return; }
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `${name}-sketch.png`; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000); status('Your PNG is ready to save.');
  }, 'image/png');
});
if (document.modelContext?.registerTool) {
  try { Promise.resolve(document.modelContext.registerTool({
    name: 'configure_sketch', description: 'Set pencil strength and stroke thickness for the image already selected by the user.',
    inputSchema: { type: 'object', properties: { strength: { type: 'number', minimum: 0, maximum: 100 }, detail: { type: 'number', minimum: 0, maximum: 100 } }, required: ['strength', 'detail'], additionalProperties: false },
    annotations: { readOnlyHint: false },
    async execute(input) {
      if (!ready || !$('busy').hidden) throw new Error('Upload an image and wait for processing first.');
      if (!input || ![input.strength, input.detail].every(n => Number.isFinite(n) && n >= 0 && n <= 100)) throw new Error('Values must be between 0 and 100.');
      for (const id of ['strength', 'detail']) { $(id).value = input[id]; $(id + '-value').value = $(id).value + '%'; }
      render();
      const expected = version;
      await new Promise((resolve, reject) => {
        const started = Date.now(), check = () => {
          if (version !== expected) return reject(new Error('Image or settings changed.'));
          if (Date.now() - started > 30000) return reject(new Error('Processing timed out.'));
          if ($('busy').hidden) return $('download').disabled ? reject(new Error('Processing failed.')) : resolve();
          setTimeout(check, 50);
        }; check();
      });
      return { status: 'ready', width: result.width, height: result.height, strength: +$('strength').value, detail: +$('detail').value };
    }
  })).catch(() => {}); } catch (_) { /* Optional browser API. */ }
}
