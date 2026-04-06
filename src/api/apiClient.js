const ENTITY_ENDPOINT = {
  Leito: 'leitos',
  EventoLeito: 'eventos',
  Membro: 'membros',
  Escala: 'escalas',
  Notificacao: 'notificacoes',
};

const SUBSCRIBE_POLL_MS = 5000;

const runtimeImportMeta = /** @type {{env?: {VITE_GAS_BASE_URL?: string, VITE_API_KEY?: string}}} */ (/** @type {any} */ (import.meta));
const viteEnv = runtimeImportMeta.env || {};
const CONFIG_ERROR = '[apiClient] VITE_GAS_BASE_URL nao configurada. Defina no .env do build e publique novamente. Em deploy estatico, configure window.__APP_CONFIG__.VITE_GAS_BASE_URL em runtime.';

const firstNonEmptyString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (
        trimmed &&
        trimmed !== 'undefined' &&
        trimmed !== 'null' &&
        !/^%VITE_[A-Z0-9_]+%$/.test(trimmed)
      ) {
        return trimmed;
      }
    }
  }
  return '';
};

const getRuntimeConfigFromGlobal = () => {
  const root = (typeof globalThis === 'object' && globalThis) ? /** @type {any} */ (globalThis) : {};
  const appConfig = (root.__APP_CONFIG__ && typeof root.__APP_CONFIG__ === 'object') ? root.__APP_CONFIG__ : {};
  const envConfig = (root.__ENV__ && typeof root.__ENV__ === 'object') ? root.__ENV__ : {};
  return {
    baseUrl: firstNonEmptyString(
      appConfig.VITE_GAS_BASE_URL,
      appConfig.GAS_BASE_URL,
      envConfig.VITE_GAS_BASE_URL,
      envConfig.GAS_BASE_URL,
      root.VITE_GAS_BASE_URL,
    ),
    apiKey: firstNonEmptyString(
      appConfig.VITE_API_KEY,
      appConfig.API_KEY,
      envConfig.VITE_API_KEY,
      envConfig.API_KEY,
      root.VITE_API_KEY,
    ),
  };
};

const getRuntimeConfig = () => {
  const globalConfig = getRuntimeConfigFromGlobal();
  return {
    // Prioridade: env do build (Vite) -> config runtime global.
    baseUrl: firstNonEmptyString(viteEnv.VITE_GAS_BASE_URL, globalConfig.baseUrl),
    apiKey: firstNonEmptyString(viteEnv.VITE_API_KEY, globalConfig.apiKey),
  };
};

const getBaseUrl = () => {
  const { baseUrl } = getRuntimeConfig();
  if (!baseUrl) {
    throw new Error(CONFIG_ERROR);
  }
  return baseUrl.replace(/\/+$/, '');
};

const buildUrl = (path, query) => {
  const url = new URL(getBaseUrl());
  const { apiKey } = getRuntimeConfig();
  url.searchParams.set('path', path.startsWith('/') ? path : `/${path}`);
  if (apiKey) {
    // Compatibilidade com GAS que valida chave por querystring.
    url.searchParams.set('api_key', apiKey);
  }
  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
};

const getHeaders = (hasBody = false) => {
  /** @type {Record<string, string>} */
  const headers = {};
  if (hasBody) {
    // Evita preflight CORS em chamadas browser -> GAS.
    headers['Content-Type'] = 'text/plain;charset=UTF-8';
  }
  return headers;
};

const safeJson = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const extractPayload = (payload) => {
  if (payload && typeof payload === 'object' && 'ok' in payload) {
    if (!payload.ok) throw new Error(payload.error || 'Erro na API GAS');
    return payload.data;
  }
  return payload;
};

