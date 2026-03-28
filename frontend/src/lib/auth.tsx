import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from './api';

interface User {
    id: string;
    email: string;
    full_name: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<User>;
    signup: (email: string, password: string, fullName: string) => Promise<void>;
    logout: () => void;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Load persisted auth on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('cogni_token');
        const savedUser = localStorage.getItem('cogni_user');
        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const response = await authAPI.login({ email, password });
        const { token: newToken, user: authUser } = response.data;
        
        setToken(newToken);
        setUser(authUser);
        localStorage.setItem('cogni_token', newToken);
        localStorage.setItem('cogni_user', JSON.stringify(authUser));
        
        // Ensure starting fresh on Dashboard
        localStorage.removeItem('current_document');
        return authUser;
    }, []);

    const signup = useCallback(async (email: string, password: string, fullName: string) => {
        await authAPI.signup({ email, password, full_name: fullName });
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('cogni_token');
        localStorage.removeItem('cogni_user');
        localStorage.removeItem('current_document'); // Clear document on logout
    }, []);

    const isAdmin = user?.role === 'admin';

    return (
        <AuthContext.Provider value={{ user, token, loading, login, signup, logout, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
