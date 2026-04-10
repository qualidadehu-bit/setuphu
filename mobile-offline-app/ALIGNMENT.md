# Alinhamento APK (`mobile-offline-app`) ↔ app web (`src/`)

Documento de análise e plano. Sem refatoração ampla obrigatória: serve para decidir escopo e próximos passos mínimos.

---

## 1. Estado atual (o que o código faz hoje)

| Aspeto | App web (Vite, `src/`) | Mobile (Expo, `mobile-offline-app/`) |
|--------|------------------------|--------------------------------------|
| **Superfície de UI** | Rotas completas: home, membro, escriturário, higiene, gestor (leitos, tempo real, monitoramento, indicadores, relatórios, membros, notificações, configurações). | Apenas **login** + **`ChecklistFormScreen`** (formulário, fila offline, cartões de leito na UI). |
| **Contrato HTTP** | `src/api/apiClient.js`: URL base `VITE_GAS_BASE_URL` (tipicamente `.../exec`), query `path=/rota`, `api_key` em query e/ou corpo, `Content-Type: text/plain` em POST para reduzir preflight, resposta `{ ok, data, error }`. | **Auth:** `EXPO_PUBLIC_API_BASE_URL` → `/api/auth` e `/api/me` (JSON + Bearer), ou URLs explícitas. **Sync:** `POST` JSON para `EXPO_PUBLIC_SYNC_API_URL` (default `https://httpbin.org/post`). |
| **Dados de leito na tela mobile** | Vem da API GAS (`/leitos`, eventos, etc.). | **`BED_CARDS` hardcoded** em `ChecklistFormScreen.tsx`; ações de leito só **`console.log`** — não persistem nem batem com o backend real. |
| **Fila offline** | Não há fila genérica equivalente no cliente web (opera online no GAS). | `queueStorage` + `syncService` + `useSyncQueue`: padrão correto para “offline-first” de **um** tipo de payload (`ChecklistFormPayload`). |

**Conclusão:** o repositório trata o mobile como **protótipo / escopo restrito** (login REST + checklist com sync genérico), **não** como cópia do produto web. “Igual ao HTML” **não** é verdade em código; para manter isso explícito no produto, declare o APK como **app complementar (offline/checklist)** ou invista numa das estratégias abaixo.

---

## 2. O que “falta” conforme o objetivo

### Se o objetivo for **paridade visual/funcional com todo o web**

- Falta **navegação e telas** equivalentes (dezenas de componentes em `src/`).
- Falta **mesmo cliente de dados** que o web (entidades `Leito`, `EventoLeito`, `Membro`, etc., via GAS).
- Falta **mesmo modelo de auth** do web (`AuthContext` + fluxo GAS/sessão do `apiClient`), a menos que exista um **BFF** que emule isso para o mobile.

### Se o objetivo for **só checklist offline útil na operação, sem perder o web**

- O web **não precisa mudar** para “não perder nada”.
- Falta no mobile: **(a)** destino real do POST (GAS ou backend), **(b)** opcionalmente **lista de leitos** vinda da API em vez de mock, **(c)** ações de leito **gravadas** (ex.: criar `EventoLeito` no mesmo formato que o web), se forem requisito de negócio.

---

## 3. Plano concreto — três opções

### Opção A — **WebView / PWA empacolada** (paridade máxima de UI com esforço controlado)

- **Ideia:** o APK abre o mesmo `dist/` (ou URL de produção) dentro de `WebView`, com mesmas `VITE_GAS_BASE_URL` / runtime config.
- **Prós:** zero duplicação de telas; comportamento idêntico ao HTML.
- **Contras:** offline limitado (Service Worker/PWA ajuda, mas não é o mesmo que fila nativa atual); UX “web dentro do app”; permissões/câmera/notificações podem exigir ajustes.
- **Env:** reutilizar conceito de `VITE_GAS_BASE_URL` + `VITE_API_KEY` (injetados na URL ou numa bridge mínima).
- **Alteração mínima de código:** novo entry ou screen WebView no Expo; **não** obriga remover o checklist nativo — pode coexistir (menu “Modo completo (web)” vs “Checklist offline”).

### Opção B — **Port nativo incremental** (React Native espelhando `src/`)

