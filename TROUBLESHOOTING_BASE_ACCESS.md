# Troubleshooting Base Access Issues

## Problem: "Authentication failed for base" even though list_bases shows the base

### Root Cause Analysis

When `list_bases` works but accessing a specific base fails, it indicates:

1. ✅ Token is valid (can list bases)
2. ✅ Token has `schema.bases:read` scope (can call `/v0/meta/bases`)
3. ❌ Token cannot access specific base (fails on `/v0/meta/bases/{baseId}`)

### Most Common Causes

#### 1. Token Not Updated in Railway (90% of cases)

**Symptoms:**
- `list_bases` works
- Direct base access fails
- You just regenerated the token

**Solution:**
1. Go to Railway → Your Project → Variables
2. Check `AIRTABLE_PAT` or `AIRTABLE_TOKEN` value
3. Update it with the new token (copy the entire token, ~82 characters)
4. **CRITICAL**: Restart the Railway deployment
   - Go to Railway → Your Service → "..." menu → "Restart"
   - Or trigger a redeploy by pushing a commit
5. Wait 30-60 seconds for restart to complete
6. Try again

#### 2. Governance Restriction

**Check:**
```bash
# In Railway, check if these environment variables are set:
AIRTABLE_ALLOWED_BASES
AIRTABLE_BASE_ALLOWLIST
AIRTABLE_DEFAULT_BASE
AIRTABLE_BASE_ID
```

**Solution:**
- If `AIRTABLE_ALLOWED_BASES` or `AIRTABLE_BASE_ALLOWLIST` is set, ensure your base ID is included
- Or remove these variables to allow all bases
- Restart Railway after changes

#### 3. Token Access Configuration

**Verify in Airtable:**
1. Go to https://airtable.com/create/tokens
2. Open your token
3. In "Access" section, verify:
   - The base "MrJapan (Heb) 🇮🇱" (ID: `appQVIZeJSCJmmtpA`) is explicitly listed
   - Not just the workspace, but the specific base
4. If missing, click "+ Add a base" and add it
5. Save the token
6. Update Railway and restart

#### 4. Token Scope Issues

**Required Scopes:**
- `schema.bases:read` - for describe/list operations
- `data.records:read` - for query operations  
- `data.records:write` - for create/update operations

**Verify:**
- Check token scopes in Airtable token settings
- All three should be enabled

### Diagnostic Steps

#### Step 1: Check Railway Logs

After the error occurs, check Railway logs for:
- `Airtable authentication/authorization error` entries
- Full error response from Airtable
- Request ID for Airtable support

#### Step 2: Test Token Directly

Use curl to test the token:

```bash
# Test list_bases (should work)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.airtable.com/v0/meta/bases

# Test specific base (might fail)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.airtable.com/v0/meta/bases/appQVIZeJSCJmmtpA
```

#### Step 3: Verify Environment Variables

In Railway, check:
- `AIRTABLE_PAT` or `AIRTABLE_TOKEN` is set
- Token value matches the one in Airtable
- No extra spaces or line breaks
- Token starts with `pat.`

### Enhanced Error Messages

After the latest update, error messages now include:
- Full Airtable error response
- Airtable's specific error message
- Request ID for support

Check Railway logs for these details when the error occurs.

### Still Not Working?

1. **Check Railway Logs** for the full error response
2. **Verify token format** - should be ~82 characters, start with `pat.`
3. **Test with curl** to isolate if it's a server issue or token issue
4. **Contact Airtable Support** with the request ID from error logs

