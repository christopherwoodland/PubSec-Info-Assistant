// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PublicClientApplication } from '@azure/msal-browser';

export {}; // Make this a module

interface AuthenticatedFetchOptions extends RequestInit {
    scopes?: string[];
    skipAuth?: boolean;
}

interface ApiConfig {
    msalInstance: PublicClientApplication | null;
    defaultScopes: string[];
}

class AuthenticatedApiClient {
    private msalInstance: PublicClientApplication | null = null;
    private defaultScopes: string[] = ['User.Read'];

    constructor(config?: Partial<ApiConfig>) {
        if (config?.msalInstance) {
            this.msalInstance = config.msalInstance;
        }
        if (config?.defaultScopes) {
            this.defaultScopes = config.defaultScopes;
        }
    }

    public setMsalInstance(instance: PublicClientApplication): void {
        this.msalInstance = instance;
    }

    private async getAccessToken(scopes: string[] = this.defaultScopes): Promise<string | null> {
        if (!this.msalInstance) {
            console.warn('MSAL instance not available, proceeding without authentication');
            return null;
        }

        try {
            const accounts = this.msalInstance.getAllAccounts();
            if (accounts.length === 0) {
                console.warn('No authenticated accounts found');
                return null;
            }

            const silentRequest = {
                scopes: scopes,
                account: accounts[0]
            };

            const response = await this.msalInstance.acquireTokenSilent(silentRequest);
            return response.accessToken;
        } catch (error) {
            console.error('Failed to acquire token silently:', error);
            
            // Try interactive token acquisition as fallback
            try {
                const accounts = this.msalInstance.getAllAccounts();
                if (accounts.length > 0) {
                    const response = await this.msalInstance.acquireTokenPopup({
                        scopes: scopes,
                        account: accounts[0]
                    });
                    return response.accessToken;
                }
            } catch (interactiveError) {
                console.error('Interactive token acquisition also failed:', interactiveError);
            }
            
            return null;
        }
    }

    public async authenticatedFetch(
        url: string, 
        options: AuthenticatedFetchOptions = {}
    ): Promise<Response> {
        const { scopes = this.defaultScopes, skipAuth = false, ...fetchOptions } = options;        // Prepare headers
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(fetchOptions.headers as Record<string, string> || {})
        };

        // Add authentication header if not skipped
        if (!skipAuth) {
            const token = await this.getAccessToken(scopes);
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        // Make the authenticated request
        const response = await fetch(url, {
            ...fetchOptions,
            headers
        });

        // Handle token expiration
        if (response.status === 401 && !skipAuth) {
            console.warn('Received 401, attempting token refresh');
            
            // Try to get a fresh token
            const freshToken = await this.getAccessToken(scopes);
            if (freshToken) {
                headers['Authorization'] = `Bearer ${freshToken}`;
                
                // Retry the request with fresh token
                return fetch(url, {
                    ...fetchOptions,
                    headers
                });
            }
        }

        return response;
    }

    // Convenience methods for common HTTP verbs
    public async get(url: string, options?: AuthenticatedFetchOptions): Promise<Response> {
        return this.authenticatedFetch(url, { ...options, method: 'GET' });
    }

    public async post(url: string, body?: any, options?: AuthenticatedFetchOptions): Promise<Response> {
        return this.authenticatedFetch(url, {
            ...options,
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined
        });
    }

    public async put(url: string, body?: any, options?: AuthenticatedFetchOptions): Promise<Response> {
        return this.authenticatedFetch(url, {
            ...options,
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined
        });
    }

    public async delete(url: string, options?: AuthenticatedFetchOptions): Promise<Response> {
        return this.authenticatedFetch(url, { ...options, method: 'DELETE' });
    }
}

// Create a singleton instance
export const apiClient = new AuthenticatedApiClient();

// Export the class for testing or custom instances
export { AuthenticatedApiClient };
export type { AuthenticatedFetchOptions };
