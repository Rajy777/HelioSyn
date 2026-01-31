import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isDemoMode } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, fullName: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Demo Mode: Skip auth
        if (isDemoMode) {
            setLoading(false);
            return;
        }

        // Check active session
        supabase!.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        if (isDemoMode) throw new Error('Auth disabled in Demo Mode');
        const { error } = await supabase!.auth.signInWithPassword({ email, password });
        if (error) throw error;
    };

    const signUp = async (email: string, password: string, fullName: string) => {
        if (isDemoMode) throw new Error('Auth disabled in Demo Mode');
        const { error } = await supabase!.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });
        if (error) throw error;
    };

    const signOut = async () => {
        if (isDemoMode) return;
        const { error } = await supabase!.auth.signOut();
        if (error) throw error;
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
