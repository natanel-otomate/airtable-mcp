# Make.com AI Agent Integration Guide

This guide explains how to connect your hosted Airtable MCP server to Make.com AI Agents.

## Prerequisites

- Your MCP server is deployed and accessible: `https://airtable-mcp-production-2056.up.railway.app`
- A Make.com account with AI Agents enabled
- Your Airtable token is already configured in the MCP server

## MCP Server Details

- **Server URL**: `https://airtable-mcp-production-2056.up.railway.app`
- **Health Endpoint**: `https://airtable-mcp-production-2056.up.railway.app/health`
- **MCP Endpoint**: `https://airtable-mcp-production-2056.up.railway.app/mcp`
- **Protocol**: JSON-RPC 2.0 over HTTP
- **Method**: POST

## Step 1: Verify Your MCP Server is Running

Test the health endpoint:
```bash
curl https://airtable-mcp-production-2056.up.railway.app/health
```

Expected response:
```json
{"status":"ok","version":"3.2.8"}
```

## Step 2: Create an AI Agent in Make.com

1. **Log in to Make.com** and navigate to your scenario
2. **Add an AI Agent module** to your scenario
3. **Configure the AI Agent**:
   - Select your preferred LLM provider (OpenAI, Anthropic, etc.)
   - Configure the model and parameters
   - Set up your API keys

## Step 3: Add MCP Server Connection

**⚠️ Important Note**: Make.com's native MCP integration may have compatibility issues with the MCP server's HTTP transport. If you encounter "SSE error" or "Server already initialized" errors, use **Option B (HTTP Modules)** instead, which provides more reliable integration.

### Option A: If Make.com Supports Direct MCP Integration (May Have Issues)

1. In your AI Agent settings, look for **"MCP Servers"** or **"Tools"** section
2. Click **"Add MCP Server"** or **"Add Tool"**
3. Configure the connection:
   - **Name**: `https://airtable-mcp-production-2056.up.railway.app/mcp`
   - **URL**: `https://airtable-mcp-production-2056.up.railway.app/mcp`
   - **Protocol**: HTTP/JSON-RPC 2.0
   - **Authentication**: **Leave empty** (your Airtable token is already in the server)
   - **Important**: Do NOT provide an access token in Make.com - the server doesn't require client authentication

### Troubleshooting

#### "SSE error: Invalid content type, expected 'text/event-stream'" Error

**This is the most common error when using Make.com's native MCP integration.**

**Root Cause**: Make.com's MCP client expects Server-Sent Events (SSE) with `text/event-stream` content type, but there's a compatibility issue between Make.com's client and the MCP SDK's `StreamableHTTPServerTransport`.

**Solution**: **Use Option B (HTTP Modules)** instead of Make.com's native MCP integration. The HTTP module approach gives you full control over the requests and responses, avoiding the SSE compatibility issue.

**Why this happens**:
- The MCP server uses `StreamableHTTPServerTransport` which should handle SSE automatically
- Make.com's client is sending requests expecting SSE responses
- There's a mismatch in how Make.com expects SSE vs. how the transport provides it
- This is a **Make.com client compatibility issue**, not a server bug

**Workaround if you must use native integration**:
1. Wait for Make.com to update their MCP client implementation
2. Contact Make.com support about MCP SSE compatibility
3. Use HTTP modules (Option B) as a reliable alternative

#### "Server already initialized" Error

If you see the error `"Server already initialized"`, it means Make.com is trying to initialize the same session twice. This can happen if:

1. **Make.com retries the connection** - Wait a few seconds and try again
2. **Session persistence** - Make.com might be caching the session. Try:
   - Clearing the AI Agent connection and re-adding it
   - Using a different connection name
   - Waiting 30-60 seconds between connection attempts

**Note**: The MCP server uses session-based connections. Each new connection should create a new session automatically. If you continue to see this error, it may be a Make.com client issue with session management.

#### 401 Unauthorized Error

If you see a **401 Unauthorized** error in Make.com's console:

1. **Check Make.com MCP configuration**:
   - Ensure the **Authentication** field is **completely empty**
   - Do NOT enter any access token, API key, or OAuth credentials
   - The server does NOT require client authentication

2. **Verify server is running**:
   - Check the health endpoint: `https://airtable-mcp-production-2056.up.railway.app/health`
   - Should return: `{"status":"ok","version":"3.2.8"}`

