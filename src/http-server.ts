#!/usr/bin/env node

import express from 'express';
import { createServer } from 'http';
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ghostApiClient } from './ghostApi';
import { randomUUID } from 'crypto';
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
      'POST /message': 'MCP message endpoint (Streamable HTTP transport)',
    },
    usage: 'Connect via MCP client to /message endpoint'
  });
});

// Set up HTTP transport
async function startServer() {
    // Create MCP server instance
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
    
    // Create Streamable HTTP transport for MCP
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID()
    });
    
    // Connect server to transport
    await server.connect(transport);
    
    // Set up MCP endpoint to handle all HTTP methods
    app.all('/message', async (req, res) => {
        await transport.handleRequest(req, res, req.body);
    });
    
    // Start the HTTP server
    app.listen(port, () => {
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