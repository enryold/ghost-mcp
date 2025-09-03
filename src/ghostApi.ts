import GhostContentAPI from '@tryghost/content-api';
import { GHOST_API_URL, GHOST_CONTENT_API_KEY, GHOST_API_VERSION } from './config';

// Initialize and export the Ghost Content API client instance.
// Configuration is loaded from src/config.ts.
export const ghostApiClient = new GhostContentAPI({
    url: GHOST_API_URL,
    key: GHOST_CONTENT_API_KEY,
    version: GHOST_API_VERSION
});

// You can add helper functions here to wrap API calls and handle errors
// For example:
/*
export async function getPostById(postId: string): Promise<any> {
    try {
        const post = await ghostApiClient.posts.read({ id: postId });
        return post;
    } catch (error) {
        console.error(`Error fetching post ${postId}:`, error);
        throw new Error(`Failed to fetch post ${postId}`);
    }
}
*/