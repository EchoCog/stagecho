// Hub core
export { MardukHub } from "./hub/MardukHub";
export { IntegrationRegistry } from "./hub/IntegrationRegistry";
export { IntegrationManager } from "./hub/IntegrationManager";

// Built-in integrations
export { OpenAIIntegration } from "./builtin/OpenAIIntegration";

// Re-export types
export type {
  AIIntegration,
  IntegrationCapability,
  IntegrationConfig,
  BatchOperation,
  BatchResult,
  HealthStatus,
  HubMetrics,
  IntegrationError,
  IntegrationMetrics,
  RetryPolicy,
} from "../../types/integration";

export type {
  HubConfig,
  IntegrationRegistry as IIntegrationRegistry,
  IntegrationManager as IIntegrationManager,
  MardukHubInterface,
} from "../../types/hub";
