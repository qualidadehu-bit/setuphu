const TOKEN_KEY = 'auth_token';

const sanitizeBaseUrl = (value: string): string => value.replace(/\/+$/, '');

const getOriginFromUrl = (value: string): string => {
  try {
    const parsed = new URL(value);
    return parsed.origin;
  } catch {
    return '';
  }
};

const getAuthEndpoint = (): string => {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (apiBaseUrl) {
    return `${sanitizeBaseUrl(apiBaseUrl)}/api/auth`;
  }

  const directAuthUrl = process.env.EXPO_PUBLIC_AUTH_API_URL;
  if (directAuthUrl) {
    return directAuthUrl;
  }

  const syncUrl = process.env.EXPO_PUBLIC_SYNC_API_URL;
  if (syncUrl) {
    const origin = getOriginFromUrl(syncUrl);
    return origin ? `${origin}/api/auth` : '';
  }

  return '';
};

const isApiBaseUrlConfigured = (): boolean => Boolean(process.env.EXPO_PUBLIC_API_BASE_URL?.trim());

const getMeEndpoint = (): string => {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (apiBaseUrl) {
    return `${sanitizeBaseUrl(apiBaseUrl)}/api/me`;
  }

  const directMeUrl = process.env.EXPO_PUBLIC_ME_API_URL;
  if (directMeUrl) {
    return directMeUrl;
  }

  const authUrl = process.env.EXPO_PUBLIC_AUTH_API_URL;
  if (authUrl) {
    const origin = getOriginFromUrl(authUrl);
    return origin ? `${origin}/api/me` : '';
  }

  const syncUrl = process.env.EXPO_PUBLIC_SYNC_API_URL;
  if (syncUrl) {
    const origin = getOriginFromUrl(syncUrl);
    return origin ? `${origin}/api/me` : '';
  }

  return '';
};

interface LoginApiResponse {
  token?: string;
  accessToken?: string;
  data?: { token?: string; accessToken?: string };
  error?: string;
  message?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

interface MeApiResponse {
  ok?: boolean;
  error?: string;
  message?: string;
  user?: {
    email?: string;
  };
  exp?: number;
}

export const loginWithEmail = async ({ email, password }: LoginPayload): Promise<string> => {
  const authEndpoint = getAuthEndpoint();
  const meEndpoint = getMeEndpoint();

  console.log('[auth]', {
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? '(vazio)',
    authEndpoint: authEndpoint || '(vazio)',
    meEndpoint: meEndpoint || '(vazio)',
  });

  if (!authEndpoint) {
    if (!isApiBaseUrlConfigured()) {
      throw new Error('Erro: URL base não configurada no Build');
    }
    throw new Error(
      'URL da API de autenticacao nao configurada. Defina EXPO_PUBLIC_API_BASE_URL (recomendado) ou EXPO_PUBLIC_AUTH_API_URL.',
    );
  }

  const response = await fetch(authEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  let payload: LoginApiResponse | null = null;
  try {
    payload = (await response.json()) as LoginApiResponse;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('E-mail ou senha invalidos.');
    }
    throw new Error(payload?.error || payload?.message || `Falha de autenticacao (HTTP ${response.status}).`);
  }

  const token = payload?.token || payload?.accessToken || payload?.data?.token || payload?.data?.accessToken;
  if (!token) {
    throw new Error('Login concluido, mas a API nao retornou token.');
  }

  return token;
};

export interface SessionInfo {
  email: string;
  exp?: number;
}

export const validateToken = async (token: string): Promise<SessionInfo> => {
  const meEndpoint = getMeEndpoint();

  console.log('[auth/session]', {
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? '(vazio)',
    meEndpoint: meEndpoint || '(vazio)',
  });

  if (!meEndpoint) {
    if (!isApiBaseUrlConfigured()) {
      throw new Error('Erro: URL base não configurada no Build');
    }
    throw new Error(
      'URL da API de sessao nao configurada. Defina EXPO_PUBLIC_API_BASE_URL (recomendado) ou EXPO_PUBLIC_ME_API_URL.',
    );
  }

  const response = await fetch(meEndpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  let payload: MeApiResponse | null = null;
  try {
    payload = (await response.json()) as MeApiResponse;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Sessao expirada ou invalida.');
    }
    throw new Error(payload?.error || payload?.message || `Falha ao validar sessao (HTTP ${response.status}).`);
  }

  return {
    email: payload?.user?.email || '',
    exp: payload?.exp,
  };
};

export const authTokenKey = TOKEN_KEY;
