import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, Brain, AlertCircle } from 'lucide-react';
import type { PredictionResult } from '../lib/predictionService';

interface PredictionChartProps {
    predictions: PredictionResult[];
    actualData?: { hour: number; power: number }[];
    title?: string;
    showConfidence?: boolean;
}

const PredictionChart: React.FC<PredictionChartProps> = ({
    predictions,
    actualData,
    title = 'Solar Power Predictions',
    showConfidence = true,
}) => {
    // Combine predictions with actual data
    const chartData = predictions.map((pred) => {
        const actual = actualData?.find((a) => a.hour === pred.hour);
        return {
            hour: pred.hour,
            predicted: pred.predicted_power,
            actual: actual?.power,
            lowerBound: pred.lower_bound,
            upperBound: pred.upper_bound,
        };
    });

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
                    <p className="text-white font-semibold mb-2">Hour {data.hour}:00</p>
                    <div className="space-y-1 text-sm">
                        <p className="text-cyan-400">
                            Predicted: <span className="font-mono">{data.predicted.toFixed(2)} kW</span>
                        </p>
                        {data.actual !== undefined && (
                            <p className="text-green-400">
                                Actual: <span className="font-mono">{data.actual.toFixed(2)} kW</span>
                            </p>
                        )}
                        {showConfidence && (
                            <p className="text-slate-400 text-xs">
                                Range: {data.lowerBound.toFixed(2)} - {data.upperBound.toFixed(2)} kW
                            </p>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    <h3 className="text-xl font-semibold text-white">{title}</h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <TrendingUp className="w-4 h-4" />
                    <span>XGBoost ML Model</span>
                </div>
            </div>

            {predictions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <AlertCircle className="w-12 h-12 mb-3" />
                    <p>No prediction data available</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={400}>
                    {showConfidence ? (
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis
                                dataKey="hour"
                                stroke="#94a3b8"
                                label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ paddingTop: '20px' }}
                                iconType="line"
                            />

                            {/* Confidence interval */}
                            <Area
                                type="monotone"
                                dataKey="upperBound"
                                stroke="none"
                                fill="url(#confidenceGradient)"
                                fillOpacity={1}
                                name="Confidence Interval"
                            />
                            <Area
                                type="monotone"
                                dataKey="lowerBound"
                                stroke="none"
                                fill="#0f172a"
                                fillOpacity={1}
                            />

                            {/* Predicted line */}
                            <Line
                                type="monotone"
                                dataKey="predicted"
                                stroke="#06b6d4"
                                strokeWidth={3}
                                dot={{ fill: '#06b6d4', r: 4 }}
                                name="Predicted Power"
                            />

                            {/* Actual line (if available) */}
                            {actualData && actualData.length > 0 && (
                                <Line
                                    type="monotone"
                                    dataKey="actual"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={{ fill: '#10b981', r: 3 }}
                                    name="Actual Power"
                                />
                            )}
                        </AreaChart>
                    ) : (
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis
                                dataKey="hour"
                                stroke="#94a3b8"
                                label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />

                            <Line
                                type="monotone"
                                dataKey="predicted"
                                stroke="#06b6d4"
                                strokeWidth={3}
                                dot={{ fill: '#06b6d4', r: 4 }}
                                name="Predicted Power"
                            />

                            {actualData && actualData.length > 0 && (
                                <Line
                                    type="monotone"
                                    dataKey="actual"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={{ fill: '#10b981', r: 3 }}
                                    name="Actual Power"
                                />
                            )}
                        </LineChart>
                    )}
                </ResponsiveContainer>
            )}

            {/* Legend explanation */}
            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-cyan-400"></div>
                    <span>ML Prediction</span>
                </div>
                {actualData && actualData.length > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-0.5 bg-green-400 border-dashed"></div>
                        <span>Actual Output</span>
                    </div>
                )}
                {showConfidence && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-3 bg-cyan-400/20 rounded"></div>
                        <span>95% Confidence Interval</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PredictionChart;
