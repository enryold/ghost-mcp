// Test the actual MCP posts tool with the problematic parameters
const express = require('express');
const { createServer } = require('./build/server');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

async function testMcpTool() {
    console.log('🧪 Testing MCP posts tool directly...');

    try {
        // Create an MCP server instance
        const server = new McpServer(
            {
                name: "ghost-mcp-test",
                version: "0.1.0",
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        // Import and register the tools (using the createServer function)
        const actualServer = await createServer();

        // Test the posts_browse tool directly
        const toolArgs = {
            limit: 10,
            order: 'published_at DESC'
        };

        console.log('Testing tool with args:', toolArgs);

        // We need to manually call the tool function
        // Let's get the tools from the server instead
        const tools = actualServer._tools;
        console.log('Available tools:', Object.keys(tools));

        if (tools['posts_browse']) {
            console.log('📖 Testing posts_browse tool...');
            const result = await tools['posts_browse'].handler(toolArgs, {});
            console.log('✅ Tool result length:', JSON.stringify(result).length);
            console.log('✅ Tool executed successfully');
        } else {
            console.log('❌ posts_browse tool not found');
        }

    } catch (error) {
        console.error('❌ MCP Tool Error:', error.message);
        console.error('Full error:', error);
    }
}

testMcpTool();