// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import React, { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { apiClient } from './apiClient';

interface AuthenticatedAppProps {
    children: React.ReactNode;
}

/**
 * HOC that handles authentication setup and silent login
 */
export const AuthenticatedApp: React.FC<AuthenticatedAppProps> = ({ children }) => {
    const { instance, isAuthenticated, isLoading, accounts, login, error } = useAuth();

    useEffect(() => {
        // Set up the API client with MSAL instance when available
        if (instance) {
            apiClient.setMsalInstance(instance);
        }
    }, [instance]);

    useEffect(() => {
        // Attempt silent login when MSAL is initialized but user is not authenticated
        const attemptSilentLogin = async () => {
            if (instance && !isAuthenticated && !isLoading) {
                try {
                    const currentAccounts = instance.getAllAccounts();
                    if (currentAccounts.length > 0) {
                        // User has cached tokens, they should be automatically signed in
                        // The AuthProvider should handle this, but let's ensure it's working
                        console.log('User has cached tokens, should be authenticated');
                    } else {
                        // Check if we're coming from App Service authentication
                        try {
                            const response = await fetch('/.auth/me');
                            if (response.ok) {
                                const authData = await response.json();
                                if (authData && authData.length > 0) {
                                    // User is authenticated via App Service, but we need to get MSAL tokens
                                    console.log('User authenticated via App Service, attempting MSAL token acquisition');
                                    // This would typically require a more complex flow to exchange the App Service token
                                    // For now, we'll rely on the silent authentication in MSAL
                                }
                            }
                        } catch (appServiceError) {
                            console.log('App Service authentication check failed, proceeding with MSAL-only auth');
                        }
                    }
                } catch (error) {
                    console.error('Silent login attempt failed:', error);
                }
            }
        };

        attemptSilentLogin();
    }, [instance, isAuthenticated, isLoading]);

    // Show loading state while MSAL is initializing
    if (isLoading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                flexDirection: 'column'
            }}>
                <div>Loading authentication...</div>
                {error && (
                    <div style={{ color: 'red', marginTop: '10px' }}>
                        Authentication error: {error}
                    </div>
                )}
            </div>
        );
    }

    // If MSAL is initialized but user is not authenticated, show login prompt
    if (instance && !isAuthenticated && accounts.length === 0) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                flexDirection: 'column'
            }}>
                <h2>Authentication Required</h2>
                <p>Please sign in to access the Information Assistant.</p>
                <button 
                    onClick={login}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        backgroundColor: '#0078d4',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Sign In
                </button>
                {error && (
                    <div style={{ color: 'red', marginTop: '10px' }}>
                        {error}
                    </div>
                )}
            </div>
        );
    }

    // User is authenticated, render the application
    return <>{children}</>;
};

/**
 * Hook to check if the current user is authenticated and get user info
 */
export const useAuthenticatedUser = () => {
    const { accounts, isAuthenticated, acquireTokenSilently } = useAuth();
    
    const user = accounts.length > 0 ? accounts[0] : null;
    
    return {
        isAuthenticated,
        user,
        getToken: acquireTokenSilently
    };
};

// Make this a module
export {};
