# MSAL Configuration Fix

## Problem
The Information Assistant application was experiencing an authentication error:
```
Azure Client ID is not configured. Please set AZURE_CLIENT_ID in your environment or App Service configuration.
```

This occurred because the frontend MSAL (Microsoft Authentication Library) configuration was not properly receiving the Azure AD client ID and tenant ID that were available in the backend.

## Root Cause
1. Terraform properly creates Azure AD applications and generates client IDs via `module.entraObjects.azure_ad_web_app_client_id`
2. The backend receives the client ID through the `aadClientId` parameter in web app configuration
3. However, these values were not exposed as environment variables for the backend application to access
4. The frontend had a comprehensive configuration loading system but no backend API endpoint to retrieve MSAL settings

## Solution Overview
The fix involves three main components:

### 1. Backend Changes (`app/backend/app.py`)
- Added `AZURE_CLIENT_ID` and `AZURE_TENANT_ID` to the ENV dictionary
- Created new `/getMsalConfig` endpoint that returns MSAL configuration:
  ```json
  {
    "clientId": "azure-ad-client-id",
    "tenantId": "azure-tenant-id", 
    "authority": "https://login.microsoftonline.com/tenant-id"
  }
  ```

### 2. Infrastructure Changes (`infra/main.tf`)
- Added `AZURE_CLIENT_ID` and `AZURE_TENANT_ID` to the web app's environment variables:
  ```hcl
  AZURE_CLIENT_ID = module.entraObjects.azure_ad_web_app_client_id
  AZURE_TENANT_ID = data.azurerm_client_config.current.tenant_id
  ```

### 3. Frontend Changes (`app/frontend/src/config/runtimeConfig.ts`)
- Enhanced the configuration loader to fetch MSAL config from the backend API as the first priority
- Added fallback chain: Backend API → App Service Auth → Runtime Config → Environment Variables → Defaults

## Implementation Details

### Backend Endpoint
```python
@app.get("/getMsalConfig")
async def get_msal_config():
    """Get MSAL (Microsoft Authentication Library) configuration"""
    tenant_id = ENV.get("AZURE_TENANT_ID")
    client_id = ENV.get("AZURE_CLIENT_ID")
    authority = f"https://login.microsoftonline.com/{tenant_id}" if tenant_id else None
    
    response = {
        "clientId": client_id,
        "tenantId": tenant_id,
        "authority": authority
    }
    return response
```

### Frontend Configuration Loader
```typescript
// First priority: Backend API
const backendResponse = await fetch('/getMsalConfig');
if (backendResponse.ok) {
    const backendConfig = await backendResponse.json();
    config.AZURE_CLIENT_ID = backendConfig.clientId;
    config.AZURE_TENANT_ID = backendConfig.tenantId;
    config.AZURE_AUTHORITY = backendConfig.authority;
}
```

### Terraform Environment Variables
```hcl
appSettings = {
  # ... existing settings ...
  AZURE_CLIENT_ID = module.entraObjects.azure_ad_web_app_client_id
  AZURE_TENANT_ID = data.azurerm_client_config.current.tenant_id
}
```

## Configuration Priority Chain
The frontend now loads MSAL configuration in this order:
1. **Backend API** (`/getMsalConfig`) - NEW, highest priority
2. **App Service Authentication** (`/.auth/me`) - existing
3. **Runtime Configuration** (`window.__RUNTIME_CONFIG__`) - existing  
4. **Build-time Environment Variables** (`import.meta.env.VITE_*`) - existing
5. **Default Values** - existing fallback

## Benefits
- **Centralized Configuration**: MSAL settings come from the same source that configures App Service authentication
- **No Manual Configuration**: No need to manually set environment variables - everything flows from Terraform
- **Backward Compatibility**: Existing configuration sources still work as fallbacks
- **Better Error Handling**: Clear error messages when configuration is missing
- **Development Friendly**: Easy to test and debug configuration loading

## Testing
The solution can be tested by:
1. Deploying the updated Terraform configuration
2. Verifying the backend endpoint returns proper configuration: `GET /getMsalConfig`
3. Checking browser console for configuration loading logs
4. Confirming that the authentication flow works end-to-end

## Files Changed
- `app/backend/app.py` - Added MSAL config endpoint and environment variables
- `infra/main.tf` - Added Azure AD configuration to app settings
- `app/frontend/src/config/runtimeConfig.ts` - Enhanced configuration loader

## Deployment Requirements
1. Apply Terraform changes to update web app environment variables
2. Redeploy backend container with new endpoint
3. Redeploy frontend container with updated configuration loader

No breaking changes - the solution maintains backward compatibility with existing configuration methods.
