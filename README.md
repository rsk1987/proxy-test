HLS Proxy

Endpoints:
- GET /playlist?url=<m3u8-url>  -> returns rewritten .m3u8 with /seg proxies
- GET /seg?u=<encoded-ts-url>   -> streams a .ts segment (forwards Range)

Environment variables:
- SPOOF_USER_AGENT
- SPOOF_REFERER
- SPOOF_COOKIE

Deploy: connect this repo to Render and create a new Web Service.
