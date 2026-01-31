
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isDemoMode } from '../lib/supabase';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export default function Auth() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { signIn, signUp } = useAuth();

    // Demo Mode: Skip to dashboard
    if (isDemoMode) {
        navigate('/dashboard');
        return null;
    }

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                await signIn(email, password);
            } else {
                await signUp(email, password, fullName);
            }
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Auth error:', err);
            setError(err.message || 'An error occurred during authentication');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 blur-[150px] rounded-full mix-blend-screen"></div>
            </div>

            <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative z-10">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-white mb-2">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-slate-400">
                        {isLogin ? 'Enter your credentials to access HelioSyn' : 'Start your solar intelligence journey'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                            </div>
                            <input
                                type="email"
                                required
                                className="w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                            </div>
                            <input
                                type="password"
                                required
                                className="w-full pl-11 pr-4 py-3.5 bg-slate-950/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-slate-400 hover:text-cyan-400 text-sm font-medium transition-colors"
                    >
                        {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                    </button>
                </div>
            </div>
        </div>
    );
}
