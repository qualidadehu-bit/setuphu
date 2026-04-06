/**
 * API GAS para módulo de Leitos (HUUEL).
 *
 * Configure no Script Properties:
 * - SPREADSHEET_ID: ID da planilha
 * - API_KEY: chave opcional para autenticação
 *
 * Rotas suportadas:
 * GET  /leitos
 * POST /leitos
 * POST /leitos/create
 * POST /leitos/bulk-create
 * POST /leitos/bulk
 * POST /leitos/create-many
 * POST /leitos/update
 * POST /leitos/status
 * POST /leitos/delete
 * POST /leitos/remove
 */

var LEITOS_SHEET_NAME = 'Leitos';
var DEFAULT_SPREADSHEET_ID = '1ZHPZOWzRwpwtuRjhRwpajmwQtuN2HtH1Qj6qgaXNsSs';
var LEITOS_COLUMNS = [
  'id',
  'numero',
  'divisao',
  'unidade',
  'quarto',
  'status',
  'ativo',
  'bloqueado',
  'ultimo_evento_at',
  'created_at',
  'updated_at'
];

var ENTITY_CONFIG = {
  membros: {
    sheetName: 'Membros',
    idPrefix: 'membro',
    columns: ['id', 'responsavel', 'categoria', 'matricula', 'senha', 'ativo', 'created_at', 'updated_at']
  },
  eventos: {
    sheetName: 'Eventos',
    idPrefix: 'evt',
    columns: ['id', 'leito_id', 'leito_numero', 'tipo', 'responsavel_nome', 'responsavel_categoria', 'timestamp', 'created_at', 'updated_at']
  },
  escalas: {
    sheetName: 'Escalas',
    idPrefix: 'esc',
    columns: ['id', 'data', 'turno', 'membro_id', 'membro_nome', 'categoria', 'status', 'created_at', 'updated_at']
  },
  notificacoes: {
    sheetName: 'Notificacoes',
    idPrefix: 'notif',
    columns: ['id', 'leito_id', 'leito_numero', 'mensagem', 'status', 'usuario_id', 'usuario_nome', 'categoria_origem', 'created_at', 'updated_at']
  }
};

function doGet(e) {
  try {
    var request = parseRequest_(e, null);
    enforceApiKey_(request);

    if (request.path === '/me') {
      return jsonOutput_(ok_({}));
    }

    if (request.path === '/leitos') {
      return jsonOutput_(ok_(listLeitos_()));
    }

    var getEntity = resolveEntityFromGetPath_(request.path);
    if (getEntity) {
      return jsonOutput_(ok_(listEntity_(getEntity)));
    }

    return jsonOutput_(fail_('Rota GET não encontrada: ' + request.path, 404));
  } catch (error) {
    return jsonOutput_(fail_(error.message || String(error), 500));
  }
}

function doPost(e) {
  try {
    var body = parseJsonBody_(e);
    var request = parseRequest_(e, body);
    enforceApiKey_(request);

    if (
      request.path === '/senhaauth' ||
      request.path === '/auth/senha' ||
      request.path === '/functions/invoke'
    ) {
      return jsonOutput_(ok_(handleSenhaAuth_(request.body)));
    }

    if (request.path === '/leitos' || request.path === '/leitos/create') {
      return jsonOutput_(ok_(createLeito_(request.body)));
    }

    if (
      request.path === '/leitos/bulk-create' ||
      request.path === '/leitos/bulk' ||
      request.path === '/leitos/create-many'
    ) {
      return jsonOutput_(ok_(bulkCreateLeitos_(request.body)));
    }

    if (request.path === '/leitos/update' || request.path === '/leitos/status') {
      return jsonOutput_(ok_(updateLeito_(request.body)));
    }

    if (request.path === '/leitos/delete' || request.path === '/leitos/remove') {
      return jsonOutput_(ok_(deleteLeito_(request.body)));
    }

    var entityRoute = resolveEntityPostRoute_(request.path);
    if (entityRoute) {
      return jsonOutput_(ok_(handleEntityPost_(entityRoute, request.body)));
    }

    return jsonOutput_(fail_('Rota POST não encontrada: ' + request.path, 404));
  } catch (error) {
    return jsonOutput_(fail_(error.message || String(error), 500));
  }
}

function parseRequest_(e, body) {
  var params = (e && e.parameter) ? e.parameter : {};
  var rawPath = String(params.path || '/').trim();
  var normalizedPath = normalizePath_(rawPath);
  return {
    path: normalizedPath,
    params: params,
    body: body || {}
  };
}

