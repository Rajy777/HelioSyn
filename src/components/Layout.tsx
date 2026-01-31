
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Zap, BrainCircuit, LogOut, Sun } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Layout = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();

    const navItems = [
        { icon: LayoutDashboard, label: 'Input Data', path: '/dashboard' },
        { icon: Zap, label: 'Control Center', path: '/results' },
        { icon: BrainCircuit, label: 'AI Insights', path: '/ai-insights' },
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen bg-slate-950 flex text-slate-100">
            {/* Sidebar */}
            <aside className="w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl hidden md:flex flex-col p-6 fixed h-full z-20">
                <div className="flex items-center gap-3 mb-12">
                    <div className="p-2 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-lg shadow-lg shadow-cyan-500/20">
                        <Sun className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold font-sans tracking-tight">Helio<span className="text-cyan-400">Syn</span></span>
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 border border-cyan-500/20'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                <span className="font-medium text-sm">{item.label}</span>
                                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div>}
                            </Link>
                        );
                    })}
                </nav>

                <button
                    onClick={() => window.location.href = '/'}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors mt-auto"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium text-sm">Exit App</span>
                </button>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-64 p-8 relative overflow-hidden">
                {/* Background Ambient */}
                <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-cyan-900/10 to-transparent pointer-events-none z-0" />

                <div className="relative z-10 max-w-6xl mx-auto animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
