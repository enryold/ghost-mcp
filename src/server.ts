#!/usr/bin/env node

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ghostApiClient } from './ghostApi'; // Import the initialized Ghost API client
import {
    handlePostResource,
    handleBlogInfoResource
} from './resources'; // Import resource handlers

// Create an MCP server instance
const server = new McpServer({
    name: "ghost-mcp-ts",
    version: "1.0.0", // TODO: Get version from package.json
    capabilities: {
        resources: {}, // Capabilities will be enabled as handlers are registered
        tools: {},
        prompts: {},
        logging: {} // Enable logging capability
    }
});

// Register resource handlers (only for Content API supported resources)
server.resource("post", new ResourceTemplate("post://{post_id}", { list: undefined }), handlePostResource);
server.resource("blog-info", "blog://info", handleBlogInfoResource);

// Register tools (only for Content API supported resources)
import { registerPostTools } from "./tools/posts";
import { registerPageTools } from "./tools/pages";
import { registerTagTools } from "./tools/tags";
import { registerAuthorTools } from "./tools/authors";
import { registerSettingsTools } from "./tools/settings";
registerPostTools(server);
registerPageTools(server);
registerTagTools(server);
registerAuthorTools(server);
registerSettingsTools(server);

import { registerPrompts } from "./prompts";
registerPrompts(server);

// Set up and connect to the standard I/O transport
async function startServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Ghost MCP TypeScript Server running on stdio"); // Log to stderr
}

// Start the server
startServer().catch((error: any) => { // Add type annotation for error
    console.error("Fatal error starting server:", error);
    process.exit(1);
});