const request = async (method, path, body, query) => {
  try {
    const payload = body && typeof body === 'object' ? { ...body } : body;
    const { apiKey } = getRuntimeConfig();
    if (payload && typeof payload === 'object' && apiKey && !('api_key' in payload)) {
      // Compatibilidade com GAS que valida chave no corpo do POST.
      payload.api_key = apiKey;
    }
    const response = await fetch(buildUrl(path, query), {
      method,
      headers: getHeaders(Boolean(body)),
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const parsed = await safeJson(response);
    if (!response.ok) {
      const msg = parsed?.error || parsed?.message || `HTTP ${response.status}`;
      throw new Error(msg);
    }
    return extractPayload(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'Failed to fetch' || /networkerror/i.test(message)) {
      throw new Error(
        `[apiClient] ${method} ${path} falhou: Failed to fetch. Verifique CORS/preflight no GAS e se VITE_GAS_BASE_URL aponta para .../exec.`,
      );
    }
    throw new Error(`[apiClient] ${method} ${path} falhou: ${message}`);
  }
};

const getRequest = (path, query) => request('GET', path, undefined, query);
const postRequest = (path, body) => request('POST', path, body);

const isTruthy = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'sim';
  }
  return Boolean(value);
};

const normalizeItem = (item) => {
  if (!item || typeof item !== 'object') return item;
  const normalized = { ...item };
  if ('ativo' in normalized) normalized.ativo = isTruthy(normalized.ativo);
  if ('bloqueado' in normalized) normalized.bloqueado = isTruthy(normalized.bloqueado);
  return normalized;
};

const sortItems = (items, orderBy) => {
  if (!orderBy) return items;
  const desc = orderBy.startsWith('-');
  const key = desc ? orderBy.slice(1) : orderBy;
  return [...items].sort((a, b) => {
    const av = a?.[key];
    const bv = b?.[key];
    if (av === bv) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return desc ? bv - av : av - bv;
    const avDate = Date.parse(String(av));
    const bvDate = Date.parse(String(bv));
    if (!Number.isNaN(avDate) && !Number.isNaN(bvDate)) return desc ? bvDate - avDate : avDate - bvDate;
    return desc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
  });
};

const filterItems = (items, query = {}) =>
  items.filter((item) => Object.entries(query).every(([key, value]) => item?.[key] === value));

