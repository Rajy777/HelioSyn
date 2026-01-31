
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { SchedulerMetrics } from './simulation';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Initialize Gemini AI
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const isAIEnabled = !!genAI;

export interface AIInsight {
    type: 'success' | 'warning' | 'info' | 'tip';
    title: string;
    message: string;
    priority: number;
}

/**
 * Generate AI-powered insights from simulation results
 */
export async function generateInsights(
    smartMetrics: SchedulerMetrics,
    baselineMetrics: SchedulerMetrics
): Promise<AIInsight[]> {
    if (!genAI) {
        // Return fallback insights if AI is not enabled
        return getFallbackInsights(smartMetrics, baselineMetrics);
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

        const prompt = `You are an expert solar energy analyst. Analyze the following simulation results and provide 3-5 actionable insights in JSON format.

**Smart Scheduler Results:**
- Solar Energy Used: ${smartMetrics.energy.solar.toFixed(2)} kWh
- Grid Energy Used: ${smartMetrics.energy.grid.toFixed(2)} kWh
- Cooling Energy: ${smartMetrics.energy.cooling.toFixed(2)} kWh
- Total Cost: ₹${smartMetrics.cost.total.toFixed(2)}
- Carbon Emissions: ${smartMetrics.carbon.toFixed(2)} kg CO₂
- SLA Violations: ${smartMetrics.sla.violations}

**Baseline (FIFO) Results:**
- Solar Energy Used: ${baselineMetrics.energy.solar.toFixed(2)} kWh
- Grid Energy Used: ${baselineMetrics.energy.grid.toFixed(2)} kWh
- Total Cost: ₹${baselineMetrics.cost.total.toFixed(2)}
- Carbon Emissions: ${baselineMetrics.carbon.toFixed(2)} kg CO₂

**Improvements:**
- Cost Savings: ₹${(baselineMetrics.cost.total - smartMetrics.cost.total).toFixed(2)} (${(((baselineMetrics.cost.total - smartMetrics.cost.total) / baselineMetrics.cost.total) * 100).toFixed(1)}%)
- Carbon Reduction: ${(baselineMetrics.carbon - smartMetrics.carbon).toFixed(2)} kg CO₂
- Grid Usage Reduction: ${(baselineMetrics.energy.grid - smartMetrics.energy.grid).toFixed(2)} kWh

Provide insights as a JSON array with this structure:
[
  {
    "type": "success" | "warning" | "info" | "tip",
    "title": "Short title (max 6 words)",
    "message": "Detailed explanation (max 25 words)",
    "priority": 1-5 (5 = most important)
  }
]

Focus on:
1. Cost savings opportunities
2. Carbon reduction achievements
3. Solar utilization efficiency
4. Potential improvements

Return ONLY the JSON array, no other text.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const insights: AIInsight[] = JSON.parse(jsonMatch[0]);
            return insights.sort((a, b) => b.priority - a.priority);
        }

        return getFallbackInsights(smartMetrics, baselineMetrics);
    } catch (error) {
        console.error('Gemini AI Error:', error);
        return getFallbackInsights(smartMetrics, baselineMetrics);
    }
}

/**
 * Fallback insights when AI is not available
 */
function getFallbackInsights(
    smartMetrics: SchedulerMetrics,
    baselineMetrics: SchedulerMetrics
): AIInsight[] {
    const insights: AIInsight[] = [];

    const costSavings = baselineMetrics.cost.total - smartMetrics.cost.total;
    const costSavingsPercent = (costSavings / baselineMetrics.cost.total) * 100;
    const carbonReduction = baselineMetrics.carbon - smartMetrics.carbon;
    const solarUtilization = (smartMetrics.energy.solar / (smartMetrics.energy.solar + smartMetrics.energy.grid)) * 100;

    // Cost savings insight
    if (costSavingsPercent > 30) {
        insights.push({
            type: 'success',
            title: 'Excellent Cost Reduction',
            message: `Smart scheduling saved ₹${costSavings.toFixed(0)}, a ${costSavingsPercent.toFixed(0)}% reduction from baseline costs.`,
            priority: 5
        });
    } else if (costSavingsPercent > 10) {
        insights.push({
            type: 'success',
            title: 'Good Cost Savings',
            message: `Achieved ₹${costSavings.toFixed(0)} in savings (${costSavingsPercent.toFixed(0)}%) through optimized scheduling.`,
            priority: 4
        });
    }

    // Carbon reduction
    if (carbonReduction > 5) {
        insights.push({
            type: 'success',
            title: 'Significant Carbon Reduction',
            message: `Reduced emissions by ${carbonReduction.toFixed(1)} kg CO₂, equivalent to planting ${Math.floor(carbonReduction / 20)} trees.`,
            priority: 4
        });
    }

    // Solar utilization
    if (solarUtilization > 70) {
        insights.push({
            type: 'success',
            title: 'High Solar Utilization',
            message: `${solarUtilization.toFixed(0)}% of energy from solar. Excellent renewable energy usage.`,
            priority: 3
        });
    } else if (solarUtilization < 50) {
        insights.push({
            type: 'tip',
            title: 'Increase Solar Usage',
            message: `Only ${solarUtilization.toFixed(0)}% solar. Consider shifting more loads to peak solar hours.`,
            priority: 4
        });
    }

    // SLA violations
    if (smartMetrics.sla.violations > 0) {
        insights.push({
            type: 'warning',
            title: 'SLA Violations Detected',
            message: `${smartMetrics.sla.violations} violation(s) occurred. Adjust priorities or add flexibility.`,
            priority: 5
        });
    } else {
        insights.push({
            type: 'success',
            title: 'All Deadlines Met',
            message: 'Perfect scheduling! All jobs completed on time with optimal energy usage.',
            priority: 2
        });
    }

    // Cooling efficiency
    const coolingPercent = (smartMetrics.energy.cooling / smartMetrics.energy.total) * 100;
    if (coolingPercent > 30) {
        insights.push({
            type: 'tip',
            title: 'High Cooling Energy',
            message: `Cooling uses ${coolingPercent.toFixed(0)}% of total energy. Consider pre-cooling strategies.`,
            priority: 3
        });
    }

    return insights.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

/**
 * Ask Gemini a question about the simulation
 */
export async function askAI(question: string, context: string): Promise<string> {
    if (!genAI) {
        return "AI is not enabled. Add VITE_GEMINI_API_KEY to your .env file to enable AI features.";
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

        const prompt = `You are a solar energy optimization expert. Answer the following question based on the context provided.

**Context:**
${context}

**Question:**
${question}

Provide a concise, actionable answer (max 100 words).`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Gemini AI Error:', error);
        return "Sorry, I couldn't process your question. Please try again.";
    }
}
