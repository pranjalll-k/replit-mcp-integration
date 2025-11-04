const express = require('express');
const { info, error } = require('../utils/logging');
const ReplitBridge = require('../lib/replitBridge');

const router = express.Router();
const replitBridge = new ReplitBridge();

// MCP JSON-RPC endpoint
router.post('/', async (req, res) => {
  const { method, params, id } = req.body;
  
  info('MCP JSON-RPC request', { method, params, id });

  try {
    let result;

    switch (method) {
      case 'tools/list':
        result = {
          tools: [
            {
              name: "createReplitProject",
              description: "Create a new Replit project with a given template or language.",
              inputSchema: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Project name"
                  },
                  language: {
                    type: "string", 
                    description: "Replit language template (e.g., 'python', 'nodejs', 'javascript')"
                  },
                  visibility: {
                    type: "string",
                    enum: ["public", "private"],
                    default: "private",
                    description: "Project visibility"
                  }
                },
                required: ["title", "language"]
              }
            },
            {
              name: "updateFile",
              description: "Edit or overwrite a file in an existing Replit project.",
              inputSchema: {
                type: "object",
                properties: {
                  replId: {
                    type: "string",
                    description: "Replit project ID"
                  },
                  filePath: {
                    type: "string", 
                    description: "Path to the file (e.g., 'main.py', 'src/app.js')"
                  },
                  content: {
                    type: "string",
                    description: "File contents"
                  }
                },
                required: ["replId", "filePath", "content"]
              }
            },
            {
              name: "deployReplitProject",
              description: "Trigger a Replit deployment for the given project.",
              inputSchema: {
                type: "object",
                properties: {
                  replId: {
                    type: "string",
                    description: "Replit project ID"
                  },
                  command: {
                    type: "string",
                    description: "Build or run command",
                    default: "npm run deploy"
                  }
                },
                required: ["replId"]
              }
            },
            {
              name: "getDeploymentStatus", 
              description: "Check if the last Replit deployment succeeded or failed.",
              inputSchema: {
                type: "object",
                properties: {
                  replId: {
                    type: "string",
                    description: "Replit project ID"
                  }
                },
                required: ["replId"]
              }
            },
            {
              name: "reviewCommits",
              description: "Retrieve recent commits or code changes from a Replit project.",
              inputSchema: {
                type: "object",
                properties: {
                  replId: {
                    type: "string",
                    description: "Replit project ID"
                  },
                  limit: {
                    type: "number",
                    description: "Number of commits to fetch",
                    default: 5
                  }
                },
                required: ["replId"]
              }
            }
          ]
        };
        break;

      case 'tools/call':
        const { name, arguments: args } = params;
        result = await handleToolCall(name, args);
        break;

      default:
        return res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: "Method not found"
          },
          id
        });
    }

    res.json({
      jsonrpc: "2.0",
      result,
      id
    });

  } catch (err) {
    error('MCP JSON-RPC error', { error: err.message, method, params });
    
    res.status(500).json({
      jsonrpc: "2.0", 
      error: {
        code: -32603,
        message: "Internal error",
        data: err.message
      },
      id
    });
  }
});

async function handleToolCall(toolName, args) {
  info('Tool call', { toolName, args });

  // Use ReplitBridge to handle both real and mock integration
  switch (toolName) {
    case 'createReplitProject':
      return await replitBridge.createProject(args);

    case 'updateFile':
      return await replitBridge.updateFile(args);

    case 'deployReplitProject':
      return await replitBridge.deployProject(args);

    case 'getDeploymentStatus':
      return await replitBridge.getDeploymentStatus(args);

    case 'reviewCommits':
      return await replitBridge.reviewCommits(args);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// All helper functions moved to ReplitBridge class

module.exports = router;