const tryPostPaths = async (paths, body) => {
  let lastError = null;
  for (const path of paths) {
    try {
      return await postRequest(path, body);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Nenhuma rota de escrita disponivel na API.');
};

const toUtf8Bytes = (value) => {
  try {
    return new TextEncoder().encode(String(value || ''));
  } catch {
    return null;
  }
};

const toHexString = (arrayBuffer) =>
  Array.from(new Uint8Array(arrayBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const sha256Hex = async (value) => {
  if (!(globalThis.crypto && globalThis.crypto.subtle)) {
    throw new Error('Web Crypto API indisponivel no ambiente atual.');
  }
  const bytes = toUtf8Bytes(value);
  if (!bytes) {
    throw new Error('Falha ao codificar senha para hash.');
  }
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return toHexString(hashBuffer);
};

const senhaAuthFallback = async (payload = {}) => {
  const action = String(payload.action || '').trim().toLowerCase();
  if (!action) return null;

  if (action === 'hash') {
    if (!payload.senha) {
      throw new Error('Senha obrigatoria para gerar hash.');
    }
    const hash = await sha256Hex(payload.senha);
    return { hash };
  }

  if (action === 'verify') {
    if (!payload.senha || !payload.hash) {
      return { valido: false };
    }
    const computed = await sha256Hex(payload.senha);
    return { valido: computed === String(payload.hash) };
  }

  return null;
};

const createEntityApi = (entityName) => {
  const endpoint = ENTITY_ENDPOINT[entityName];
  const basePath = `/${endpoint}`;
  return {
    async list(orderBy = '-created_date', limit) {
      try {
        const data = await getRequest(basePath);
        const normalized = Array.isArray(data) ? data.map(normalizeItem) : [];
        const sorted = sortItems(normalized, orderBy);
        return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
      } catch (error) {
        console.error(error);
        return [];
      }
    },

    async filter(query = {}, orderBy) {
      try {
        const listed = await this.list(orderBy);
        return filterItems(listed, query);
      } catch (error) {
        console.error(error);
        return [];
      }
    },

    async create(payload) {
      if (entityName === 'EventoLeito') {
        return tryPostPaths(['/eventos', '/eventos/create'], payload);
      }
      if (entityName === 'Notificacao') {
        return tryPostPaths(['/notificacoes', '/notificacoes/create'], payload);
      }
      return tryPostPaths(
        [`${basePath}/create`, basePath],
        payload,
      );
    },

    async bulkCreate(payloads = []) {
      if (!Array.isArray(payloads) || payloads.length === 0) return [];
      try {
        return await tryPostPaths(
          [`${basePath}/bulk-create`, `${basePath}/bulk`, `${basePath}/create-many`],
          { items: payloads },
        );
      } catch (error) {
        // Fallback para APIs que nao expõem endpoint bulk.
        const createdItems = [];
        for (const payload of payloads) {
          const created = await this.create(payload);
          createdItems.push(created);
        }
        return createdItems;
      }
    },

    async update(id, patch) {
      if (entityName === 'Leito') {
        return tryPostPaths(
          ['/leitos/status', '/leitos/update', '/leitos'],
          { id, ...patch },
        );
      }
      if (entityName === 'Notificacao') {
        return tryPostPaths(
          ['/notificacoes/update', '/notificacoes'],
          { id, ...patch },
        );
      }
      return tryPostPaths(
        [`${basePath}/update`, basePath],
        { id, ...patch },
      );
    },

    async delete(id) {
      return tryPostPaths(
        [`${basePath}/delete`, `${basePath}/remove`],
        { id },
      );
    },

    subscribe(callback) {
      const timer = setInterval(() => {
        Promise.resolve()
          .then(callback)
          .catch(() => {
            // Ignore polling callback errors to keep subscription alive.
          });
      }, SUBSCRIBE_POLL_MS);
      return () => clearInterval(timer);
    },
  };
};

export const apiClient = {
  meta: {
    isConfigured() {
      return Boolean(getRuntimeConfig().baseUrl);
    },
    getConfigurationError() {
      return CONFIG_ERROR;
    },
  },
  entities: {
    Leito: createEntityApi('Leito'),
    EventoLeito: createEntityApi('EventoLeito'),
    Membro: createEntityApi('Membro'),
    Escala: createEntityApi('Escala'),
    Notificacao: createEntityApi('Notificacao'),
  },

  functions: {
    async invoke(name, payload = {}) {
      if (name === 'senhaAuth') {
        try {
          const data = await tryPostPaths(['/senhaAuth', '/auth/senha', '/functions/invoke'], { name, ...payload });
          return { data: data || {} };
        } catch (error) {
          console.error('[apiClient] senhaAuth API indisponivel, usando fallback local.', error);
          try {
            const fallbackData = await senhaAuthFallback(payload);
            if (fallbackData) return { data: fallbackData };
          } catch (fallbackError) {
            console.error('[apiClient] senhaAuth fallback local falhou.', fallbackError);
          }
          const action = String(payload?.action || '').trim().toLowerCase();
          if (action === 'verify') {
            return { data: { valido: false, erro: 'Falha ao validar senha: API e fallback indisponiveis.' } };
          }
          throw new Error('Falha ao gerar hash de senha: API e fallback indisponiveis.');
        }
      }
      try {
        const data = await tryPostPaths(['/functions/invoke'], { name, ...payload });
        return { data: data || {} };
      } catch (error) {
        console.error(error);
        return { data: {} };
      }
    },
  },

  auth: {
    async me() {
      try {
        const data = await getRequest('/me');
        return normalizeItem(data) || {};
      } catch (error) {
        console.error(error);
        return null;
      }
    },
  },
};
