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

function doGet(e) {
  try {
    var request = parseRequest_(e, null);
    enforceApiKey_(request);

    if (request.path === '/leitos') {
      return jsonOutput_(ok_(listLeitos_()));
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
