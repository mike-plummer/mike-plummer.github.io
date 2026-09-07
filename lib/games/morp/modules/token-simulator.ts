/** Decode a raw tokenizer piece into text to append (handles Ġ / ▁ space markers). */
function decodeTokenPiece(raw: string): string {
  if (raw === 'Ġ' || raw === '▁' || raw === ' ') {
    return ' ';
  }
  if (raw.startsWith('Ġ') || raw.startsWith('▁')) {
    return ` ${raw.slice(1)}`;
  }
  if (raw.startsWith(' ')) {
    return raw;
  }
  return raw;
}

export function formatTokenForAppend(token: string, rawToken?: string): string {
  if (rawToken !== undefined && rawToken !== '') {
    return decodeTokenPiece(rawToken);
  }

  if (token === 'space') {
    return ' ';
  }
  if (token === ',' || token === '...' || token === '.') {
    return token;
  }
  if (/^[^\w\s]+$/.test(token)) {
    return token;
  }
  return ` ${token}`;
}
