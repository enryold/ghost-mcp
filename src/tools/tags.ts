// src/tools/tags.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "../ghostApi";

// Parameter schemas as ZodRawShape (object literals)
const browseParams = {
  filter: z.string().optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  order: z.string().optional(),
};
const readParams = {
  id: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  include: z.string().optional(),
};

export function registerTagTools(server: McpServer) {
  // Browse tags
  server.tool(
    "tags_browse",
    browseParams,
    async (args, _extra) => {
      const options = {
        ...(args.filter && { filter: args.filter }),
        ...(args.limit && { limit: args.limit }),
        ...(args.page && { page: args.page }),
        ...(args.order && { order: args.order })
      };
      const tags = await ghostApiClient.tags.browse(options);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(tags, null, 2),
          },
        ],
      };
    }
  );

  // Read tag
  server.tool(
    "tags_read",
    readParams,
    async (args, _extra) => {
      // Prepare the identifier parameter - ensure we have either id or slug
      if (!args.id && !args.slug) {
        throw new Error("Either id or slug must be provided");
      }
      const identifier = args.id ? { id: args.id } : { slug: args.slug! };
      const options: any = { 
        ...(args.include && { include: args.include.split(',') as any })
      };
      const tag = await ghostApiClient.tags.read(identifier, options);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(tag, null, 2),
          },
        ],
      };
    }
  );

}