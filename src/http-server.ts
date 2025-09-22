#!/usr/bin/env node

import express from 'express';
import { createServer } from 'http';
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
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

// Import authentication
import { authMiddleware, setSessionTokenInfo } from "./auth";
import { oauthRouter } from "./oauth";
import { AUTH_TYPE } from "./config";

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// OAuth routes (must be before auth middleware)
app.use('/', oauthRouter);

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
  const endpoints: any = {
    'GET /health': 'Health check',
    'POST /message': 'MCP message endpoint (Streamable HTTP transport)',
  };

  // Add auth-specific endpoints
  if (AUTH_TYPE !== 'NONE') {
    endpoints['POST /oauth/token'] = 'OAuth token endpoint (client_credentials grant)';
    endpoints['GET /.well-known/oauth-authorization-server'] = 'OAuth discovery endpoint';
    endpoints['GET /oauth/health'] = 'OAuth health check';
  }

  res.json({
    name: 'Ghost MCP Readonly Server',
    description: 'Read-only MCP server for accessing Ghost CMS content safely',
    version: '1.0.0',
    auth_type: AUTH_TYPE,
    endpoints,
    usage: AUTH_TYPE === 'NONE'
      ? 'Connect via MCP client to /message endpoint'
      : 'Obtain access token via /oauth/token, then connect with Bearer token to /message endpoint'
  });
});

// Function to create a configured MCP server instance
function createMcpServer() {
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
    
    return server;
}

// Map to store transports by session ID
const transports: Record<string, StreamableHTTPServerTransport> = {};
// Map to store current session context
export const currentSession: { sessionId?: string } = {};

// Set up HTTP transport
async function startServer() {
    // MCP endpoint handler
    const mcpHandler = async (req: any, res: any) => {
        const sessionId = req.headers['mcp-session-id'];
        
        try {
            let transport: StreamableHTTPServerTransport;
            
            if (sessionId && transports[sessionId]) {
                // Reuse existing transport
                transport = transports[sessionId];
            } else if (!sessionId && isInitializeRequest(req.body)) {
                // New initialization request
                transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => randomUUID(),
                    onsessioninitialized: (sessionId: string) => {
                        console.log(`Session initialized with ID: ${sessionId}`);
                        transports[sessionId] = transport;

                        // Store token info for this session if available
                        if (req.tokenInfo) {
                            setSessionTokenInfo(sessionId, req.tokenInfo);
                        }
                    }
                });
                
                // Set up onclose handler to clean up transport
                transport.onclose = () => {
                    const sid = transport.sessionId;
                    if (sid && transports[sid]) {
                        console.log(`Transport closed for session ${sid}`);
                        delete transports[sid];
                        // Clean up session store
                        setSessionTokenInfo(sid, { token: '', memberAccess: false });
                    }
                };
                
                // Connect a new server instance to this transport
                const server = createMcpServer();
                await server.connect(transport);
                await transport.handleRequest(req, res, req.body);
                return; // Already handled
            } else {
                // Invalid request - no session ID or not initialization request
                res.status(400).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32000,
                        message: 'Bad Request: No valid session ID provided',
                    },
                    id: null,
                });
                return;
            }
            
            // Handle the request with existing transport
            await transport.handleRequest(req, res, req.body);
            
        } catch (error) {
            console.error('Error handling MCP request:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32603,
                        message: 'Internal server error',
                    },
                    id: null,
                });
            }
        }
    };
    
    // Set up MCP endpoint to handle all HTTP methods with authentication
    app.all('/message', authMiddleware(), mcpHandler);
    
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

// Handle server shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    // Close all active transports to properly clean up resources
    for (const sessionId in transports) {
        try {
            console.log(`Closing transport for session ${sessionId}`);
            await transports[sessionId].close();
            delete transports[sessionId];
        } catch (error) {
            console.error(`Error closing transport for session ${sessionId}:`, error);
        }
    }
    console.log('Server shutdown complete');
    process.exit(0);
});