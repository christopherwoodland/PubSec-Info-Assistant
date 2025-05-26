// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Configuration, PopupRequest, RedirectRequest, SilentRequest } from "@azure/msal-browser";
import { loadRuntimeConfig } from "../config/runtimeConfig";

// MSAL configuration
export const msalConfig: Configuration = {
    auth: {
        clientId: "", // This will be populated from environment or runtime configuration
        authority: "https://login.microsoftonline.com/common", // This will be updated with tenant-specific authority
        redirectUri: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
        navigateToLoginRequestUrl: false,
    },
    cache: {
        cacheLocation: "sessionStorage", // Use sessionStorage for better security
        storeAuthStateInCookie: false, // Set to true for IE11 or Edge legacy support
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case 0: // Error
                        console.error(message);
                        return;
                    case 1: // Warning
                        console.warn(message);
                        return;
                    case 2: // Info
                        console.info(message);
                        return;
                    case 3: // Verbose
                        console.debug(message);
                        return;
                }
            }
        }
    }
};

// Add scopes for API access
export const loginRequest: RedirectRequest = {
    scopes: ["User.Read"],
    prompt: "select_account"
};

// Scopes for silent token acquisition
export const silentRequest: SilentRequest = {
    scopes: ["User.Read"],
    forceRefresh: false // Set to true to skip cache and force token refresh
};

// API scopes for accessing backend services
export const apiRequest: SilentRequest = {
    scopes: [], // This will be populated with API-specific scopes
    forceRefresh: false
};

// Graph API scopes
export const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
    graphScopes: ["User.Read"]
};

// Configuration loader to populate clientId and authority from runtime config
export const loadMsalConfig = async (): Promise<Configuration> => {
    try {
        // Load configuration from runtime sources
        const runtimeConfig = await loadRuntimeConfig();
        
        // Update MSAL config with loaded values
        if (runtimeConfig.AZURE_CLIENT_ID) {
            msalConfig.auth.clientId = runtimeConfig.AZURE_CLIENT_ID;
        }
        
        if (runtimeConfig.AZURE_AUTHORITY) {
            msalConfig.auth.authority = runtimeConfig.AZURE_AUTHORITY;
        }
        
        // Update API scopes
        if (runtimeConfig.API_SCOPES && runtimeConfig.API_SCOPES.length > 0) {
            apiRequest.scopes = runtimeConfig.API_SCOPES;
            silentRequest.scopes = runtimeConfig.API_SCOPES.includes('User.Read') 
                ? runtimeConfig.API_SCOPES 
                : ['User.Read', ...runtimeConfig.API_SCOPES];
        }
        
        console.log('MSAL configuration loaded successfully');
        
    } catch (error) {
        console.error('Failed to load runtime configuration:', error);
        // Continue with default configuration
    }
    
    return msalConfig;
};
