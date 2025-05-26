// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import React from 'react';
import { useAuth } from '../../auth/AuthContext';

interface AuthStatusProps {
    showDetails?: boolean;
}

/**
 * Component to display authentication status for debugging purposes
 */
export const AuthStatus: React.FC<AuthStatusProps> = ({ showDetails = false }) => {
    const { isAuthenticated, accounts, isLoading, error } = useAuth();

    if (!showDetails) {
        return null;
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            padding: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 9999,
            maxWidth: '300px'
        }}>
            <div><strong>Auth Status</strong></div>
            <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
            <div>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
            <div>Accounts: {accounts.length}</div>
            {accounts.length > 0 && (
                <div>User: {accounts[0].name || accounts[0].username}</div>
            )}
            {error && (
                <div style={{ color: 'red' }}>Error: {error}</div>
            )}
        </div>
    );
}

// Make this a module
export {};
