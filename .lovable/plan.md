# Instagram Video Downloader

App simples onde o usuário cola o link de um vídeo do Instagram (Reel, post ou IGTV) e baixa o arquivo MP4.

## Fluxo do usuário
1. Cola a URL do Instagram em um input
2. Clica em "Baixar"
3. Vê preview (thumbnail, autor, caption) + botão de download direto do MP4

## Arquitetura

```text
[UI React]  →  POST /api/resolve  →  [server route]  →  RapidAPI/serviço de extração
     ↓                                       ↓
  preview + URL do MP4  ←──────────────  { videoUrl, thumb, author }
     ↓
  GET /api/download?u=...  →  [server route faz proxy do MP4 com Content-Disposition]
     ↓
  download.mp4 salvo pelo navegador
```

### Por que um proxy de download?
O CDN do Instagram bloqueia hotlink e não envia `Content-Disposition`, então clicar direto abre o vídeo no navegador em vez de baixar. Uma rota `/api/download` no servidor faz stream do arquivo com o header correto.

### Por que um serviço externo de extração?
O Instagram exige login/cookies e muda o HTML com frequência. Tentar fazer scraping direto no Worker quebra em dias. O caminho confiável é usar uma API pronta (ex.: RapidAPI "Instagram Downloader", `instagram-scraper-api2`, ou similar) que recebe a URL e devolve o link do MP4.

## Telas
- **Home** (`/`): input grande com URL, botão "Baixar", card de resultado com thumbnail, autor, caption e botão "Baixar MP4". Estados: idle, loading, erro (link inválido / privado / não encontrado), sucesso.

## Implementação técnica

Arquivos a criar:
- `src/routes/index.tsx` — UI (input + card de preview, TanStack Query para chamar `/api/resolve`)
- `src/routes/api/resolve.ts` — `POST` recebe `{ url }`, valida que é do instagram.com, chama o provedor externo com a API key, devolve `{ videoUrl, thumbnail, author, caption }`
- `src/routes/api/download.ts` — `GET ?u=<videoUrl>` faz `fetch` no CDN do Instagram e devolve o stream com `Content-Disposition: attachment; filename="instagram-<id>.mp4"`
- `src/styles.css` — tokens de design (paleta + tipografia)

Validação: regex aceita `instagram.com/(reel|p|tv)/<id>` (com ou sem query string / `www.` / `/share/`).

## O que preciso confirmar antes de construir

1. **Provedor de extração / API key**
   Precisa de uma chave de algum serviço (ex.: RapidAPI). Você tem preferência, ou prefere que eu sugira um e te peça a chave depois?

2. **Apenas vídeos públicos?**
   Posts privados exigem login. Plano: suportar só públicos e mostrar erro claro se for privado. OK?

3. **Escopo extra**
   Só vídeo, ou também imagens / carrossel / áudio do Reel separado? Sugiro começar só com vídeo único.

4. **Estilo visual**
   Algum direcionamento (dark/minimal, colorido, estilo do próprio Instagram)? Se não tiver preferência, vou de dark minimalista com acento roxo/rosa.

Confirma esses pontos e eu parto pra implementação.