function normalizePath_(path) {
  var p = String(path || '/').trim();
  if (!p) return '/';
  if (p.charAt(0) !== '/') p = '/' + p;
  return p.replace(/\/+$/, '').toLowerCase() || '/';
}

function handleSenhaAuth_(payload) {
  var body = (payload && typeof payload === 'object') ? payload : {};
  var name = String(body.name || '').trim();
  var action = String(body.action || '').trim().toLowerCase();
  if (name && name !== 'senhaAuth') {
    // Mantém compatibilidade para functions.invoke de outras funções.
    return {};
  }
  if (!action) {
    throw new Error('Ação obrigatória para senhaAuth.');
  }

  if (action === 'hash') {
    var senha = String(body.senha || '');
    if (!senha) throw new Error('Senha obrigatória para gerar hash.');
    return { hash: sha256Hex_(senha) };
  }

  if (action === 'verify') {
    var senhaInput = String(body.senha || '');
    var hash = String(body.hash || '').trim();
    if (!senhaInput || !hash) return { valido: false };
    return { valido: sha256Hex_(senhaInput) === hash };
  }

  throw new Error('Ação senhaAuth não suportada: ' + action);
}

function sha256Hex_(value) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value || ''));
  return bytes.map(function(b) {
    var v = (b < 0) ? b + 256 : b;
    var hex = v.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function parseJsonBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    var parsed = JSON.parse(e.postData.contents);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    throw new Error('JSON inválido no body da requisição.');
  }
}

function enforceApiKey_(request) {
  var expected = getApiKey_();
  if (!expected) return;

  var params = request.params || {};
  var body = request.body || {};
  var provided = String(params.api_key || body.api_key || '').trim();
  if (!provided || provided !== expected) {
    throw new Error('Não autorizado: api_key inválida.');
  }
}

function getSpreadsheetId_() {
  var configuredId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  var id = String(configuredId || DEFAULT_SPREADSHEET_ID || '').trim();
  if (!id) {
    throw new Error('SPREADSHEET_ID não configurado. Defina em Script Properties ou em DEFAULT_SPREADSHEET_ID no Code.gs.');
  }
  return id;
}

function getApiKey_() {
  return String(PropertiesService.getScriptProperties().getProperty('API_KEY') || '').trim();
}

function resolveEntityFromGetPath_(path) {
  var keys = Object.keys(ENTITY_CONFIG);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (path === '/' + key) return key;
  }
  return null;
}

function resolveEntityPostRoute_(path) {
  var keys = Object.keys(ENTITY_CONFIG);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var base = '/' + key;
    if (path === base) return { entityKey: key, action: 'upsert' };
    if (path === base + '/create') return { entityKey: key, action: 'create' };
    if (path === base + '/bulk-create' || path === base + '/bulk' || path === base + '/create-many') {
      return { entityKey: key, action: 'bulkCreate' };
    }
    if (path === base + '/update') return { entityKey: key, action: 'update' };
    if (path === base + '/delete' || path === base + '/remove') return { entityKey: key, action: 'delete' };
  }
  return null;
}

function handleEntityPost_(route, payload) {
  if (!route || !route.entityKey || !route.action) {
    throw new Error('Rota de entidade inválida.');
  }
  var body = (payload && typeof payload === 'object') ? payload : {};

  if (route.action === 'create') return createEntity_(route.entityKey, body);
  if (route.action === 'bulkCreate') return bulkCreateEntity_(route.entityKey, body);
  if (route.action === 'update') return updateEntity_(route.entityKey, body);
  if (route.action === 'delete') return deleteEntity_(route.entityKey, body);
  if (route.action === 'upsert') return upsertEntity_(route.entityKey, body);

  throw new Error('Ação de rota não suportada: ' + route.action);
}

function getEntityConfig_(entityKey) {
  var cfg = ENTITY_CONFIG[entityKey];
  if (!cfg) throw new Error('Entidade não suportada: ' + entityKey);
  return cfg;
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(getSpreadsheetId_());
}

function getEntitySheet_(entityKey) {
  var cfg = getEntityConfig_(entityKey);
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(cfg.sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(cfg.sheetName);
    sheet.getRange(1, 1, 1, cfg.columns.length).setValues([cfg.columns]);
    return { sheet: sheet, headers: cfg.columns.slice() };
  }

  var headers = ensureEntityHeaders_(sheet, cfg.columns);
  return { sheet: sheet, headers: headers };
}

