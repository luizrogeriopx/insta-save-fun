import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/thumb")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const target = url.searchParams.get("u");
        if (!target) return new Response("Missing url", { status: 400 });

        let parsed: URL;
        try {
          parsed = new URL(target);
        } catch {
          return new Response("Invalid url", { status: 400 });
        }

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

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "content-type": upstream.headers.get("content-type") || "image/jpeg",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
