# Replit MCP Integration

A production-ready MCP (Model Context Protocol) server that enables real-time integration between AI platforms and Replit workspaces. Create projects, edit files, deploy applications, and manage Replit resources through natural language commands.

## 🎯 Overview

This MCP server allows you to:
- Connect your Replit account via OAuth 2.0
- Create new Replit projects programmatically
- Edit files in existing projects
- Trigger deployments and check status
- Review commit history
- Manage Replit resources through Bhindi's AI interface

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Replit account with OAuth app configured

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo>
   cd replit-deploy-agent
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # Replit OAuth Configuration
   REPLIT_CLIENT_ID=your_replit_client_id
   REPLIT_CLIENT_SECRET=your_replit_client_secret
   REPLIT_REDIRECT_URI=http://localhost:3000/auth/replit/callback
   ```

3. **Start the server:**
   ```bash
   npm start
   # or for development:
   npm run dev
   ```

## 🔗 MCP Integration Setup

### 1. Deploy Your MCP Server
First, deploy the MCP server to a cloud platform:

**Option A: Railway**
```bash
npm install -g @railway/cli
railway login
railway deploy
```

**Option B: Render**
1. Push code to GitHub
2. Connect to Render
3. Set environment variables
4. Deploy

**Option C: Fly.io**
```bash
fly deploy
```

### 2. Configure MCP Client
Add this MCP server to any MCP-compatible AI platform:

**MCP Server Endpoint:**
```
https://your-deployed-server.com/mcp
```

**Supported MCP Methods:**
- `tools/list` - Lists available tools
- `tools/call` - Executes tools with parameters

### 3. Local Development with Tunnel
For local development, use LocalTunnel:
```bash
npm start &
npx localtunnel --port 3001
# Use the provided tunnel URL as your MCP endpoint
```

## 🔧 Replit OAuth Setup

1. Go to [Replit Apps](https://replit.com/account/apps)
2. Create a new OAuth app
3. Set the redirect URI to: `http://localhost:3000/auth/replit/callback`
4. Note your Client ID and Client Secret
5. Add these to your `.env` file

## 📖 API Endpoints

### Core MCP Integration

#### `GET /tools`
Lists all available tools with their schemas.

**Response:**
```json
{
  "success": true,
  "responseType": "json",
  "data": [
    {
      "name": "createReplitProject",
      "description": "Create a new Replit project",
      "parameters": {
        "type": "object",
        "properties": {
          "title": {"type": "string", "description": "Project name"},
          "language": {"type": "string", "description": "Replit language template"},
          "visibility": {"type": "string", "enum": ["public", "private"], "default": "private"}
        },
        "required": ["title", "language"]
      }
    }
  ]
}
```

#### `POST /tools/:toolName`
Executes a specific tool with the provided parameters.

**Headers:**
- `Authorization: Bearer <replit-token>`: User's Replit access token (required)

**Example - Create Project:**
```bash
curl -X POST http://localhost:3000/tools/createReplitProject \
  -H "Authorization: Bearer your-replit-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My New Project",
    "language": "nodejs",
    "visibility": "private"
  }'
```

**Response:**
```json
{
  "success": true,
  "responseType": "text",
  "data": {
    "text": "Project \"My New Project\" created successfully with ID: abc123. URL: https://replit.com/@user/my-new-project"
  }
}
```

#### `POST /resource`
Returns contextual information about the connected user and their projects.

**Headers:**
- `Authorization: Bearer <replit-token>`: User's Replit access token (optional)

**Response:**
```json
{
  "success": true,
  "responseType": "json",
  "data": {
    "connected": true,
    "replitUser": {
      "id": "user_id",
      "username": "replit_user",
      "email": "user@example.com",
      "displayName": "User Name"
    },
    "projects": [
      {
        "title": "demo",
        "id": "abc123",
        "url": "https://replit.com/@user/demo",
        "language": "nodejs",
        "isPrivate": false
      }
    ],
    "stats": {
      "totalProjects": 5,
      "publicProjects": 2,
      "privateProjects": 3
    }
  }
}
```

### OAuth Authentication

#### `GET /auth/replit`
Initiates the OAuth flow by returning the authorization URL.

**Response:**
```json
{
  "success": true,
  "responseType": "json",
  "data": {
    "authURL": "https://replit.com/oauth/authorize?client_id=...",
    "message": "Visit the authURL to authorize this application with Replit"
  }
}
```

