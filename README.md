<div align="center">
	<img src="public/reeli-icon.svg" width="100" alt="Reeli cinema reel icon" />
	<h1>reeli</h1>
	<p><strong>Find your next great watch.</strong></p>
	<p>Explore movies, anime, and series by title, cast, crew, and genre.</p>
	<p>
		<a href="https://reeli-movies.vercel.app">Open Reeli</a> ·
		<a href="#features">Features</a> ·
		<a href="#getting-started">Get started</a>
	</p>
</div>

<p align="center">
	<img src="public/reeli.jpeg" alt="Reeli Hero page" width="100%" />
</p>

## About

Reeli is a movie discovery app built around one question: *what should I watch next?* Browse regional picks, explore horizontal genre shelves, then open a dedicated title page for the story, cast, age rating, release timeline, trailer, and regional watch options.

## Features

- Live movie, series, and people search powered by TMDB.
- Regional picks, ranked with genre interests stored in the current browser.
- Scrollable shelves for Animation, Anime, Horror, Fantasy, Action, Science Fiction, Comedy, and more.
- Shareable title routes: `/movies/movie/:id` and `/movies/tv/:id`.
- Google sign-in with Appwrite; title details are available after signing in.
- Title pages with cast and roles, crew, age rating, release/air dates, series status, trailers, recommendations, and watch providers.
- Best-effort AniList enrichment for anime descriptions and manga/manhwa information.
- Light and dark themes with browser-local preferences and recent searches.

> **Recommendations:** Picks combine regional TMDB popularity with genre interests from this browser. Reeli does not currently read or expose other users' private search history.

## Built With

| Area | Technology |
| --- | --- |
| Frontend | React, Vite, React Router |
| API | Node.js, Express |
| Movie data | TMDB API |
| Anime enrichment | AniList GraphQL |
| Authentication | Appwrite, Google OAuth |
| Hosting | Vercel-compatible API and route handlers |

## Getting Started

### Requirements

- Node.js 20 or later
- A TMDB API Read Access Token or API v3 key
- An Appwrite project if Google sign-in is required

### Install and run

```bash
npm install
npm run dev
```

The local Express + Vite app runs at `http://localhost:5173`. It proxies TMDB requests through the server so the TMDB credential is not bundled into the browser.

### Environment variables

Create `.env.local` in the project root:

```dotenv
# Required for live movie data. Set one server-only credential.
TMDB_API_READ_ACCESS_TOKEN=your_tmdb_read_access_token
# Alternative to the read access token:
# TMDB_API_KEY=your_tmdb_v3_api_key

# Optional; required only for Google sign-in.
VITE_APPWRITE_ENDPOINT=https://your-region.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_appwrite_project_id
```

Do not commit `.env.local`, prefix TMDB credentials with `VITE_`, or put the Google OAuth client secret in the frontend environment.

### Configure Google sign-in

1. In Appwrite Console, enable Google under **Auth → Settings → OAuth2 providers**.
2. Create a Google OAuth client. Add the callback URL shown by Appwrite to Google's **Authorized redirect URIs**.
3. Enter the Google client ID and secret in Appwrite's Google provider settings.
4. Add `localhost` and `reeli-movies.vercel.app` under **Auth → Settings → Platforms** as Web platforms.
5. Copy the Appwrite project ID and API endpoint into `.env.local`.

No Appwrite database or collection is needed for the current feature set. Recent searches and preferences are stored in the visitor's browser and do not sync across devices.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local Express + Vite app |
| `npm run lint` | Run ESLint |
| `npm run build` | Build the production frontend |
| `npm start` | Start the standalone Node production server |

## Deployment

Vercel uses the repository's API handlers and route rewrites. Add `TMDB_API_READ_ACCESS_TOKEN` (recommended) or `TMDB_API_KEY` as a server-side environment variable. For Google sign-in, also add `VITE_APPWRITE_PROJECT_ID` and `VITE_APPWRITE_ENDPOINT`. Redeploy after changing environment variables.

For another Node host, run `npm run build` then `npm start`; configure `PORT` and the same environment variables in the host's secret settings.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB. Anime data may be supplemented by AniList.

## License

No license has been added yet. All rights reserved unless the repository owner chooses and adds a license.