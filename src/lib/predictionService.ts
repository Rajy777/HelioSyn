/**
 * Solar Prediction Service - XGBoost ML Integration
 * Handles communication with Python backend for solar power predictions
 */

export interface SolarDataPoint {
    timestamp: number | string;
    value: number;
    extras?: Record<string, number>;
}

export interface PredictionRequest {
    hours: number[];
    weather_data?: SolarDataPoint[];
    last_known_values?: number[];
    start_timestamp?: string;
}

export interface PredictionResult {
    hour: number;
    predicted_power: number;
    lower_bound: number;
    upper_bound: number;
}

export interface TrainingRequest {
    solar_data: SolarDataPoint[];
    weather_data?: SolarDataPoint[];
}

export interface ModelMetrics {
    train_rmse: number;
    train_mae: number;
    train_r2: number;
    val_rmse: number;
    val_mae: number;
    val_r2: number;
    test_rmse: number;
    test_mae: number;
    test_r2: number;
}

export interface FeatureImportance {
    [featureName: string]: number;
}

export interface ModelStatus {
    is_trained: boolean;
    metrics: ModelMetrics;
    top_features: FeatureImportance;
}

export interface TrainingResponse {
    success: boolean;
    message?: string;
    metrics?: ModelMetrics;
    feature_importance?: FeatureImportance;
    error?: string;
}

export interface PredictionResponse {
    success: boolean;
    predictions?: PredictionResult[];
    model_metrics?: {
        test_rmse: number;
        test_r2: number;
    };
    error?: string;
}

export interface StatusResponse {
    success: boolean;
    data?: ModelStatus;
    error?: string;
}

class PredictionService {
    private baseUrl: string;
    private cache: Map<string, any>;
    private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

    constructor() {
        // Get API URL from environment variable or use default
        this.baseUrl = import.meta.env.VITE_PREDICTION_API_URL || 'http://localhost:5000';
        this.cache = new Map();
    }

    /**
     * Check if the API is healthy and reachable
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            return response.ok;
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }

    /**
     * Get the current status of the ML model
     */
    async getModelStatus(): Promise<StatusResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/api/model/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error getting model status:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Train the XGBoost model with historical data
     */
    async trainModel(request: TrainingRequest): Promise<TrainingResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/api/train`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            const data = await response.json();

            // Clear cache after training
            this.cache.clear();

            return data;
        } catch (error) {
            console.error('Error training model:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Get solar power predictions for specified hours
     */
    async getPredictions(request: PredictionRequest): Promise<PredictionResponse> {
        try {
            // Check cache first
            const cacheKey = JSON.stringify(request);
            const cached = this.cache.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('Returning cached predictions');
                return cached.data;
            }

            const response = await fetch(`${this.baseUrl}/api/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            const data = await response.json();

            // Cache successful predictions
            if (data.success) {
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now(),
                });
            }

            return data;
        } catch (error) {
            console.error('Error getting predictions:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Get feature importance from the trained model
     */
    async getFeatureImportance(topN: number = 10): Promise<{ success: boolean; feature_importance?: FeatureImportance; error?: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/api/feature-importance?top_n=${topN}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error getting feature importance:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Generate predictions for next 24 hours using current hour as starting point
     */
    async predict24Hours(weatherData?: SolarDataPoint[], lastKnownValues?: number[], startTimestamp?: string): Promise<PredictionResponse> {
        const currentHour = new Date().getHours();
        const hours = Array.from({ length: 24 }, (_, i) => (currentHour + i) % 24);

        return this.getPredictions({
            hours,
            weather_data: weatherData,
            last_known_values: lastKnownValues,
            start_timestamp: startTimestamp,
        });
    }

    /**
     * Clear the prediction cache
     */
    clearCache(): void {
        this.cache.clear();
    }
}

// Export singleton instance
export const predictionService = new PredictionService();
