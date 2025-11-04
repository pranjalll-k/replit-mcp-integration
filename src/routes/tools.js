const express = require('express');
const { validateReplitToken } = require('../lib/auth');
const { BaseSuccessResponseDto, BaseErrorResponseDto, TextResponseData, JsonResponseData } = require('../lib/responses');
const { validateToolParameters } = require('../utils/validation');
const { ReplitAPI } = require('../lib/replit');
const { info, error } = require('../utils/logging');

const router = express.Router();

const TOOLS_DEFINITION = [
  {
    "name": "createReplitProject",
    "description": "Create a new Replit project with a given template or language.",
    "parameters": {
      "type": "object",
      "properties": {
        "title": {"type": "string", "description": "Project name"},
        "language": {"type": "string", "description": "Replit language template"},
        "visibility": {"type": "string", "enum": ["public", "private"], "default": "private"}
      },
      "required": ["title", "language"]
    }
  },
  {
    "name": "updateFile",
    "description": "Edit or overwrite a file in an existing Replit project.",
    "parameters": {
      "type": "object",
      "properties": {
        "replId": {"type": "string", "description": "Replit project ID"},
        "filePath": {"type": "string", "description": "Path to the file"},
        "content": {"type": "string", "description": "File contents"}
      },
      "required": ["replId", "filePath", "content"]
    }
  },
  {
    "name": "deployReplitProject",
    "description": "Trigger a Replit deployment for the given project.",
    "parameters": {
      "type": "object",
      "properties": {
        "replId": {"type": "string", "description": "Replit project ID"},
        "command": {"type": "string", "description": "Build or run command", "default": "npm run deploy"}
      },
      "required": ["replId"]
    }
  },
  {
    "name": "getDeploymentStatus",
    "description": "Check if the last Replit deployment succeeded or failed.",
    "parameters": {
      "type": "object",
      "properties": {
        "replId": {"type": "string", "description": "Replit project ID"}
      },
      "required": ["replId"]
    }
  },
  {
    "name": "reviewCommits",
    "description": "Retrieve recent commits or code changes from a Replit project.",
    "parameters": {
      "type": "object",
      "properties": {
        "replId": {"type": "string", "description": "Replit project ID"},
        "limit": {"type": "number", "description": "Number of commits to fetch", "default": 5}
      },
      "required": ["replId"]
    }
  }
];

router.get('/tools', (req, res) => {
  info('GET /tools requested');
  
  // Return tools as a simple array for MCP compliance
  res.json({
    tools: TOOLS_DEFINITION
  });
});

router.post('/tools/:toolName', async (req, res) => {
  const { toolName } = req.params;
  const parameters = req.body;

  info('Tool execution requested', { toolName, parameters });

  const validation = validateToolParameters(toolName, parameters);
  if (!validation.valid) {
    return res.status(400).json(new BaseErrorResponseDto(validation.error, 400));
  }

  const validatedParams = validation.parameters;

  // For demo purposes, return mock responses without actually calling Replit API
  try {
    let result;

    switch (toolName) {
      case 'createReplitProject':
        // Mock response for demo
        const mockProject = {
          title: validatedParams.title,
          id: `mock_${Date.now()}`,
          url: `https://replit.com/@user/${validatedParams.title.toLowerCase().replace(/\s+/g, '-')}`
        };
        
        res.json(new BaseSuccessResponseDto(
          new TextResponseData(`Project "${mockProject.title}" created successfully with ID: ${mockProject.id}. URL: ${mockProject.url}`)
        ));
        break;

      case 'updateFile':
        // Mock response for demo
        res.json(new BaseSuccessResponseDto(
          new TextResponseData(`File ${validatedParams.filePath} updated successfully in project ${validatedParams.replId}`)
        ));
        break;

      case 'deployReplitProject':
        // Mock response for demo
        res.json(new BaseSuccessResponseDto(
          new TextResponseData(`Deployment started for ${validatedParams.replId}. Command: ${validatedParams.command}. Status: Success`)
        ));
        break;

      case 'getDeploymentStatus':
        // Mock response for demo
        res.json(new BaseSuccessResponseDto(
          new TextResponseData(`Deployment status for ${validatedParams.replId}: success. Last deployment completed successfully.`)
        ));
        break;

      case 'reviewCommits':
        // Mock response for demo
        const mockCommits = [
          `abcd1234: Initial commit (by user)`,
          `efgh5678: Add main functionality (by user)`,
          `ijkl9012: Fix bug in deployment (by user)`
        ].slice(0, validatedParams.limit);
        
        res.json(new BaseSuccessResponseDto(
          new TextResponseData(`Recent commits for ${validatedParams.replId}:\n${mockCommits.join('\n')}`)
        ));
        break;

      default:
        res.status(404).json(new BaseErrorResponseDto(`Tool ${toolName} not found`, 404));
    }

  } catch (err) {
    error('Tool execution failed', { toolName, error: err.message });
    res.status(500).json(new BaseErrorResponseDto(`Tool execution failed: ${err.message}`, 500));
  }
});

module.exports = router;