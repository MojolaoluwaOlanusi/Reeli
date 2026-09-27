# Reeli

Reeli searches TMDB for movies, series, and people, and shows live title details, trailers, and regional streaming providers when TMDB has availability data. Anime synopses and manga/manhwa source metadata are supplemented from AniList when available. Recent searches and preferences are stored in the current browser. Google sign-in uses Appwrite.

## Environment

Copy `.env.example` to `.env.local` for local development. Never commit `.env.local` or put a TMDB credential in a variable prefixed with `VITE_`.

Required for live movie data, set one server-only credential:

- `TMDB_API_READ_ACCESS_TOKEN` (recommended): TMDB API Read Access Token. The Node server sends it to TMDB; it is never bundled into the browser.
- `TMDB_API_KEY` (alternative): TMDB API v3 key, also kept server-side.

Required only for Google sign-in:

- `VITE_APPWRITE_PROJECT_ID`: Appwrite project ID.
- `VITE_APPWRITE_ENDPOINT`: Appwrite API endpoint, for example `https://fra.cloud.appwrite.io/v1`.

The Appwrite endpoint and project ID are public client configuration, not secrets. In Appwrite Console:

1. Open **Auth → Settings → OAuth2 providers** and enable **Google**.
2. Create a Google OAuth client in Google Cloud Console. Copy Appwrite's displayed callback URL into the Google client's **Authorized redirect URIs**.
3. Paste the Google client ID and secret into Appwrite's Google provider settings. Do not add Google's secret to this app's `.env`.
4. Under **Auth → Settings → Platforms**, add `localhost` and your Vercel hostname (for example `reeli-movies.vercel.app`) as Web platforms.
5. Set the production and local hostnames as allowed redirect origins if your Appwrite Console presents that setting.
6. Copy the Appwrite **Project ID** from project settings and the **API Endpoint** from the project overview into `.env.local` using the variable names above.

The endpoint and project ID are public client configuration, not secrets. Google OAuth client credentials belong in Appwrite. Google sign-in creates a new account on first login and signs returning users in. `VITE_APPWRITE_DATABASE_ID` and `VITE_APPWRITE_COLLECTION_ID` are not needed by this version; search history and preferences are browser-local and do not sync between accounts.

### Appwrite setup review

For the current feature set, the Appwrite project only needs the Google OAuth provider and web platforms. Do not create a database or API key just for sign-in. If you later want shared cross-account recommendation signals, add a server-only Appwrite API key with the minimum document permissions and an aggregate collection; never put that key in a `VITE_` variable. Current picks use TMDB regional popularity plus this browser's locally recorded genre interests, not other Reeli users' private search history.

`VITE_APPWRITE_DATABASE_ID` and `VITE_APPWRITE_COLLECTION_ID` are not currently needed. History and preferences stay in browser storage and are not synchronized between devices or accounts.

## Run locally

```powershell
npm install
npm run dev
```

The Node/Express server hosts Vite in development and proxies TMDB requests through `/api`. The server reads `.env.local` and `.env`; deployment environment variables take precedence.

## Production

The app includes Vercel routing for `/movies/...` refreshes and a serverless `/api` handler. In Vercel Project Settings, add `TMDB_API_READ_ACCESS_TOKEN` (recommended) or `TMDB_API_KEY` as a server-side environment variable, and add `VITE_APPWRITE_PROJECT_ID` plus `VITE_APPWRITE_ENDPOINT` for Google sign-in. Redeploy after setting them. Direct movie URLs use `/movies/movie/:tmdbId` or `/movies/tv/:tmdbId`.

For a standalone Node.js host, provide the server-only TMDB credential as a secret environment variable, then build and start:

```powershell
npm run build
$env:NODE_ENV = 'production'
npm start
```

The host should route HTTPS traffic to the Node process and set `PORT` if required by the platform. This cannot be deployed as a static-only site because the TMDB proxy must run server-side.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.