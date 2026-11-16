import { useEffect, useState } from 'react';
import { clear, createStore, del, get, set, type UseStore } from 'idb-keyval';
import { newId } from '@/lib/id';

/**
 * Photo storage for the portfolio.
 *
 * A photo ref is one of
 *  - `asset:<path>`  a bundled file under /public, e.g. "asset:/seed/portfolio/weld.svg"
 *  - `idb:<key>`     a user photo stored as a Blob in IndexedDB
 * Anything else (http, blob: or data: URLs) is passed through unchanged.
 */
const ASSET_PREFIX = 'asset:';
const IDB_PREFIX = 'idb:';

export type PhotoMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
const AI_MEDIA_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
/** Base64 grows by a third, and the vision API caps images at 5 MB. */
const MAX_DIRECT_BYTES = 3_500_000;

export interface PhotoBase64 {
  mediaType: PhotoMediaType;
  /** Base64 without the `data:` prefix. */
  data: string;
}

export const isAssetRef = (ref: string) => ref.startsWith(ASSET_PREFIX);
export const isIdbRef = (ref: string) => ref.startsWith(IDB_PREFIX);

let photoStore: UseStore | undefined;
/** Own database, so clearing photos never touches anything else. Created on first use. */
function store(): UseStore {
  photoStore ??= createStore('kompass-photos', 'photos');
  return photoStore;
}

const hasIndexedDb = () => typeof indexedDB !== 'undefined';

/** Public URL for an `asset:` ref, honouring Vite's base path. */
export function assetUrl(ref: string): string {
  const path = ref.slice(ASSET_PREFIX.length);
  const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

// ---------------------------------------------------------------- storage

/** Stores a photo and returns its `idb:<key>` ref. */
export async function savePhoto(blob: Blob): Promise<string> {
  const key = newId();
  await set(key, blob, store());
  return `${IDB_PREFIX}${key}`;
}

/** The stored Blob for an `idb:` ref, or the fetched file for an `asset:` ref. */
export async function loadPhotoBlob(ref: string): Promise<Blob | null> {
  if (isIdbRef(ref)) {
    if (!hasIndexedDb()) return null;
    const blob = await get<Blob>(ref.slice(IDB_PREFIX.length), store());
    return blob ?? null;
  }
  const url = isAssetRef(ref) ? assetUrl(ref) : ref;
  const response = await fetch(url);
  if (!response.ok) return null;
  const blob = await response.blob();
  // Some servers send SVG as text/plain or text/xml; the decoder needs the real type.
  return /\.svg(\?|$)/i.test(url) && blob.type !== 'image/svg+xml'
    ? new Blob([blob], { type: 'image/svg+xml' })
    : blob;
}

/** Deletes a user photo. Asset refs and missing refs are ignored. */
export async function deletePhoto(ref: string | null | undefined): Promise<void> {
  if (!ref || !isIdbRef(ref) || !hasIndexedDb()) return;
  await del(ref.slice(IDB_PREFIX.length), store());
}

/** Deletes every stored user photo (used by "Tilbakestill demodata"). */
export async function clearPhotos(): Promise<void> {
  if (!hasIndexedDb()) return;
  await clear(store());
}

// ---------------------------------------------------------------- display

/**
 * Resolves a photo ref to something an `<img src>` can show. `asset:` refs resolve at once;
 * `idb:` refs resolve after a read (null meanwhile) to an object URL that is revoked when
 * the ref changes or the component unmounts.
 */
export function usePhotoUrl(ref: string | null | undefined): string | null {
  const [loaded, setLoaded] = useState<{ ref: string; url: string } | null>(null);

  useEffect(() => {
    if (!ref || !isIdbRef(ref)) return;
    let cancelled = false;
    let url: string | null = null;
    loadPhotoBlob(ref)
      .then((blob) => {
        if (cancelled || !blob) return;
        url = URL.createObjectURL(blob);
        setLoaded({ ref, url });
      })
      .catch(() => {
        // A missing or unreadable photo simply shows the placeholder.
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [ref]);

  if (!ref) return null;
  if (isAssetRef(ref)) return assetUrl(ref);
  if (!isIdbRef(ref)) return ref;
  return loaded?.ref === ref ? loaded.url : null;
}

// ---------------------------------------------------------------- conversion

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

function decodeWithImageElement(blob: Blob): Promise<Decoded> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.decoding = 'async';
    image.onload = () =>
      resolve({
        source: image,
        // An SVG without intrinsic size reports 0: fall back to the seed images' 4:3 size.
        width: image.naturalWidth || 1280,
        height: image.naturalHeight || 960,
        release: () => URL.revokeObjectURL(url),
      });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Kunne ikke lese bildet.'));
    };
    image.src = url;
  });
}

async function decode(blob: Blob): Promise<Decoded> {
  const isSvg = blob.type === 'image/svg+xml';
  if (!isSvg && typeof createImageBitmap === 'function') {
    try {
      // Applies the EXIF rotation phone cameras rely on.
      const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Fall through to the <img> decoder.
    }
  }
  return decodeWithImageElement(blob);
}

/** Draws any decodable image (including SVG) onto a white canvas and encodes it as JPEG. */
async function toJpeg(blob: Blob, maxPx: number, quality: number): Promise<Blob> {
  const decoded = await decode(blob);
  try {
    const scale = Math.min(1, maxPx / Math.max(decoded.width, decoded.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(decoded.width * scale));
    canvas.height = Math.max(1, Math.round(decoded.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Kunne ikke behandle bildet.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('Kunne ikke lagre bildet.'))),
        'image/jpeg',
        quality,
      );
    });
  } finally {
    decoded.release();
  }
}

/**
 * Downscales a picked or captured image so the longest side is at most `maxPx` and
 * re-encodes it as JPEG. Use the result with `savePhoto`.
 */
export function fileToDownscaledJpeg(file: Blob, maxPx = 1280, quality = 0.85): Promise<Blob> {
  return toJpeg(file, maxPx, quality);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Kunne ikke lese bildet.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * The photo as base64 for the AI route (`PortfolioDescribeRequest.image`). SVG seed assets
 * and oversized or unsupported files are rasterised to JPEG first, since the vision API
 * only takes JPEG, PNG, WebP and GIF. Returns null when the photo cannot be read.
 */
export async function photoToBase64(
  ref: string | null | undefined,
  maxPx = 1280,
): Promise<PhotoBase64 | null> {
  if (!ref) return null;
  try {
    const blob = await loadPhotoBlob(ref);
    if (!blob) return null;
    if (AI_MEDIA_TYPES.includes(blob.type) && blob.size <= MAX_DIRECT_BYTES) {
      return { mediaType: blob.type as PhotoMediaType, data: await blobToBase64(blob) };
    }
    const jpeg = await toJpeg(blob, maxPx, 0.85);
    return { mediaType: 'image/jpeg', data: await blobToBase64(jpeg) };
  } catch {
    return null;
  }
}