function ensureEntityHeaders_(sheet, expectedHeaders) {
  var lastColumn = Math.max(sheet.getLastColumn(), expectedHeaders.length);
  if (lastColumn <= 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return expectedHeaders.slice();
  }

  var current = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map(function(v) { return String(v || '').trim(); })
    .filter(function(v) { return Boolean(v); });

  if (!current.length) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return expectedHeaders.slice();
  }

  var merged = current.slice();
  for (var i = 0; i < expectedHeaders.length; i++) {
    if (merged.indexOf(expectedHeaders[i]) === -1) merged.push(expectedHeaders[i]);
  }

  if (merged.join('|') !== current.join('|')) {
    sheet.getRange(1, 1, 1, merged.length).setValues([merged]);
  }
  return merged;
}

function listEntity_(entityKey) {
  var meta = getEntitySheet_(entityKey);
  var sheet = meta.sheet;
  var headers = meta.headers;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  var rows = [];
  for (var i = 0; i < values.length; i++) {
    var obj = rowToEntity_(headers, values[i]);
    if (!obj.id) continue;
    rows.push(obj);
  }
  return rows;
}

function createEntity_(entityKey, payload) {
  var body = validateEntityPayload_(payload, 'create');
  var meta = getEntitySheet_(entityKey);
  var prepared = prepareEntityPayload_(entityKey, body, true);
  var row = entityToRow_(meta.headers, prepared);
  meta.sheet.appendRow(row);
  return rowToEntity_(meta.headers, row);
}

function bulkCreateEntity_(entityKey, payload) {
  var items = (payload && Array.isArray(payload.items)) ? payload.items : [];
  if (!items.length) {
    throw new Error('Payload de bulk inválido: use { items: [...] }.');
  }

  var meta = getEntitySheet_(entityKey);
  var rows = [];
  for (var i = 0; i < items.length; i++) {
    var body = validateEntityPayload_(items[i], 'create');
    var prepared = prepareEntityPayload_(entityKey, body, true);
    rows.push(entityToRow_(meta.headers, prepared));
  }

  var startRow = meta.sheet.getLastRow() + 1;
  meta.sheet.getRange(startRow, 1, rows.length, meta.headers.length).setValues(rows);
  return rows.map(function(row) { return rowToEntity_(meta.headers, row); });
}

function updateEntity_(entityKey, payload) {
  var body = validateEntityPayload_(payload, 'update');
  var id = String(body.id || '').trim();
  if (!id) throw new Error('ID obrigatório para update.');

  var meta = getEntitySheet_(entityKey);
  var rowInfo = findEntityRowById_(meta.sheet, meta.headers, id);
  if (!rowInfo) throw new Error('Registro não encontrado para id: ' + id);

  var current = rowToEntity_(meta.headers, rowInfo.values);
  var merged = {};
  var keys = Object.keys(current);
  for (var i = 0; i < keys.length; i++) merged[keys[i]] = current[keys[i]];
  var payloadKeys = Object.keys(body);
  for (var j = 0; j < payloadKeys.length; j++) merged[payloadKeys[j]] = body[payloadKeys[j]];

  var prepared = prepareEntityPayload_(entityKey, merged, false);
  prepared.id = id;
  var row = entityToRow_(meta.headers, prepared);
  meta.sheet.getRange(rowInfo.rowNumber, 1, 1, meta.headers.length).setValues([row]);
  return rowToEntity_(meta.headers, row);
}

function deleteEntity_(entityKey, payload) {
  var body = validateEntityPayload_(payload, 'delete');
  var id = String(body.id || '').trim();
  if (!id) throw new Error('ID obrigatório para delete.');

  var meta = getEntitySheet_(entityKey);
  var rowInfo = findEntityRowById_(meta.sheet, meta.headers, id);
  if (!rowInfo) throw new Error('Registro não encontrado para id: ' + id);

  meta.sheet.deleteRow(rowInfo.rowNumber);
  return { id: id, deleted: true };
}

function upsertEntity_(entityKey, payload) {
  var body = validateEntityPayload_(payload, 'upsert');
  var id = String(body.id || '').trim();
  if (id) {
    var meta = getEntitySheet_(entityKey);
    var rowInfo = findEntityRowById_(meta.sheet, meta.headers, id);
    if (rowInfo) return updateEntity_(entityKey, body);
  }
  return createEntity_(entityKey, body);
}

