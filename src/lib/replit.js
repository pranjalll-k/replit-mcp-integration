const axios = require('axios');
const { info, error } = require('../utils/logging');

class ReplitAPI {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.graphqlURL = process.env.REPLIT_API_URL || 'https://replit.com/graphql';
  }

  async makeGraphQLRequest(query, variables = {}) {
    try {
      const response = await axios.post(this.graphqlURL, {
        query,
        variables
      }, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'bhindi-replit-agent/1.0'
        }
      });

      if (response.data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
      }

      return response.data.data;
    } catch (err) {
      error('GraphQL request failed', { error: err.message, query, variables });
      throw err;
    }
  }

  async createProject(title, language, visibility = 'private') {
    const query = `
      mutation CreateRepl($title: String!, $language: String!, $isPrivate: Boolean!) {
        createRepl(input: {
          title: $title
          language: $language
          isPrivate: $isPrivate
        }) {
          ... on Repl {
            id
            title
            slug
            url
            language
            isPrivate
          }
        }
      }
    `;

    const variables = {
      title,
      language,
      isPrivate: visibility === 'private'
    };

    info('Creating Replit project', { title, language, visibility });
    const data = await this.makeGraphQLRequest(query, variables);
    return data.createRepl;
  }

  async updateFile(replId, filePath, content) {
    const query = `
      mutation WriteToFile($replId: String!, $path: String!, $content: String!) {
        writeToFile(input: {
          replId: $replId
          path: $path
          content: $content
        }) {
          ... on WriteToFileResult {
            success
          }
        }
      }
    `;

    const variables = {
      replId,
      path: filePath,
      content
    };

    info('Updating file in Replit project', { replId, filePath });
    const data = await this.makeGraphQLRequest(query, variables);
    return data.writeToFile;
  }

  async getReplInfo(replId) {
    const query = `
      query GetRepl($id: String!) {
        repl(id: $id) {
          id
          title
          slug
          url
          language
          isPrivate
          owner {
            id
            username
          }
        }
      }
    `;

    const data = await this.makeGraphQLRequest(query, { id: replId });
    return data.repl;
  }

  async executeCode(replId, command = 'npm run deploy') {
    try {
      const execURL = `https://replit.com/@api/repls/${replId}/exec`;
      
      const response = await axios.post(execURL, {
        command
      }, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      info('Executed command in Replit', { replId, command });
      return {
        success: true,
        output: response.data.output || 'Command executed successfully',
        exitCode: response.data.exitCode || 0
      };
    } catch (err) {
      error('Failed to execute command', { replId, command, error: err.message });
      return {
        success: false,
        error: err.message,
        exitCode: 1
      };
    }
  }

  async getDeploymentStatus(replId) {
    try {
      const logsURL = `https://replit.com/@api/repls/${replId}/logs`;
      
      const response = await axios.get(logsURL, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        params: {
          limit: 50
        }
      });

      const logs = response.data.logs || [];
      const deploymentLogs = logs.filter(log => 
        log.message.includes('deploy') || 
        log.message.includes('build') ||
        log.message.includes('error') ||
        log.message.includes('success')
      );

      const latestLog = deploymentLogs[0];
      if (!latestLog) {
        return {
          status: 'unknown',
          message: 'No deployment logs found'
        };
      }

      const success = latestLog.message.toLowerCase().includes('success') ||
                     latestLog.message.toLowerCase().includes('deployed');
      
      return {
        status: success ? 'success' : 'failed',
        message: latestLog.message,
        timestamp: latestLog.timestamp
      };
    } catch (err) {
      error('Failed to get deployment status', { replId, error: err.message });
      return {
        status: 'error',
        message: `Failed to fetch deployment status: ${err.message}`
      };
    }
  }

  async getCommits(replId, limit = 5) {
    const query = `
      query GetReplHistory($id: String!, $count: Int!) {
        repl(id: $id) {
          ... on Repl {
            id
            title
            history(count: $count) {
              id
              message
              timestamp
              author {
                username
              }
            }
          }
        }
      }
    `;

    try {
      const data = await this.makeGraphQLRequest(query, { id: replId, count: limit });
      return data.repl?.history || [];
    } catch (err) {
      error('Failed to get commit history', { replId, error: err.message });
      
      return [{
        id: 'mock-commit',
        message: 'Recent changes',
        timestamp: new Date().toISOString(),
        author: { username: 'unknown' }
      }];
    }
  }

  async getCurrentUser() {
    const query = `
      query GetCurrentUser {
        currentUser {
          id
          username
          email
          displayName
        }
      }
    `;

    try {
      const data = await this.makeGraphQLRequest(query);
      return data.currentUser;
    } catch (err) {
      error('Failed to get current user', { error: err.message });
      throw err;
    }
  }

  async getUserRepls() {
    const query = `
      query GetUserRepls {
        currentUser {
          repls(count: 20) {
            id
            title
            slug
            url
            language
            isPrivate
          }
        }
      }
    `;

    try {
      const data = await this.makeGraphQLRequest(query);
      return data.currentUser?.repls || [];
    } catch (err) {
      error('Failed to get user repls', { error: err.message });
      return [];
    }
  }
}

module.exports = { ReplitAPI };