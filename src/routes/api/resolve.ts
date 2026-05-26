import { createFileRoute } from "@tanstack/react-router";

const IG_URL_RE = /^https?:\/\/(www\.)?instagram\.com\/(reel|reels|p|tv|share)\/[A-Za-z0-9_\-]+/i;

type ResolveResult = {
  videoUrl: string;
  thumbnail?: string;
  author?: string;
  caption?: string;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const IG_APP_ID = "936619743392459";
const IG_LSD = "AVqbxe3J_YA";

type InstagramGraphqlMedia = {
  video_url?: string;
  thumbnail_src?: string;
  display_url?: string;
  edge_media_to_caption?: { edges?: Array<{ node?: { text?: string } }> };
  owner?: { username?: string; full_name?: string };
  edge_sidecar_to_children?: { edges?: Array<{ node?: InstagramGraphqlMedia }> };
};

type InstagramGraphqlResponse = {
  data?: { xdt_shortcode_media?: InstagramGraphqlMedia | null };
};

function extractShortcode(url: string) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const type = parts[0]?.toLowerCase();
    if (["reel", "reels", "p", "tv"].includes(type) && parts[1]) return parts[1];
    if (type === "share" && ["reel", "reels", "p", "tv"].includes(parts[1]?.toLowerCase())) {
      return parts[2] || null;
    }
  } catch {
    return null;
  }
  return null;
}

async function resolveShortcode(url: string) {
  const direct = extractShortcode(url);
  if (direct) return direct;

  const redirected = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: { "user-agent": UA, accept: "text/html" },
  });
  return extractShortcode(redirected.url);
}

function decodeHtml(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractFromHtml(html: string): ResolveResult | null {
  const videoMatch =
    html.match(/href="([^"]+\.mp4[^"]*)"[^>]*>\s*<[^>]*>\s*Download\s*\(?\s*Video/i) ||
    html.match(/href="(https?:\/\/[^"]+\.mp4[^"]*)"/i) ||
    html.match(/"(https?:\/\/[^"\\]+\.mp4[^"\\]*)"/i);
  if (!videoMatch) return null;
  const videoUrl = decodeHtml(videoMatch[1]).replace(/\\\//g, "/");
  const thumbMatch =
    html.match(/<img[^>]+src="([^"]+)"/i) ||
    html.match(/"thumb(?:nail)?"\s*:\s*"([^"]+)"/i);
  const captionMatch =
    html.match(/<h3[^>]*>([^<]+)<\/h3>/i) || html.match(/<p[^>]*>([^<]{10,})<\/p>/i);
  return {
    videoUrl,
    thumbnail: thumbMatch ? decodeHtml(thumbMatch[1]).replace(/\\\//g, "/") : undefined,
    caption: captionMatch ? decodeHtml(captionMatch[1]).trim() : undefined,
  };
}

function mediaToResult(media: InstagramGraphqlMedia): ResolveResult | null {
  const childVideo = media.edge_sidecar_to_children?.edges
    ?.map((edge) => edge.node)
    .find((node): node is InstagramGraphqlMedia => Boolean(node?.video_url));
  const source = childVideo ?? media;
  if (!source.video_url) return null;

  const caption = media.edge_media_to_caption?.edges?.[0]?.node?.text;
  return {
    videoUrl: decodeHtml(source.video_url).replace(/\\\//g, "/"),
    thumbnail: decodeHtml(source.thumbnail_src || source.display_url || media.thumbnail_src || media.display_url || "").replace(
      /\\\//g,
      "/",
    ) || undefined,
    author: media.owner?.username || media.owner?.full_name,
    caption: caption ? decodeHtml(caption).trim() : undefined,
  };
}

async function viaInstagramGraphql(url: string): Promise<ResolveResult> {
  const shortcode = await resolveShortcode(url);
  if (!shortcode) throw new Error("instagram shortcode");

  const graphql = new URL("https://www.instagram.com/api/graphql");
  graphql.searchParams.set("variables", JSON.stringify({ shortcode }));
  graphql.searchParams.set("doc_id", "10015901848480474");
  graphql.searchParams.set("lsd", IG_LSD);

  const res = await fetch(graphql.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": UA,
      "x-ig-app-id": IG_APP_ID,
      "x-fb-lsd": IG_LSD,
      "x-asbd-id": "129477",
      origin: "https://www.instagram.com",
      referer: `https://www.instagram.com/reel/${shortcode}/`,
      accept: "application/json,text/javascript,*/*",
    },
  });
  if (!res.ok) throw new Error(`instagram graphql ${res.status}`);
  const json = (await res.json()) as InstagramGraphqlResponse;
  const media = json.data?.xdt_shortcode_media;
  const out = media ? mediaToResult(media) : null;
  if (!out) throw new Error("instagram graphql no video");
  return out;
}

async function viaSaveIG(url: string): Promise<ResolveResult> {
  const res = await fetch("https://saveig.app/api/ajaxSearch", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "user-agent": UA,
      "x-requested-with": "XMLHttpRequest",
      origin: "https://saveig.app",
      referer: "https://saveig.app/en",
      accept: "*/*",
    },
    body: new URLSearchParams({ q: url, t: "media", lang: "en" }).toString(),
  });
  if (!res.ok) throw new Error(`saveig ${res.status}`);
  const json = (await res.json()) as { status?: string; data?: string };
  if (json.status !== "ok" || !json.data) throw new Error("saveig empty");
  const out = extractFromHtml(json.data);
  if (!out) throw new Error("saveig no video");
  return out;
}

async function viaSnapInsta(url: string): Promise<ResolveResult> {
  const res = await fetch("https://snapinsta.app/action2.php", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "user-agent": UA,
      "x-requested-with": "XMLHttpRequest",
      origin: "https://snapinsta.app",
      referer: "https://snapinsta.app/",
      accept: "*/*",
    },
    body: new URLSearchParams({ url, action: "post", lang: "en" }).toString(),
  });
  if (!res.ok) throw new Error(`snapinsta ${res.status}`);
  const text = await res.text();
  const out = extractFromHtml(text);
  if (!out) throw new Error("snapinsta no video");
  return out;
}

async function viaSnapSave(url: string): Promise<ResolveResult> {
  const res = await fetch("https://snapsave.app/action.php?lang=en", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "user-agent": UA,
      "x-requested-with": "XMLHttpRequest",
      origin: "https://snapsave.app",
      referer: "https://snapsave.app/",
      accept: "*/*",
    },
    body: new URLSearchParams({ url }).toString(),
  });
  if (!res.ok) throw new Error(`snapsave ${res.status}`);
  const json = (await res.json().catch(() => null)) as { data?: string } | null;
  const html = json?.data ?? "";
  const out = extractFromHtml(html);
  if (!out) throw new Error("snapsave no video");
  return out;
}

async function resolveWithFallbacks(url: string): Promise<ResolveResult> {
  const providers = [viaInstagramGraphql, viaSaveIG, viaSnapInsta, viaSnapSave];
  const errors: string[] = [];
  for (const p of providers) {
    try {
      return await p(url);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  throw new Error(
    `Não consegui extrair esse link. O vídeo pode ser privado/removido ou o Instagram bloqueou o acesso temporariamente.`,
  );
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
          const result = await resolveWithFallbacks(url.trim());
          return Response.json(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erro ao processar o link";
          return Response.json({ error: message }, { status: 502 });
        }
      },
    },
  },
});
