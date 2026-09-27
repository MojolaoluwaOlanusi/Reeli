import { Client, Account, Databases, ID, Query } from 'appwrite';

const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject(PROJECT_ID);

const account = new Account(client);
const database = new Databases(client);

export const auth = {
  checkSession: async () => {
    if (!PROJECT_ID) return null;

    try {
      return await account.get();
    } catch (error) {
      return null;
    }
  },

  signInWithGoogle: async () => {
    if (!PROJECT_ID) {
      throw new Error('Missing Appwrite project ID. Add VITE_APPWRITE_PROJECT_ID to your environment.');
    }

    const redirectUrl = `${window.location.origin}`;
    await account.createOAuth2Session('google', redirectUrl, redirectUrl);
  },

  signOut: async () => {
    if (!PROJECT_ID) return;

    try {
      await account.deleteSession('current');
    } catch (error) {
      console.error('Logout failed', error);
    }
  },
};

export const updateSearchCount = async (searchTerm, movie) => {
  if (!DATABASE_ID || !COLLECTION_ID) return;

  try {
    const result = await database.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.equal('searchTerm', searchTerm),
    ]);

    if (result.documents.length > 0) {
      const doc = result.documents[0];

      await database.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, {
        count: doc.count + 1,
      });
    } else {
      await database.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
        searchTerm,
        count: 1,
        movie_id: movie.id,
        poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
      });
    }
  } catch (error) {
    console.error(error);
  }
};

export const getTrendingMovies = async () => {
  if (!DATABASE_ID || !COLLECTION_ID) {
    return [];
  }

  try {
    const result = await database.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.limit(5),
      Query.orderDesc('count'),
    ]);

    return result.documents;
  } catch (error) {
    console.error(error);
    return [];
  }
};