3. **Check Railway environment variables**:
   - Ensure `AIRTABLE_TOKEN` or `AIRTABLE_PAT` is set in Railway
   - The server uses this token server-side - clients don't need to provide it

4. **If Make.com requires authentication fields**:
   - Try entering a dummy value (like "none" or "not-required")
   - Or contact Make.com support about MCP servers that don't require client authentication

### Option B: Using HTTP Module (Recommended - More Reliable)

**This is the recommended approach** because it avoids compatibility issues with Make.com's native MCP client (SSE errors, initialization conflicts, etc.). The HTTP module gives you explicit control over the MCP protocol.

Use the HTTP module to call MCP tools directly:

1. **Add an HTTP module** before your AI Agent
2. **Configure the HTTP request**:
   - **Method**: POST
   - **URL**: `https://airtable-mcp-production-2056.up.railway.app/mcp`
   - **Headers**:
     ```
     Content-Type: application/json
     Accept: application/json, text/event-stream
     ```
   - **Body** (JSON):
     ```json
     {
       "jsonrpc": "2.0",
       "id": 1,
       "method": "tools/list",
       "params": {}
     }
     ```

3. **Parse the response** and use it in your AI Agent

## Step 4: Available MCP Tools

Your MCP server provides 33 tools. Here are some commonly used ones:

### Data Operations
- `list_tables` - List all tables in a base
- `list_records` - Query records with filtering
- `get_record` - Get a single record by ID
- `create_record` - Create new records
- `update_record` - Update existing records
- `delete_record` - Delete records
- `search_records` - Advanced search with formulas

### Schema Discovery
- `list_bases` - List all accessible bases
- `get_base_schema` - Get complete schema for a base
- `describe_table` - Get detailed table information

### Batch Operations
- `batch_create_records` - Create up to 10 records at once
- `batch_update_records` - Update up to 10 records
- `batch_delete_records` - Delete up to 10 records

## Step 5: MCP Protocol Flow

**Important**: MCP requires an initialization handshake and session management before using tools.

### Step 1: Initialize Connection (Get Session ID)

**⚠️ Critical**: The first `initialize` request does NOT include a `Mcp-Session-Id` header. The server will return the session ID in the response headers.

**HTTP Request:**
- **Method**: `POST`
- **URL**: `https://airtable-mcp-production-2056.up.railway.app/mcp`
- **Headers**:
  ```
  Content-Type: application/json
  Accept: application/json
  ```
  **Note**: Do NOT include `Mcp-Session-Id` header in the initialize request.

- **Body (JSON)**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "make-com",
      "version": "1.0"
    }
  }
}
```

**Response:**
- **Status**: `200 OK`
- **Headers**:
  ```
  Content-Type: application/json
  Mcp-Session-Id: <session-id-uuid>
  ```
  **⚠️ IMPORTANT**: Extract the `Mcp-Session-Id` from the response headers! You'll need it for all subsequent requests.

- **Body (JSON)**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "airtable-brain",
      "version": "3.2.8"
    }
  }
}
```

**In Make.com**: Use a "Set variable" module after the HTTP request to store the `Mcp-Session-Id` from the response headers. The header name might be lowercase (`mcp-session-id`) depending on Make.com's HTTP module.

### Step 2: Send Initialized Notification

**⚠️ Critical**: This request MUST include the `Mcp-Session-Id` header from Step 1.

**HTTP Request:**
- **Method**: `POST`
- **URL**: `https://airtable-mcp-production-2056.up.railway.app/mcp`
- **Headers**:
  ```
  Content-Type: application/json
  Accept: application/json
  Mcp-Session-Id: <session-id-from-step-1>
  ```

- **Body (JSON)**:
```json
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized",
  "params": {}
}
```

**Note**: This is a notification (no `id` field) and doesn't return a response. The server should return `202 Accepted`.

### Step 3: Now You Can Use Tools

**⚠️ Critical**: ALL tool requests MUST include the `Mcp-Session-Id` header from Step 1.

### List Available Tools

**HTTP Request:**
- **Method**: `POST`
- **URL**: `https://airtable-mcp-production-2056.up.railway.app/mcp`
- **Headers**:
  ```
  Content-Type: application/json
  Accept: application/json
  Mcp-Session-Id: <session-id-from-step-1>
  ```

- **Body (JSON)**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

### Call a Tool (Example: List Bases)

**HTTP Request:**
- **Method**: `POST`
- **URL**: `https://airtable-mcp-production-2056.up.railway.app/mcp`
- **Headers**:
  ```
  Content-Type: application/json
  Accept: application/json
  Mcp-Session-Id: <session-id-from-step-1>
  ```

