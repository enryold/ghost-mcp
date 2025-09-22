import GhostContentAPI from '@tryghost/content-api';
import GhostAdminAPI from '@tryghost/admin-api';
import { GHOST_API_URL, GHOST_CONTENT_API_KEY, GHOST_ADMIN_API_KEY, GHOST_API_VERSION } from './config';

// Initialize and export the Ghost Content API client instance.
// Configuration is loaded from src/config.ts.
export const ghostApiClient = new GhostContentAPI({
    url: GHOST_API_URL,
    key: GHOST_CONTENT_API_KEY,
    version: GHOST_API_VERSION
});

// Initialize Ghost Admin API client if admin key is provided
export const ghostAdminApiClient = GHOST_ADMIN_API_KEY ? new GhostAdminAPI({
    url: GHOST_API_URL,
    key: GHOST_ADMIN_API_KEY,
    version: GHOST_API_VERSION
}) : null;

// Helper function to get posts with member content access
export async function getPostById(postId: string, includeMemberContent: boolean = false): Promise<any> {
    try {
        // Determine if postId is a slug or ID
        const identifier = postId.length === 24 ? { id: postId } : { slug: postId };
        
        if (includeMemberContent && ghostAdminApiClient) {
            // Use Admin API to access member-reserved content
            const post = await ghostAdminApiClient.posts.read(identifier, { include: 'tags,authors' });
            return post;
        } else {
            // Use Content API for public posts only
            const post = await ghostApiClient.posts.read(identifier);
            return post;
        }
    } catch (error) {
        console.error(`Error fetching post ${postId}:`, error);
        throw new Error(`Failed to fetch post ${postId}`);
    }
}

// Helper function to get all posts with optional member content
export async function getPosts(includeMemberContent: boolean = false, options: any = {}): Promise<any> {
    try {
        if (includeMemberContent && ghostAdminApiClient) {
            // Use Admin API to access all posts including member-reserved
            return await ghostAdminApiClient.posts.browse({
                include: 'tags,authors',
                filter: options.filter,
                limit: options.limit || 15,
                page: options.page || 1
            });
        } else {
            // Use Content API for public posts only
            return await ghostApiClient.posts.browse(options);
        }
    } catch (error) {
        console.error('Error fetching posts:', error);
        throw new Error('Failed to fetch posts');
    }
}