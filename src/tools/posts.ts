// src/tools/posts.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient, ghostAdminApiClient, getPosts, getPostById } from "../ghostApi";
import { getSessionTokenInfo } from "../auth";
import { currentSession } from "../http-server";

// Parameter schemas as ZodRawShape (object literals)
const browseParams = {
  filter: z.string().optional().describe("Filter posts using Ghost NQL syntax. Examples: 'tag:getting-started', 'tag:[tutorial,guide]', 'featured:true', 'published_at:>now-30d'"),
  limit: z.number().int().positive().optional().describe("Number of posts to return"),
  page: z.number().int().positive().optional().describe("Page number for pagination"),
  order: z.string().optional().describe("Sort order for posts"),
  include: z.string().optional().describe("Comma-separated list of fields to include"),
  formats: z.string().optional().describe("Comma-separated list of formats to include")
};
const readParams = {
  idOrSlug: z.string().describe("Post ID or slug (required)"),
  include: z.string().optional().describe("Comma-separated list of fields to include"),
  formats: z.string().optional().describe("Comma-separated list of formats to include"),
  includeMemberContent: z.boolean().optional().describe("Flag this to true to read member reserved content where visibility equals to members")
};

export function registerPostTools(server: McpServer) {
  // Browse posts
  server.tool(
    "posts_browse",
    browseParams,
    async (args, _extra) => {
      const options: any = {
        ...(args.filter && { filter: args.filter }),
        ...(args.limit !== undefined && { limit: args.limit }),
        ...(args.page !== undefined && { page: args.page }),
        ...(args.order && { order: args.order }),
        ...(args.include && { include: args.include.split(',') as any }),
        ...(args.formats && { formats: args.formats.split(',') as any })
      };

      const posts = await getPosts(options);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(posts, null, 2),
          },
        ],
      };
    }
  );

  // Read post
  server.tool(
    "posts_read",
    readParams,
    async (args, _extra) => {
      const includeMemberContent = args.includeMemberContent || false;
      console.log(`[POSTS_READ] includeMemberContent: ${includeMemberContent}`);

      // Check if Admin API is configured
      if (includeMemberContent && !ghostAdminApiClient) {
        console.log(`[POSTS_READ] Admin API not configured`);
        return {
          content: [
            {
              type: "text",
              text: "Member content access requested but Admin API key not configured. Please set GHOST_ADMIN_API_KEY environment variable.",
            },
          ],
        };
      }

      // Check user permissions for member content access
      if (includeMemberContent) {
        const sessionId = currentSession.sessionId;
        console.log(`[POSTS_READ] Member content requested. SessionId: ${sessionId}`);

        if (sessionId) {
          const tokenInfo = getSessionTokenInfo(sessionId);
          console.log(`[POSTS_READ] Token info for session ${sessionId}:`, tokenInfo);

          if (!tokenInfo || !tokenInfo.memberAccess) {
            console.log(`[POSTS_READ] Access denied - memberAccess: ${tokenInfo?.memberAccess}`);
            return {
              content: [
                {
                  type: "text",
                  text: "Access denied: Your token does not have permission to access member-only content.",
                },
              ],
            };
          }
          console.log(`[POSTS_READ] Access granted for session ${sessionId}`);
        } else {
          console.log(`[POSTS_READ] No session ID found in currentSession`);
        }
      }

      const post = await getPostById(args.idOrSlug, includeMemberContent);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(post, null, 2),
          },
        ],
      };
    }
  );

}