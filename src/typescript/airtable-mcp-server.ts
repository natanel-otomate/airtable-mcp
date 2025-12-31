#!/usr/bin/env node

// Import via require to avoid TS type resolution issues with deep subpath exports
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
import * as http from 'node:http';
import * as crypto from 'node:crypto';
import { loadConfig } from './app/config';
import { Logger } from './app/logger';
import { RateLimiter } from './app/rateLimiter';
import { AirtableClient } from './app/airtable-client';
import { GovernanceService } from './app/governance';
import { ExceptionStore } from './app/exceptions';
import { registerAllTools } from './app/tools';
import { AppContext } from './app/context';

const PROTOCOL_VERSION = '2024-11-05';

function buildContext(config: ReturnType<typeof loadConfig>, rootLogger: Logger): AppContext {
  const baseLimiter = new RateLimiter({ maxRequestsPerSecond: 5 });
  const patLimiter = new RateLimiter({ maxRequestsPerSecond: 50 });

  const airtable = new AirtableClient(config.auth.personalAccessToken, {
    baseLimiter,
    patLimiter,
    logger: rootLogger.child({ component: 'airtable_client' }),
    userAgent: `airtable-brain-mcp/${config.version}`,
    patHash: config.auth.patHash
  });

  const governance = new GovernanceService(config.governance);
  const exceptions = new ExceptionStore(config.exceptionQueueSize, rootLogger);

  return {
    config,
    logger: rootLogger,
    airtable,
    governance,
    exceptions
  };
}

export async function start(): Promise<void> {
  const config = loadConfig();
  const logger = new Logger(config.logLevel, { component: 'server' });

  const context = buildContext(config, logger);

  const server = new McpServer(
    {
      name: 'airtable-brain',
      version: config.version,
      protocolVersion: PROTOCOL_VERSION
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
        resources: {}
      },
      instructions:
        'Use describe and query tools for read flows. All mutations require diff review and idempotency keys.'
    }
  );

  registerAllTools(server, context);

  // Check if HTTP mode is requested (for Smithery hosting)
  const httpPort = process.env.PORT || process.env.MCP_HTTP_PORT;

  if (httpPort) {
    // HTTP transport for hosted deployments
    // Create transport with session management
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    const httpServer = http.createServer(async (req, res) => {
      // Health check endpoint
      if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', version: config.version }));
        return;
      }

      // MCP endpoint
      if (req.url === '/mcp' || req.url === '/') {
        // Handle GET requests
        if (req.method === 'GET') {
          // Always return JSON for GET requests (Make.com connection verification)
          // The transport's handleRequest expects POST for MCP protocol
          // GET is only used for verification/health checks
          res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept'
          });
          res.end(JSON.stringify({
            status: 'ok',
            service: 'airtable-mcp',
            version: config.version,
            protocol: 'MCP 2024-11-05',
            endpoint: '/mcp',
            methods: ['POST'],
            message: 'MCP server is running. Use POST method for MCP protocol requests.'
          }));
          return;
        }

        // Handle OPTIONS for CORS preflight
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
            'Access-Control-Max-Age': '86400'
          });
          res.end();
          return;
        }

        // Handle POST requests for MCP protocol
        if (req.method === 'POST') {
          try {
            // Log request details for debugging
            logger.debug('Handling MCP POST request', {
              url: req.url,
              headers: {
                'content-type': req.headers['content-type'],
                'accept': req.headers['accept'],
                'authorization': req.headers['authorization'] ? '[present]' : '[absent]',
                'user-agent': req.headers['user-agent']
              }
            });
            
            // Note: Our server doesn't require client authentication
            // Make.com might send Authorization headers, but we ignore them
            // The Airtable token is configured server-side via environment variables
            
            // Ensure proper headers for SSE if requested
            const acceptHeader = req.headers['accept'] || '';
            if (acceptHeader.includes('text/event-stream')) {
              // Transport should handle SSE automatically, but ensure headers are set
              res.setHeader('Cache-Control', 'no-cache');
              res.setHeader('Connection', 'keep-alive');
            }
            
            await transport.handleRequest(req, res);
          } catch (error) {
            logger.error('Error handling MCP request', { 
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              url: req.url,
              method: req.method
            });
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: {
                  code: -32000,
                  message: 'Internal server error'
                }
              }));
            }
          }
          return;
        }

        // Method not allowed
        res.writeHead(405, { 
          'Content-Type': 'application/json',
          'Allow': 'GET, POST, OPTIONS'
        });
        res.end(JSON.stringify({
          error: 'Method not allowed',
          allowed: ['GET', 'POST', 'OPTIONS']
        }));
        return;
      }

      res.writeHead(404);
      res.end('Not Found');
    });

    // Connect server to transport
    // Note: StreamableHTTPServerTransport manages sessions per request
    await server.connect(transport);

    const port = parseInt(httpPort, 10);
    httpServer.listen(port, '0.0.0.0', () => {
      logger.info('Airtable Brain MCP server ready (HTTP mode)', {
        version: config.version,
        protocolVersion: PROTOCOL_VERSION,
        port
      });
      console.log(`Server listening on port ${port}`);
    });

    httpServer.on('error', (error: Error) => {
      logger.error('HTTP server error', { error: error.message, stack: error.stack });
      console.error('HTTP server error:', error);
      process.exit(1);
    });

    const shutdown = async (signal: string) => {
      logger.info('Shutting down due to signal', { signal });
      httpServer.close();
      await server.close();
      process.exit(0);
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
  } else {
    // Stdio transport for local usage
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('Airtable Brain MCP server ready (stdio mode)', {
      version: config.version,
      protocolVersion: PROTOCOL_VERSION
    });

    const shutdown = async (signal: string) => {
      logger.info('Shutting down due to signal', { signal });
      await server.close();
      await transport.close();
      process.exit(0);
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  start().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start Airtable Brain MCP server:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : String(error));
    process.exit(1);
  });
}
