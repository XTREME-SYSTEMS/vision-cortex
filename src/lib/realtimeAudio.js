// Audio processing utilities for Vercel AI Gateway realtime voice
// Handles PCM16 conversion, base64 encoding/decoding, and resampling

// Convert Float32 samples to PCM16 (Int16Array)
export function float32ToPCM16(float32Array) {
  const pcm16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return pcm16;
}

// Convert PCM16 (Int16Array) to Float32 samples
export function pcm16ToFloat32(int16Array) {
  const float32 = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32[i] = int16Array[i] / 0x8000;
  }
  return float32;
}

// Convert ArrayBuffer to base64 string
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 string to ArrayBuffer
export function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Downsample from one sample rate to another (linear interpolation)
export function downsampleBuffer(float32Array, fromRate, toRate) {
  if (fromRate === toRate) return float32Array;
  const ratio = toRate / fromRate;
  const newLength = Math.round(float32Array.length * ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const index = i / ratio;
    const indexFloor = Math.floor(index);
    const indexFrac = index - indexFloor;
    const sample1 = float32Array[indexFloor] || 0;
    const sample2 = float32Array[indexFloor + 1] || sample1;
    result[i] = sample1 + (sample2 - sample1) * indexFrac;
  }
  return result;
}