# mobile-offline-app (Expo)

App nativa offline-first. **Não** correr `eas build` na raiz do monorepo (`setup-hu`): lá está só o projeto Vite.

## Build EAS (Android / iOS)

Na pasta deste projeto:

```bash
cd mobile-offline-app
eas build --platform android --profile production
```

No PowerShell (Windows), o equivalente é:

```powershell
cd mobile-offline-app; eas build --platform android --profile production
```

Perfis disponíveis: ver `eas.json` (`preview` gera APK interno; `production` gera app bundle por defeito).

## Variáveis de ambiente

Ver `.env.example`. Alinhamento com o web (GAS): ver `ALIGNMENT.md`.

## Projeto Expo (EAS)

Este diretório usa o `projectId` em `app.json` → `extra.eas.projectId`. Os builds ligam-se a **esse** projeto no [expo.dev](https://expo.dev). Uma configuração mínima de `app.json` / `eas.json` na **raiz** do repo era um erro comum e fazia o Metro tentar empacotar o Vite; a raiz não deve ter ficheiros EAS.
