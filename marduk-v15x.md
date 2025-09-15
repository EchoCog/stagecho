# Marduk v15x - AI Integration Hub Specification

## Overview

Marduk is the AI Integration Hub for Stagehand, providing a unified interface for managing and orchestrating multiple AI services and integrations. Named after the Babylonian god of wisdom and order, Marduk brings structure and intelligence to AI service management.

## Core Concepts

### 1. Integration Registry

A centralized registry for discovering, registering, and managing AI integrations:

```typescript
interface IntegrationRegistry {
  register(integration: AIIntegration): void;
  get(name: string): AIIntegration | undefined;
  list(): AIIntegration[];
  remove(name: string): boolean;
}
```

### 2. AI Integration Interface

Standard interface that all AI integrations must implement:

```typescript
interface AIIntegration {
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
```

### 3. Integration Capabilities

Define what each integration can do:

```typescript
enum IntegrationCapability {
  TEXT_GENERATION = "text-generation",
  IMAGE_GENERATION = "image-generation",
  VISION = "vision",
  EMBEDDINGS = "embeddings",
  SEARCH = "search",
  DATABASE = "database",
  WORKFLOW = "workflow",
  ANALYSIS = "analysis",
}
```

## Hub Architecture

### 1. Core Components

```
lib/integrations/
├── hub/
│   ├── MardukHub.ts              # Main hub class
│   ├── IntegrationRegistry.ts    # Registry implementation
│   ├── IntegrationManager.ts     # Lifecycle management
│   └── IntegrationLoader.ts      # Dynamic loading
├── builtin/
│   ├── OpenAIIntegration.ts      # OpenAI services
│   ├── AnthropicIntegration.ts   # Anthropic services
│   ├── GoogleIntegration.ts      # Google AI services
│   └── SearchIntegration.ts      # Web search integration
├── types/
│   ├── integration.ts            # Core interfaces
│   └── hub.ts                   # Hub types
└── utils/
    ├── validation.ts            # Config validation
    └── serialization.ts         # Data serialization
```

### 2. Hub API

```typescript
class MardukHub {
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
  configure(config: HubConfig): void;
  getConfig(): HubConfig;

  // Health monitoring
  healthCheck(): Promise<HealthStatus>;
  getMetrics(): Promise<HubMetrics>;
}
```

### 3. Configuration System

```typescript
interface HubConfig {
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
```

## Built-in Integrations

### 1. LLM Integrations

- **OpenAI Integration**: GPT models, embeddings, vision
- **Anthropic Integration**: Claude models, computer use
- **Google Integration**: Gemini models, Vertex AI
- **Local Integration**: Ollama, local models

### 2. Search Integrations

- **Web Search**: Exa, Serp API, Google Search
- **Vector Search**: Pinecone, Weaviate, Chroma
- **Database Search**: Supabase, PostgreSQL

### 3. Workflow Integrations

- **Automation**: Zapier, Make, n8n
- **Notifications**: Slack, Discord, email
- **Storage**: Google Drive, Dropbox, S3

## Usage Examples

### 1. Basic Hub Setup

```typescript
import { MardukHub } from "@browserbasehq/stagehand";

const hub = new MardukHub({
  maxConcurrentOperations: 10,
  operationTimeout: 30000,
  integrations: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: "gpt-4-turbo-preview",
    },
  },
});

await hub.initialize();
```

### 2. Custom Integration

```typescript
class CustomAnalyticsIntegration implements AIIntegration {
  name = "custom-analytics";
  version = "1.0.0";
  description = "Custom analytics integration";
  provider = "internal";
  capabilities = [IntegrationCapability.ANALYSIS];

  async initialize(config: Record<string, unknown>): Promise<void> {
    // Setup analytics client
  }

  async call(method: string, params: unknown[]): Promise<unknown> {
    switch (method) {
      case "analyze":
        return this.analyzeData(params[0]);
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  async cleanup(): Promise<void> {
    // Cleanup resources
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}

// Register custom integration
await hub.register(new CustomAnalyticsIntegration());
```

### 3. Integration with Stagehand Agents

```typescript
const stagehand = new Stagehand({ experimental: true });
await stagehand.init();

// Create agent with hub integrations
const agent = stagehand.agent({
  provider: "openai",
  model: "gpt-4-turbo-preview",
  integrations: {
    hub: hub, // Use the entire hub
    // or specific integrations
    analytics: "custom-analytics",
    search: "exa",
  },
});

await agent.execute("Analyze the current page and search for related content");
```

## Integration Patterns

### 1. Service Wrapper Pattern

Wrap existing AI services with the standard interface:

```typescript
class ServiceWrapper implements AIIntegration {
  private client: ExternalService;

  async call(method: string, params: unknown[]): Promise<unknown> {
    // Translate generic calls to service-specific API
    return this.client[method](...params);
  }
}
```

### 2. Proxy Pattern

Route calls to appropriate backend services:

```typescript
class ProxyIntegration implements AIIntegration {
  private services = new Map<string, ExternalService>();

  async call(method: string, params: unknown[]): Promise<unknown> {
    const service = this.selectService(method, params);
    return service.execute(method, params);
  }
}
```

### 3. Chain Pattern

Chain multiple integrations together:

```typescript
class ChainIntegration implements AIIntegration {
  private chain: AIIntegration[];

  async call(method: string, params: unknown[]): Promise<unknown> {
    let result = params[0];
    for (const integration of this.chain) {
      result = await integration.call(method, [result]);
    }
    return result;
  }
}
```

## Error Handling

### 1. Integration Errors

```typescript
class IntegrationError extends Error {
  constructor(
    message: string,
    public integrationName: string,
    public method: string,
    public cause?: Error,
  ) {
    super(message);
  }
}
```

### 2. Retry Policies

```typescript
interface RetryPolicy {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}
```

## Monitoring and Metrics

### 1. Health Monitoring

- Integration health checks
- Performance metrics
- Error rates and types
- Resource usage

### 2. Metrics Collection

```typescript
interface HubMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  integrationMetrics: Record<string, IntegrationMetrics>;
}
```

## Security Considerations

1. **API Key Management**: Secure storage and rotation of API keys
2. **Rate Limiting**: Prevent abuse and manage costs
3. **Input Validation**: Validate all inputs to integrations
4. **Audit Logging**: Log all integration calls for security analysis

## Migration Path

### Phase 1: Core Infrastructure

- Basic hub architecture
- Registry system
- Standard interfaces

### Phase 2: Built-in Integrations

- LLM provider integrations
- Search integrations
- Basic workflow integrations

### Phase 3: Advanced Features

- Chain integrations
- Batch operations
- Advanced monitoring

### Phase 4: Ecosystem

- Plugin marketplace
- Community integrations
- Advanced orchestration

## Version History

- **v15.0**: Initial specification
- **v15.1**: Added chain pattern support
- **v15.2**: Enhanced error handling
- **v15.x**: Current specification (extensible)
