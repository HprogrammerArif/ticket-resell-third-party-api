import { describe, it, expect } from 'vitest';
import { detectImageType, MAX_UPLOAD_BYTES } from '../../src/modules/banners/upload';

/** The first bytes of each format, which is what the check actually reads. */
const JPEG = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
const PNG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP'),
]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const GIF = Buffer.from('GIF89a');
const HTML = Buffer.from('<!doctype html><script>alert(1)</script>');

describe('detectImageType', () => {
  it('accepts a JPEG', () => {
    expect(detectImageType(JPEG)).toBe('jpg');
  });

  it('accepts a PNG', () => {
    expect(detectImageType(PNG)).toBe('png');
  });

  it('accepts a WebP', () => {
    expect(detectImageType(WEBP)).toBe('webp');
  });

  it('rejects an SVG', () => {
    // An SVG is an image to a person and a script host to a browser. Serving
    // one from our own origin would run its script there.
    expect(detectImageType(SVG)).toBeNull();
  });

  it('rejects HTML dressed as an upload', () => {
    expect(detectImageType(HTML)).toBeNull();
  });

  it('rejects a format we do not serve', () => {
    expect(detectImageType(GIF)).toBeNull();
  });

  it('rejects a file whose bytes are not an image at all', () => {
    expect(detectImageType(Buffer.from('just some text'))).toBeNull();
  });

  it('rejects an empty buffer', () => {
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });

  it('ignores the declared extension entirely', () => {
    // The point of reading bytes: a .png suffix proves nothing about content.
    expect(detectImageType(HTML)).toBeNull();
    expect(detectImageType(JPEG)).toBe('jpg');
  });

  it('caps uploads at 5 MB', () => {
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
  });
});
