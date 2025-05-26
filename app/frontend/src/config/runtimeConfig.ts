// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Runtime configuration loader for MSAL
 * This handles loading configuration from various sources in order of preference:
 * 1. App Service authentication (/.auth/me)
 * 2. Environment variables injected at runtime
 * 3. Build-time environment variables
 * 4. Default values
 */

export interface RuntimeConfig {
    AZURE_CLIENT_ID?: string;
    AZURE_TENANT_ID?: string;
    AZURE_AUTHORITY?: string;
    API_SCOPES?: string[];
}

interface AppServiceAuthInfo {
    client_id?: string;
    authority?: string;
    access_token?: string;
    id_token?: string;
    user_claims?: any[];
}

let cachedConfig: RuntimeConfig | null = null;

export const loadRuntimeConfig = async (): Promise<RuntimeConfig> => {
    // Return cached config if available
    if (cachedConfig) {
        return cachedConfig;
    }

    const config: RuntimeConfig = {};

    try {
        // First, try to get configuration from backend API
        console.log('Attempting to fetch MSAL config from backend API...');
        const backendResponse = await fetch('/getMsalConfig', {
            method: 'GET',
            credentials: 'include'
        });

        if (backendResponse.ok) {
            const backendConfig = await backendResponse.json();
            console.log('Found backend MSAL configuration');
            
            config.AZURE_CLIENT_ID = backendConfig.clientId;
            config.AZURE_TENANT_ID = backendConfig.tenantId;
            config.AZURE_AUTHORITY = backendConfig.authority;
        } else {
            console.log('Backend MSAL config not available, status:', backendResponse.status);
        }
    } catch (error) {
        console.log('Backend MSAL config fetch failed:', error);
    }

    try {
        // Try to get configuration from App Service authentication
        const response = await fetch('/.auth/me', {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            const authData: AppServiceAuthInfo[] = await response.json();
            if (authData && authData.length > 0) {
                const authInfo = authData[0];
                console.log('Found App Service authentication info');
                
                config.AZURE_CLIENT_ID = config.AZURE_CLIENT_ID || authInfo.client_id;
                if (authInfo.authority) {
                    config.AZURE_AUTHORITY = authInfo.authority;
                    // Extract tenant ID from authority URL
                    const tenantMatch = authInfo.authority.match(/\/([0-9a-f-]{36}|common|organizations|consumers)\/?$/i);
                    if (tenantMatch) {
                        config.AZURE_TENANT_ID = tenantMatch[1];
                    }
                }
            }
        }
    } catch (error) {
        console.log('App Service authentication not available or failed:', error);
    }

    // Fallback to runtime-injected configuration
    const runtimeConfig = (window as any).__RUNTIME_CONFIG__;
    if (runtimeConfig) {
        config.AZURE_CLIENT_ID = config.AZURE_CLIENT_ID || runtimeConfig.AZURE_CLIENT_ID;
        config.AZURE_TENANT_ID = config.AZURE_TENANT_ID || runtimeConfig.AZURE_TENANT_ID;
        config.AZURE_AUTHORITY = config.AZURE_AUTHORITY || runtimeConfig.AZURE_AUTHORITY;
        config.API_SCOPES = config.API_SCOPES || runtimeConfig.API_SCOPES;
    }

    // Fallback to environment variables (build-time)
    config.AZURE_CLIENT_ID = config.AZURE_CLIENT_ID || import.meta.env.VITE_AZURE_CLIENT_ID;
    config.AZURE_TENANT_ID = config.AZURE_TENANT_ID || import.meta.env.VITE_AZURE_TENANT_ID;
    config.AZURE_AUTHORITY = config.AZURE_AUTHORITY || import.meta.env.VITE_AZURE_AUTHORITY;

    // Set default authority if tenant ID is available but authority is not
    if (config.AZURE_TENANT_ID && !config.AZURE_AUTHORITY) {
        config.AZURE_AUTHORITY = `https://login.microsoftonline.com/${config.AZURE_TENANT_ID}`;
    }

    // Default authority if nothing else is available
    if (!config.AZURE_AUTHORITY) {
        config.AZURE_AUTHORITY = 'https://login.microsoftonline.com/common';
    }

    // Default API scopes
    if (!config.API_SCOPES) {
        config.API_SCOPES = ['User.Read'];
        
        // Add API-specific scopes if we have a client ID
        if (config.AZURE_CLIENT_ID) {
            config.API_SCOPES.push(`api://${config.AZURE_CLIENT_ID}/access_as_user`);
        }
    }

    // Cache the configuration
    cachedConfig = config;

    console.log('Loaded runtime configuration:', {
        clientId: config.AZURE_CLIENT_ID ? '***configured***' : 'not set',
        tenantId: config.AZURE_TENANT_ID ? '***configured***' : 'not set', 
        authority: config.AZURE_AUTHORITY,
        scopes: config.API_SCOPES
    });

    return config;
};

/**
 * Clear the cached configuration (useful for testing or when configuration changes)
 */
export const clearConfigCache = (): void => {
    cachedConfig = null;
};

/**
 * Get the cached configuration synchronously (returns null if not loaded yet)
 */
export const getCachedConfig = (): RuntimeConfig | null => {
    return cachedConfig;
};
