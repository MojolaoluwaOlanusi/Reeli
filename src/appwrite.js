import { Client, Account } from 'appwrite';

const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(PROJECT_ID);

const account = new Account(client);

export const auth = {
  checkSession: async () => {
    if (!PROJECT_ID) return null;

    try {
      return await account.get();
    } catch {
      return null;
    }
  },

  signInWithGoogle: async (successUrl = window.location.href) => {
    if (!PROJECT_ID) {
      throw new Error('Missing Appwrite project ID. Add VITE_APPWRITE_PROJECT_ID to your environment.');
    }

    await account.createOAuth2Session(
      'google',
      successUrl,
      `${window.location.origin}/?auth=failed`,
    );
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