function validateEntityPayload_(payload, operation) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload inválido para ' + operation + '.');
  }
  return payload;
}

function prepareEntityPayload_(entityKey, payload, isCreate) {
  var cfg = getEntityConfig_(entityKey);
  var nowIso = new Date().toISOString();
  var next = {};
  var keys = Object.keys(payload || {});
  for (var i = 0; i < keys.length; i++) next[keys[i]] = payload[keys[i]];

  if (isCreate && !next.id) {
    next.id = cfg.idPrefix + '_' + Utilities.getUuid().slice(0, 12);
  }

  if (entityKey === 'membros' && !hasOwn_(next, 'ativo')) next.ativo = true;
  if (entityKey === 'eventos' && !next.timestamp) next.timestamp = nowIso;
  if (entityKey === 'escalas' && !next.status) next.status = 'escalado';
  if (entityKey === 'notificacoes' && !next.status) next.status = 'pendente';

  if (!next.created_at) next.created_at = nowIso;
  next.updated_at = nowIso;

  return next;
}

function entityToRow_(headers, obj) {
  return headers.map(function(header) {
    if (!hasOwn_(obj, header)) return '';
    return obj[header];
  });
}

function rowToEntity_(headers, row) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];
    obj[key] = row[i];
  }

  if (hasOwn_(obj, 'ativo')) obj.ativo = toBool_(obj.ativo, true);
  if (hasOwn_(obj, 'bloqueado')) obj.bloqueado = toBool_(obj.bloqueado, false);
  if (obj.created_at && !obj.created_date) obj.created_date = obj.created_at;
  if (obj.updated_at && !obj.updated_date) obj.updated_date = obj.updated_at;

  return obj;
}

function findEntityRowById_(sheet, headers, id) {
  var idIndex = headers.indexOf('id');
  if (idIndex === -1) throw new Error('Coluna id não encontrada na aba.');

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;

  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][idIndex] || '').trim() === id) {
      return { rowNumber: i + 2, values: values[i] };
    }
  }
  return null;
}

function getLeitosSheet_() {
  var ss = SpreadsheetApp.openById(getSpreadsheetId_());
  var sheet = ss.getSheetByName(LEITOS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LEITOS_SHEET_NAME);
    sheet.getRange(1, 1, 1, LEITOS_COLUMNS.length).setValues([LEITOS_COLUMNS]);
  }

  var firstRow = sheet.getRange(1, 1, 1, LEITOS_COLUMNS.length).getValues()[0];
  var needsHeader = false;
  for (var i = 0; i < LEITOS_COLUMNS.length; i++) {
    if (String(firstRow[i] || '').trim() !== LEITOS_COLUMNS[i]) {
      needsHeader = true;
      break;
    }
  }
  if (needsHeader) {
    sheet.getRange(1, 1, 1, LEITOS_COLUMNS.length).setValues([LEITOS_COLUMNS]);
  }
  return sheet;
}

function listLeitos_() {
  var sheet = getLeitosSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, LEITOS_COLUMNS.length).getValues();
  var rows = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    if (!row[0]) continue;
    rows.push(rowToLeito_(row));
  }
  return rows;
}

function createLeito_(payload) {
  var normalized = normalizeCreatePayload_(payload);
  var sheet = getLeitosSheet_();
  var nowIso = new Date().toISOString();
  var row = [
    normalized.id || generateLeitoId_(),
    normalized.numero,
    normalized.divisao,
    normalized.unidade,
    normalized.quarto,
    normalized.status || 'ocupado',
    toBool_(normalized.ativo, true),
    toBool_(normalized.bloqueado, false),
    normalized.ultimo_evento_at || nowIso,
    nowIso,
    nowIso
  ];
  sheet.appendRow(row);
  return rowToLeito_(row);
}

function bulkCreateLeitos_(payload) {
  var items = (payload && Array.isArray(payload.items)) ? payload.items : [];
  if (!items.length) {
    throw new Error('Payload de bulk inválido: use { items: [...] }.');
  }

  var sheet = getLeitosSheet_();
  var nowIso = new Date().toISOString();
  var rows = [];
  for (var i = 0; i < items.length; i++) {
    var normalized = normalizeCreatePayload_(items[i]);
    rows.push([
      normalized.id || generateLeitoId_(),
      normalized.numero,
      normalized.divisao,
      normalized.unidade,
      normalized.quarto,
      normalized.status || 'ocupado',
      toBool_(normalized.ativo, true),
      toBool_(normalized.bloqueado, false),
      normalized.ultimo_evento_at || nowIso,
      nowIso,
      nowIso
    ]);
  }

  var startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, LEITOS_COLUMNS.length).setValues(rows);

  var created = [];
  for (var j = 0; j < rows.length; j++) {
    created.push(rowToLeito_(rows[j]));
  }
  return created;
}

