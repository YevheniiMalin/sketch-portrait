/* Linear-time separable box blur; three passes approximate a Gaussian blur. */
function blur(source, width, height, radius) {
  const temp = new Float32Array(source.length), out = new Float32Array(source.length);
  const size = radius * 2 + 1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += source[row + Math.max(0, Math.min(width - 1, k))];
    for (let x = 0; x < width; x++) {
      temp[row + x] = sum / size;
      sum += source[row + Math.min(width - 1, x + radius + 1)] - source[row + Math.max(0, x - radius)];
    }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += temp[Math.max(0, Math.min(height - 1, k)) * width + x];
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum / size;
      sum += temp[Math.min(height - 1, y + radius + 1) * width + x] - temp[Math.max(0, y - radius) * width + x];
    }
  }
  return out;
}
function makeSketch(data, width, height, strength, detail) {
  const count = width * height, gray = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const p = i * 4, alpha = data[p + 3] / 255;
    gray[i] = (data[p] * .299 + data[p + 1] * .587 + data[p + 2] * .114) * alpha + 255 * (1 - alpha);
  }
  const radius = Math.max(1, Math.round((1.5 + detail * .11) * Math.max(width, height) / 1400));
  let softened = gray;
  for (let pass = 0; pass < 3; pass++) softened = blur(softened, width, height, radius);
  const output = new Uint8ClampedArray(count * 4), intensity = .65 + strength / 40;
  for (let i = 0; i < count; i++) {
    const dodge = Math.min(1, (gray[i] + 2) / (softened[i] + 2));
    const shading = (1 - gray[i] / 255) * (.025 + strength * .0008);
    const value = Math.max(0, Math.min(255, 255 * (1 - (1 - dodge) * intensity - shading)));
    output[i * 4] = output[i * 4 + 1] = output[i * 4 + 2] = value;
    output[i * 4 + 3] = 255;
  }
  return output;
}
if (typeof module !== 'undefined') module.exports = { makeSketch, blur };
