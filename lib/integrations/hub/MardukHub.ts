import type {
  AIIntegration,
  BatchOperation,
  BatchResult,
  HealthStatus,
  HubMetrics,
  IntegrationError,
  IntegrationMetrics,
} from "../../../types/integration";
import type { HubConfig, MardukHubInterface } from "../../../types/hub";
import { IntegrationRegistry } from "./IntegrationRegistry";
import { IntegrationManager } from "./IntegrationManager";

const DEFAULT_HUB_CONFIG: HubConfig = {
  maxConcurrentOperations: 10,
  operationTimeout: 30000,
  retryPolicy: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: ["TIMEOUT", "NETWORK_ERROR", "RATE_LIMIT"],
  },
  integrations: {},
  enableMetrics: true,
  enableHealthChecks: true,
  healthCheckInterval: 60000, // 1 minute
};

export class MardukHub implements MardukHubInterface {
  private registry: IntegrationRegistry;
  private manager: IntegrationManager;
  private config: HubConfig;
  private metrics: Map<string, IntegrationMetrics> = new Map();
  private startTime: Date = new Date();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config?: Partial<HubConfig>) {
    this.config = { ...DEFAULT_HUB_CONFIG, ...config };
    this.registry = new IntegrationRegistry();
    this.manager = new IntegrationManager();
  }

  async initialize(): Promise<void> {
    if (this.config.enableHealthChecks) {
      this.startHealthChecks();
    }
  }

  async register(integration: AIIntegration): Promise<void> {
    await this.registry.register(integration);

    // Initialize if config exists
    const integrationConfig = this.config.integrations[integration.name];
    if (integrationConfig?.enabled) {
      await this.manager.initialize(
        integration,
        integrationConfig.customConfig || {},
      );
    }

    // Initialize metrics
    if (this.config.enableMetrics) {
      this.metrics.set(integration.name, {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageResponseTime: 0,
        errorRate: 0,
      });
    }
  }

  async unregister(name: string): Promise<void> {
    await this.manager.cleanup(name);
    await this.registry.remove(name);
    this.metrics.delete(name);
  }

  async execute(
    integrationName: string,
    method: string,
    params: unknown[],
  ): Promise<unknown> {
    const integration = this.registry.get(integrationName);
    if (!integration) {
      throw new Error(`Integration ${integrationName} not found`);
    }

    if (this.manager.getStatus(integrationName) !== "initialized") {
      throw new Error(`Integration ${integrationName} is not initialized`);
    }

    const startTime = Date.now();
    let success = false;

    try {
      const result = await this.executeWithTimeout(integration, method, params);
      success = true;
      return result;
    } catch (error) {
      if (error instanceof Error) {
        const integrationError: IntegrationError = Object.assign(error, {
          integrationName,
          method,
          cause: error,
        });
        throw integrationError;
      }
      throw error;
    } finally {
      if (this.config.enableMetrics) {
        this.updateMetrics(integrationName, Date.now() - startTime, success);
      }
    }
  }

  async executeBatch(operations: BatchOperation[]): Promise<BatchResult> {
    const results = await Promise.allSettled(
      operations.map(async (op) => {
        try {
          const result = await this.execute(
            op.integrationName,
            op.method,
            op.params,
          );
          return {
            id: op.id,
            success: true,
            result,
          };
        } catch (error) {
          return {
            id: op.id,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );

    const processedResults = results.map((result) =>
      result.status === "fulfilled"
        ? result.value
        : {
            id: undefined,
            success: false,
            error: "Batch operation failed",
          },
    );

    const successful = processedResults.filter((r) => r.success).length;
    const failed = processedResults.length - successful;

    return {
      results: processedResults,
      summary: {
        total: processedResults.length,
        successful,
        failed,
      },
    };
  }

  configure(config: Partial<HubConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): HubConfig {
    return { ...this.config };
  }

  async healthCheck(): Promise<HealthStatus> {
    const integrations: HealthStatus["integrations"] = {};
    let healthyCount = 0;
    const registeredIntegrations = this.registry.list();

    await Promise.allSettled(
      registeredIntegrations.map(async (integration) => {
        const now = new Date();
        try {
          const isHealthy = await integration.isHealthy();
          integrations[integration.name] = {
            status: isHealthy ? "healthy" : "degraded",
            lastCheck: now,
          };
          if (isHealthy) healthyCount++;
        } catch (error) {
          integrations[integration.name] = {
            status: "unhealthy",
            lastCheck: now,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );

    const total = registeredIntegrations.length;
    let overall: HealthStatus["overall"] = "healthy";

    if (total === 0) {
      overall = "healthy";
    } else if (healthyCount === 0) {
      overall = "unhealthy";
    } else if (healthyCount < total) {
      overall = "degraded";
    }

    return {
      overall,
      integrations,
    };
  }

  async getMetrics(): Promise<HubMetrics> {
    const integrationMetrics: Record<string, IntegrationMetrics> = {};
    let totalCalls = 0;
    let successfulCalls = 0;
    let failedCalls = 0;
    let totalResponseTime = 0;

    for (const [name, metrics] of this.metrics.entries()) {
      integrationMetrics[name] = { ...metrics };
      totalCalls += metrics.totalCalls;
      successfulCalls += metrics.successfulCalls;
      failedCalls += metrics.failedCalls;
      totalResponseTime += metrics.averageResponseTime * metrics.totalCalls;
    }

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      averageResponseTime: totalCalls > 0 ? totalResponseTime / totalCalls : 0,
      integrationMetrics,
      uptime: Date.now() - this.startTime.getTime(),
    };
  }

  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    await this.manager.cleanupAll();
  }

  private async executeWithTimeout(
    integration: AIIntegration,
    method: string,
    params: unknown[],
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Integration call timed out after ${this.config.operationTimeout}ms`,
          ),
        );
      }, this.config.operationTimeout);

      integration
        .call(method, params)
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private updateMetrics(
    integrationName: string,
    responseTime: number,
    success: boolean,
  ): void {
    const metrics = this.metrics.get(integrationName);
    if (!metrics) return;

    metrics.totalCalls++;
    metrics.lastCallTime = new Date();

    if (success) {
      metrics.successfulCalls++;
    } else {
      metrics.failedCalls++;
    }

    // Update average response time
    const totalResponseTime =
      metrics.averageResponseTime * (metrics.totalCalls - 1) + responseTime;
    metrics.averageResponseTime = totalResponseTime / metrics.totalCalls;

    // Update error rate
    metrics.errorRate = metrics.failedCalls / metrics.totalCalls;
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        console.error("Health check failed:", error);
      }
    }, this.config.healthCheckInterval);
  }
}
