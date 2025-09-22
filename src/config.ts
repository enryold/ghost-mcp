// Read configuration values directly from process.env
export const GHOST_API_URL: string = process.env.GHOST_API_URL as string;
export const GHOST_CONTENT_API_KEY: string = process.env.GHOST_CONTENT_API_KEY as string;
export const GHOST_ADMIN_API_KEY: string = process.env.GHOST_ADMIN_API_KEY as string;
export const GHOST_API_VERSION: string = process.env.GHOST_API_VERSION as string || 'v5.0'; // Default to v5.0

// Authentication configuration
export type AuthType = 'NONE' | 'BASIC' | 'OAUTH';
export const AUTH_TYPE: AuthType = (process.env.AUTH_TYPE as AuthType) || 'NONE';
export const AUTH_TYPE_BASIC_FILE_PATH: string = process.env.AUTH_TYPE_BASIC_FILE_PATH as string;
export const AUTH_TYPE_OAUTH_URL: string = process.env.AUTH_TYPE_OAUTH_URL as string;

// Basic validation to ensure required environment variables are set
if (!GHOST_API_URL) {
    console.error("Error: GHOST_API_URL environment variable is not set.");
    process.exit(1);
}

if (!GHOST_CONTENT_API_KEY) {
    console.error("Error: GHOST_CONTENT_API_KEY environment variable is not set.");
    process.exit(1);
}

// Admin API key is optional - if provided, enables access to member-reserved posts
if (GHOST_ADMIN_API_KEY) {
    console.log("Admin API key detected - member-reserved posts will be accessible");
}

// Validate authentication configuration
if (AUTH_TYPE === 'BASIC' && !AUTH_TYPE_BASIC_FILE_PATH) {
    console.error("Error: AUTH_TYPE_BASIC_FILE_PATH environment variable is required when AUTH_TYPE=BASIC");
    process.exit(1);
}

if (AUTH_TYPE === 'OAUTH' && !AUTH_TYPE_OAUTH_URL) {
    console.error("Error: AUTH_TYPE_OAUTH_URL environment variable is required when AUTH_TYPE=OAUTH");
    process.exit(1);
}

console.log(`Authentication mode: ${AUTH_TYPE}`);