- **Ideia:** reimplementar rotas críticas em RN, compartilhando **tipos e regras** onde possível (pacote monorepo ou cópia gradual).
- **Prós:** melhor UX nativa e offline por tela (se desenhado).
- **Contras:** maior custo contínuo; qualquer mudança no web duplica trabalho.
- **API:** idealmente **um só contrato** — o mesmo GAS via funções que montem `buildUrl`/`request` equivalentes ao `apiClient.js` (incl. `text/plain` e `api_key` no body).

### Opção C — **Mesma API (GAS), escopo mínimo no APK** (recomendado se o APK continuar “complementar”)

- **Ideia:** manter **só** login + checklist/fila, mas:
  1. **Sync:** `postChecklist` passa a chamar uma **rota GAS** real (novo `path`, ex. `/checklist-submissions` ou mapear payload → `EventoLeito`/`Leito` conforme regra de negócio). Ajustar corpo/headers ao que `apiClient.js` já usa.
  2. **Leitos na tela:** substituir `BED_CARDS` por `GET` GAS `/leitos` (cache local + retry), quando online.
  3. **Auth:** ou implementar no GAS endpoints compatíveis com o que `authService.ts` espera, ou trocar o mobile para token/sessão alinhado ao web (maior mudança — só se necessário).
- **Prós:** alinhamento de **dados** com o hospital sem reescrever todo o UI web.
- **Contras:** é preciso **definir no backend GAS** (ou Apps Script) as rotas que hoje **não** existem no exemplo `gas/` para “checklist” explícito — trabalho de backend, não só frontend.

---

## 4. Unificação de variáveis de ambiente (referência)

| Conceito | Web (Vite) | Mobile (Expo) — proposta de alinhamento |
|----------|------------|----------------------------------------|
| Base GAS | `VITE_GAS_BASE_URL` | `EXPO_PUBLIC_GAS_BASE_URL` (mesmo valor que o web) |
| Chave API | `VITE_API_KEY` | `EXPO_PUBLIC_API_KEY` ou `EXPO_PUBLIC_GAS_API_KEY` |
| Auth REST (atual mobile) | — | `EXPO_PUBLIC_API_BASE_URL` só se mantiver BFF separado |
| POST checklist | — | Deixar de usar httpbin em builds reais; URL = mesma base GAS + `path` na query **ou** URL dedicada documentada |

**Nota:** o web envia POST com `Content-Type: text/plain;charset=UTF-8` e JSON no body; o mobile hoje usa `application/json`. Para falar com o **mesmo** GAS, o cliente mobile deve **replicar esse detalhe** numa alteração pequena e localizada em `apiClient.ts` (e incluir `api_key` no payload como o `apiClient.js`).

---

## 5. Alterações mínimas sugeridas (sem refatoração ampla)

Ordem sugerida para máximo ganho por linha alterada:

1. **Documentar no README do mobile** (ou neste ficheiro) que o escopo oficial é **offline/checklist** até segunda ordem.
2. **`apiClient.ts` (sync):** trocar default de httpbin por **obrigatoriedade** de `EXPO_PUBLIC_SYNC_API_URL` / GAS em release (falhar build ou runtime claro se vazio).
3. **Um cliente `gasFetch` minimalista** no mobile (só `getBaseUrl` + `buildUrl` + `request` espelhando `apiClient.js`) usado por: listagem de leitos + POST do checklist.
4. **`ChecklistFormScreen`:** substituir mock por dados de `GET /leitos` quando online; fallback offline = último snapshot em `AsyncStorage` (ou manter mock só como último recurso).
5. **Ações de leito:** em vez de `console.log`, chamar `POST` GAS equivalente ao web (`/eventos` ou rotas já usadas em `tryPostPaths` para `EventoLeito`).
6. **Auth:** só unificar com o web depois de definido se a sessão do hospital no mobile é Bearer REST ou a mesma sessão do PWA; evitar mudar `AuthContext` no web sem necessidade.

---

## 6. Decisão de produto (preenche pela equipa)

- [ ] APK = **somente complemento offline/checklist** (Opção C + doc).
- [ ] APK = **cópia do produto** → preferir **Opção A** a curto prazo ou **Opção B** a longo prazo.
- [ ] Backend GAS terá rota explícita para submissions do checklist: _______________

Quando esta decisão estiver fixa, os passos 2–5 podem ser implementados de forma incremental e testável contra o mesmo `VITE_GAS_BASE_URL` do ambiente web.
