/**
 * SPA fallback for Cloudflare Pages (with Functions present).
 * Serves index.html for client-routed paths (e.g. /owners) so deep links work,
 * while leaving /api/* functions and real static files untouched.
 */
export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // API routes -> their functions
  if (url.pathname.startsWith("/api/")) return next();

  const res = await next();

  // Only rewrite "not found" GETs for extensionless, HTML-accepting paths (SPA routes)
  const accept = request.headers.get("accept") || "";
  if (
    res.status === 404 &&
    request.method === "GET" &&
    !url.pathname.includes(".") &&
    accept.includes("text/html")
  ) {
    const indexReq = new Request(new URL("/", url).toString(), request);
    const index = await next(indexReq);
    if (index && index.status === 200) {
      return new Response(index.body, {
        status: 200,
        headers: index.headers,
      });
    }
  }
  return res;
}
