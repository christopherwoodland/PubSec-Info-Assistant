// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { useAuth } from '../auth/AuthContext';
import { createApiProxy } from '../api/authenticatedApi';

/**
 * Hook that provides API functions with automatic authentication
 * Falls back to non-authenticated versions if authentication is not available
 */
export const useApi = () => {
    const { isAuthenticated } = useAuth();
    
    // Create API proxy that uses authenticated versions when possible
    const api = createApiProxy(isAuthenticated);
    
    return api;
};

/**
 * Higher-order component that wraps API calls with authentication
 */
export const withAuthentication = <T extends any[], R>(
    authenticatedFn: (...args: T) => Promise<R>,
    fallbackFn?: (...args: T) => Promise<R>
) => {
    return async (...args: T): Promise<R> => {
        try {
            return await authenticatedFn(...args);
        } catch (error) {
            console.error('Authenticated API call failed:', error);
            
            // If we have a fallback function and the error might be auth-related, try it
            if (fallbackFn && (error as any)?.status === 401) {
                console.log('Attempting fallback API call');
                return await fallbackFn(...args);
            }
            
            throw error;
        }
    };
};

/**
 * Utility to check if the current authentication setup supports silent token acquisition
 */
export const checkAuthenticationCapabilities = async (): Promise<{
    hasAuthentication: boolean;
    hasValidTokens: boolean;
    supportsSilentAuth: boolean;
    errorMessage?: string;
}> => {
    try {
        // Check if we can get authentication info from App Service
        const appServiceResponse = await fetch('/.auth/me');
        const hasAppServiceAuth = appServiceResponse.ok;
        
        // Check if MSAL is properly configured
        const runtimeConfig = (window as any).__RUNTIME_CONFIG__;
        const hasMsalConfig = !!(runtimeConfig?.AZURE_CLIENT_ID || import.meta.env.VITE_AZURE_CLIENT_ID);
        
        return {
            hasAuthentication: hasAppServiceAuth || hasMsalConfig,
            hasValidTokens: hasAppServiceAuth, // App Service would have tokens if active
            supportsSilentAuth: hasMsalConfig, // MSAL supports silent auth
            errorMessage: !hasAppServiceAuth && !hasMsalConfig 
                ? 'No authentication configuration found' 
                : undefined
        };
    } catch (error) {
        return {
            hasAuthentication: false,
            hasValidTokens: false,
            supportsSilentAuth: false,
            errorMessage: `Authentication check failed: ${error}`
        };
    }
};

// Make this a module
export {};
