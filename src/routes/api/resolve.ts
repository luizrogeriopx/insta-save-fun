import { createFileRoute } from "@tanstack/react-router";

const IG_URL_RE = /^https?:\/\/(www\.)?instagram\.com\/(reel|reels|p|tv|share)\/[A-Za-z0-9_\-]+/i;

type ResolveResult = {
  videoUrl: string;
  thumbnail?: string;
  author?: string;
  caption?: string;
};

async function resolveViaSaveIG(url: string): Promise<ResolveResult> {
  const res = await fetch("https://saveig.app/api/ajaxSearch", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
      "x-requested-with": "XMLHttpRequest",
      origin: "https://saveig.app",
      referer: "https://saveig.app/en",
      accept: "*/*",
    },
    body: new URLSearchParams({ q: url, t: "media", lang: "en" }).toString(),
  });

  if (!res.ok) throw new Error(`Provider error ${res.status}`);
  const json = (await res.json()) as { status?: string; data?: string };
  if (json.status !== "ok" || !json.data) throw new Error("Could not extract video");

  const html = json.data;

  // Extract first downloadable mp4 link
  const videoMatch =
    html.match(/href="([^"]+\.mp4[^"]*)"[^>]*>\s*<[^>]*>\s*Download\s*\(?\s*Video/i) ||
    html.match(/href="(https?:\/\/[^"]+\.mp4[^"]*)"/i);
  if (!videoMatch) throw new Error("No video found at this link (image post or private)");

  const videoUrl = decodeHtml(videoMatch[1]);
  const thumbMatch = html.match(/<img[^>]+src="([^"]+)"/i);
  const captionMatch = html.match(/<h3[^>]*>([^<]+)<\/h3>/i) || html.match(/<p[^>]*>([^<]{10,})<\/p>/i);

  return {
    videoUrl,
    thumbnail: thumbMatch ? decodeHtml(thumbMatch[1]) : undefined,
    caption: captionMatch ? decodeHtml(captionMatch[1]).trim() : undefined,
  };
}

function decodeHtml(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export const Route = createFileRoute("/api/resolve")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { url } = (await request.json()) as { url?: string };
          if (!url || typeof url !== "string" || url.length > 500) {
            return Response.json({ error: "Link inválido" }, { status: 400 });
          }
          if (!IG_URL_RE.test(url.trim())) {
            return Response.json(
              { error: "Use um link do Instagram (reel, post ou IGTV)" },
              { status: 400 },
            );
          }

          const result = await resolveViaSaveIG(url.trim());
          return Response.json(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erro ao processar o link";
          return Response.json({ error: message }, { status: 502 });
        }
      },
    },
  },
});
