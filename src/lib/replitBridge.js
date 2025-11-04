const { info, error } = require('../utils/logging');
const axios = require('axios');

class ReplitBridge {
  constructor() {
    this.extensionEndpoint = process.env.REPLIT_EXTENSION_URL;
    this.useRealAPI = !!this.extensionEndpoint;
    this.mockMode = !this.useRealAPI;
  }

  async isExtensionConnected() {
    if (!this.extensionEndpoint) return false;
    
    try {
      const response = await axios.get(`${this.extensionEndpoint}/health`, { timeout: 3000 });
      return response.status === 200;
    } catch (err) {
      return false;
    }
  }

  async createProject(args) {
    if (this.useRealAPI) {
      return await this.callExtension('createProject', args);
    }
    return this.mockCreateProject(args);
  }

  async updateFile(args) {
    if (this.useRealAPI) {
      return await this.callExtension('updateFile', args);
    }
    return this.mockUpdateFile(args);
  }

  async deployProject(args) {
    if (this.useRealAPI) {
      return await this.callExtension('deployProject', args);
    }
    return this.mockDeployProject(args);
  }

  async getDeploymentStatus(args) {
    if (this.useRealAPI) {
      return await this.callExtension('getDeploymentStatus', args);
    }
    return this.mockGetDeploymentStatus(args);
  }

  async reviewCommits(args) {
    if (this.useRealAPI) {
      return await this.callExtension('reviewCommits', args);
    }
    return this.mockReviewCommits(args);
  }

  // Real API calls to Replit Extension
  async callExtension(method, params) {
    try {
      info('Calling real Replit Extension', { method, params });
      
      // For server-side (Node.js), use HTTP communication
      return await this.callExtensionHTTP(method, params);
    } catch (err) {
      error('Extension call failed', { method, params, error: err.message });
      throw new Error(`Real Replit integration failed: ${err.message}`);
    }
  }

  async callExtensionHTTP(method, params) {
    const config = { 
      timeout: 10000
    };
    
    // Only add HTTPS agent for HTTPS connections
    if (this.extensionEndpoint.startsWith('https://')) {
      config.httpsAgent = new (require('https').Agent)({
        rejectUnauthorized: false // Allow self-signed certificates for Replit
      });
    }
    
    const response = await axios.post(`${this.extensionEndpoint}/api`, {
      method,
      params
    }, config);

    return {
      content: [{
        type: "text", 
        text: `✨ **Real Replit Integration Active!**\n\n${response.data.message || 'Operation completed successfully'}\n\n**Real Results:**\n${JSON.stringify(response.data, null, 2)}`
      }]
    };
  }

  // Enhanced mock responses (existing implementation)
  mockCreateProject(args) {
    const projectStructure = this.getProjectStructure(args.language);
    const projectId = `repl_${Date.now()}`;
    
    return {
      content: [
        {
          type: "text",
          text: `🚀 **Project "${args.title}" created successfully!** ${this.mockMode ? '*(Enhanced Simulation)*' : ''}\n\n**Details:**\n- **ID:** ${projectId}\n- **Language:** ${args.language}\n- **Visibility:** ${args.visibility || 'private'}\n- **URL:** https://replit.com/@user/${args.title.toLowerCase().replace(/\\s+/g, '-')}\n\n**Project Structure Created:**\n${projectStructure.map(f => `- ${f.path}`).join('\n')}\n\n✨ Your ${args.language} project is ready! You can now:\n- Edit files with \`updateFile\`\n- Deploy with \`deployReplitProject\`\n- Check status with \`getDeploymentStatus\`\n\n${this.mockMode ? '🔄 *To enable real Replit integration, deploy the extension to a live Replit workspace*' : ''}`
        }
      ]
    };
  }

  mockUpdateFile(args) {
    return {
      content: [
        {
          type: "text", 
          text: `📝 **File \`${args.filePath}\` updated successfully!** ${this.mockMode ? '*(Enhanced Simulation)*' : ''}\n\n**Project:** ${args.replId}\n**File:** ${args.filePath}\n**Size:** ${args.content.length} characters\n\n✅ The file has been saved with your new content. The changes are immediately available in the Replit workspace.\n\n💡 **Next steps:**\n- Deploy the project to see changes live\n- Test your changes in the Replit console\n- Add more files or continue editing\n\n${this.mockMode ? '🔄 *To enable real file operations, deploy the extension to a live Replit workspace*' : ''}`
        }
      ]
    };
  }

  mockDeployProject(args) {
    const deployCommand = args.command || this.getDefaultDeployCommand(args.replId);
    return {
      content: [
        {
          type: "text",
          text: `🚀 **Deployment initiated for project ${args.replId}** ${this.mockMode ? '*(Enhanced Simulation)*' : ''}\n\n**Command executed:** \`${deployCommand}\`\n**Status:** ✅ Running\n**Started:** ${new Date().toLocaleString()}\n\n📊 **Deployment Process:**\n✅ Pre-deployment checks passed\n🔄 Installing dependencies...\n🔄 Building project...\n🔄 Deploying to Replit hosting...\n\n⏱️ Estimated completion: 2-3 minutes\n\n💡 Use \`getDeploymentStatus\` to check progress and final results.\n\n${this.mockMode ? '🔄 *To enable real deployments, deploy the extension to a live Replit workspace*' : ''}`
        }
      ]
    };
  }

