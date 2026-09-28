import { Client, Account, ID, OAuthProvider, Permission, Query, Role, TablesDB } from 'appwrite';

const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const INTERACTIONS_TABLE_ID = import.meta.env.VITE_APPWRITE_INTERACTIONS_TABLE_ID;

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(PROJECT_ID);

const account = new Account(client);
const tables = new TablesDB(client);

export const interactionStoreConfigured = Boolean(DATABASE_ID && INTERACTIONS_TABLE_ID);

export const auth = {
  checkSession: async () => {
    if (!PROJECT_ID) return null;

    try {
      return await account.get();
    } catch (error) {
      if (error.code === 401) return null;
      throw error;
    }
  },

  signInWithGoogle: async (successUrl = window.location.href) => {
    if (!PROJECT_ID) {
      throw new Error('Missing Appwrite project ID. Add VITE_APPWRITE_PROJECT_ID to your environment.');
    }

    const failureUrl = new URL('/', window.location.origin);
    failureUrl.searchParams.set('auth', 'failed');
    account.createOAuth2Session({
      provider: OAuthProvider.Google,
      success: successUrl,
      failure: failureUrl.toString(),
    });
  },

  signOut: async () => {
    if (!PROJECT_ID) return;

    try {
      await account.deleteSession({ sessionId: 'current' });
    } catch (error) {
      console.error('Logout failed', error);
    }
  },
};

export const getUserInteractions = async (userId) => {
  if (!interactionStoreConfigured || !userId) return [];

  const result = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: INTERACTIONS_TABLE_ID,
    queries: [
      Query.equal('ownerId', userId),
      Query.limit(100),
      Query.orderDesc('lastInteractedAt'),
    ],
  });

  return result.rows;
};

export const recordUserInteraction = async (userId, movie, interactionType) => {
  if (!interactionStoreConfigured) {
    throw new Error('Appwrite interactions are not configured. Add the database and interactions table IDs.');
  }
  if (!userId || !movie?.mediaType || !movie?.tmdbId) return null;

  const movieKey = `${movie.mediaType}:${movie.tmdbId}`;
  const matches = await tables.listRows({
    databaseId: DATABASE_ID,
    tableId: INTERACTIONS_TABLE_ID,
    queries: [
      Query.equal('ownerId', userId),
      Query.equal('movieKey', movieKey),
      Query.limit(1),
    ],
  });
  const existing = matches.rows[0];
  const genres = [...new Set([...(existing?.genres || []), ...(movie.genres || [])])].slice(0, 12);
  const data = {
    ownerId: userId,
    movieKey,
    mediaType: movie.mediaType,
    tmdbId: String(movie.tmdbId),
    title: movie.title,
    genres,
    detailViews: (existing?.detailViews || 0) + (interactionType === 'detail_view' ? 1 : 0),
    watchClicks: (existing?.watchClicks || 0) + (interactionType === 'watch_click' ? 1 : 0),
    lastInteractedAt: new Date().toISOString(),
  };

  if (existing) {
    return tables.updateRow({
      databaseId: DATABASE_ID,
      tableId: INTERACTIONS_TABLE_ID,
      rowId: existing.$id,
      data,
    });
  }

  return tables.createRow({
    databaseId: DATABASE_ID,
    tableId: INTERACTIONS_TABLE_ID,
    rowId: ID.unique(),
    data,
    permissions: [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ],
  });
};
