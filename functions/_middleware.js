// Cloudflare Pages `_headers` is path-scoped. A static X-Robots-Tag on HTML
// would noindex docs.paperclip.ing together with every preview host. This
// middleware runs on the request hostname instead: pages.dev hosts get
// `noindex`, and the production custom domain is returned untouched.
//
// Pages compiles `/functions` from the repository root, not from the static
// build output. Do not move this file into `.site`.

export function isPagesDevHostname(hostname) {
  const host = String(hostname ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/:\d+$/, "");
  return host === "pages.dev" || host.endsWith(".pages.dev");
}

export function requestHostname(request) {
  try {
    return new URL(request.url).hostname;
  } catch {
    return "";
  }
}

export async function onRequest(context) {
  const response = await context.next();
  if (!isPagesDevHostname(requestHostname(context.request))) return response;
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
