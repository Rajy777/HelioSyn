
import { useEffect } from 'react';
import { ArrowRight, Sun, Zap, TrendingUp, ShieldCheck, Battery, Cloud, DollarSign, Leaf, BarChart3, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../animations.css';

const Home = () => {
    useEffect(() => {
        // Import animations CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/src/animations.css';
        document.head.appendChild(link);
        return () => {
            document.head.removeChild(link);
        };
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-cyan-500 selection:text-cyan-950 overflow-x-hidden">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {/* Moving Glowing Sun */}
                <div className="moving-sun"></div>

                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow"></div>
                <div className="absolute top-[50%] left-[50%] w-[30%] h-[30%] bg-purple-500/5 blur-[100px] rounded-full mix-blend-screen"></div>
            </div>

            {/* Navigation */}
            <nav className="relative z-50 px-6 py-6 flex justify-between items-center max-w-7xl mx-auto">
                <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="p-2 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-lg group-hover:scale-110 transition-transform duration-300 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                        <Sun className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        Helio<span className="text-cyan-400">Syn</span>
                    </span>
                </div>
                <div className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
                    <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
                    <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">How it Works</a>
                    <a href="#impact" className="hover:text-cyan-400 transition-colors">Impact</a>
                </div>
                <Link to="/dashboard" className="relative group px-6 py-2.5 rounded-full bg-slate-800/50 border border-slate-700 hover:border-cyan-500/50 transition-all overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative z-10 flex items-center gap-2 text-sm font-semibold group-hover:text-cyan-400 transition-colors">
                        Launch App <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                </Link>
            </nav>

            {/* Hero Section with 3D Animation */}
            <main className="relative z-10 pt-12 pb-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Left: Text Content */}
                        <div className="text-left lg:pr-12">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-950/30 border border-cyan-800/50 mb-8 animate-fade-in-up">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                                <span className="text-xs font-medium text-cyan-300 tracking-wide uppercase">Live Optimization Active</span>
                            </div>

                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 tracking-tight">
                                Maximize Every <br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
                                    Ray of Sunshine
                                </span>
                            </h1>

                            <p className="text-lg md:text-xl text-slate-400 mb-8 leading-relaxed">
                                AI-powered forecasting and inland for modern facilities. Reduce costs by <span className="text-cyan-400 font-semibold">60%</span> while maximizing solar self-consumption.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link to="/dashboard" className="px-8 py-4 bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl font-bold text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2">
                                    Try Demo
                                </Link>
                                <a href="#how-it-works" className="px-8 py-4 bg-slate-800/50 border border-slate-700 rounded-xl font-semibold text-slate-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-all duration-300 flex items-center justify-center gap-2">
                                    Learn More <ArrowRight className="w-5 h-5" />
                                </a>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-6 mt-12">
                                {[
                                    { value: "60%", label: "Cost Saved" },
                                    { value: "85%", label: "Solar Usage" },
                                    { value: "24/7", label: "Monitoring" }
                                ].map((stat, idx) => (
                                    <div key={idx}>
                                        <div className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">{stat.value}</div>
                                        <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: 3D Animated Device Mockup */}
                        <div className="relative flex items-center justify-center lg:justify-end">
                            {/* Animated Solar Rays */}
                            <div className="solar-rays absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

                            {/* Glowing Orb */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-orange-400/20 to-yellow-400/20 rounded-full blur-3xl animate-pulse-slow"></div>

                            {/* Device Mockup */}
                            <div className="device-mockup relative z-10">
                                <div className="relative w-[400px] h-[500px] rounded-3xl overflow-hidden shadow-2xl shadow-cyan-500/20 border-4 border-cyan-500/30 glow-border">
                                    {/* Screen Content */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 p-8">
                                        {/* Mini Dashboard Preview */}
                                        <div className="text-center mb-6">
                                            <div className="text-sm text-slate-500 mb-2">HelioSyn Dashboard</div>
                                            <div className="text-3xl font-bold text-white">Solar Forecast</div>
                                        </div>

                                        {/* Circular Progress */}
                                        <div className="relative w-48 h-48 mx-auto mb-8">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle cx="96" cy="96" r="88" stroke="#1e293b" strokeWidth="12" fill="none" />
                                                <circle
                                                    cx="96"
                                                    cy="96"
                                                    r="88"
                                                    stroke="url(#gradient)"
                                                    strokeWidth="12"
                                                    fill="none"
                                                    strokeDasharray="552"
                                                    strokeDashoffset="138"
                                                    strokeLinecap="round"
                                                    className="transition-all duration-1000"
                                                />
                                                <defs>
                                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stopColor="#22d3ee" />
                                                        <stop offset="100%" stopColor="#3b82f6" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <Sun className="w-12 h-12 text-orange-400 mb-2" />
                                                <div className="text-3xl font-bold text-white">75%</div>
                                                <div className="text-xs text-slate-500">Efficiency</div>
                                            </div>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                                                <div className="text-xs text-slate-500 mb-1">Solar Gen</div>
                                                <div className="text-lg font-bold text-cyan-400">8.2 kW</div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                                                <div className="text-xs text-slate-500 mb-1">Grid Use</div>
                                                <div className="text-lg font-bold text-blue-400">2.1 kW</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Particles */}
                            <div className="absolute top-1/4 right-1/4 w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
                            <div className="absolute bottom-1/4 left-1/4 w-2 h-2 rounded-full bg-blue-400 animate-ping" style={{ animationDelay: '1s' }}></div>
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div id="features" className="max-w-6xl mx-auto mt-32">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Powerful Features</h2>
                        <p className="text-slate-400 text-lg">Everything you need to master solar energy</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: TrendingUp, title: "Solar Forecasting", desc: "Predict generation with ML-powered weather analysis." },
                            { icon: Zap, title: "Smart Scheduling", desc: "Shift loads to peak solar hours automatically." },
                            { icon: ShieldCheck, title: "Explainable AI", desc: "Understand every decision the system makes." },
                            { icon: Battery, title: "Battery Support", desc: "Optimize charge/discharge cycles for storage." },
                            { icon: DollarSign, title: "Cost Analysis", desc: "Track savings with Time-of-Use pricing models." },
                            { icon: BarChart3, title: "Real-time Analytics", desc: "Monitor energy flows and temperature in real-time." }
                        ].map((feature, idx) => (
                            <div key={idx} className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm hover:bg-slate-800/50 hover:border-cyan-500/30 transition-all duration-300 group">
                                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mb-6 group-hover:bg-cyan-500/20 transition-colors">
                                    <feature.icon className="w-6 h-6 text-slate-300 group-hover:text-cyan-400 transition-colors" />
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* How It Works */}
                <div id="how-it-works" className="max-w-5xl mx-auto mt-32">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">How It Works</h2>
                        <p className="text-slate-400 text-lg">Three simple steps to solar optimization</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { step: "01", icon: Cloud, title: "Upload Data", desc: "Import solar, weather, and load history via CSV." },
                            { step: "02", icon: Zap, title: "AI Optimizes", desc: "Smart scheduler analyzes and creates optimal plan." },
                            { step: "03", icon: BarChart3, title: "Track Savings", desc: "Monitor energy, cost, and carbon reductions." }
                        ].map((item, idx) => (
                            <div key={idx} className="relative">
                                <div className="text-6xl font-bold text-slate-800/50 mb-4">{item.step}</div>
                                <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800">
                                    <item.icon className="w-10 h-10 text-cyan-400 mb-4" />
                                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                                    <p className="text-slate-400">{item.desc}</p>
                                </div>
                                {idx < 2 && (
                                    <div className="hidden md:block absolute top-1/2 right-[-2rem] w-8 h-0.5 bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Impact Section */}
                <div id="impact" className="max-w-4xl mx-auto mt-32">
                    <div className="p-12 rounded-3xl bg-gradient-to-br from-cyan-950/30 to-blue-950/30 border border-cyan-800/30 backdrop-blur-xl">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">Real-World Impact</h2>
                            <p className="text-slate-400">Measurable results for your facility</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { icon: DollarSign, value: "₹12,000", label: "Avg. Monthly Savings" },
                                { icon: Leaf, value: "2.5 tons", label: "CO₂ Reduced/Year" },
                                { icon: Clock, value: "< 5 min", label: "Setup Time" }
                            ].map((impact, idx) => (
                                <div key={idx} className="text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
                                        <impact.icon className="w-8 h-8 text-cyan-400" />
                                    </div>
                                    <div className="text-2xl font-bold text-white mb-1">{impact.value}</div>
                                    <div className="text-sm text-slate-400">{impact.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="max-w-4xl mx-auto mt-32 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Optimize?</h2>
                    <p className="text-xl text-slate-400 mb-8">Start reducing costs and carbon emissions today.</p>
                    <Link to="/dashboard" className="inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-white text-lg shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 transition-all duration-300">
                        <Zap className="w-6 h-6" /> Launch HelioSyn
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-slate-800 mt-32 py-12 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Sun className="w-5 h-5 text-cyan-400" />
                        <span className="font-semibold">HelioSyn</span>
                        <span className="text-slate-600">© 2026</span>
                    </div>
                    <div className="text-sm text-slate-500">
                        Powered by AI • Built for Sustainability
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
