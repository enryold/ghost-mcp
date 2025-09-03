// src/tools/settings.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "../ghostApi";

export function registerSettingsTools(server: McpServer) {
  // Read settings (no browse for settings - it's a single resource)
  server.tool(
    "settings_read",
    {},
    async (args, _extra) => {
      const settings = await ghostApiClient.settings.browse();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(settings, null, 2),
          },
        ],
      };
    }
  );
}