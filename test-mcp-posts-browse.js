const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { registerPostTools } = require('./build/tools/posts.js');

async function testMcpPostsBrowse() {
    console.log('Testing posts_browse via MCP interface...');

    // Create a mock MCP server
    const server = new McpServer({
        name: "ghost-mcp-test",
        version: "1.0.0"
    }, {
        capabilities: {
            tools: {}
        }
    });

    // Register the posts tools
    registerPostTools(server);

    // Test parameters that match your original query
    const args = {
        limit: 10,
        order: 'published_at desc',
        include: 'title,slug,published_at,excerpt,tags'
    };

    try {
        console.log('Calling posts_browse with args:', args);

        // Find the posts_browse tool
        const toolsMap = server._toolHandlers;
        const postsBrowseTool = toolsMap.get('posts_browse');

        if (!postsBrowseTool) {
            throw new Error('posts_browse tool not found in server handlers');
        }

        // Call the tool handler directly
        const result = await postsBrowseTool.handler(args, {});

        console.log('MCP posts_browse result:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('Error calling posts_browse via MCP:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
    }
}

testMcpPostsBrowse();