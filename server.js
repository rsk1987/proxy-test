const { HLSProxy } = require("@eyevinn/hls-proxy");

const proxy = new HLSProxy({
    originHandler: async (request) => {
        // This handler returns the base URL for the origin.
        // It fetches from maitv-vod.lab.eyevinn.technology.
        return "https://maitv-vod.lab.eyevinn.technology";
    },
    segmentRedirectHandler: async (request, baseUrl) => {
        // This handler creates a 302 redirect for segment requests.
        const redirectUrl = new URL(request.raw.url, baseUrl);
        return redirectUrl.href;
    }
});

// The port must be dynamically set for cloud platforms like Render.
// process.env.PORT is an environment variable set by the hosting service.
const port = process.env.PORT || 8000;
proxy.listen(port);

console.log(`HLS proxy server is listening on port ${port}...`);
