
import { SIMULATION_START_HOUR, SIMULATION_END_HOUR, TIME_STEP_MINUTES, HEAT_ACCUMULATION, THERMAL_DISSIPATION, COOLING_EFFICIENCY, IDEAL_TEMP, DEADLINE_PENALTY_KWH, GRID_CARBON_INTENSITY } from './simulationConfig';
import { getSolarPower, getAmbientTemp, getCoolingPowerKw } from './physicsModels';
import { SmartScheduler, BaselineScheduler, Job } from './smartScheduler';
import type { StandardizedPoint } from './csvParser';

export interface SchedulerMetrics {
    energy: {
        solar: number;
        grid: number;
        cooling: number;
        total: number;
        solarPct: number;
    };
    cost: {
        total: number;
        grid: number;
        penalty: number;
    };
    carbon: number; // kg
    sla: {
        violations: number;
        penaltyKwh: number;
    };
    timeline: any[]; // Timeline events for UI
    logs: {
        time: number[];
        solar: number[];
        grid: number[];
        temp: number[];
        cooling: number[];
        cost: number[]; // Cumulative cost
    }
}

// Helper for Time-of-Use Pricing (INR/kWh)
export const getGridPrice = (hour: number): number => {
    // 00-06: Off-peak (Cheap)
    if (hour < 6) return 4.0;
    // 18-22: Peak (Expensive)
    if (hour >= 18 && hour < 22) return 12.0;
    // Rest: Standard
    return 8.0;
};

// Convert parsed CSV (StandardizedPoint[]) to a fast lookup map: Hour -> Value
const createLookup = (data?: StandardizedPoint[]): (h: number) => number | null => {
    if (!data || data.length === 0) return () => null;
    const map = new Map<number, number>();
    data.forEach(p => {
        if (p.timestamp !== null) {
            map.set(Number(p.timestamp), p.value);
        }
    });
    const fallbackMap = new Map();
    data.forEach((p, i) => fallbackMap.set(i, p.value));
    return (h: number) => {
        if (map.has(h)) return map.get(h)!;
        const idx = Math.floor(h);
        if (fallbackMap.has(idx)) return fallbackMap.get(idx)!;
        return null;
    };
};

export interface SimulationConfig {
    maxSolarKw?: number;
    minTemp?: number;
    maxTemp?: number;
    latitude?: number;
    dayOfYear?: number;
}

export const runSmartSimulation = (
    appliances: any[],
    files: { solar?: StandardizedPoint[], weather?: StandardizedPoint[], loads?: StandardizedPoint[] },
    config: SimulationConfig = {},
    useSmart: boolean = true
): SchedulerMetrics => {

    // 1. Setup Jobs
    const scheduler = useSmart ? new SmartScheduler() : new BaselineScheduler();

    // Convert appliances to Jobs
    appliances.forEach(app => {
        const job = new Job(
            app.name,
            parseFloat(app.power),
            app.duration ? (app.duration * 60) : 120,
            app.priority,
            18,
            app.flexible !== false
        );
        scheduler.addJob(job);
    });

    // 2. Setup Data Sources
    const getSolar = createLookup(files.solar);
    const getTemp = createLookup(files.weather);

    // Metrics Containers
    let gridEnergy = 0;
    let solarEnergy = 0;
    let coolingEnergy = 0;
    let carbon = 0;
    let slaViolations = 0;
    let accumulatedCost = 0;

    const logs: { time: number[], solar: number[], grid: number[], temp: number[], cooling: number[], cost: number[] } = {
        time: [], solar: [], grid: [], temp: [], cooling: [], cost: []
    };

    // State
    let currentTemp = IDEAL_TEMP;
    let currentHour = SIMULATION_START_HOUR;
    const dtHours = TIME_STEP_MINUTES / 60.0;
    const currentlyRunning = new Set<Job>();

    while (currentHour < SIMULATION_END_HOUR) {
        // A. Environment
        const solarRaw = getSolar(currentHour);
        const tempRaw = getTemp(currentHour);

        const solarAvailable = solarRaw !== null ? solarRaw : getSolarPower(currentHour, config.maxSolarKw, config.latitude, config.dayOfYear);
        const ambientTemp = tempRaw !== null ? tempRaw : getAmbientTemp(currentHour, config.minTemp, config.maxTemp);

        // B. Run Existing Jobs (Step Time)
        currentlyRunning.forEach(job => {
            job.runStep(TIME_STEP_MINUTES, currentHour);
            if (job.status === 'DONE') currentlyRunning.delete(job);
        });

        // C. Scheduler Decision
        const newJobs = scheduler.schedule(solarAvailable, currentTemp, currentHour);

        newJobs.forEach(j => {
            if (!currentlyRunning.has(j) && j.status !== 'DONE') {
                currentlyRunning.add(j);
            }
        });

        // D. Power & Thermal Physics
        const computeLoad = Array.from(currentlyRunning).reduce((sum, j) => sum + j.powerKw, 0);

        // Energy Mix
        const solarUsed = Math.min(computeLoad, solarAvailable);
        const gridUsed = Math.max(0, computeLoad - solarUsed);

        // Cooling
        const coolingNeeded = getCoolingPowerKw(currentTemp, computeLoad);

        // Thermal Update
        const tempChange = (
            (HEAT_ACCUMULATION * computeLoad) -
            (COOLING_EFFICIENCY * coolingNeeded) -
            (THERMAL_DISSIPATION * (currentTemp - ambientTemp))
        );
        currentTemp += tempChange;

        // E. Record Metrics
        const currentGridUse = gridUsed + coolingNeeded; // Total grid (Compute + Cooling)
        const price = getGridPrice(currentHour);
        const stepCost = currentGridUse * dtHours * price;

        solarEnergy += solarUsed * dtHours;
        gridEnergy += currentGridUse * dtHours;
        coolingEnergy += coolingNeeded * dtHours;
        carbon += currentGridUse * dtHours * GRID_CARBON_INTENSITY;
        accumulatedCost += stepCost;

        // Logs
        logs.time.push(currentHour);
        logs.solar.push(solarUsed);
        logs.grid.push(currentGridUse);
        logs.temp.push(currentTemp);
        logs.cooling.push(coolingNeeded);
        logs.cost.push(accumulatedCost);

        // F. Deadlines
        scheduler.jobs.forEach(j => {
            if (j.deadlineMissed(currentHour)) slaViolations++;
        });

        currentHour += dtHours;
    }

    // Wrap up
    return {
        energy: {
            solar: solarEnergy,
            grid: gridEnergy - coolingEnergy, // pure compute grid
            cooling: coolingEnergy,
            total: solarEnergy + gridEnergy,
            solarPct: (solarEnergy / (solarEnergy + gridEnergy)) * 100
        },
        cost: {
            total: accumulatedCost,
            grid: accumulatedCost, // Assuming no other costs for now
            penalty: 0 // TODO: Add SLA penalty cost?
        },
        carbon: carbon,
        sla: {
            violations: slaViolations,
            penaltyKwh: slaViolations * DEADLINE_PENALTY_KWH
        },
        timeline: scheduler.jobs.map(j => ({
            name: j.name,
            start: j.startHour,
            duration: j.duration / 60,
            priority: j.priority,
            status: j.status
        })),
        logs
    };
};
