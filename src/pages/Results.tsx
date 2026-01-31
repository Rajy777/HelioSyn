
import { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { runSmartSimulation } from '../lib/simulation';
import PredictionChart from '../components/PredictionChart';
import { predictionService } from '../lib/predictionService';
import type { PredictionResult } from '../lib/predictionService';


const Results = () => {

    const { metrics, baselineMetrics, data } = useMemo(() => {
        const storedData = localStorage.getItem('helioSynData');
        const parsed = storedData ? JSON.parse(storedData) : { files: {}, appliances: [] };

        // 1. Run Smart Simulation
        const metrics = runSmartSimulation(parsed.appliances, parsed.files, parsed.config || {}, true);

        // 2. Run Baseline Simulation (FCFS)
        const baselineMetrics = runSmartSimulation(parsed.appliances, parsed.files, parsed.config || {}, false);

        // 3. Save results for AI analysis
        localStorage.setItem('smartResults', JSON.stringify(metrics));
        localStorage.setItem('baselineResults', JSON.stringify(baselineMetrics));

        // Format for Recharts (Hour by Hour)
        const data = metrics.logs.time.map((t, i) => ({
            hour: t,
            // Smart
            solar: metrics.logs.solar[i],
            grid: metrics.logs.grid[i],
            temp: metrics.logs.temp[i],
            cooling: metrics.logs.cooling[i],
            cost: metrics.logs.cost ? metrics.logs.cost[i] : 0,
            // Baseline (for comparison)
            gridBase: baselineMetrics.logs.grid[i],
            tempBase: baselineMetrics.logs.temp[i],
            costBase: baselineMetrics.logs.cost ? baselineMetrics.logs.cost[i] : 0
        }));

        return { metrics, baselineMetrics, data };
    }, []);

    // ML Prediction State
    const [mlPredictions, setMlPredictions] = useState<PredictionResult[]>([]);
    const [mlLoading, setMlLoading] = useState(false);
    const [mlError, setMlError] = useState<string | null>(null);

    // Load ML predictions on mount with context from simulation
    useEffect(() => {
        const loadPredictions = async () => {
            setMlLoading(true);
            try {
                // Get last 24h of simulation data for context
                const solarLogs = metrics.logs.solar;
                const tempLogs = metrics.logs.temp;
                const timeLogs = metrics.logs.time;

                // We need the last values for context (Lags: 1, 2, 3, 24)
                const lastIdx = solarLogs.length - 1;
                const lastKnownValues = [
                    solarLogs[lastIdx] || 0,
                    solarLogs[lastIdx - 1] || 0,
                    solarLogs[lastIdx - 2] || 0,
                    solarLogs[lastIdx - 23] || 0
                ];

                // Also pass some weather context if available
                const weatherContext = timeLogs.map((t, i) => ({
                    timestamp: t,
                    value: tempLogs[i]
                })).slice(-24); // Last 24 hours of weather

                // Get last timestamp for seasonal alignment (try to find a real date string)
                const storedData = localStorage.getItem('helioSynData');
                const parsed = storedData ? JSON.parse(storedData) : null;
                const solarFile = parsed?.files?.solar;
                let lastTimestamp = undefined;

                if (solarFile && solarFile.length > 0) {
                    // Try to find the most recent valid timestamp in the uploaded data
                    const latestPoint = solarFile[solarFile.length - 1];
                    if (latestPoint.timestamp && String(latestPoint.timestamp).includes('-')) {
                        lastTimestamp = String(latestPoint.timestamp);
                    }
                }

                // Fallback to hour number only if no real date found (though backend is now robust)
                if (!lastTimestamp) {
                    lastTimestamp = timeLogs[lastIdx] !== null ? String(timeLogs[lastIdx]) : undefined;
                }

                const response = await predictionService.predict24Hours(weatherContext, lastKnownValues, lastTimestamp);
                if (response.success && response.predictions) {
                    setMlPredictions(response.predictions);
                    setMlError(null);
                } else {
                    setMlError(response.error || 'Failed to generate predictions');
                }
            } catch (error) {
                console.error('Failed to load ML predictions:', error);
                setMlError('Machine Learning API is not responding. Ensure the backend is running.');
            } finally {
                setMlLoading(false);
            }
        };
        loadPredictions();
    }, [metrics]);

    // Delta Calculations
    const energySavings = baselineMetrics.energy.grid - metrics.energy.grid;
    const carbonSavings = baselineMetrics.carbon - metrics.carbon;
    const slaImprovement = baselineMetrics.sla.violations - metrics.sla.violations;

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white">Optimization Results</h1>
                    <p className="text-slate-400 mt-2">AI-driven schedule analysis vs Baseline (FIFO).</p>
                </div>
                <div className="flex gap-2">
                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-sm border border-green-500/20">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                        Smart Scheduler Active
                    </span>
                </div>
            </header>

            {/* Impact Analysis Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 backdrop-blur-sm">
                    <h3 className="text-green-400 text-sm font-medium mb-2">Net Grid Savings</h3>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-white max-w-full truncate" title={energySavings.toFixed(1)}>{energySavings.toFixed(1)}</span>
                        <span className="text-sm text-slate-400 mb-1">kWh</span>
                    </div>
                    <p className="text-xs text-green-300/60 mt-2">
                        Reduced grid import by {baselineMetrics.energy.grid > 0 ? ((energySavings / baselineMetrics.energy.grid) * 100).toFixed(1) : 0}% vs Baseline.
                    </p>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 backdrop-blur-sm">
                    <h3 className="text-cyan-400 text-sm font-medium mb-2">Carbon Avoided</h3>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-white max-w-full truncate" title={carbonSavings.toFixed(1)}>{carbonSavings.toFixed(1)}</span>
                        <span className="text-sm text-slate-400 mb-1">kgCO₂</span>
                    </div>
                    <p className="text-xs text-cyan-300/60 mt-2">
                        Equivalent to driving a car for {(carbonSavings * 4).toFixed(0)} km.
                    </p>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 backdrop-blur-sm">
                    <h3 className="text-purple-400 text-sm font-medium mb-2">Reliability Gain</h3>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-white">
                            {slaImprovement >= 0 ? `+${slaImprovement}` : slaImprovement}
                        </span>
                        <span className="text-sm text-slate-400 mb-1">Missed Deadlines</span>
                    </div>
                    <p className="text-xs text-purple-300/60 mt-2">
                        Smart Scheduler prevented {slaImprovement} potential SLA violations.
                    </p>
                </div>
            </div>

            {/* Comparison Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-md">
                    <h3 className="text-lg font-semibold text-white mb-6">Grid Dependency Comparison</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorGridOld" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorGridNew" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="hour" stroke="#64748b" tickFormatter={(val) => `${Math.floor(val)}:00`} />
                            <YAxis stroke="#64748b" />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                            <Legend />
                            <Area type="monotone" dataKey="gridBase" name="Baseline Grid (FIFO)" stroke="#94a3b8" strokeDasharray="5 5" fill="none" />
                            <Area type="monotone" dataKey="grid" name="Smart Grid (Optimized)" stroke="#3b82f6" fill="url(#colorGridNew)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-md">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-lg font-semibold text-white">Thermal Safety Comparison</h3>
                        <div className="group relative">
                            <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs cursor-help border border-slate-700">?</div>
                            <div className="absolute right-0 top-6 w-64 p-4 bg-slate-950/95 border border-slate-700 rounded-xl text-xs text-slate-300 hidden group-hover:block z-50 shadow-xl backdrop-blur-xl">
                                <span className="text-white font-semibold block mb-1">Why is Optimized hotter?</span>
                                Running jobs during the day utilizes Solar energy but faces higher ambient temperatures. Baseline runs at night (cooler) but relies on Grid energy. The AI trades small thermal increases (within safety limits) for massive energy savings.
                            </div>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height="90%">
                        <AreaChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="hour" stroke="#64748b" tickFormatter={(val) => `${Math.floor(val)}:00`} />
                            <YAxis stroke="#64748b" domain={[20, 50]} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                            <Legend />

                            {/* Baseline Temp */}
                            <Area type="monotone" dataKey="tempBase" name="Baseline Temp" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" fill="none" />

                            {/* Smart Temp */}
                            <Area type="monotone" dataKey="temp" name="Smart Temp (AI)" stroke="#10b981" strokeWidth={2} fillOpacity={0.1} fill="#10b981" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Secondary Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                {/* Cost Analysis */}
                <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-md">
                    <h3 className="text-lg font-semibold text-white mb-6">Cumulative Grid Cost ($)</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <AreaChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="hour" stroke="#64748b" tickFormatter={(val) => `${Math.floor(val)}:00`} />
                            <YAxis stroke="#64748b" />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                            <Legend />
                            {/* We simulate cost as Grid kWh * 0.15 (Base) + Peak pricing? Just simple linear for now */}
                            <Area type="monotone" dataKey="costBase" name="Baseline Cost" stroke="#9ca3af" fill="transparent" strokeDasharray="5 5" />
                            <Area type="monotone" dataKey="cost" name="Smart Cost" stroke="#f59e0b" fill="url(#colorSolar)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ML Solar Prediction Visualization */}
            {mlPredictions.length > 0 && (
                <PredictionChart
                    predictions={mlPredictions}
                    title="XGBoost Solar Power Forecast (Next 24 Hours)"
                    showConfidence={true}
                />
            )}

            {mlLoading && (
                <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-md text-center py-12">
                    <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400">Consulting XGBoost for solar forecast...</p>
                </div>
            )}

            {mlError && !mlLoading && (
                <div className="p-6 rounded-3xl bg-red-500/10 border border-red-500/20 backdrop-blur-md text-center">
                    <p className="text-red-400 font-medium mb-1">Prediction Error</p>
                    <p className="text-red-400/60 text-sm">{mlError}</p>
                </div>
            )}

            {/* Schedule Timeline */}
            <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-md">
                <h3 className="text-lg font-semibold text-white mb-6">Detailed Job Report</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="text-xs uppercase bg-slate-900/50 text-slate-300">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Job Name</th>
                                <th className="px-4 py-3">Priority</th>
                                <th className="px-4 py-3">Duration</th>
                                <th className="px-4 py-3">Smart Start</th>
                                <th className="px-4 py-3">Baseline Start</th>
                                <th className="px-4 py-3 rounded-r-lg">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {metrics.timeline.map((event: any, idx: number) => {
                                const baselineEvent = baselineMetrics?.timeline?.find((e: any) => e.name === event.name);
                                return (
                                    <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                                        <td className="px-4 py-3 font-medium text-white">{event.name}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs ${event.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                                                event.priority === 'medium' ? 'bg-orange-500/10 text-orange-400' :
                                                    'bg-green-500/10 text-green-400'
                                                }`}>
                                                {event.priority}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{event.duration.toFixed(1)}h</td>
                                        <td className="px-4 py-3 text-cyan-400">
                                            {event.start !== null ? `${event.start.toFixed(2)}h` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {baselineEvent?.start !== null && baselineEvent?.start !== undefined
                                                ? `${baselineEvent.start.toFixed(2)}h`
                                                : '--'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={event.status === 'DONE' ? 'text-green-400' : 'text-red-400'}>{event.status}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Results;
