function validateToolParameters(toolName, parameters) {
  const toolSchemas = {
    createReplitProject: {
      required: ['title', 'language'],
      properties: {
        title: { type: 'string' },
        language: { type: 'string' },
        visibility: { type: 'string', enum: ['public', 'private'], default: 'private' }
      }
    },
    updateFile: {
      required: ['replId', 'filePath', 'content'],
      properties: {
        replId: { type: 'string' },
        filePath: { type: 'string' },
        content: { type: 'string' }
      }
    },
    deployReplitProject: {
      required: ['replId'],
      properties: {
        replId: { type: 'string' },
        command: { type: 'string', default: 'npm run deploy' }
      }
    },
    getDeploymentStatus: {
      required: ['replId'],
      properties: {
        replId: { type: 'string' }
      }
    },
    reviewCommits: {
      required: ['replId'],
      properties: {
        replId: { type: 'string' },
        limit: { type: 'number', default: 5 }
      }
    }
  };

  const schema = toolSchemas[toolName];
  if (!schema) {
    return { valid: false, error: `Unknown tool: ${toolName}` };
  }

  for (const requiredField of schema.required) {
    if (!(requiredField in parameters)) {
      return { valid: false, error: `Missing required parameter: ${requiredField}` };
    }
  }

  const validatedParams = { ...parameters };
  for (const [key, prop] of Object.entries(schema.properties)) {
    if (!(key in validatedParams) && 'default' in prop) {
      validatedParams[key] = prop.default;
    }

    if (key in validatedParams) {
      const value = validatedParams[key];
      if (prop.type === 'string' && typeof value !== 'string') {
        return { valid: false, error: `Parameter ${key} must be a string` };
      }
      if (prop.type === 'number' && typeof value !== 'number') {
        return { valid: false, error: `Parameter ${key} must be a number` };
      }
      if (prop.enum && !prop.enum.includes(value)) {
        return { valid: false, error: `Parameter ${key} must be one of: ${prop.enum.join(', ')}` };
      }
    }
  }

  return { valid: true, parameters: validatedParams };
}

module.exports = {
  validateToolParameters
};