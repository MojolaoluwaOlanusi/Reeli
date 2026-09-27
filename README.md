# Reeli

Reeli searches TMDB for movies, series, and people, and shows live title details, trailers, and regional streaming providers when TMDB has availability data. Recent searches and preferences are stored in the current browser. Google sign-in uses Appwrite.

## Environment

Copy `.env.example` to `.env.local` for local development. Never commit `.env.local` or put a TMDB credential in a variable prefixed with `VITE_`.

Required for live movie data, set one server-only credential:

- `TMDB_API_READ_ACCESS_TOKEN` (recommended): TMDB API Read Access Token. The Node server sends it to TMDB; it is never bundled into the browser.
- `TMDB_API_KEY` (alternative): TMDB API v3 key, also kept server-side.

Required only for Google sign-in:

- `VITE_APPWRITE_PROJECT_ID`: Appwrite project ID.
- `VITE_APPWRITE_ENDPOINT`: Appwrite API endpoint, for example `https://fra.cloud.appwrite.io/v1`.

The Appwrite endpoint and project ID are public client configuration, not secrets. Configure the Google OAuth provider in the Appwrite Console and add both local and production hostnames to the project's web platform domains. Appwrite supplies the Google callback URL; Google OAuth client credentials belong in Appwrite, not this app's frontend environment.

`VITE_APPWRITE_DATABASE_ID` and `VITE_APPWRITE_COLLECTION_ID` are not currently needed. History and preferences stay in browser storage and are not synchronized between devices or accounts.

## Run locally

```powershell
npm install
npm run dev
```

The Node/Express server hosts Vite in development and proxies TMDB requests through `/api`. The server reads `.env.local` and `.env`; deployment environment variables take precedence.

## Production

Deploy to a Node.js host that can run Express and provide the server-only TMDB credential as a secret environment variable. Build and start:

```powershell
npm run build
$env:NODE_ENV = 'production'
npm start
```

The host should route HTTPS traffic to the Node process and set `PORT` if required by the platform. This cannot be deployed as a static-only site because the TMDB proxy must run server-side.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.