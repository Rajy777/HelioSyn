
import Papa from 'papaparse';

// Standardized Interface for internal use
export interface StandardizedPoint {
    timestamp: string | null;
    value: number; // Main metric (Solar kW, Load kW, Price)
    extras: Record<string, number>; // Weather stats etc
}

// Keywords to look for in CSV headers (case-insensitive)
const COLUMN_MAPPINGS = {
    timestamp: ['date', 'time', 'timestamp', 'dt', 'period', 'date-hour', 'local_time'],
    solar: ['solar', 'production', 'power', 'generation', 'yield', 'systemproduction', 'system_production'],
    load: ['load', 'demand', 'consumption', 'usage', 'energy_used'],
    tariff: ['price', 'cost', 'rate', 'tariff', 'inr', 'usd'],
    weather: {
        temp: ['temp', 'temperature', 'air_temp', 'airtemperature'],
        radiation: ['rad', 'radiation', 'irradiance', 'sun', 'sunshine', 'solar_radiation'],
        humidity: ['hum', 'humidity', 'rel_hum', 'relativeairhumidity']
    }
};

const findColumn = (headers: string[], keywords: string[]): string | undefined => {
    const lowerHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

    for (const keyword of keywords) {
        const normalizedKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
        const index = lowerHeaders.findIndex(h => h.includes(normalizedKeyword));
        if (index !== -1) return headers[index];
    }
    return undefined;
};

const normalizeData = (data: any[], type: 'solar' | 'weather' | 'load' | 'tariff'): StandardizedPoint[] => {
    if (!data || data.length === 0) return [];

    // Get headers from first row
    const headers = Object.keys(data[0]);

    // Find critical columns
    const timeCol = findColumn(headers, COLUMN_MAPPINGS.timestamp);
    let valueCol: string | undefined;
    let extraCols: Record<string, string> = {};

    if (type === 'solar') {
        valueCol = findColumn(headers, COLUMN_MAPPINGS.solar);
    } else if (type === 'load') {
        valueCol = findColumn(headers, COLUMN_MAPPINGS.load);
    } else if (type === 'tariff') {
        valueCol = findColumn(headers, COLUMN_MAPPINGS.tariff);
    } else if (type === 'weather') {
        // Weather usually accompanies solar, but if separate:
        valueCol = findColumn(headers, COLUMN_MAPPINGS.weather.radiation); // Primary weather driver
    }

    // Auto-detect extra weather columns if they exist
    if (type === 'solar' || type === 'weather') {
        const radCol = findColumn(headers, COLUMN_MAPPINGS.weather.radiation);
        const tempCol = findColumn(headers, COLUMN_MAPPINGS.weather.temp);
        const humCol = findColumn(headers, COLUMN_MAPPINGS.weather.humidity);

        if (radCol) extraCols.radiation = radCol;
        if (tempCol) extraCols.temperature = tempCol;
        if (humCol) extraCols.humidity = humCol;
    }

    // Map data
    return data.map(row => {
        const valRaw = valueCol ? row[valueCol] : 0;
        // Clean numeric value
        const val = typeof valRaw === 'number' ? valRaw : parseFloat(String(valRaw).replace(/[^0-9.-]/g, '')) || 0;

        const extras: Record<string, number> = {};
        Object.entries(extraCols).forEach(([key, col]) => {
            const extraVal = row[col];
            extras[key] = typeof extraVal === 'number' ? extraVal : parseFloat(String(extraVal)) || 0;
        });

        // Use index/row number if date is missing, or try to parse
        let ts = timeCol ? row[timeCol] : null;

        // Fix "01.01.2017" format (dd.mm.yyyy) to standard
        if (ts && typeof ts === 'string' && ts.includes('.')) {
            // Simple hack for European formats often found in solar datasets
            // If starts with "dd.mm.yyyy"
        }

        return {
            timestamp: ts,
            value: val,
            extras
        };
    });
};

export const parseCSV = (file: File, type: 'solar' | 'weather' | 'load' | 'tariff' = 'solar'): Promise<StandardizedPoint[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
                try {
                    const standardized = normalizeData(results.data, type);
                    resolve(standardized);
                } catch (err) {
                    console.error("Smart Parsing Error:", err);
                    // Fallback to raw data if smart parse fails extremely
                    resolve(results.data as any);
                }
            },
            error: (error) => {
                reject(error);
            }
        });
    });
};
