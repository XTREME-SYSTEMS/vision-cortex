// Client-side ZIP extractor — zero dependencies.
// Parses the ZIP central directory directly and inflates deflated entries
// with the browser's native DecompressionStream('deflate-raw').

async function inflateRaw(compressed) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser does not support DecompressionStream. Use a modern Chrome/Firefox/Safari.');
  }
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(compressed);
  writer.close();
  const reader = ds.readable.getReader();
  const chunks = [];
  let total = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

function parseZip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0 && i > bytes.length - 65536; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a valid ZIP archive (no end-of-central-directory record).');
  const total = dv.getUint16(eocd + 10, true);
  const cdOff = dv.getUint32(eocd + 16, true);

  const files = [];
  let p = cdOff;
  for (let i = 0; i < total; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const uncompSize = dv.getUint32(p + 24, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOff = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));
    if (!name.endsWith('/')) {
      files.push({ name, method, compSize, size: uncompSize, localOff });
    }
    p += 46 + nameLen + extraLen + commentLen;
  }

  async function getContent(entry) {
    const lh = entry.localOff;
    if (dv.getUint32(lh, true) !== 0x04034b50) throw new Error('Corrupt local header for ' + entry.name);
    const nameLen = dv.getUint16(lh + 26, true);
    const extraLen = dv.getUint16(lh + 28, true);
    const dataOff = lh + 30 + nameLen + extraLen;
    const compSize = dv.getUint32(lh + 18, true);
    const compressed = bytes.subarray(dataOff, dataOff + compSize);
    let out;
    if (entry.method === 0) out = compressed;
    else if (entry.method === 8) out = await inflateRaw(compressed);
    else throw new Error('Unsupported compression method ' + entry.method + ' for ' + entry.name);
    return new TextDecoder().decode(out);
  }

  return { fileCount: files.length, bytes: bytes.length, files, getContent };
}

export async function loadZipFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Fetch failed: ' + res.status + ' ' + res.statusText);
  const ab = await res.arrayBuffer();
  return parseZip(new Uint8Array(ab));
}

export async function loadZipFromFile(file) {
  const ab = await file.arrayBuffer();
  return parseZip(new Uint8Array(ab));
}