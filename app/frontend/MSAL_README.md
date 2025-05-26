# MSAL Silent Authentication Implementation

This document describes the Microsoft MSAL (Microsoft Authentication Library) implementation for silent login in the Information Assistant application.

## Overview

The implementation provides seamless authentication without pop-up interruptions, allowing users to authenticate silently in the background. This is particularly useful for enterprise applications where users are already authenticated to their Azure AD tenant.

## Architecture

### Components

1. **AuthContext.tsx** - React context provider that manages MSAL instance and authentication state
2. **authConfig.ts** - MSAL configuration with runtime loading capabilities
3. **apiClient.ts** - Enhanced API client that automatically includes authentication headers
4. **AuthenticatedApp.tsx** - HOC that handles authentication flow and loading states
5. **runtimeConfig.ts** - Runtime configuration loader that supports multiple configuration sources

### Key Features

- **Silent Token Acquisition**: Automatically acquires tokens without user interaction
- **Automatic Token Refresh**: Handles token expiration and refresh seamlessly
- **Fallback Authentication**: Falls back to interactive authentication when silent fails
- **Runtime Configuration**: Supports configuration from multiple sources (App Service, environment variables, build-time)
- **Backward Compatibility**: Existing API calls continue to work with optional authentication enhancement

## Configuration

### Azure AD App Registration

The application expects an Azure AD app registration with the following configuration:

1. **Application Type**: Single Page Application (SPA)
2. **Redirect URIs**: `https://your-app-domain.com/` (adjust based on your deployment)
3. **Implicit Grant**: Enable ID tokens and access tokens
4. **API Permissions**: 
   - Microsoft Graph: `User.Read` (delegated)
   - Your API: `access_as_user` (delegated, if using custom scopes)

### Runtime Configuration Options

The application supports multiple configuration sources in order of preference:

#### 1. App Service Authentication (Recommended for Azure deployments)
When deployed to Azure App Service with authentication enabled, the application automatically detects and uses the existing authentication configuration.

#### 2. Runtime Environment Variables
Set these in your runtime environment:
```javascript
window.__RUNTIME_CONFIG__ = {
    AZURE_CLIENT_ID: 'your-client-id',
    AZURE_TENANT_ID: 'your-tenant-id',
    AZURE_AUTHORITY: 'https://login.microsoftonline.com/your-tenant-id',
    API_SCOPES: ['User.Read', 'api://your-client-id/access_as_user']
};
```

#### 3. Build-time Environment Variables
Set these in your build environment:
```bash
VITE_AZURE_CLIENT_ID=your-client-id
VITE_AZURE_TENANT_ID=your-tenant-id
VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/your-tenant-id
```

#### 4. Server-side Template Replacement
The `index.html` file includes placeholders that can be replaced at server start:
```html
<script>
    window.__RUNTIME_CONFIG__ = {
        AZURE_CLIENT_ID: '${AZURE_CLIENT_ID}',
        AZURE_TENANT_ID: '${AZURE_TENANT_ID}',
        AZURE_AUTHORITY: '${AZURE_AUTHORITY}'
    };
</script>
```

## Usage

### Basic Authentication Check
```typescript
import { useAuth } from './auth/AuthContext';

function MyComponent() {
    const { isAuthenticated, accounts, login, logout } = useAuth();
    
    if (!isAuthenticated) {
        return <button onClick={login}>Sign In</button>;
    }
    
    return (
        <div>
            <p>Welcome, {accounts[0].name}!</p>
            <button onClick={logout}>Sign Out</button>
        </div>
    );
}
```

### Making Authenticated API Calls
```typescript
import { useApi } from './hooks/useApi';

function MyComponent() {
    const api = useApi();
    
    const handleApiCall = async () => {
        try {
            const response = await api.chatApi(chatRequest, signal);
            // Handle response
        } catch (error) {
            // Handle error
        }
    };
    
    return <button onClick={handleApiCall}>Make API Call</button>;
}
```

### Manual Token Acquisition
```typescript
import { useAuth } from './auth/AuthContext';

function MyComponent() {
    const { acquireTokenSilently } = useAuth();
    
    const getToken = async () => {
        const token = await acquireTokenSilently(['User.Read']);
        console.log('Access token:', token);
    };
    
    return <button onClick={getToken}>Get Token</button>;
}
```

## Silent Authentication Flow

1. **Application Startup**:
   - MSAL initializes with runtime configuration
   - Checks for cached tokens
   - Automatically signs in users with valid cached tokens

2. **API Calls**:
   - Automatically acquires access tokens before making API calls
   - Uses cached tokens when available
   - Refreshes tokens silently when expired

3. **Token Refresh**:
   - Monitors token expiration
   - Automatically refreshes tokens in the background
   - Falls back to interactive authentication if silent refresh fails

## Troubleshooting

### Common Issues

1. **"Client ID not configured"**
   - Ensure AZURE_CLIENT_ID is set in runtime configuration
   - Check that the Azure AD app registration exists

2. **"Silent authentication failed"**
   - User might need to sign in interactively first
   - Check that the user has access to the application
   - Verify Azure AD app registration permissions

3. **"Token acquisition failed"**
   - Check network connectivity
   - Verify Azure AD app registration configuration
   - Ensure user has required permissions

### Debug Mode

Enable debug logging by adding the AuthStatus component to your layout:
```typescript
import { AuthStatus } from './components/AuthStatus/AuthStatus';

function Layout() {
    return (
        <div>
            {/* Your app content */}
            <AuthStatus showDetails={true} />
        </div>
    );
}
```

### Authentication Capabilities Check

Use the utility function to check authentication setup:
```typescript
import { checkAuthenticationCapabilities } from './hooks/useApi';

const capabilities = await checkAuthenticationCapabilities();
console.log('Auth capabilities:', capabilities);
```

## Security Considerations

1. **Token Storage**: Tokens are stored in sessionStorage for better security
2. **HTTPS Required**: MSAL requires HTTPS in production
3. **CSRF Protection**: Uses standard OAuth2/OIDC flows with state validation
4. **Token Scope**: Requests minimal required scopes for least privilege access

## Deployment

### Azure App Service

1. Enable App Service Authentication
2. Configure Azure AD provider
3. Set authentication to "Allow unauthenticated requests"
4. The application will automatically detect and use App Service authentication

### Custom Deployment

1. Set environment variables for Azure AD configuration
2. Ensure HTTPS is enabled
3. Configure proper redirect URIs in Azure AD app registration
4. Deploy application with runtime configuration

## Migration from Existing Authentication

The implementation is designed to be backward compatible:

1. Existing API calls continue to work without modification
2. Authentication is added progressively
3. Original authentication methods remain functional as fallbacks
4. Gradual migration path available through the `useApi` hook

## Performance Considerations

1. **Token Caching**: Tokens are cached to minimize authentication requests
2. **Silent Refresh**: Background token refresh prevents interruptions
3. **Lazy Loading**: MSAL configuration is loaded asynchronously
4. **Network Optimization**: Minimal additional network requests for authentication

## Support

For issues related to MSAL authentication:

1. Check the browser console for detailed error messages
2. Verify Azure AD app registration configuration
3. Test authentication capabilities using the debug utilities
4. Review the authentication flow logs in the developer tools
