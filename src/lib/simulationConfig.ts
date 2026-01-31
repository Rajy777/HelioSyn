
// ========================================
// SIMULATION PARAMETERS
// ========================================
export const SIMULATION_START_HOUR = 0;
export const SIMULATION_END_HOUR = 24;
export const TIME_STEP_MINUTES = 10;

// ========================================
// DATA HUB SPECIFICATIONS
// ========================================
export const MAX_DATA_HUB_POWER = 10;  // kW
export const BASELINE_BACKGROUND_LOAD = 3.0;  // kW

// ========================================
// TEMPERATURE & THERMAL MODEL
// ========================================
export const IDEAL_TEMP = 25;  // °C
export const THERMAL_THRESHOLD = 32;  // °C

// Thermal dynamics
export const HEAT_ACCUMULATION = 0.15;
export const THERMAL_DISSIPATION = 0.05;

// ========================================
// COOLING MODEL
// ========================================
export const TEMP_THRESHOLD = 25;  // °C
export const COOLING_FACTOR = 0.5;
export const COOLING_EFFICIENCY = 0.6; // Thermal reduction per kW
export const COOLING_COP = 3.0; // Efficiency
export const LOAD_COOLING_FACTOR = 0.05;

// ========================================
// SOLAR ENERGY
// ========================================
export const MAX_SOLAR_KW = 8.0;
export const SOLAR_EFFICIENCY = 0.85;
export const SUNRISE_HOUR = 6;
export const SUNSET_HOUR = 18;

// ========================================
// CARBON & COST (INR)
// ========================================
export const GRID_CARBON_INTENSITY = 0.7;  // kg/kWh
export const GRID_PRICE = 6;  // ₹/kWh
export const COOLING_PRICE = 6;  // ₹/kWh
export const CARBON_PRICE = 2;  // ₹/kg
export const DEADLINE_PENALTY_KWH = 2.0;
