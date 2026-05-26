import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const target = url.searchParams.get("u");
        const filename = url.searchParams.get("f") || "instagram-video.mp4";

        if (!target) return new Response("Missing url", { status: 400 });

        let parsed: URL;
        try {
          parsed = new URL(target);
        } catch {
          return new Response("Invalid url", { status: 400 });
        }

        // Only allow Instagram / Facebook CDN hosts
        if (!/(\.cdninstagram\.com|\.fbcdn\.net)$/i.test(parsed.hostname)) {
          return new Response("Forbidden host", { status: 403 });
        }

        const upstream = await fetch(parsed.toString(), {
          headers: {
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
            referer: "https://www.instagram.com/",
          },
        });

        if (!upstream.ok || !upstream.body) {
          return new Response(`Upstream error ${upstream.status}`, { status: 502 });
        }

        const safeName = filename.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80) || "video.mp4";

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "content-type": "video/mp4",
            "content-disposition": `attachment; filename="${safeName}"`,
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
