
import { useState, useEffect } from 'react';
import FileUpload from '../components/FileUpload';
import { Settings, Play, Plus, Trash2, Cpu, Zap, Brain, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { parseCSV } from '../lib/csvParser';
import { X } from 'lucide-react';
import { predictionService } from '../lib/predictionService';

const Dashboard = () => {
    const navigate = useNavigate();
    const [files, setFiles] = useState<{ [key: string]: File | null }>({
        solar: null,
        weather: null,
        loads: null,
        tariff: null
    });

    const [appliances, setAppliances] = useState([
        { id: 1, name: "Air Conditioner", power: 1.5, duration: 4.0, priority: "High", flexible: true },
        { id: 2, name: "Water Pump", power: 2.0, duration: 1.0, priority: "Medium", flexible: true },
        { id: 3, name: "EV Charger", power: 7.0, duration: 3.5, priority: "Low", flexible: true },
        { id: 4, name: "Lighting System", power: 0.5, duration: 6.0, priority: "Critical", flexible: false },
    ]);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newAppliance, setNewAppliance] = useState({ name: '', power: '', duration: '', priority: 'Medium', flexible: true });

    // Manual Configuration
    const [config, setConfig] = useState({
        maxSolarKw: 8.0,
        minTemp: 26.0,
        maxTemp: 42.0,
        latitude: 21.0,
        dayOfYear: 172
    });

    const [isProcessing, setIsProcessing] = useState(false);

    // ML Prediction State
    const [mlStatus, setMlStatus] = useState<{ is_trained: boolean; metrics?: any }>({ is_trained: false });
    const [isTraining, setIsTraining] = useState(false);
    const [apiConnected, setApiConnected] = useState(false);

    // Check ML API status on mount
    useEffect(() => {
        const checkMLStatus = async () => {
            const healthy = await predictionService.healthCheck();
            setApiConnected(healthy);

            if (healthy) {
                const status = await predictionService.getModelStatus();
                if (status.success && status.data) {
                    setMlStatus(status.data);
                }
            }
        };
        checkMLStatus();
    }, []);

    const handleFileSelect = (key: string) => (file: File) => {
        setFiles(prev => ({ ...prev, [key]: file }));
    };

    const handleRunSimulation = async () => {
        setIsProcessing(true);
        try {
            // Parse files if they exist
            const parsedData: any = {};
            if (files.solar) parsedData.solar = await parseCSV(files.solar, 'solar');
            if (files.weather) parsedData.weather = await parseCSV(files.weather, 'weather');
            if (files.loads) parsedData.loads = await parseCSV(files.loads, 'load');
            if (files.tariff) parsedData.tariff = await parseCSV(files.tariff, 'tariff');

            // Save to localStorage for the Results page to pick up
            localStorage.setItem('helioSynData', JSON.stringify({
                files: parsedData,
                appliances: appliances,
                config: config
            }));

            // Navigate to results
            navigate('/results');
        } catch (error) {
            console.error("Error parsing files:", error);
            alert("Failed to parse CSV files. Please check the format.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAddAppliance = () => {
        if (!newAppliance.name || !newAppliance.power) return;
        setAppliances([...appliances, {
            id: Date.now(),
            name: newAppliance.name,
            power: parseFloat(newAppliance.power),
            duration: parseFloat(newAppliance.duration) || 2.0, // Default to 2h if empty
            priority: newAppliance.priority,
            flexible: newAppliance.flexible
        }]);
        setNewAppliance({ name: '', power: '', duration: '', priority: 'Medium', flexible: true });
        setShowAddModal(false);
    };

    const handleDeleteAppliance = (id: number) => {
        setAppliances(appliances.filter(a => a.id !== id));
    };

    const handleTrainMLModel = async () => {
        if (!files.solar) {
            alert('Please upload solar generation data first');
            return;
        }

        setIsTraining(true);
        try {
            // Parse solar and weather data
            const solarDataRaw = await parseCSV(files.solar, 'solar');
            const weatherDataRaw = files.weather ? await parseCSV(files.weather, 'weather') : undefined;

            // Convert to ML API format (include extras for rich feature learning)
            const solarData = solarDataRaw.map((point, index) => ({
                timestamp: point.timestamp !== null ? point.timestamp : index,
                value: point.value,
                extras: point.extras
            }));

            const weatherData = weatherDataRaw?.map((point, index) => ({
                timestamp: point.timestamp !== null ? point.timestamp : index,
                value: point.value,
                extras: point.extras
            }));

            // Train the model
            const response = await predictionService.trainModel({
                solar_data: solarData,
                weather_data: weatherData
            });

            if (response.success) {
                alert(`Model trained successfully!\nTest RMSE: ${response.metrics?.test_rmse.toFixed(3)} kW\nTest R²: ${response.metrics?.test_r2.toFixed(3)}`);

                // Update status
                const status = await predictionService.getModelStatus();
                if (status.success && status.data) {
                    setMlStatus(status.data);
                }
            } else {
                alert(`Training failed: ${response.error}`);
            }
        } catch (error) {
            console.error('Training error:', error);
            alert('Failed to train model. Make sure the Python API is running.');
        } finally {
            setIsTraining(false);
        }
    };

    return (
        <div className="space-y-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                    System Configuration
                </h1>
                <p className="text-slate-400 mt-2">Upload your data and configure facility loads to begin optimization.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Data Input */}
                <section className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 p-6 space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Settings className="w-5 h-5 text-cyan-400" />
                        <h2 className="text-xl font-semibold text-white">Data Packages</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FileUpload
                            label="Solar Generation History"
                            onFileSelect={handleFileSelect('solar')}
                            selectedFile={files.solar}
                        />
                        <FileUpload
                            label="Weather Data (Forecast)"
                            onFileSelect={handleFileSelect('weather')}
                            selectedFile={files.weather}
                        />
                        <FileUpload
                            label="Facility Load Profile"
                            onFileSelect={handleFileSelect('loads')}
                            selectedFile={files.loads}
                        />
                        <FileUpload
                            label="Tariff Structure"
                            onFileSelect={handleFileSelect('tariff')}
                            selectedFile={files.tariff}
                        />
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-200">
                        <p className="font-semibold mb-1">💡 Pro Tip</p>
                        If no files are uploaded, the system will use built-in demo datasets for simulation.
                    </div>
                </section>

                {/* Right Column: Appliance Config */}
                <section className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Cpu className="w-5 h-5 text-purple-400" />
                            <h2 className="text-xl font-semibold text-white">Appliance Registry</h2>
                        </div>
                        <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                        {appliances.map((app) => (
                            <div key={app.id} className="flex items-center p-4 bg-slate-950/50 rounded-xl border border-slate-800 group hover:border-slate-600 transition-all">
                                <div className="flex-1">
                                    <h3 className="font-medium text-white">{app.name}</h3>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                        <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {app.power} kW</span>
                                        <span className="flex items-center gap-1">⏱ {app.duration || 2.0}h</span>
                                        <span className={`px-2 py-0.5 rounded-full ${app.priority === 'Critical' ? 'bg-red-500/20 text-red-400' :
                                            app.priority === 'High' ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-green-500/20 text-green-400'
                                            }`}>{app.priority}</span>
                                        {app.flexible && <span className="text-cyan-400/80">⚡ Flexible</span>}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteAppliance(app.id)}
                                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        <button
                            onClick={() => setShowAddModal(true)}
                            className="w-full py-3 border border-dashed border-slate-700 rounded-xl text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all"
                        >
                            + Add New Appliance
                        </button>
                    </div>
                </section>
            </div>

            {/* ML Prediction Training Section */}
            <section className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-400" />
                        <h2 className="text-xl font-semibold text-white">ML Solar Prediction</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {apiConnected ? (
                            <div className="flex items-center gap-1 text-xs text-green-400">
                                <CheckCircle className="w-4 h-4" />
                                <span>API Connected</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 text-xs text-red-400">
                                <XCircle className="w-4 h-4" />
                                <span>API Offline</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Status Card */}
                    <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                        <h3 className="text-sm text-slate-400 mb-2">Model Status</h3>
                        {mlStatus.is_trained ? (
                            <div>
                                <p className="text-green-400 font-semibold mb-2">✓ Trained</p>
                                {mlStatus.metrics && (
                                    <div className="text-xs text-slate-500 space-y-1">
                                        <p>RMSE: {mlStatus.metrics.test_rmse?.toFixed(3)} kW</p>
                                        <p>R²: {mlStatus.metrics.test_r2?.toFixed(3)}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-slate-500">Not trained</p>
                        )}
                    </div>

                    {/* Training Action */}
                    <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                        <h3 className="text-sm text-slate-400 mb-2">Train Model</h3>
                        <button
                            onClick={handleTrainMLModel}
                            disabled={!files.solar || isTraining || !apiConnected}
                            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            {isTraining ? 'Training...' : 'Train XGBoost'}
                        </button>
                        <p className="text-xs text-slate-500 mt-2">
                            {!files.solar ? 'Upload solar data first' : 'Uses uploaded solar & weather data'}
                        </p>
                    </div>

                    {/* Info */}
                    <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                        <h3 className="text-sm text-slate-400 mb-2">About</h3>
                        <p className="text-xs text-slate-500">
                            XGBoost machine learning model provides accurate solar power predictions based on historical patterns, time features, and weather data.
                        </p>
                    </div>
                </div>

                {!apiConnected && (
                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-200">
                        <p className="font-semibold mb-1">⚠️ Python API Not Running</p>
                        <p className="text-xs">Start the backend server: <code className="bg-slate-900 px-2 py-0.5 rounded">cd backend && python api.py</code></p>
                    </div>
                )}
            </section>

            {/* Manual Simulation Parameters */}
            <section className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-green-400" />
                        <h2 className="text-xl font-semibold text-white">Advanced Parameters</h2>
                    </div>
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded border border-cyan-500/30">
                        Model: ASHRAE Clear Sky
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="text-sm text-slate-400 block mb-1">Peak Solar Power (kW)</label>
                        <input
                            type="number"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                            value={config.maxSolarKw}
                            onChange={e => setConfig({ ...config, maxSolarKw: parseFloat(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-slate-500 mt-1">Default: 8.0 kW</p>
                    </div>
                    <div>
                        <label className="text-sm text-slate-400 block mb-1">Min Amb. Temp (°C)</label>
                        <input
                            type="number"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                            value={config.minTemp}
                            onChange={e => setConfig({ ...config, minTemp: parseFloat(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-slate-500 mt-1">Nighttime Low</p>
                    </div>
                    <div>
                        <label className="text-sm text-slate-400 block mb-1">Max Amb. Temp (°C)</label>
                        <input
                            type="number"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                            value={config.maxTemp}
                            onChange={e => setConfig({ ...config, maxTemp: parseFloat(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-slate-500 mt-1">Daytime Peak</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-800/50">
                    <div>
                        <label className="text-sm text-slate-400 block mb-1">Facility Latitude (Deg)</label>
                        <input
                            type="number"
                            step="0.1"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                            value={config.latitude}
                            onChange={e => setConfig({ ...config, latitude: parseFloat(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-slate-500 mt-1">Example: 28.6 (New Delhi)</p>
                    </div>
                    <div>
                        <label className="text-sm text-slate-400 block mb-1">Day of Year (1-365)</label>
                        <input
                            type="number"
                            min="1"
                            max="365"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                            value={config.dayOfYear}
                            onChange={e => setConfig({ ...config, dayOfYear: parseInt(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-slate-500 mt-1">1 = Jan 1, 172 = June 21</p>
                    </div>
                </div>
            </section>

            <div className="flex justify-end pt-4">
                <button
                    onClick={handleRunSimulation}
                    disabled={isProcessing}
                    className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isProcessing ? (
                        <>Processing...</>
                    ) : (
                        <><Play className="w-5 h-5" /> Run Simulation Engine</>
                    )}
                </button>
            </div>

            {/* Add Appliance Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Add New Appliance</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-slate-400 block mb-1">Appliance Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                                    placeholder="e.g. Dishwasher"
                                    value={newAppliance.name}
                                    onChange={e => setNewAppliance({ ...newAppliance, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm text-slate-400 block mb-1">Power Rating (kW)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                                    placeholder="e.g. 1.2"
                                    value={newAppliance.power}
                                    onChange={e => setNewAppliance({ ...newAppliance, power: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm text-slate-400 block mb-1">Duration (Hours)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                                    placeholder="e.g. 2.0"
                                    value={newAppliance.duration}
                                    onChange={e => setNewAppliance({ ...newAppliance, duration: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm text-slate-400 block mb-1">Priority</label>
                                <select
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                                    value={newAppliance.priority}
                                    onChange={e => setNewAppliance({ ...newAppliance, priority: e.target.value })}
                                >
                                    <option value="Low">Low (Can wait)</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical (Must run)</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="flexible"
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                                    checked={newAppliance.flexible}
                                    onChange={e => setNewAppliance({ ...newAppliance, flexible: e.target.checked })}
                                />
                                <label htmlFor="flexible" className="text-sm text-slate-300">Flexible Schedule?</label>
                            </div>

                            <button
                                onClick={handleAddAppliance}
                                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold mt-4 transition-colors"
                            >
                                Add Appliance
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
