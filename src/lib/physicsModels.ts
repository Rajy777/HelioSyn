import {
    MAX_SOLAR_KW, SOLAR_EFFICIENCY,
    TEMP_THRESHOLD, COOLING_FACTOR, COOLING_COP, LOAD_COOLING_FACTOR
} from './simulationConfig';

// ========================================
// SOLAR MODEL (ASHRAE Clear Sky)
// ========================================

const D2R = Math.PI / 180;

/**
 * Calculates Clear Sky Solar Irradiance (W/m2) using ASHRAE Model.
 * @param dayOfYear Day of the year (1-365)
 * @param hour Local solar time (0-24)
 * @param latitude Latitude in degrees
 * @param tilt Panel tilt in degrees (default = latitude)
 * @returns Global Irradiance on tilted surface in W/m2
 */
export const calculateIrradiance = (
    dayOfYear: number,
    hour: number,
    latitude: number,
    tilt?: number
): number => {
    const latRad = latitude * D2R;
    const tiltRad = (tilt ?? latitude) * D2R;

    // 1. Declination Angle (delta)
    // Approx: delta = 23.45 * sin(360/365 * (284 + n))
    const delta = 23.45 * Math.sin((360 / 365) * (284 + dayOfYear) * D2R);
    const deltaRad = delta * D2R;

    // 2. Hour Angle (omega)
    // Solar Noon = 12:00. Each hour = 15 degrees.
    const omega = 15 * (hour - 12);
    const omegaRad = omega * D2R;

    // 3. Solar Altitude (alpha) - Angle of sun above horizon
    // sin(alpha) = sin(lat)sin(delta) + cos(lat)cos(delta)cos(omega)
    const sinAlpha = Math.sin(latRad) * Math.sin(deltaRad) +
        Math.cos(latRad) * Math.cos(deltaRad) * Math.cos(omegaRad);

    // If sun is down, 0 irradiance
    if (sinAlpha <= 0) return 0.0;

    const alpha = Math.asin(sinAlpha); // Radians

    // 4. Beam Normal Irradiance (I_bn) - ASHRAE Model
    // Constants for "Average Clear Sky"
    const A = 1160; // Apparent solar irradiation at air mass 0 (W/m2)
    const B = 0.168; // Atmospheric extinction coefficient
    // I_bn = A * exp(-B / sin(alpha))
    const Ibn = A * Math.exp(-B / sinAlpha);

    // 5. Incidence Angle (theta) on Tilted Surface
    // Simplified for South Facing (Azimuth = 0 for Panel)
    // cos(theta) = sin(alpha)sin(tilt) + cos(alpha)cos(tilt)cos(solar_azimuth)
    // For simplicity in this demo, we assume panel tracks or optimal fixed tilt approx:
    // We roughly approximate the projection. 
    // A robust simple model for fixed South tilt: 
    // cos(theta) = sin(delta)sin(lat-tilt) + cos(delta)cos(lat-tilt)cos(omega)
    // Let's use the explicit geometric formula for South facing panel (Surface Azimuth = 0/180 depending on convention. Northern Hemisphere: South = 0 relative to Meridian for calculation simplicity usually).

    // Panel Pointing South (Northern Hemisphere):
    // cos(theta) = sin(Lat - Tilt)*sin(Declination) + cos(Lat - Tilt)*cos(Declination)*cos(HourAngle)
    const effLatRad = (latitude - (tilt ?? latitude)) * D2R; // If Tilt=Lat, this is 0.

    const cosTheta = Math.sin(effLatRad) * Math.sin(deltaRad) +
        Math.cos(effLatRad) * Math.cos(deltaRad) * Math.cos(omegaRad);

    const I_beam = Ibn * Math.max(0, cosTheta);

    // 6. Diffuse Sky Radiation using classic approach: C * I_bn
    const C = 0.095; // Diffuse radiation factor
    const I_diffuse = C * Ibn * ((1 + Math.cos(tiltRad)) / 2); // Simple view factor model

    // 7. Ground Reflected (Albedo) - optional, assume 0.2
    const rho = 0.2;
    const I_reflected = Ibn * (sinAlpha + C) * rho * ((1 - Math.cos(tiltRad)) / 2);

    return Math.max(0, I_beam + I_diffuse + I_reflected);
};

export const getSolarPower = (
    hour: number,
    maxPowerKw: number = MAX_SOLAR_KW,
    latitude: number = 21.0,  // Good central default
    dayOfYear: number = 172   // Summer Solstice (Peak) default
): number => {
    // Calculate Irradiance in W/m2
    const irradiance = calculateIrradiance(dayOfYear, hour, latitude, latitude); // Tilt = Latitude

    // System Output = Capacity_STC * (G / 1000) * Performance_Ratio
    const outputKw = maxPowerKw * (irradiance / 1000.0) * SOLAR_EFFICIENCY;

    return outputKw;
};

// ========================================
// TEMPERATURE MODEL
// ========================================
const DEF_MIN_TEMP = 26.0;
const DEF_MAX_TEMP = 42.0;
const PEAK_TEMP_HOUR = 14.0;

export const getAmbientTemp = (hour: number, minTemp: number = DEF_MIN_TEMP, maxTemp: number = DEF_MAX_TEMP): number => {
    const h = hour % 24;
    const avg = (minTemp + maxTemp) / 2;
    const amp = (maxTemp - minTemp) / 2;

    // Peak at 14:00
    const phase = (h - PEAK_TEMP_HOUR) * (2 * Math.PI / 24);
    return avg + amp * Math.cos(phase);
};

// ========================================
// COOLING MODEL
// ========================================
export const getCoolingPowerKw = (hubTemp: number, computeLoadKw: number): number => {
    if (hubTemp <= TEMP_THRESHOLD) return 0.0;
    const excess = hubTemp - TEMP_THRESHOLD;

    // Cooling needs based on excess heat + current load contribution
    const coolingReq = (COOLING_FACTOR * excess) + (LOAD_COOLING_FACTOR * computeLoadKw);

    // Electrical power needed (Efficiency Adjustment)
    const electricalPower = coolingReq / COOLING_COP;

    return Math.max(0, electricalPower);
};
