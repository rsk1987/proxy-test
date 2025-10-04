export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)
  const target = url.searchParams.get("url")

  if (!target) {
    return new Response("Missing ?url=", { status: 400 })
  }

  try {
    const res = await fetch(target, {
      method: request.method,
      headers: request.headers,
    })

    const headers = new Headers(res.headers)
    headers.delete("content-disposition")
    headers.set("access-control-allow-origin", "*")
    headers.set("access-control-allow-methods", "GET, HEAD, OPTIONS")
    headers.set("access-control-allow-headers", "Range, Origin, Content-Type, Accept")

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    })
  } catch (err) {
    return new Response("Proxy error: " + err.message, { status: 502 })
  }
}
