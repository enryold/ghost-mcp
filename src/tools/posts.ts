// src/tools/posts.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient, ghostAdminApiClient, getPosts, getPostById } from "../ghostApi";

// Parameter schemas as ZodRawShape (object literals)
const browseParams = {
  filter: z.string().optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  order: z.string().optional(),
  include: z.string().optional(),
  formats: z.string().optional(),
  includeMemberContent: z.boolean().optional(),
};
const readParams = {
  id: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  include: z.string().optional(),
  formats: z.string().optional(),
  includeMemberContent: z.boolean().optional(),
};

export function registerPostTools(server: McpServer) {
  // Browse posts
  server.tool(
    "posts_browse",
    browseParams,
    async (args, _extra) => {
      const options: any = {
        ...(args.filter && { filter: args.filter }),
        ...(args.limit && { limit: args.limit }),
        ...(args.page && { page: args.page }),
        ...(args.order && { order: args.order }),
        ...(args.include && { include: args.include.split(',') as any }),
        ...(args.formats && { formats: args.formats.split(',') as any })
      };
      
      const includeMemberContent = args.includeMemberContent || false;
      
      if (includeMemberContent && !ghostAdminApiClient) {
        return {
          content: [
            {
              type: "text",
              text: "Member content access requested but Admin API key not configured. Please set GHOST_ADMIN_API_KEY environment variable.",
            },
          ],
        };
      }
      
      const posts = await getPosts(includeMemberContent, options);
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
      // Prepare the identifier parameter - ensure we have either id or slug
      if (!args.id && !args.slug) {
        throw new Error("Either id or slug must be provided");
      }
      
      const includeMemberContent = args.includeMemberContent || false;
      
      if (includeMemberContent && !ghostAdminApiClient) {
        return {
          content: [
            {
              type: "text",
              text: "Member content access requested but Admin API key not configured. Please set GHOST_ADMIN_API_KEY environment variable.",
            },
          ],
        };
      }
      
      const postId = args.id || args.slug!;
      const post = await getPostById(postId, includeMemberContent);
      
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