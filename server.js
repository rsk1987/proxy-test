const { HLSProxy } = require("@eyevinn/hls-proxy");

const proxy = new HLSProxy({
    originHandler: async (request) => {
        return "https://maitv-vod.lab.eyevinn.technology";
    },
    segmentRedirectHandler: async (request, baseUrl) => {
        const redirectUrl = new URL(request.raw.url, baseUrl);
        return redirectUrl.href;
    },
    // Add a handler to modify the manifest response
    masterManifestHandler: async (manifest, request, baseUrl) => {
        // You might need to rewrite segment URLs in a more complex scenario,
        // but for a simple redirect, this is often enough.
        manifest.headers["Access-Control-Allow-Origin"] = "*";
        return manifest;
    },
    mediaManifestHandler: async (manifest, request, baseUrl) => {
        // Add CORS headers to the media manifest (which lists the video segments)
        manifest.headers["Access-Control-Allow-Origin"] = "*";
        return manifest;
    }
});

const port = process.env.PORT || 8000;
proxy.listen(port);

console.log(`HLS proxy server is listening on port ${port}...`);