- **Body (JSON)**:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "list_bases",
    "arguments": {}
  }
}
```

### Call a Tool (Example: List Records)

**HTTP Request:**
- **Method**: `POST`
- **URL**: `https://airtable-mcp-production-2056.up.railway.app/mcp`
- **Headers**:
  ```
  Content-Type: application/json
  Accept: application/json
  Mcp-Session-Id: <session-id-from-step-1>
  ```

- **Body (JSON)**:
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "list_records",
    "arguments": {
      "baseId": "your_base_id",
      "table": "Table Name",
      "maxRecords": 10
    }
  }
}
```

## Step 6: Testing the Integration

### Test 1: Initialize and List Tools

**⚠️ Important**: Extract the `Mcp-Session-Id` from the response headers of the initialize request!

```bash
# Step 1: Initialize (no session ID header needed)
curl -X POST https://airtable-mcp-production-2056.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -i \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0"}
    }
  }'
# Note: The -i flag shows response headers. Look for "Mcp-Session-Id: <uuid>" in the headers.
# Save this session ID for subsequent requests.

# Step 2: Send initialized notification (no response expected)
curl -X POST https://airtable-mcp-production-2056.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "notifications/initialized",
    "params": {}
  }'

# Step 3: List tools
curl -X POST https://airtable-mcp-production-2056.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

### Test 2: List Your Bases (After Initialization)
```bash
# After initialization, call the tool
curl -X POST https://airtable-mcp-production-2056.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "list_bases",
      "arguments": {}
    }
  }'
```

## Step 7: Using in Make.com Scenarios

### Example Scenario: Query Airtable and Use in AI Agent

1. **HTTP Module** - Call MCP to list records:
   ```
   POST https://airtable-mcp-production-2056.up.railway.app/mcp
   Body: {
     "jsonrpc": "2.0",
     "id": 1,
     "method": "tools/call",
     "params": {
       "name": "list_records",
       "arguments": {
         "baseId": "{{your_base_id}}",
         "table": "Tasks",
         "maxRecords": 10
       }
     }
   }
   ```

2. **Parse JSON** - Extract the records from the response

3. **AI Agent Module** - Use the data:
   - Pass the Airtable records as context
   - Ask the AI to analyze or process the data
   - Use AI responses to update Airtable if needed

4. **HTTP Module** - Update Airtable (if needed):
   ```
   POST https://airtable-mcp-production-2056.up.railway.app/mcp
   Body: {
     "jsonrpc": "2.0",
     "id": 2,
     "method": "tools/call",
     "params": {
       "name": "update_record",
       "arguments": {
         "baseId": "{{your_base_id}}",
         "table": "Tasks",
         "recordId": "{{record_id}}",
         "fields": {
           "Status": "Completed"
         }
       }
     }
   }
   ```

## Troubleshooting

### Connection Issues

**502 Bad Gateway**
- Check if your Railway deployment is running
- Verify the health endpoint responds

**404 Not Found**
- Ensure you're using `/mcp` endpoint
- Check the URL is correct

**Authentication Errors**
- Verify `AIRTABLE_TOKEN` is set in Railway environment variables
- Check token has required scopes

### Response Format

All MCP responses follow JSON-RPC 2.0 format:

**Success Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Tool execution result..."
      }
    ]
  }
}
```

**Error Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": "Error details..."
  }
}
```

## Advanced: Webhook Integration

You can also set up webhooks in Make.com to receive notifications from Airtable:

1. Use the `create_webhook` tool to set up a webhook
2. Configure Make.com to receive webhook calls
3. Process webhook payloads in your scenarios

## Security Considerations

- Your Airtable token is stored securely in Railway (encrypted)
- The MCP server doesn't require additional authentication
- Consider adding API key authentication if exposing publicly
- Use HTTPS (already configured via Railway)

## Support

- **MCP Server Health**: `https://airtable-mcp-production-2056.up.railway.app/health`
- **Railway Logs**: Check Railway dashboard for server logs
- **Make.com Documentation**: [Make.com AI Agents](https://www.make.com/en/help/tools/ai-agents)

## Next Steps

1. Test the connection using the examples above
2. Create Make.com scenarios that leverage Airtable data
3. Build automated workflows combining AI and Airtable operations
4. Set up monitoring and error handling in your scenarios

Enjoy your integrated Airtable MCP server with Make.com! 🚀

