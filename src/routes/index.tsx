import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Link2, Loader2, AlertCircle, Sparkles, Copy, Check, Heart } from "lucide-react";
import pixQr from "@/assets/pix-qr.png";

const PIX_KEY =
  "00020126560014BR.GOV.BCB.PIX0114582083280001880216Doacao InstaSave5204000053039865802BR592558.208.328 LUIZ ROGERIO R6010GOIANIA GO62130509InstaSave63045B78";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InstaGrab — Baixe vídeos do Instagram em 1 clique" },
      {
        name: "description",
        content:
          "Cole o link de um Reel, post ou IGTV do Instagram e baixe o vídeo em MP4 gratuitamente, sem cadastro.",
      },
      { property: "og:title", content: "InstaGrab — Baixe vídeos do Instagram" },
      {
        property: "og:description",
        content: "Baixe Reels, vídeos e IGTV do Instagram em MP4. Rápido, grátis e sem login.",
      },
    ],
  }),
  component: Home,
});

type ResolveData = {
  videoUrl: string;
  thumbnail?: string;
  caption?: string;
  author?: string;
};

function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResolveData | null>(null);
  const [copied, setCopied] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);

  async function handleCopyPix() {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function handleCopyCaption() {
    if (!result?.caption) return;
    try {
      await navigator.clipboard.writeText(result.caption);
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2000);
    } catch {
      setCaptionCopied(false);
    }
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Não foi possível processar este link");
      } else {
        setResult(json);
      }
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const downloadHref = result
    ? `/api/download?u=${encodeURIComponent(result.videoUrl)}&f=instagram-video.mp4`
    : "#";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] opacity-30 blur-3xl"
        style={{ background: "var(--gradient-brand)" }}
      />

      <div className="relative mx-auto flex max-w-2xl flex-col px-6 pt-20 pb-16">
        <div className="mb-10 flex flex-col items-center text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Grátis, sem cadastro
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Baixe vídeos do{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-brand)" }}
            >
              Instagram
            </span>
          </h1>
          <p className="mt-4 max-w-md text-base text-muted-foreground">
            Cole o link de um Reel, post ou IGTV e baixe o MP4 direto no seu dispositivo.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card/80 p-3 shadow-2xl backdrop-blur"
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-input/60 px-3">
              <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.instagram.com/reel/..."
                className="w-full bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                maxLength={500}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--gradient-brand)" }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Baixar
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            {result.thumbnail && (
              <div className="aspect-video w-full overflow-hidden bg-muted">
                <img
                  src={`/api/thumb?u=${encodeURIComponent(result.thumbnail)}`}
                  alt={result.caption || "Prévia do vídeo do Instagram"}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div className="space-y-4 p-5">
              {result.author && (
                <p className="text-sm font-semibold text-foreground">@{result.author}</p>
              )}
              {result.caption && (
                <div className="space-y-2">
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {result.caption}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyCaption}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    {captionCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-primary" />
                        Legenda copiada
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copiar legenda
                      </>
                    )}
                  </button>
                </div>
              )}
              <a
                href={downloadHref}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                style={{ background: "var(--gradient-brand)" }}
              >
                <Download className="h-4 w-4" />
                Baixar MP4
              </a>
            </div>
          </div>
        )}

        <section className="mt-6 rounded-2xl border border-border bg-card/80 p-5 shadow-xl backdrop-blur">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Heart className="h-4 w-4 text-primary" />
              Não tem Propagandas, considere fazer uma doação!
            </div>
            <div className="rounded-xl bg-white p-3">
              <img
                src={pixQr}
                alt="QR Code PIX para doação"
                className="h-40 w-40 object-contain"
              />
            </div>
            <div className="w-full">
              <p className="mb-1 text-left text-xs text-muted-foreground">PIX copia e cola</p>
              <div className="flex items-stretch gap-2">
                <code className="flex-1 truncate rounded-lg bg-input/60 px-3 py-2 text-left text-xs text-muted-foreground">
                  {PIX_KEY}
                </code>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-primary" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>


        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { t: "1. Copie o link", d: "No app do Instagram, toque em Compartilhar → Copiar link." },
            { t: "2. Cole acima", d: "Cole no campo e clique em Baixar." },
            { t: "3. Salve o vídeo", d: "Clique em Baixar MP4 quando o preview aparecer." },
          ].map((s) => (
            <div
              key={s.t}
              className="rounded-xl border border-border bg-card/60 p-4 text-sm backdrop-blur"
            >
              <h3 className="mb-1 font-semibold text-foreground">{s.t}</h3>
              <p className="text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </section>

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          Apenas vídeos públicos. Respeite os direitos autorais do criador.
        </footer>
      </div>
    </main>
  );
}
