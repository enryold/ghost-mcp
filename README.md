# Ghost MCP Server

## ‼️ Important Notice: Python to TypeScript Migration
I've completely rewritten the Ghost MCP Server from Python to TypeScript in this v0.1.0 release. This major change brings several benefits:

- Simplified installation: Now available as an NPM package (@fanyangmeng/ghost-mcp)
- Improved reliability: Uses the official @tryghost/admin-api client instead of custom implementation
- Better maintainability: TypeScript provides type safety and better code organization
- Streamlined configuration: Simple environment variable setup

### Breaking Changes

- Python dependencies are no longer required
- Configuration method has changed (now using Node.js environment variables)
- Docker deployment has been simplified
- Different installation process (now using NPM)

Please see the below updated documentation for details on migrating from the Python version. If you encounter any issues, feel free to open an issue on GitHub.

---

A Model Context Protocol (MCP) server for **read-only** access to Ghost CMS content through LLM interfaces like Claude. This server provides secure access to your Ghost blog's published content using the Ghost Content API, making it perfect for AI agents to read and analyze Ghost blog content without any risk of modifications.

![demo](./assets/ghost-mcp-demo.gif)

## Features

- **Read-only access** to Ghost CMS using the secure Content API
- Access to **published content** including posts, pages, tags, authors, tiers, and site settings
- **Content API key** support (no admin privileges required)
- **Safe for public deployment** - no write operations available
- Advanced filtering and search functionality with exact matching options
- Support for including related data (authors, tags) in responses
- Multiple content formats (HTML, plaintext) supported
- Robust error handling and integrated logging support

## Usage

To use this with MCP clients, for instance, Claude Desktop, add the following to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
      "ghost-mcp": {
        "command": "npx",
        "args": ["-y", "@fanyangmeng/ghost-mcp"],
        "env": {
            "GHOST_API_URL": "https://yourblog.com",
            "GHOST_CONTENT_API_KEY": "your_content_api_key",
            "GHOST_API_VERSION": "v5.0"
        }
      }
    }
}
```

## Available Resources

The following **read-only** Ghost CMS resources are available through this MCP server:

- **Posts**: Published articles and content from your Ghost site.
- **Pages**: Static pages published on your Ghost site.
- **Tags**: Organizational tags for posts and content.
- **Authors**: Authors and content creators on your site.
- **Tiers**: Subscription tiers and membership plans.
- **Settings**: Global site settings and configuration.

## Available Tools

This MCP server exposes **read-only** tools for accessing your Ghost CMS content via the Model Context Protocol. All operations are read-only, ensuring your content remains safe from accidental modifications. Below is a summary of the available tools:

### Posts
- **Browse Posts**: List published posts with optional filters, pagination, ordering, and includes (authors, tags).
- **Read Post**: Retrieve a specific post by ID or slug, with support for different content formats.

### Pages
- **Browse Pages**: List published pages with optional filters, pagination, and ordering.
- **Read Page**: Retrieve a specific page by ID or slug, with support for different content formats.

### Tags
- **Browse Tags**: List all tags with optional filters and pagination.
- **Read Tag**: Retrieve a specific tag by ID or slug, with optional post count.

### Authors
- **Browse Authors**: List all authors with optional filters and includes (post counts).
- **Read Author**: Retrieve a specific author by ID or slug, with optional post information.

### Tiers
- **Browse Tiers**: List subscription tiers and membership plans.
- **Read Tier**: Retrieve a specific tier by ID with detailed information.

### Settings
- **Read Settings**: Retrieve global site settings and configuration.

> All tools support common Content API parameters like `include`, `formats`, `filter`, `limit`, `page`, and `order`. Each tool is accessible via the MCP protocol and can be invoked from compatible clients. For detailed parameter schemas and usage, see the source code in `src/tools/`.


## API Key Setup

To use this MCP server, you'll need a **Ghost Content API key** (not an Admin API key):

1. Go to your Ghost Admin panel → Settings → Integrations
2. Click "Add custom integration"
3. Give it a name (e.g., "MCP Content Reader")
4. Copy the **Content API Key** (not the Admin API Key)
5. Use this key in your configuration as `GHOST_CONTENT_API_KEY`

The Content API key only provides read access to published content, making it safe for use in AI applications.

## Error Handling

Ghost MCP Server employs robust error handling for Content API communication errors and processing issues. This ensures clear and descriptive error messages to assist with troubleshooting while maintaining security.

## Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Create pull request

## License

MIT