/**
 * Minimal pure-SVG Code 39 barcode generator (no dependencies).
 * Renders crisp vector bars that scale perfectly for print and PDF.
 */

const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100',
  A: '100001001', B: '001001001', C: '101001000', D: '000011001',
  E: '100011000', F: '001011000', G: '000001101', H: '100001100',
  I: '001001100', J: '000011100', K: '100000011', L: '001000011',
  M: '101000010', N: '000010011', O: '100010010', P: '001010010',
  Q: '000000111', R: '100000110', S: '001000110', T: '000010110',
  U: '110000001', V: '011000001', W: '111000000', X: '010010001',
  Y: '110010000', Z: '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100',
  '$': '010101000', '/': '010100010', '+': '010001010', '%': '000101010',
  '*': '010010100',
};

/** Render an SVG string for the given Code 39 payload (uppercased). */
export function code39Svg(payload: string, options?: { height?: number; barColor?: string }): string {
  const height = options?.height ?? 40;
  const barColor = options?.barColor ?? '#10251c';

  const clean = String(payload)
    .toUpperCase()
    .replace(/[^0-9A-Z\-. $\/+%]/g, '')
    .slice(0, 20);
  if (!clean) return '';

  const narrow = 1;
  const wide = 2;
  const gap = narrow;

  const chars = [`*${clean}*`];
  let x = 0;
  const rects: string[] = [];
  const textWidth = chars[0].length * 13 * narrow * 1.0;

  for (const seq of chars) {
    for (const ch of seq) {
      const pattern = CODE39_PATTERNS[ch];
      if (!pattern) continue;
      for (let i = 0; i < pattern.length; i++) {
        const w = pattern[i] === '1' ? wide : narrow;
        if (i % 2 === 0) {
          rects.push(`<rect x="${x}" y="0" width="${w}" height="${height}" fill="${barColor}"/>`);
        }
        x += w;
      }
      x += gap;
    }
  }

  const totalWidth = x - gap;
  const textX = totalWidth / 2;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height + 14}" ` +
    `viewBox="0 0 ${totalWidth} ${height + 14}" role="img" aria-label="${escapeSvg(payload)}">` +
    rects.join('') +
    `<text x="${textX}" y="${height + 11}" text-anchor="middle" font-family="monospace" ` +
    `font-size="9" fill="${barColor}" letter-spacing="2">${escapeSvg(payload)}</text>` +
    `</svg>`
  );
}

function escapeSvg(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
