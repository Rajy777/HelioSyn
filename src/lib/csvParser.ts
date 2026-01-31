
import Papa from 'papaparse';

// Standardized Interface for internal use
export interface StandardizedPoint {
    timestamp: string | null;
    value: number; // Main metric (Solar kW, Load kW, Price)
    extras: Record<string, number>; // Weather stats etc
}

// Keywords to look for in CSV headers (case-insensitive)
const COLUMN_MAPPINGS = {
    timestamp: ['date', 'time', 'timestamp', 'dt', 'period', 'date-hour', 'local_time', 'ts', 'datetime', 'day'],
    solar: ['solar', 'production', 'power', 'generation', 'yield', 'systemproduction', 'system_production', 'panel_output', 'kwh', 'kw'],
    load: ['load', 'demand', 'consumption', 'usage', 'energy_used', 'total_load', 'house_load', 'total_consumption'],
    tariff: ['price', 'cost', 'rate', 'tariff', 'inr', 'usd', 'unit_cost', 'grid_price', 'electricity_price'],
    weather: {
        temp: ['temp', 'temperature', 'air_temp', 'airtemperature', 'ambient_temp', 'degree', 'celsius'],
        radiation: ['rad', 'radiation', 'irradiance', 'sun', 'sunshine', 'solar_radiation', 'ghi', 'dni', 'dhi'],
        humidity: ['hum', 'humidity', 'rel_hum', 'relativeairhumidity', 'rh']
    }
};

const findColumn = (headers: string[], keywords: string[]): string | undefined => {
    const lowerHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

    for (const keyword of keywords) {
        const normalizedKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
        // Priority 1: Exact match with normalized header
        const exactIndex = lowerHeaders.indexOf(normalizedKeyword);
        if (exactIndex !== -1) return headers[exactIndex];

        // Priority 2: Header includes the keyword
        const partialIndex = lowerHeaders.findIndex(h => h.includes(normalizedKeyword));
        if (partialIndex !== -1) return headers[partialIndex];
    }
    return undefined;
};

const detectCriticalColumns = (data: any[], type: string): { valueCol?: string, timeCol?: string } => {
    if (!data || data.length === 0) return {};
    const headers = Object.keys(data[0]);

    // 1. Try Keyword Matching first
    let timeCol = findColumn(headers, COLUMN_MAPPINGS.timestamp);
    let valueCol: string | undefined;

    if (type === 'solar') valueCol = findColumn(headers, COLUMN_MAPPINGS.solar);
    else if (type === 'load') valueCol = findColumn(headers, COLUMN_MAPPINGS.load);
    else if (type === 'tariff') valueCol = findColumn(headers, COLUMN_MAPPINGS.tariff);
    else if (type === 'weather') valueCol = findColumn(headers, COLUMN_MAPPINGS.weather.radiation);

    // 2. Heuristics if keyword matching fails
    if (!valueCol) {
        // Find first column that looks like a number and isn't the timestamp
        valueCol = headers.find(h => {
            if (h === timeCol) return false;
            const val = data[0][h];
            return typeof val === 'number' || (!isNaN(parseFloat(String(val))) && String(val).replace(/[^0-9.-]/g, '') !== '');
        });
    }

    if (!timeCol) {
        // Find first column that looks like a date/timestamp or unique sequence
        timeCol = headers.find(h => {
            if (h === valueCol) return false;
            const val = String(data[0][h]).toLowerCase();
            return val.includes(':') || val.includes('/') || val.includes('-') || !isNaN(Date.parse(val));
        });
    }

    return { valueCol, timeCol };
};

const normalizeData = (data: any[], type: 'solar' | 'weather' | 'load' | 'tariff'): StandardizedPoint[] => {
    if (!data || data.length === 0) return [];

    // Get headers
    const headers = Object.keys(data[0]);

    // 1. Smart Detect Critical Columns
    const { valueCol, timeCol } = detectCriticalColumns(data, type);

    let extraCols: Record<string, string> = {};

    // 2. Auto-detect extra weather columns if they exist
    if (type === 'solar' || type === 'weather') {
        const radCol = findColumn(headers, COLUMN_MAPPINGS.weather.radiation);
        const tempCol = findColumn(headers, COLUMN_MAPPINGS.weather.temp);
        const humCol = findColumn(headers, COLUMN_MAPPINGS.weather.humidity);

        if (radCol && radCol !== valueCol) extraCols.radiation = radCol;
        if (tempCol && tempCol !== valueCol) extraCols.temperature = tempCol;
        if (humCol && humCol !== valueCol) extraCols.humidity = humCol;
    }

    // Map data
    return data.map(row => {
        const valRaw = valueCol ? row[valueCol] : 0;
        // Robust numeric cleaning: remove non-numeric chars except . and -
        const val = typeof valRaw === 'number' ? valRaw : parseFloat(String(valRaw).replace(/[^0-9.-]/g, '')) || 0;

        const extras: Record<string, number> = {};
        Object.entries(extraCols).forEach(([key, col]) => {
            const extraVal = row[col];
            extras[key] = typeof extraVal === 'number' ? extraVal : parseFloat(String(extraVal).replace(/[^0-9.-]/g, '')) || 0;
        });

        // Get timestamp - keep as string or number
        let ts = timeCol ? row[timeCol] : null;

        return {
            timestamp: ts !== null ? String(ts) : null,
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
