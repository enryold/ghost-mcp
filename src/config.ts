// Read configuration values directly from process.env
export const GHOST_API_URL: string = process.env.GHOST_API_URL as string;
export const GHOST_CONTENT_API_KEY: string = process.env.GHOST_CONTENT_API_KEY as string;
export const GHOST_API_VERSION: string = process.env.GHOST_API_VERSION as string || 'v5.0'; // Default to v5.0

// Basic validation to ensure required environment variables are set
if (!GHOST_API_URL) {
    console.error("Error: GHOST_API_URL environment variable is not set.");
    process.exit(1);
}

if (!GHOST_CONTENT_API_KEY) {
    console.error("Error: GHOST_CONTENT_API_KEY environment variable is not set.");
    process.exit(1);
}