const assert = require('node:assert/strict');
const { makeSketch, blur } = require('./dist/sketch.js');
for (const [w, h] of [[1, 1], [1, 9], [9, 1], [30, 20]]) {
  const white = new Uint8ClampedArray(w * h * 4).fill(255);
  const output = makeSketch(white, w, h, 100, 100);
  assert.equal(output.length, white.length);
  assert.ok(output.every(x => x === 255), 'White backgrounds stay white');
  const transparent = new Uint8ClampedArray(w * h * 4);
  assert.ok(makeSketch(transparent, w, h, 60, 40).every(x => x === 255), 'Transparency becomes white');
  assert.ok(blur(new Float32Array(w * h).fill(80), w, h, 12).every(x => Math.abs(x - 80) < .001), 'Blur preserves constant tone, including narrow images');
}
const w = 120, h = 80, pixels = new Uint8ClampedArray(w * h * 4).fill(255);
for (let y = 20; y < 60; y++) for (let x = 40; x < 80; x++) pixels.set([35, 60, 80, 255], (y * w + x) * 4);
const light = makeSketch(pixels, w, h, 0, 50), bold = makeSketch(pixels, w, h, 100, 50);
let lightInk = 0, boldInk = 0;
for (let i = 0; i < light.length; i += 4) {
  assert.equal(bold[i], bold[i + 1]); assert.equal(bold[i], bold[i + 2]); assert.equal(bold[i + 3], 255);
  lightInk += 255 - light[i]; boldInk += 255 - bold[i];
}
assert.ok(boldInk > lightInk, 'Higher strength adds darker pencil marks');
assert.ok(bold[(20 * w + 40) * 4] < bold[0], 'Object edges differ from white background');
console.log('Passed: white images, transparency, narrow dimensions, blur boundaries, grayscale, strength and edge contrast.');