  mockGetDeploymentStatus(args) {
    const deployTime = new Date(Date.now() - Math.random() * 300000);
    const status = Math.random() > 0.2 ? 'success' : 'in-progress';
    
    if (status === 'success') {
      return {
        content: [
          {
            type: "text",
            text: `🎉 **Deployment Status: SUCCESS** ${this.mockMode ? '*(Enhanced Simulation)*' : ''}\n\n**Project:** ${args.replId}\n**Completed:** ${deployTime.toLocaleString()}\n**Duration:** 2m 34s\n**Status:** ✅ Live and running\n\n**Deployment URL:** https://${args.replId}.replit.app\n\n📊 **Deployment Summary:**\n✅ Dependencies installed (1m 12s)\n✅ Build completed (45s)\n✅ Deployment successful (37s)\n\n🌟 Your project is now live and accessible to users!\n\n${this.mockMode ? '🔄 *To get real deployment URLs, deploy the extension to a live Replit workspace*' : ''}`
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: "text", 
            text: `⏳ **Deployment Status: IN PROGRESS** ${this.mockMode ? '*(Enhanced Simulation)*' : ''}\n\n**Project:** ${args.replId}\n**Started:** ${deployTime.toLocaleString()}\n**Current Step:** Building project assets\n**Progress:** 65% complete\n\n🔄 **Current Activity:**\n✅ Pre-deployment checks (completed)\n✅ Dependencies installed (completed)\n🔄 Building project (in progress...)\n⏳ Deployment (pending)\n\n⏱️ Estimated completion: 1-2 minutes remaining\n\n${this.mockMode ? '🔄 *To get real deployment progress, deploy the extension to a live Replit workspace*' : ''}`
          }
        ]
      };
    }
  }

  mockReviewCommits(args) {
    const mockCommits = this.generateRealisticCommits(args.limit || 5);

    return {
      content: [
        {
          type: "text",
          text: `📝 **Recent commits for ${args.replId}:** ${this.mockMode ? '*(Enhanced Simulation)*' : ''}\n\n${mockCommits.map((commit, i) => `**${i + 1}.** \`${commit.hash}\` - ${commit.message}\n   👤 ${commit.author} • 🕐 ${commit.time}`).join('\n\n')}\n\n📊 **Repository Stats:**\n- Total commits: ${Math.floor(Math.random() * 50) + 10}\n- Contributors: ${Math.floor(Math.random() * 3) + 1}\n- Last activity: ${mockCommits[0].time}\n\n💡 These commits show the recent development history of your project.\n\n${this.mockMode ? '🔄 *To get real commit history, deploy the extension to a live Replit workspace*' : ''}`
        }
      ]
    };
  }

  // Helper functions (existing implementation)
  getProjectStructure(language) {
    const structures = {
      python: [
        { path: 'main.py', type: 'file' },
        { path: 'requirements.txt', type: 'file' },
        { path: 'README.md', type: 'file' },
        { path: '.gitignore', type: 'file' }
      ],
      nodejs: [
        { path: 'package.json', type: 'file' },
        { path: 'index.js', type: 'file' },
        { path: 'README.md', type: 'file' },
        { path: '.gitignore', type: 'file' },
        { path: 'node_modules/', type: 'directory' }
      ],
      javascript: [
        { path: 'index.html', type: 'file' },
        { path: 'script.js', type: 'file' },
        { path: 'style.css', type: 'file' },
        { path: 'README.md', type: 'file' }
      ],
      react: [
        { path: 'package.json', type: 'file' },
        { path: 'src/', type: 'directory' },
        { path: 'src/App.js', type: 'file' },
        { path: 'src/index.js', type: 'file' },
        { path: 'public/', type: 'directory' },
        { path: 'public/index.html', type: 'file' },
        { path: 'README.md', type: 'file' }
      ],
      nextjs: [
        { path: 'package.json', type: 'file' },
        { path: 'pages/', type: 'directory' },
        { path: 'pages/index.js', type: 'file' },
        { path: 'pages/_app.js', type: 'file' },
        { path: 'README.md', type: 'file' }
      ],
      html: [
        { path: 'index.html', type: 'file' },
        { path: 'style.css', type: 'file' },
        { path: 'script.js', type: 'file' }
      ]
    };
    
    return structures[language.toLowerCase()] || structures.python;
  }

  getDefaultDeployCommand(replId) {
    const commands = [
      'npm run build && npm start',
      'python main.py',
      'npm run deploy',
      'yarn build && yarn start',
      'node index.js'
    ];
    
    return commands[Math.floor(Math.random() * commands.length)];
  }

  generateRealisticCommits(limit) {
    const commitMessages = [
      'Initial project setup',
      'Add main functionality',
      'Fix authentication bug', 
      'Update dependencies',
      'Improve error handling',
      'Add user interface components',
      'Optimize performance',
      'Fix deployment issues',
      'Add documentation',
      'Implement new features',
      'Refactor code structure',
      'Add unit tests',
      'Fix CSS styling issues',
      'Update API endpoints',
      'Add database integration'
    ];
    
    const authors = ['user', 'developer', 'team-member'];
    
    return Array.from({ length: limit }, (_, i) => {
      const daysAgo = i * Math.floor(Math.random() * 3) + 1;
      const commitTime = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      
      return {
        hash: Math.random().toString(36).substring(2, 10),
        message: commitMessages[Math.floor(Math.random() * commitMessages.length)],
        author: authors[Math.floor(Math.random() * authors.length)],
        time: commitTime.toLocaleDateString() + ' ' + commitTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
    });
  }
}

module.exports = ReplitBridge;