#### `GET /auth/replit/callback`
Handles the OAuth callback and exchanges the authorization code for an access token.

**Query Parameters:**
- `code`: Authorization code from Replit
- `error`: Error message (if authorization failed)

### Utility Endpoints

#### `GET /`
Returns API documentation and available endpoints.

#### `GET /health`
Health check endpoint for monitoring.

#### `GET /auth/token/:userId`
Check if a user has a stored token and its expiration status.

## 🛠️ Available Tools

### 1. createReplitProject
Creates a new Replit project with specified language and visibility.

**Parameters:**
- `title` (string, required): Project name
- `language` (string, required): Replit language template (e.g., "nodejs", "python", "react")
- `visibility` (string, optional): "public" or "private" (default: "private")

### 2. updateFile
Edits or overwrites a file in an existing Replit project.

**Parameters:**
- `replId` (string, required): Replit project ID
- `filePath` (string, required): Path to the file
- `content` (string, required): File contents

### 3. deployReplitProject
Triggers a deployment for the given project.

**Parameters:**
- `replId` (string, required): Replit project ID
- `command` (string, optional): Build or run command (default: "npm run deploy")

### 4. getDeploymentStatus
Checks if the last deployment succeeded or failed.

**Parameters:**
- `replId` (string, required): Replit project ID

### 5. reviewCommits
Retrieves recent commits or code changes from a Replit project.

**Parameters:**
- `replId` (string, required): Replit project ID
- `limit` (number, optional): Number of commits to fetch (default: 5)

## 🧪 Testing

Run the test suite:
```bash
npm test
```

### Manual Testing

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Test OAuth flow:**
   ```bash
   curl http://localhost:3000/auth/replit
   # Visit the returned authURL in your browser
   ```

3. **Test tools endpoint:**
   ```bash
   curl http://localhost:3000/tools
   ```

4. **Test tool execution:**
   ```bash
   curl -X POST http://localhost:3000/tools/createReplitProject \
     -H "Authorization: Bearer your-replit-token" \
     -H "Content-Type: application/json" \
     -d '{"title": "Test Project", "language": "nodejs"}'
   ```

## 🚢 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
REPLIT_CLIENT_ID=your_replit_client_id
REPLIT_CLIENT_SECRET=your_replit_client_secret
REPLIT_REDIRECT_URI=https://your-domain.com/auth/replit/callback
DB_PATH=./data/tokens.sqlite
CORS_ORIGIN=https://bhindi.io
```

### Docker Deployment

Create a `Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
EXPOSE 3000
CMD ["npm", "start"]
```

### Deploy to Render/Vercel/Fly.io

1. **Connect your repository**
2. **Set environment variables**
3. **Set build command:** `npm install`
4. **Set start command:** `npm start`

## 🔍 Troubleshooting

### Common Issues

1. **Missing environment variables:**
   ```
   ❌ Missing required environment variables: BHINDI_API_KEY
   ```
   Solution: Check your `.env` file and ensure all required variables are set.

2. **OAuth callback fails:**
   ```
   OAuth callback failed: Invalid client credentials
   ```
   Solution: Verify your Replit OAuth app configuration and credentials.

3. **GraphQL errors:**
   ```
   GraphQL errors: [{"message": "Authentication required"}]
   ```
   Solution: Ensure the Replit access token is valid and has the required scopes.

### Debug Mode

Enable debug logging:
```bash
NODE_ENV=development npm run dev
```

## 📋 Project Structure

```
src/
├── index.js                 # Express app entrypoint
├── routes/
│   ├── tools.js             # GET /tools and POST /tools/:toolName
│   ├── resource.js          # POST /resource
│   └── auth.js              # OAuth routes
├── lib/
│   ├── replit.js            # Replit GraphQL API wrapper
│   ├── auth.js              # Authentication middleware
│   └── responses.js         # Bhindi response DTOs
├── utils/
│   ├── validation.js        # Parameter validation
│   └── logging.js           # Structured logging
└── db/
    └── tokens.sqlite        # OAuth tokens storage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- [Replit OAuth Documentation](https://docs.replit.com/hosting/authenticating-users-replit-auth)
- [Replit GraphQL API](https://replit.com/graphql)
- [Bhindi.io Agent Specification](https://docs.bhindi.io/agents)

---

Built with ❤️ for the Bhindi.io ecosystem