export interface CostControllerConfig {
  monthlyBudgetInr: number;
  warningInr: number;
  hardStopInr: number;
  estimatedCostPerRequestInr: number;
  monthlyRequestLimit: number;
  cooldownMs: number;
}

const defaultConfig: CostControllerConfig = {
  monthlyBudgetInr: Number(process.env.MONTHLY_AI_BUDGET_INR ?? 4000),
  warningInr: Number(process.env.MONTHLY_AI_WARNING_INR ?? 3000),
  hardStopInr: Number(process.env.MONTHLY_AI_HARD_STOP_INR ?? 4500),
  estimatedCostPerRequestInr: 4,
  monthlyRequestLimit: 1000,
  cooldownMs: 8000,
};

export function createCostController(
  config: Partial<CostControllerConfig> = {},
) {
  const settings = { ...defaultConfig, ...config };
  let monthlyRequestCount = 0;
  let estimatedMonthlyCostINR = 0;
  let lastRequestAt = 0;

  return {
    canCall(now = Date.now()) {
      return (
        estimatedMonthlyCostINR < settings.hardStopInr &&
        monthlyRequestCount < settings.monthlyRequestLimit &&
        now - lastRequestAt >= settings.cooldownMs
      );
    },
    recordRequest(cost = settings.estimatedCostPerRequestInr) {
      monthlyRequestCount += 1;
      estimatedMonthlyCostINR += cost;
      lastRequestAt = Date.now();
    },
    status() {
      return {
        monthlyRequestCount,
        estimatedMonthlyCostINR,
        warning: estimatedMonthlyCostINR >= settings.warningInr,
        hardStopped: estimatedMonthlyCostINR >= settings.hardStopInr,
      };
    },
  };
}
