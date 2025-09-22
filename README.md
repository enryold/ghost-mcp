# Ghost MCP Server

## ‼️ Important Notice: Read-Only Fork

This is a **read-only** fork of the original Ghost MCP server that has been completely transformed for safe AI agent access:

- **Read-only operations only** - All write/admin capabilities removed
- **Content API** - Switched from Admin API to Content API for security
- **Safe for AI agents** - No risk of content modification or deletion
- **Docker support** - Easy deployment with Docker and Docker Compose
- **Published content only** - Access to posts, pages, tags, authors, tiers, and settings
- **Optional Admin API** - Optional Admin API key support for member-reserved content access

### What's Different From the Original

- 🔒 **No admin operations** - Cannot create, edit, or delete content
- 🔒 **Content API key** - Uses safer Content API instead of Admin API
- 🔒 **Published content only** - No access to drafts or admin-only data
- 🐳 **Docker ready** - Includes Dockerfile and Docker Compose setup
- 📦 **New package name** - Available as `@enryold/ghost-mcp-readonly`

---

A Model Context Protocol (MCP) server for **read-only** access to Ghost CMS content through LLM interfaces like Claude. This server provides secure access to your Ghost blog's published content using the Ghost Content API, making it perfect for AI agents to read and analyze Ghost blog content without any risk of modifications.

![demo](./assets/ghost-mcp-demo.gif)

## Features

- **Read-only access** to Ghost CMS using the secure Content API
- Access to **published content** including posts, pages, tags, authors, tiers, and site settings
- **Content API key** support (no admin privileges required)
- **Optional Admin API** support for accessing member-reserved posts
- **Safe for public deployment** - no write operations available
- Advanced filtering and search functionality with exact matching options
- Support for including related data (authors, tags) in responses
- Multiple content formats (HTML, plaintext) supported
- Robust error handling and integrated logging support

## Usage

### Using with NPM

To use this with MCP clients, for instance, Claude Desktop, add the following to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
      "ghost-mcp": {
        "command": "npx",
        "args": ["-y", "@enryold/ghost-mcp-readonly"],
        "env": {
            "GHOST_API_URL": "https://yourblog.com",
            "GHOST_CONTENT_API_KEY": "your_content_api_key",
            "GHOST_ADMIN_API_KEY": "your_admin_api_key_optional",
            "GHOST_API_VERSION": "v5.0"
        }
      }
    }
}
```

### Using with Docker

#### For Local MCP Client Use (Stdio)

1. **Clone this repository:**
   ```bash
   git clone <repository-url>
   cd ghost-mcp
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` file with your Ghost site details:**
   ```bash
   GHOST_API_URL=https://yourblog.com
   GHOST_CONTENT_API_KEY=your_content_api_key_here
   GHOST_ADMIN_API_KEY=your_admin_api_key_here_optional
   GHOST_API_VERSION=v5.0
   ```
   
   **Important:** The `GHOST_API_URL` must NOT have a trailing slash.

4. **Run with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

#### For Cloud Deployment (HTTP)

For cloud deployments like Coolify, Heroku, or similar platforms:

1. **Build and deploy HTTP version:**
   ```bash
   docker build -f Dockerfile.http -t ghost-mcp-readonly-http .
   docker run -p 3000:3000 \
     -e GHOST_API_URL=https://yourblog.com \
     -e GHOST_CONTENT_API_KEY=your_content_api_key \
     -e GHOST_API_VERSION=v5.0 \
     ghost-mcp-readonly-http
   ```

2. **Or use Docker Compose for HTTP:**
   ```bash
   docker-compose -f docker-compose.http.yml up -d
   ```

**HTTP Endpoints:**
- Health check: `GET /health`
- MCP endpoint: `/message` (Streamable HTTP transport - supports GET, POST, DELETE)
- API info: `GET /`

#### Using with Claude Desktop (Docker)

To use the Docker version with Claude Desktop, update your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
      "ghost-mcp": {
        "command": "docker",
        "args": ["exec", "-i", "ghost-mcp-readonly-server", "npm", "start"],
        "env": {}
      }
    }
}
```

#### Manual Docker Commands

**Build the image:**
```bash
docker build -t ghost-mcp-readonly .
```

**Run the container:**
```bash
docker run -it --rm \
  -e GHOST_API_URL=https://yourblog.com \
  -e GHOST_CONTENT_API_KEY=your_content_api_key \
  -e GHOST_API_VERSION=v5.0 \
  ghost-mcp-readonly
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
- **Browse Posts**: List published posts with optional filters, pagination, ordering, and includes (authors, tags). Use `includeMemberContent: true` to access member-reserved posts (requires Admin API key).
- **Read Post**: Retrieve a specific post by ID or slug, with support for different content formats. Use `includeMemberContent: true` to access member-reserved posts (requires Admin API key).

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


## Authentication

This MCP server supports **three authentication modes** for different deployment scenarios:

### 1. NONE Authentication (Default)
No authentication required. Suitable for private deployments or testing.

```bash
AUTH_TYPE=NONE
```

### 2. BASIC Authentication (CSV File)
Simple client ID/secret authentication using a CSV file. Great for testing and small deployments.

```bash
AUTH_TYPE=BASIC
AUTH_TYPE_BASIC_FILE_PATH=./auth-credentials.csv
```

Create a CSV file with your client credentials:
```csv
access_key,secret_key
test_client_1,secret_key_123
demo_app,demo_secret_456
my_app_id,my_secret_789
```

### 3. OAuth Authentication
Full OAuth 2.0 client_credentials flow with external OAuth provider.

```bash
AUTH_TYPE=OAUTH
AUTH_TYPE_OAUTH_URL=https://your-oauth-provider.com
```

#### OAuth Flow Usage

1. **Get an access token:**
```bash
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "your_client_id",
    "client_secret": "your_client_secret"
  }'
```

2. **Use the token in MCP requests:**
```bash
curl -X POST http://localhost:3000/message \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "id": 1}'
```

3. **OAuth Discovery:**
The server provides OAuth discovery at `/.well-known/oauth-authorization-server`

### Authentication Endpoints (BASIC/OAUTH modes only)
- `POST /oauth/token` - Exchange credentials for access token
- `GET /.well-known/oauth-authorization-server` - OAuth discovery endpoint
- `GET /oauth/health` - OAuth health check

## API Key Setup

To use this MCP server, you'll need a **Ghost Content API key**:

1. Go to your Ghost Admin panel → Settings → Integrations
2. Click "Add custom integration"
3. Give it a name (e.g., "MCP Content Reader")
4. Copy the **Content API Key**
5. Use this key in your configuration as `GHOST_CONTENT_API_KEY`

The Content API key only provides read access to published content, making it safe for use in AI applications.

### Optional: Member-Reserved Content Access

To access member-reserved posts, you can optionally provide a **Ghost Admin API key**:

1. From the same integration page, copy the **Admin API Key**
2. Use this key in your configuration as `GHOST_ADMIN_API_KEY`
3. Set `includeMemberContent: true` when calling post tools

**Important:** The Admin API key is used **read-only** for accessing member-reserved content. No write operations are supported even with an Admin API key configured.

## Error Handling

Ghost MCP Server employs robust error handling for Content API communication errors and processing issues. This ensures clear and descriptive error messages to assist with troubleshooting while maintaining security.

## Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Create pull request

## License

MIT