function updateLeito_(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload inválido para update de leito.');
  }
  var id = String(payload.id || '').trim();
  if (!id) throw new Error('ID do leito é obrigatório para update.');

  var sheet = getLeitosSheet_();
  var rowInfo = findRowById_(sheet, id);
  if (!rowInfo) {
    throw new Error('Leito não encontrado para id: ' + id);
  }

  var current = rowInfo.values;
  var next = current.slice();
  var nowIso = new Date().toISOString();

  applyIfDefined_(payload, 'numero', next, 1);
  applyIfDefined_(payload, 'divisao', next, 2);
  applyIfDefined_(payload, 'unidade', next, 3);
  applyIfDefined_(payload, 'quarto', next, 4);
  applyIfDefined_(payload, 'status', next, 5);
  if (hasOwn_(payload, 'ativo')) next[6] = toBool_(payload.ativo, true);
  if (hasOwn_(payload, 'bloqueado')) next[7] = toBool_(payload.bloqueado, false);
  if (hasOwn_(payload, 'ultimo_evento_at')) next[8] = payload.ultimo_evento_at;
  next[10] = nowIso;

  sheet.getRange(rowInfo.rowNumber, 1, 1, LEITOS_COLUMNS.length).setValues([next]);
  return rowToLeito_(next);
}

function deleteLeito_(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload inválido para remoção de leito.');
  }
  var id = String(payload.id || '').trim();
  if (!id) throw new Error('ID do leito é obrigatório para delete.');

  var sheet = getLeitosSheet_();
  var rowInfo = findRowById_(sheet, id);
  if (!rowInfo) {
    throw new Error('Leito não encontrado para id: ' + id);
  }

  sheet.deleteRow(rowInfo.rowNumber);
  return { id: id, deleted: true };
}

function findRowById_(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;

  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === id) {
      var rowNumber = i + 2;
      var rowValues = sheet.getRange(rowNumber, 1, 1, LEITOS_COLUMNS.length).getValues()[0];
      return { rowNumber: rowNumber, values: rowValues };
    }
  }
  return null;
}

function normalizeCreatePayload_(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload inválido para criação de leito.');
  }
  var numero = String(payload.numero || '').trim();
  var divisao = String(payload.divisao || '').trim();
  var unidade = String(payload.unidade || '').trim();
  var quarto = String(payload.quarto || '').trim();
  if (!numero || !divisao || !unidade || !quarto) {
    throw new Error('Campos obrigatórios ausentes: numero, divisao, unidade, quarto.');
  }
  return payload;
}

function rowToLeito_(row) {
  var data = {
    id: row[0],
    numero: row[1],
    divisao: row[2],
    unidade: row[3],
    quarto: row[4],
    status: row[5],
    ativo: toBool_(row[6], true),
    bloqueado: toBool_(row[7], false),
    ultimo_evento_at: row[8] || '',
    created_at: row[9] || '',
    updated_at: row[10] || ''
  };

  // Compatibilidade com consumidores legados no frontend.
  data.created_date = data.created_at;
  data.updated_date = data.updated_at;
  return data;
}

function toBool_(value, defaultValue) {
  if (value === true || value === false) return value;
  if (value === null || value === undefined || value === '') return defaultValue;
  if (typeof value === 'string') {
    var norm = value.toLowerCase().trim();
    if (norm === 'true' || norm === '1' || norm === 'sim') return true;
    if (norm === 'false' || norm === '0' || norm === 'nao' || norm === 'não') return false;
  }
  if (typeof value === 'number') return value === 1;
  return Boolean(value);
}

function hasOwn_(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function applyIfDefined_(payload, key, targetRow, idx) {
  if (hasOwn_(payload, key)) {
    targetRow[idx] = payload[key];
  }
}

function generateLeitoId_() {
  return 'leito_' + Utilities.getUuid().slice(0, 12);
}

function ok_(data) {
  return {
    ok: true,
    data: data,
    ts: new Date().toISOString()
  };
}

function fail_(message, status) {
  return {
    ok: false,
    error: message || 'Erro interno',
    status: status || 500,
    ts: new Date().toISOString()
  };
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
