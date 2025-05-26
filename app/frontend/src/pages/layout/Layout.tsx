// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Outlet, NavLink, Link } from "react-router-dom";
import openai from "../../assets/openai.svg";
import { WarningBanner } from "../../components/WarningBanner/WarningBanner";
import styles from "./Layout.module.css";
import { Title } from "../../components/Title/Title";
import { getFeatureFlags, GetFeatureFlagsResponse } from "../../api";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { AuthenticatedApp } from "../../auth/AuthenticatedApp";

export const Layout = () => {
    const [featureFlags, setFeatureFlags] = useState<GetFeatureFlagsResponse | null>(null);
    const { accounts, logout, isAuthenticated } = useAuth();
    const user = accounts.length > 0 ? accounts[0] : null;

    async function fetchFeatureFlags() {
        try {
            const fetchedFeatureFlags = await getFeatureFlags();
            setFeatureFlags(fetchedFeatureFlags);
        } catch (error) {
            // Handle the error here
            console.log(error);
        }
    }

    useEffect(() => {
        fetchFeatureFlags();
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <AuthenticatedApp>
            <div className={styles.layout}>
                <header className={styles.header} role="banner">
                    <WarningBanner />
                    <div className={styles.headerContainer}>
                        <div className={styles.headerTitleContainer}>
                            <img src={openai} alt="Azure OpenAI" className={styles.headerLogo} />
                            <h3 className={styles.headerTitle}><Title /></h3>
                        </div>
                        <nav>
                            <ul className={styles.headerNavList}>
                                <li>
                                    <NavLink to="/" className={({ isActive }) => (isActive ? styles.headerNavPageLinkActive : styles.headerNavPageLink)}>
                                        Chat
                                    </NavLink>
                                </li>
                                <li className={styles.headerNavLeftMargin}>
                                    <NavLink to="/content" className={({ isActive }) => (isActive ? styles.headerNavPageLinkActive : styles.headerNavPageLink)}>
                                        Manage Content
                                    </NavLink>
                                </li>
                                {featureFlags?.ENABLE_MATH_ASSISTANT &&
                                    <li className={styles.headerNavLeftMargin}>
                                        <NavLink to="/tutor" className={({ isActive }) => (isActive ? styles.headerNavPageLinkActive : styles.headerNavPageLink)}>
                                        Math Assistant
                                        <br />  
                                        <p className={styles.centered}>(preview)</p>
                                        </NavLink>
                                    </li>
                                }
                                {featureFlags?.ENABLE_TABULAR_DATA_ASSISTANT &&
                                    <li className={styles.headerNavLeftMargin}>
                                        <NavLink to="/tda" className={({ isActive }) => (isActive ? styles.headerNavPageLinkActive : styles.headerNavPageLink)}>
                                        Tabular Data Assistant
                                        <br />  
                                        <p className={styles.centered}>(preview)</p>
                                        </NavLink>
                                    </li>
                                }
                                {/* User info and logout */}
                                {isAuthenticated && user && (
                                    <li className={styles.headerNavLeftMargin} style={{ marginLeft: 'auto' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ color: 'white', fontSize: '14px' }}>
                                                {user.name || user.username}
                                            </span>
                                            <button 
                                                onClick={handleLogout}
                                                style={{
                                                    padding: '5px 10px',
                                                    fontSize: '12px',
                                                    backgroundColor: 'transparent',
                                                    color: 'white',
                                                    border: '1px solid white',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Sign Out
                                            </button>
                                        </div>
                                    </li>
                                )}
                        </ul>
                        </nav>
                    </div>
                </header>

                <Outlet />

                <footer>
                    <WarningBanner />
                </footer>
            </div>
        </AuthenticatedApp>
    );
};
