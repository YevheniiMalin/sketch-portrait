importScripts('sketch.js');
let source;
self.onmessage = ({ data }) => {
  try {
    if (data.source) source = data.source;
    if (!source) throw new Error('No image loaded');
    const pixels = makeSketch(source.data, source.width, source.height, data.strength, data.detail);
    self.postMessage({ id: data.id, width: source.width, height: source.height, pixels }, [pixels.buffer]);
  } catch (error) { self.postMessage({ id: data.id, error: error.message }); }
};
