# SetUp de Leitos — HU/UEL

Aplicação frontend para gestão visual do fluxo de leitos hospitalares.

## Execução local

1. Instale dependências:
   - `npm install`
2. Rode o ambiente de desenvolvimento:
   - `npm run dev`
3. Gere build de produção:
   - `npm run build`

## Variáveis de ambiente

Crie um arquivo `.env` (ou configure no provedor de deploy) com:

- `VITE_GAS_BASE_URL`: URL base do Web App GAS (endpoint `/exec`)
- `VITE_API_KEY`: chave enviada no header `x-api-key`

## Observações

- O frontend está integrado via HTTP com a API GAS (Google Apps Script).
- As chamadas usam `fetch` com resposta esperada no formato `{ ok, data, error, ts }`.
- O build de produção gera os arquivos otimizados na pasta `dist/`.
# setuphu
