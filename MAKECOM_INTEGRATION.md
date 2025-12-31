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

### Option A: If Make.com Supports Direct MCP Integration

1. In your AI Agent settings, look for **"MCP Servers"** or **"Tools"** section
2. Click **"Add MCP Server"** or **"Add Tool"**
3. Configure the connection:
   - **Name**: `Airtable MCP`
   - **URL**: `https://airtable-mcp-production-2056.up.railway.app/mcp`
   - **Protocol**: HTTP/JSON-RPC 2.0
   - **Authentication**: None (your Airtable token is already in the server)

### Option B: Using HTTP Module (If Direct MCP Not Supported)

If Make.com doesn't have native MCP support, you can use the HTTP module to call MCP tools:

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

**Important**: MCP requires an initialization handshake before using tools.

### Step 1: Initialize Connection
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

### Step 2: Send Initialized Notification
After receiving the initialize response, send:
```json
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized",
  "params": {}
}
```

**Note**: This is a notification (no `id` field) and doesn't return a response.

### Step 3: Now You Can Use Tools
After initialization, you can call tools.

### List Available Tools
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

### Call a Tool (Example: List Bases)
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
```bash
# Step 1: Initialize
curl -X POST https://airtable-mcp-production-2056.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
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

