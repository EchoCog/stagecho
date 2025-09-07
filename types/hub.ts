import type {
  AIIntegration,
  BatchOperation,
  BatchResult,
  HealthStatus,
  HubMetrics,
  IntegrationConfig,
  RetryPolicy,
} from "./integration";

export interface HubConfig {
  // Global settings
  maxConcurrentOperations: number;
  operationTimeout: number;
  retryPolicy: RetryPolicy;

  // Integration configs
  integrations: Record<string, IntegrationConfig>;

  // Monitoring
  enableMetrics: boolean;
  enableHealthChecks: boolean;
  healthCheckInterval: number;
}

export interface IntegrationRegistry {
  register(integration: AIIntegration): Promise<void>;
  get(name: string): AIIntegration | undefined;
  list(): AIIntegration[];
  remove(name: string): Promise<boolean>;
  has(name: string): boolean;
}

export interface IntegrationManager {
  initialize(
    integration: AIIntegration,
    config: Record<string, unknown>,
  ): Promise<void>;
  cleanup(integrationName: string): Promise<void>;
  cleanupAll(): Promise<void>;
  getStatus(
    integrationName: string,
  ): "initialized" | "error" | "not_initialized";
}

export interface MardukHubInterface {
  // Registry management
  register(integration: AIIntegration): Promise<void>;
  unregister(name: string): Promise<void>;

  // Integration execution
  execute(
    integrationName: string,
    method: string,
    params: unknown[],
  ): Promise<unknown>;

  // Batch operations
  executeBatch(operations: BatchOperation[]): Promise<BatchResult>;

  // Configuration
  configure(config: Partial<HubConfig>): void;
  getConfig(): HubConfig;

  // Health monitoring
  healthCheck(): Promise<HealthStatus>;
  getMetrics(): Promise<HubMetrics>;

  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}
