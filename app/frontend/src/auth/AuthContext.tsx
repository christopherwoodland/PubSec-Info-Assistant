// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
    PublicClientApplication, 
    InteractionRequiredAuthError,
    AccountInfo,
    AuthenticationResult,
    SilentRequest
} from '@azure/msal-browser';
import { msalConfig, silentRequest, apiRequest } from './authConfig';

interface AuthContextType {
    instance: PublicClientApplication | null;
    accounts: AccountInfo[];
    isAuthenticated: boolean;
    isLoading: boolean;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    acquireTokenSilently: (scopes?: string[]) => Promise<string | null>;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [instance, setInstance] = useState<PublicClientApplication | null>(null);
    const [accounts, setAccounts] = useState<AccountInfo[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);    useEffect(() => {
        const initializeMsal = async () => {
            try {
                setIsLoading(true);
                setError(null);
                
                // Load configuration dynamically and wait for it to complete
                const { loadMsalConfig } = await import('./authConfig');
                const configResult = await loadMsalConfig();
                
                // Validate that we have the required configuration
                if (!configResult.auth.clientId) {
                    throw new Error('Azure Client ID is not configured. Please set AZURE_CLIENT_ID in your environment or App Service configuration.');
                }
                
                console.log('Creating MSAL instance with configuration:', {
                    clientId: configResult.auth.clientId ? '***configured***' : 'missing',
                    authority: configResult.auth.authority,
                    redirectUri: configResult.auth.redirectUri
                });
                
                // Create MSAL instance with loaded configuration
                const msalInstance = new PublicClientApplication(configResult);
                
                // Initialize MSAL
                await msalInstance.initialize();
                
                setInstance(msalInstance);
                
                // Get accounts from cache
                const currentAccounts = msalInstance.getAllAccounts();
                setAccounts(currentAccounts);
                setIsAuthenticated(currentAccounts.length > 0);
                
                // Handle redirect response if coming from login redirect
                const response = await msalInstance.handleRedirectPromise();
                if (response) {
                    setAccounts(msalInstance.getAllAccounts());
                    setIsAuthenticated(true);
                }
                
                console.log('MSAL initialization completed successfully');
                
            } catch (err) {
                console.error('MSAL initialization error:', err);
                setError(err instanceof Error ? err.message : 'Failed to initialize authentication');
            } finally {
                setIsLoading(false);
            }
        };

        initializeMsal();
    }, []);

    const login = async (): Promise<void> => {
        if (!instance) {
            throw new Error('MSAL instance not initialized');
        }

        try {
            setError(null);
            
            // Try silent login first
            const currentAccounts = instance.getAllAccounts();
            if (currentAccounts.length > 0) {
                // User is already signed in
                setAccounts(currentAccounts);
                setIsAuthenticated(true);
                return;
            }

            // If no accounts, proceed with interactive login
            await instance.loginRedirect({
                scopes: ['User.Read'],
                prompt: 'select_account'
            });
            
        } catch (err) {
            console.error('Login error:', err);
            setError('Login failed');
            throw err;
        }
    };

    const logout = async (): Promise<void> => {
        if (!instance) {
            throw new Error('MSAL instance not initialized');
        }

        try {
            setError(null);
            const currentAccounts = instance.getAllAccounts();
            
            if (currentAccounts.length > 0) {
                await instance.logoutRedirect({
                    account: currentAccounts[0],
                    postLogoutRedirectUri: window.location.origin
                });
            }
            
            setAccounts([]);
            setIsAuthenticated(false);
            
        } catch (err) {
            console.error('Logout error:', err);
            setError('Logout failed');
            throw err;
        }
    };

    const acquireTokenSilently = async (scopes: string[] = ['User.Read']): Promise<string | null> => {
        if (!instance || !isAuthenticated || accounts.length === 0) {
            return null;
        }

        try {
            setError(null);
            
            const silentRequestWithScopes: SilentRequest = {
                ...silentRequest,
                scopes: scopes,
                account: accounts[0]
            };

            const response: AuthenticationResult = await instance.acquireTokenSilent(silentRequestWithScopes);
            return response.accessToken;
            
        } catch (err) {
            if (err instanceof InteractionRequiredAuthError) {
                // If silent token acquisition fails, try interactive method
                try {
                    const response = await instance.acquireTokenPopup({
                        scopes: scopes,
                        account: accounts[0]
                    });
                    return response.accessToken;
                } catch (interactiveError) {
                    console.error('Interactive token acquisition failed:', interactiveError);
                    setError('Failed to acquire token');
                    return null;
                }
            } else {
                console.error('Silent token acquisition error:', err);
                setError('Failed to acquire token silently');
                return null;
            }
        }
    };

    const contextValue: AuthContextType = {
        instance,
        accounts,
        isAuthenticated,
        isLoading,
        login,
        logout,
        acquireTokenSilently,
        error
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Hook for getting tokens for API calls
export const useApiToken = (scopes: string[] = ['User.Read']) => {
    const { acquireTokenSilently, isAuthenticated } = useAuth();
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const getToken = async (): Promise<string | null> => {
        if (!isAuthenticated) {
            return null;
        }

        setIsLoading(true);
        try {
            const accessToken = await acquireTokenSilently(scopes);
            setToken(accessToken);
            return accessToken;
        } catch (error) {
            console.error('Error acquiring token:', error);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            getToken();
        }
    }, [isAuthenticated]);

    return { token, isLoading, getToken };
};

// Make this a module
export {};
