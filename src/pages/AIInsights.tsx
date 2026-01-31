
import { useState, useEffect } from 'react';
import { Brain, Sparkles, AlertCircle, CheckCircle, Info, Lightbulb, Send, Loader } from 'lucide-react';
import { generateInsights, askAI, isAIEnabled, type AIInsight } from '../lib/geminiAI';
import { predictionService } from '../lib/predictionService';

const AIInsights = () => {
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [askingAI, setAskingAI] = useState(false);

    useEffect(() => {
        loadInsights();
    }, []);

    const loadInsights = async () => {
        setLoading(true);
        try {
            // Get simulation results from localStorage
            const smartResults = localStorage.getItem('smartResults');
            const baselineResults = localStorage.getItem('baselineResults');

            if (smartResults && baselineResults) {
                const smart = JSON.parse(smartResults);
                const baseline = JSON.parse(baselineResults);

                // Get ML metrics if available
                let mlMetrics;
                try {
                    const statusResponse = await predictionService.getModelStatus();
                    if (statusResponse.success && statusResponse.data?.is_trained) {
                        mlMetrics = statusResponse.data.metrics;
                    }
                } catch (e) {
                    console.warn('Could not fetch ML status for insights');
                }

                const aiInsights = await generateInsights(smart, baseline, mlMetrics);
                setInsights(aiInsights);
            } else {
                // No simulation data available
                setInsights([{
                    type: 'info',
                    title: 'No Simulation Data',
                    message: 'Run a simulation from the Dashboard to generate AI insights.',
                    priority: 1
                }]);
            }
        } catch (error) {
            console.error('Error loading insights:', error);
            setInsights([{
                type: 'warning',
                title: 'Error Loading Insights',
                message: 'Failed to generate AI insights. Please try again.',
                priority: 1
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleAskAI = async () => {
        if (!question.trim()) return;

        setAskingAI(true);
        setAnswer('');

        try {
            const smartResults = localStorage.getItem('smartResults');
            const baselineResults = localStorage.getItem('baselineResults');

            const context = smartResults && baselineResults
                ? `Smart Scheduler: ${smartResults}\nBaseline: ${baselineResults}`
                : 'No simulation data available';

            const response = await askAI(question, context);
            setAnswer(response);
        } catch (error) {
            setAnswer('Sorry, I encountered an error. Please try again.');
        } finally {
            setAskingAI(false);
        }
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'success': return CheckCircle;
            case 'warning': return AlertCircle;
            case 'tip': return Lightbulb;
            default: return Info;
        }
    };

    const getColorForType = (type: string) => {
        switch (type) {
            case 'success': return 'border-green-500/30 bg-green-500/10 text-green-400';
            case 'warning': return 'border-orange-500/30 bg-orange-500/10 text-orange-400';
            case 'tip': return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400';
            default: return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <header>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-lg">
                        <Brain className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-400">
                        AI-Powered Insights
                    </h1>
                    {isAIEnabled && (
                        <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-xs text-green-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Gemini AI Active
                        </span>
                    )}
                </div>
                <p className="text-slate-400 mt-2">
                    {isAIEnabled
                        ? 'Real-time analysis powered by Google Gemini AI'
                        : 'Rule-based insights (Add VITE_GEMINI_API_KEY to enable AI)'}
                </p>
            </header>

            {/* AI Insights Grid */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader className="w-8 h-8 text-purple-400 animate-spin" />
                    </div>
                ) : (
                    insights.map((insight, idx) => {
                        const Icon = getIconForType(insight.type);
                        const colorClass = getColorForType(insight.type);

                        return (
                            <div
                                key={idx}
                                className={`p-6 rounded-2xl border backdrop-blur-md transition-all duration-300 hover:scale-[1.02] ${colorClass}`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-2 rounded-lg bg-white/10">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-white mb-1">{insight.title}</h3>
                                        <p className="text-sm text-slate-300 leading-relaxed">{insight.message}</p>
                                    </div>
                                    <div className="text-xs font-mono text-slate-500">
                                        P{insight.priority}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Ask AI Section */}
            {isAIEnabled && (
                <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-md">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        Ask Gemini AI
                    </h3>

                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAskAI()}
                                placeholder="Ask about your simulation results..."
                                className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                            />
                            <button
                                onClick={handleAskAI}
                                disabled={askingAI || !question.trim()}
                                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold text-white hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {askingAI ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        Thinking...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Ask
                                    </>
                                )}
                            </button>
                        </div>

                        {answer && (
                            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <Brain className="w-5 h-5 text-purple-400 mt-0.5" />
                                    <p className="text-sm text-slate-300 leading-relaxed">{answer}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-slate-500">Suggested questions:</span>
                            {[
                                'How can I reduce costs further?',
                                'Why did the temperature spike?',
                                'When should I run my EV charger?'
                            ].map((q, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setQuestion(q)}
                                    className="px-3 py-1 bg-slate-800/50 border border-slate-700 rounded-full text-xs text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Refresh Button */}
            <button
                onClick={loadInsights}
                className="w-full py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-300 hover:border-purple-500/50 hover:text-purple-400 transition-colors flex items-center justify-center gap-2"
            >
                <Brain className="w-4 h-4" />
                Regenerate Insights
            </button>
        </div>
    );
};

export default AIInsights;
