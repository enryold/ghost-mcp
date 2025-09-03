// src/tools/pages.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "../ghostApi";

// Parameter schemas as ZodRawShape (object literals)
const browseParams = {
  filter: z.string().optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
  order: z.string().optional(),
  include: z.string().optional(),
  formats: z.string().optional(),
};
const readParams = {
  id: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  include: z.string().optional(),
  formats: z.string().optional(),
};

export function registerPageTools(server: McpServer) {
  // Browse pages
  server.tool(
    "pages_browse",
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
      const pages = await ghostApiClient.pages.browse(options);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(pages, null, 2),
          },
        ],
      };
    }
  );

  // Read page
  server.tool(
    "pages_read",
    readParams,
    async (args, _extra) => {
      // Prepare the identifier parameter - ensure we have either id or slug
      if (!args.id && !args.slug) {
        throw new Error("Either id or slug must be provided");
      }
      const identifier = args.id ? { id: args.id } : { slug: args.slug! };
      const options: any = { 
        ...(args.include && { include: args.include.split(',') as any }),
        ...(args.formats && { formats: args.formats.split(',') as any })
      };
      const page = await ghostApiClient.pages.read(identifier, options);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(page, null, 2),
          },
        ],
      };
    }
  );
}