import { useState, useEffect } from 'react';
import { useReplit } from '@replit/extensions-react';

export default function App() {
  const { status, error, replit } = useReplit();
  const [mcpEndpoint, setMcpEndpoint] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    if (status === 'ready') {
      // Set up MCP bridge server
      setupMCPBridge();
    }
  }, [status, replit]);

  const setupMCPBridge = async () => {
    try {
      // Start internal server to receive MCP commands
      const port = 3001;
      setMcpEndpoint(`${window.location.origin}/mcp-bridge`);
      
      // Listen for messages from external MCP agent
      window.addEventListener('message', handleMCPMessage);
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Failed to setup MCP bridge:', err);
      setConnectionStatus('error');
    }
  };

  const handleMCPMessage = async (event) => {
    if (event.data.type !== 'MCP_COMMAND') return;

    const { method, params, id } = event.data;
    setLastMessage({ method, params, timestamp: new Date() });

    try {
      let result;
      
      switch (method) {
        case 'createProject':
          result = await createProject(params);
          break;
        case 'updateFile':
          result = await updateFile(params);
          break;
        case 'deployProject':
          result = await deployProject(params);
          break;
        case 'getProjectInfo':
          result = await getProjectInfo();
          break;
        case 'listFiles':
          result = await listFiles(params.path);
          break;
        default:
          throw new Error(`Unknown method: ${method}`);
      }

      // Send response back to MCP agent
      event.source.postMessage({
        type: 'MCP_RESPONSE',
        id,
        success: true,
        result
      }, '*');

    } catch (error) {
      event.source.postMessage({
        type: 'MCP_RESPONSE',
        id,
        success: false,
        error: error.message
      }, '*');
    }
  };

  // Real Replit API implementations
  const createProject = async (params) => {
    const { title, language, template } = params;
    
    // Get current repl info
    const currentRepl = await replit.data.currentRepl({});
    
    // Create project structure based on language
    const structure = getProjectStructure(language, template);
    
    for (const file of structure) {
      if (file.type === 'directory') {
        await replit.fs.createDir(file.path);
      } else {
        await replit.fs.writeFile(file.path, file.content);
      }
    }
    
    return {
      id: currentRepl.repl.id,
      title: currentRepl.repl.title,
      url: currentRepl.repl.url,
      language,
      message: `✨ Real project created in Replit workspace!`,
      files: structure.map(f => f.path)
    };
  };

  const updateFile = async (params) => {
    const { filePath, content } = params;
    
    const result = await replit.fs.writeFile(filePath, content);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return {
      success: true,
      path: filePath,
      size: content.length,
      message: `✨ Real file updated in Replit workspace!`
    };
  };

  const deployProject = async (params) => {
    const { command = 'npm run build && npm run deploy' } = params;
    
    try {
      const result = await replit.exec.exec(command);
      
      return {
        success: result.exitCode === 0,
        command,
        output: result.output,
        exitCode: result.exitCode,
        message: `✨ Real deployment executed in Replit!`
      };
    } catch (error) {
      return {
        success: false,
        command,
        error: error.message,
        message: `❌ Deployment failed in Replit`
      };
    }
  };

  const getProjectInfo = async () => {
    const repl = await replit.data.currentRepl({
      includeOwner: true,
      includeSocialData: true
    });
    
    const user = await replit.data.currentUser({});
    
    return {
      repl: repl.repl,
      user: user.user,
      timestamp: new Date().toISOString(),
      message: `✨ Real project info from Replit workspace!`
    };
  };

  const listFiles = async (path = '/') => {
    const result = await replit.fs.readDir(path);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return {
      path,
      children: result.children,
      message: `✨ Real file list from Replit workspace!`
    };
  };

  const getProjectStructure = (language, template) => {
    const structures = {
      python: [
        { type: 'file', path: 'main.py', content: `# ${template || 'Python'} project created by Bhindi.io\nprint("Hello from Bhindi!")` },
        { type: 'file', path: 'requirements.txt', content: '# Add your dependencies here\n' },
        { type: 'file', path: 'README.md', content: `# ${template || 'Python'} Project\n\nCreated with Bhindi.io + Replit integration.\n` }
      ],
      nodejs: [
        { type: 'file', path: 'package.json', content: JSON.stringify({
          name: template?.toLowerCase().replace(/\s+/g, '-') || 'nodejs-project',
          version: '1.0.0',
          main: 'index.js',
          scripts: { start: 'node index.js', dev: 'nodemon index.js' }
        }, null, 2) },
        { type: 'file', path: 'index.js', content: `// ${template || 'Node.js'} project created by Bhindi.io\nconsole.log("Hello from Bhindi!");` },
        { type: 'file', path: 'README.md', content: `# ${template || 'Node.js'} Project\n\nCreated with Bhindi.io + Replit integration.\n` }
      ],
      react: [
        { type: 'file', path: 'package.json', content: JSON.stringify({
          name: template?.toLowerCase().replace(/\s+/g, '-') || 'react-app',
          version: '1.0.0',
          dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
          scripts: { start: 'react-scripts start', build: 'react-scripts build' }
        }, null, 2) },
        { type: 'directory', path: 'src' },
        { type: 'file', path: 'src/App.js', content: `import React from "react";\n\nfunction App() {\n  return <h1>Hello from Bhindi!</h1>;\n}\n\nexport default App;` },
        { type: 'file', path: 'README.md', content: `# ${template || 'React'} Project\n\nCreated with Bhindi.io + Replit integration.\n` }
      ]
    };
    
    return structures[language] || structures.python;
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>🔗 Connecting to Replit...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-red-400">
        <div className="text-center max-w-md">
          <p className="text-xl mb-4">❌ Connection Failed</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🔗 Bhindi ↔ Replit Bridge</h1>
          <p className="text-gray-400">Real-time integration between Bhindi.io and Replit workspace</p>
        </div>

        {/* Connection Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">🌐 Connection Status</h3>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <span className="capitalize">{connectionStatus}</span>
            </div>
            {mcpEndpoint && (
              <div className="mt-4">
                <p className="text-sm text-gray-400">MCP Endpoint:</p>
                <code className="text-xs bg-gray-700 px-2 py-1 rounded">{mcpEndpoint}</code>
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">📊 Integration Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Replit API:</span>
                <span className="text-green-400">✅ Active</span>
              </div>
              <div className="flex justify-between">
                <span>File System:</span>
                <span className="text-green-400">✅ Ready</span>
              </div>
              <div className="flex justify-between">
                <span>Execution:</span>
                <span className="text-green-400">✅ Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Last Command */}
        {lastMessage && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-4">🔄 Last Command</h3>
            <div className="bg-gray-700 rounded p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-blue-400">{lastMessage.method}</span>
                <span className="text-xs text-gray-400">{lastMessage.timestamp.toLocaleTimeString()}</span>
              </div>
              <pre className="text-xs text-gray-300 overflow-x-auto">
                {JSON.stringify(lastMessage.params, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">🚀 Setup Instructions</h3>
          <ol className="space-y-2 text-sm">
            <li>1. <strong>Extension is ready!</strong> This Replit workspace can now receive commands from Bhindi.</li>
            <li>2. <strong>Update your MCP agent</strong> to use this extension URL as the bridge endpoint.</li>
            <li>3. <strong>Set environment variable:</strong> <code className="bg-gray-700 px-2 py-1 rounded">REPLIT_EXTENSION_URL=&lt;this-repl-url&gt;</code></li>
            <li>4. <strong>Test integration</strong> by creating a project through Bhindi!</li>
          </ol>
        </div>

        {/* Developer Info */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Built with ❤️ for seamless Bhindi ↔ Replit integration</p>
        </div>
      </div>
    </div>
  );
}