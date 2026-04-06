const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const json = (payload, init = {}) =>
  new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...init.headers,
    },
    status: init.status || 200,
  });

const base64urlToUint8Array = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const base64urlEncode = (input) => {
  const bytes = typeof input === 'string' ? textEncoder.encode(input) : input;
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const sign = async (data, secret) => {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(data));
  return base64urlEncode(new Uint8Array(signature));
};

const parseTokenPayload = (token) => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payloadBytes = base64urlToUint8Array(parts[1]);
    return JSON.parse(textDecoder.decode(payloadBytes));
  } catch {
    return null;
  }
};

const getBearerToken = (request) => {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization') || '';
  const [scheme, token] = authHeader.split(' ');
  if (!scheme || !token) return '';
  if (scheme.toLowerCase() !== 'bearer') return '';
  return token.trim();
};

export async function onRequestGet(context) {
  const { request, env } = context;
  const authSecret = String(env.AUTH_TOKEN_SECRET || '').trim();

  if (!authSecret) {
    return json(
      { ok: false, error: 'Auth temporarily unavailable.' },
      { status: 500 },
    );
  }

  const token = getBearerToken(request);
  if (!token) {
    return json(
      { ok: false, error: 'Authorization token is required.' },
      { status: 401 },
    );
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return json(
      { ok: false, error: 'Invalid token.' },
      { status: 401 },
    );
  }

  const [header, payload, signature] = parts;
  const expectedSignature = await sign(`${header}.${payload}`, authSecret);
  if (signature !== expectedSignature) {
    return json(
      { ok: false, error: 'Invalid token.' },
      { status: 401 },
    );
  }

  const claims = parseTokenPayload(token);
  if (!claims || typeof claims !== 'object') {
    return json(
      { ok: false, error: 'Invalid token payload.' },
      { status: 401 },
    );
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp <= now) {
    return json(
      { ok: false, error: 'Token expired.' },
      { status: 401 },
    );
  }

  return json({
    ok: true,
    user: {
      email: String(claims.sub || ''),
    },
    exp: claims.exp,
    iat: claims.iat,
    aud: claims.aud,
  });
}

export function onRequestOptions() {
  return json({ ok: true }, { status: 204 });
}
