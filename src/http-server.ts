#!/usr/bin/env node

import express from 'express';
import { createServer } from 'http';
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { ghostApiClient } from './ghostApi';
import {
    handlePostResource,
    handleBlogInfoResource
} from './resources';

// Import tool registrations
import { registerPostTools } from "./tools/posts";
import { registerPageTools } from "./tools/pages";
import { registerTagTools } from "./tools/tags";
import { registerAuthorTools } from "./tools/authors";
import { registerSettingsTools } from "./tools/settings";
import { registerPrompts } from "./prompts";

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Ghost MCP Readonly Server',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Ghost MCP Readonly Server',
    description: 'Read-only MCP server for accessing Ghost CMS content safely',
    version: '1.0.0',
    endpoints: {
      'GET /health': 'Health check',
      'POST /message': 'MCP message endpoint (SSE transport)',
    },
    usage: 'Connect via MCP client to /message endpoint'
  });
});

// Set up SSE transport
async function startServer() {
    // Create HTTP server
    const httpServer = createServer(app);
    
    // Create MCP server instance for each connection
    httpServer.on('request', async (req, res) => {
        if (req.method === 'POST' && req.url === '/message') {
            // Create a new MCP server instance for this connection
            const server = new McpServer({
                name: "ghost-mcp-readonly",
                version: "1.0.0",
                capabilities: {
                    resources: {},
                    tools: {},
                    prompts: {},
                    logging: {}
                }
            });

            // Register resource handlers
            server.resource("post", new ResourceTemplate("post://{post_id}", { list: undefined }), handlePostResource);
            server.resource("blog-info", "blog://info", handleBlogInfoResource);

            // Register tools
            registerPostTools(server);
            registerPageTools(server);
            registerTagTools(server);
            registerAuthorTools(server);
            registerSettingsTools(server);
            registerPrompts(server);
            
            // Set up SSE transport
            const transport = new SSEServerTransport('/message', res);
            await server.connect(transport);
            return;
        }
    });
    
    // Start the HTTP server
    httpServer.listen(port, () => {
        console.log(`🚀 Ghost MCP Readonly Server running on port ${port}`);
        console.log(`📡 MCP endpoint: http://localhost:${port}/message`);
        console.log(`💚 Health check: http://localhost:${port}/health`);
    });
}

// Start the server
startServer().catch((error: any) => {
    console.error("Fatal error starting server:", error);
    process.exit(1);
});