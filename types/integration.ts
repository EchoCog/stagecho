export enum IntegrationCapability {
  TEXT_GENERATION = "text-generation",
  IMAGE_GENERATION = "image-generation",
  VISION = "vision",
  EMBEDDINGS = "embeddings",
  SEARCH = "search",
  DATABASE = "database",
  WORKFLOW = "workflow",
  ANALYSIS = "analysis",
}

export interface IntegrationConfig {
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  customConfig?: Record<string, unknown>;
}

export interface RetryPolicy {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface AIIntegration {
  name: string;
  version: string;
  description: string;
  provider: string;
  capabilities: IntegrationCapability[];
  config: IntegrationConfig;

  // Core methods
  initialize(config: Record<string, unknown>): Promise<void>;
  call(method: string, params: unknown[]): Promise<unknown>;
  cleanup(): Promise<void>;

  // Health check
  isHealthy(): Promise<boolean>;
}

export interface BatchOperation {
  integrationName: string;
  method: string;
  params: unknown[];
  id?: string;
}

export interface BatchResult {
  results: Array<{
    id?: string;
    success: boolean;
    result?: unknown;
    error?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export interface HealthStatus {
  overall: "healthy" | "degraded" | "unhealthy";
  integrations: Record<
    string,
    {
      status: "healthy" | "degraded" | "unhealthy";
      lastCheck: Date;
      error?: string;
    }
  >;
}

export interface IntegrationMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  lastCallTime?: Date;
  errorRate: number;
}

export interface HubMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  integrationMetrics: Record<string, IntegrationMetrics>;
  uptime: number;
}

export class IntegrationError extends Error {
  constructor(
    message: string,
    public integrationName: string,
    public method: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = "IntegrationError";
  }
}
