const textEncoder = new TextEncoder();

const json = (payload, init = {}) =>
  new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...init.headers,
    },
    status: init.status || 200,
  });

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

const issueToken = async (claims, secret) => {
  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64urlEncode(JSON.stringify(claims));
  const signature = await sign(`${header}.${payload}`, secret);
  return `${header}.${payload}.${signature}`;
};

const parseBody = async (request) => {
  try {
    const body = await request.json();
    return typeof body === 'object' && body ? body : null;
  } catch {
    return null;
  }
};

const isConfiguredLogin = (env) => {
  const loginEmail = String(env.AUTH_LOGIN_EMAIL || '').trim();
  const loginPassword = String(env.AUTH_LOGIN_PASSWORD || '').trim();
  return loginEmail.length > 0 && loginPassword.length > 0;
};

export async function onRequestPost(context) {
  const { request, env } = context;
  const authSecret = String(env.AUTH_TOKEN_SECRET || '').trim();

  if (!authSecret) {
    return json(
      { ok: false, error: 'Auth temporarily unavailable.' },
      { status: 500 },
    );
  }

  const body = await parseBody(request);
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');

  if (!email || !password) {
    return json(
      { ok: false, error: 'E-mail and password are required.' },
      { status: 400 },
    );
  }

  if (isConfiguredLogin(env)) {
    const expectedEmail = String(env.AUTH_LOGIN_EMAIL).trim().toLowerCase();
    const expectedPassword = String(env.AUTH_LOGIN_PASSWORD);
    if (email !== expectedEmail || password !== expectedPassword) {
      return json(
        { ok: false, error: 'Invalid credentials.' },
        { status: 401 },
      );
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await issueToken(
    {
      sub: email,
      iat: now,
      exp: now + 60 * 60 * 8, // 8h
      aud: 'setup-hu-mobile',
    },
    authSecret,
  );

  return json({
    ok: true,
    token,
    expiresIn: 60 * 60 * 8,
  });
}

export function onRequestOptions() {
  return json({ ok: true }, { status: 204 });
}
