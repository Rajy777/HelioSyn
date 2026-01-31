
import { MAX_DATA_HUB_POWER, THERMAL_THRESHOLD, BASELINE_BACKGROUND_LOAD } from './simulationConfig';

export type Priority = 'high' | 'medium' | 'low' | 'critical';

export class Job {
    id: string;
    name: string;
    powerKw: number;
    duration: number; // minutes
    remaining: number; // minutes
    priority: Priority;
    deadline: number | null; // hour (0-24)
    status: 'WAITING' | 'RUNNING' | 'DONE';
    penalized: boolean;
    startHour: number | null;
    flexible: boolean;

    constructor(name: string, powerKw: number, durationMin: number, priority: string, deadlineHour: number | null = null, flexible: boolean = true) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.name = name;
        this.powerKw = powerKw;
        this.duration = durationMin;
        this.remaining = durationMin;
        this.priority = this.normalizePriority(priority);
        this.deadline = deadlineHour;
        this.status = 'WAITING';
        this.penalized = false;
        this.startHour = null;
        this.flexible = flexible;
    }

    private normalizePriority(p: string): Priority {
        const lower = p.toLowerCase();
        if (['high', 'medium', 'low', 'critical'].includes(lower)) return lower as Priority;
        return 'medium';
    }

    start(currentHour: number) {
        if (this.status === 'WAITING') {
            this.status = 'RUNNING';
            if (this.startHour === null) this.startHour = currentHour;
        }
    }

    runStep(dtMin: number, currentHour: number) {
        if (this.status === 'DONE') return;

        if (this.status === 'WAITING') this.start(currentHour);

        this.remaining -= dtMin;
        if (this.remaining <= 0) {
            this.remaining = 0;
            this.status = 'DONE';
        }
    }

    deadlineMissed(currentHour: number): boolean {
        if (this.deadline === null) return false;
        if (currentHour > this.deadline && this.status !== 'DONE' && !this.penalized) {
            this.penalized = true;
            return true;
        }
        return false;
    }

    urgencyScore(currentHour: number): number {
        if (this.deadline === null) return 0;

        const hoursUntilDeadline = this.deadline - currentHour;
        const hoursNeeded = this.remaining / 60.0;

        if (hoursUntilDeadline <= 0) return 999; // Max urgency
        return hoursNeeded / hoursUntilDeadline;
    }
}

// ========================================
// SMART SCHEDULER
// ========================================
export class SmartScheduler {
    jobs: Job[];

    constructor() {
        this.jobs = [];
    }

    addJob(job: Job) {
        this.jobs.push(job);
    }

    schedule(solarAvailableKw: number, currentTemp: number, currentHour: number): Job[] {
        const waitingJobs = this.jobs.filter(j => j.status === 'WAITING');
        const runningJobs: Job[] = [];
        let totalPowerUsed = 0; // We define base load elsewhere or add it here?

        // Sort based on priority logic
        const sortedJobs = this.prioritizeJobs(waitingJobs, currentHour, solarAvailableKw);

        for (const job of sortedJobs) {
            // Thermal Constraint: Skip low priority if too hot
            if (currentTemp > THERMAL_THRESHOLD && job.priority === 'low') continue;

            // Solar Constraint: Medium priority prefers solar (skip if no solar)
            // But if flexible is false, we try to run anyway? Logic from python:
            if (job.priority === 'medium' && solarAvailableKw < 1.0 && job.flexible) {
                // Python code: if job.priority == "medium" and solar_available_kw < 1.0: continue
                // This implies strict solar preference for medium jobs
                continue;
            }

            // Power Capacity Check
            if (totalPowerUsed + job.powerKw <= MAX_DATA_HUB_POWER) {
                runningJobs.push(job);
                job.start(currentHour);
                totalPowerUsed += job.powerKw;
            }
        }
        return runningJobs;
    }

    private prioritizeJobs(jobs: Job[], currentHour: number, _solarKw: number): Job[] {
        return jobs.sort((a, b) => {
            const pMap: Record<string, number> = { 'critical': -1, 'high': 0, 'medium': 1, 'low': 2 };

            // 1. Priority Class
            if (pMap[a.priority] !== pMap[b.priority]) {
                return pMap[a.priority] - pMap[b.priority];
            }

            // 2. Deadline Urgency (Higher score = run first)
            const urgencyA = a.urgencyScore(currentHour);
            const urgencyB = b.urgencyScore(currentHour);
            if (Math.abs(urgencyA - urgencyB) > 0.1) {
                return urgencyB - urgencyA;
            }

            // 3. Solar Bonus (Medium fits better in solar)
            // Implicit in list ordering if we added logic, sticking to simple sort

            // 4. Smaller jobs first (Bin packing heuristic)
            return a.powerKw - b.powerKw;
        });
    }
}

// ========================================
// BASELINE SCHEDULER (FIFO)
// ========================================
export class BaselineScheduler {
    jobs: Job[];
    constructor() { this.jobs = []; }

    addJob(job: Job) { this.jobs.push(job); }

    // Baseline ignores environment variables
    schedule(_solar: number, _temp: number, hour: number): Job[] {
        const runningJobs: Job[] = [];
        let totalPower = BASELINE_BACKGROUND_LOAD;
        const waiting = this.jobs.filter(j => j.status === 'WAITING');

        for (const job of waiting) {
            if (totalPower + job.powerKw <= MAX_DATA_HUB_POWER) {
                runningJobs.push(job);
                job.start(hour);
                totalPower += job.powerKw;
            } else {
                break; // FIFO blocked
            }
        }
        return runningJobs;
    }
}
