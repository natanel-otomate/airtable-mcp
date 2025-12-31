# Railway Deployment Guide

This guide will help you deploy the Airtable MCP server to Railway, the cheapest reliable hosting option at $5/month (includes $5 free credits monthly = effectively free for low usage).

## Prerequisites

- A Railway account ([railway.app](https://railway.app))
- Your Airtable Personal Access Token ([get it here](https://airtable.com/account))
- Your Airtable Base ID (optional - can be discovered via the `list_bases` tool)
- A GitHub account (recommended for automatic deployments)

## Step 1: Prepare Your Repository

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Add Railway deployment configuration"
   git push origin main
   ```

2. **Verify the following files exist**:
   - `Dockerfile` - Optimized for production builds
   - `railway.json` - Railway deployment configuration
   - `package.json` - Contains build scripts

## Step 2: Create Railway Project

1. **Sign in to Railway**: Go to [railway.app](https://railway.app) and sign in with GitHub

2. **Create a new project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `airtable-mcp` repository
   - Railway will automatically detect the Dockerfile

3. **Wait for initial deployment**: Railway will build and deploy your project automatically

## Step 3: Configure Environment Variables

1. **Open your Railway project** and navigate to the "Variables" tab

2. **Add the following required environment variables**:

   **Required:**
   - `AIRTABLE_PAT` or `AIRTABLE_TOKEN` - Your Airtable Personal Access Token
     - Get this from: https://airtable.com/account
     - Should start with `pat.`

   **Optional:**
   - `AIRTABLE_BASE_ID` - Your default Airtable Base ID
     - Get this from your Airtable base URL: `https://airtable.com/[BASE_ID]/...`
     - If not set, you can use the `list_bases` tool to discover bases
   - `PORT` - Railway auto-assigns this, but you can set it to `8080` as a fallback
   - `LOG_LEVEL` - Set to `info`, `warn`, `error`, or `debug` (default: `info`)

3. **Alternative environment variable names** (the server supports multiple):
   - Token: `AIRTABLE_PAT`, `AIRTABLE_TOKEN`, `AIRTABLE_API_TOKEN`, or `AIRTABLE_API_KEY`
   - Base ID: `AIRTABLE_BASE_ID`, `AIRTABLE_DEFAULT_BASE`, or `AIRTABLE_BASE`

4. **Security Note**: Railway automatically encrypts all environment variables and never exposes them in logs

## Step 4: Get Your Deployment URL

1. **Find your public URL**:
   - In Railway, go to your service
   - Click on the "Settings" tab
   - Under "Domains", you'll see your Railway-provided domain
   - It will look like: `https://your-app-name.up.railway.app`

2. **Test the health endpoint**:
   - Visit: `https://your-app-name.up.railway.app/health`
   - You should see: `{"status":"ok","version":"3.2.8"}`

3. **MCP endpoint**: Your MCP server will be available at:
   - `https://your-app-name.up.railway.app/mcp` or
   - `https://your-app-name.up.railway.app/`

## Step 5: Configure Your MCP Client

Since the server runs in HTTP mode when `PORT` is set, you'll connect via HTTP instead of stdio.

### For Cursor

1. **Open Cursor Settings**
2. **Navigate to Features** → **MCP Servers** → **Add new MCP server**
3. **Configure as follows**:
   - **Name**: `airtable` (or any name you prefer)
   - **Type**: `http` (if available) or use the URL directly
   - **URL**: `https://your-app-name.up.railway.app/mcp`

   If your MCP client supports HTTP transport:
   ```json
   {
     "mcpServers": {
       "airtable": {
         "url": "https://your-app-name.up.railway.app/mcp"
       }
     }
   }
   ```

### For Claude Desktop

Edit your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "airtable": {
      "url": "https://your-app-name.up.railway.app/mcp"
    }
  }
}
```

**Note**: Some MCP clients may not support HTTP transport yet. If your client only supports stdio:
- You can run the server locally, OR
- Use a local proxy that converts HTTP to stdio

## Step 6: Verify and Test

1. **Health Check**:
   ```bash
   curl https://your-app-name.up.railway.app/health
   ```
   Should return: `{"status":"ok","version":"3.2.8"}`

2. **Test MCP Connection**:
   - Restart your MCP client (Cursor, Claude Desktop, etc.)
   - Try asking: "List my Airtable bases" or "Show me the tables in my base"
   - Check the Railway logs for any errors

3. **Monitor Logs**:
   - In Railway, go to your service
   - Click on the "Deployments" tab
   - Click on the latest deployment to view logs
   - Check for any startup errors or connection issues

## Troubleshooting

### Server Not Starting

- **Check Railway logs**: Look for build or runtime errors
- **Verify environment variables**: Ensure `AIRTABLE_PAT` or `AIRTABLE_TOKEN` is set correctly
- **Check build process**: Ensure TypeScript compiles successfully (check `npm run build` output)

### Connection Refused

- **Verify the URL**: Make sure you're using the correct Railway domain
- **Check health endpoint**: Visit `/health` to confirm the server is running
- **Review logs**: Check Railway logs for any port binding issues

### Invalid Token Errors

- **Verify token format**: Should start with `pat.`
- **Check token permissions**: Ensure your token has the required scopes:
  - `data.records:read`
  - `data.records:write`
  - `schema.bases:read`
  - `schema.bases:write` (optional)
  - `webhook:manage` (optional)
- **Check for extra whitespace**: Copy the token carefully without extra spaces

### Base Not Found

- **Verify Base ID**: Check that your `AIRTABLE_BASE_ID` is correct
- **Use list_bases tool**: If Base ID is not set, use the `list_bases` tool to discover accessible bases
- **Check token permissions**: Ensure your token has access to the specified base

## Cost Optimization

- **Railway Free Credits**: $5/month includes $5 free credits (covers ~144 hours of runtime)
- **Monitor Usage**: Check your Railway dashboard regularly to track usage
- **The $5 free credits typically cover most MCP server usage patterns**
- **Set up usage alerts**: Railway can notify you if you approach your credit limit

## Automatic Deployments

Railway automatically deploys when you push to your connected GitHub repository:

1. **Push to main branch**: Railway will automatically rebuild and redeploy
2. **Check deployment status**: Go to the "Deployments" tab in Railway
3. **View build logs**: Click on any deployment to see build and runtime logs

## Custom Domain (Optional)

If you want to use a custom domain:

1. Go to your Railway service → Settings → Domains
2. Click "Generate Domain" or "Add Custom Domain"
3. Follow Railway's instructions for DNS configuration
4. Update your MCP client configuration with the new domain

## Security Best Practices

- ✅ **Never commit `.env` files** or tokens to git
- ✅ **Use Railway's built-in secrets management** for environment variables
- ✅ **Railway automatically encrypts secrets** and never exposes them in logs
- ✅ **Rotate your Airtable tokens** regularly
- ✅ **Use the least privilege principle** - only grant necessary scopes to your token

## Support

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **Project Issues**: [GitHub Issues](https://github.com/rashidazarang/airtable-mcp/issues)

## Next Steps

Once deployed, you can:
- Use all 33 MCP tools to interact with your Airtable data
- Set up webhooks for real-time notifications
- Perform batch operations on multiple records
- Use AI-powered analytics and insights

Enjoy your hosted Airtable MCP server! 🚀

