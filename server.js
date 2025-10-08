const { HLSProxy } = require("@eyevinn/hls-proxy");

const proxy = new HLSProxy({
    originHandler: async (request) => {
        return "https://maitv-vod.lab.eyevinn.technology";
    },
    segmentRedirectHandler: async (request, baseUrl) => {
        const redirectUrl = new URL(request.raw.url, baseUrl);
        return redirectUrl.href;
    },
    // Add a handler to modify the manifest response to include CORS headers
    masterManifestHandler: async (manifest, request, baseUrl) => {
        manifest.headers["Access-Control-Allow-Origin"] = "*";
        return manifest;
    },
    mediaManifestHandler: async (manifest, request, baseUrl) => {
        manifest.headers["Access-Control-Allow-Origin"] = "*";
        return manifest;
    }
});

const port = process.env.PORT || 8000;
proxy.listen(port);

console.log(`HLS proxy server is listening on port ${port}...`);
