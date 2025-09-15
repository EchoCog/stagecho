import { MardukHub, OpenAIIntegration, IntegrationCapability } from '../../../lib/integrations';

describe('AI Integration Hub', () => {
  let hub: MardukHub;

  beforeEach(() => {
    hub = new MardukHub({
      maxConcurrentOperations: 5,
      operationTimeout: 10000,
      integrations: {},
      enableMetrics: true,
      enableHealthChecks: false, // Disable for tests
    });
  });

  afterEach(async () => {
    await hub.shutdown();
  });

  describe('Hub Creation', () => {
    it('should create a hub with default configuration', async () => {
      await hub.initialize();
      const config = hub.getConfig();
      expect(config.maxConcurrentOperations).toBe(5);
      expect(config.enableMetrics).toBe(true);
    });
  });

  describe('Integration Registration', () => {
    it('should register an integration', async () => {
      await hub.initialize();
      
      const integration = new OpenAIIntegration();
      await hub.register(integration);
      
      // Verify the integration is registered
      const metrics = await hub.getMetrics();
      expect(metrics.integrationMetrics['openai']).toBeDefined();
      expect(metrics.integrationMetrics['openai'].totalCalls).toBe(0);
    });

    it('should prevent duplicate integration registration', async () => {
      await hub.initialize();
      
      const integration1 = new OpenAIIntegration();
      const integration2 = new OpenAIIntegration();
      
      await hub.register(integration1);
      
      await expect(hub.register(integration2)).rejects.toThrow(
        'Integration openai is already registered'
      );
    });

    it('should unregister an integration', async () => {
      await hub.initialize();
      
      const integration = new OpenAIIntegration();
      await hub.register(integration);
      
      await hub.unregister('openai');
      
      const metrics = await hub.getMetrics();
      expect(metrics.integrationMetrics['openai']).toBeUndefined();
    });
  });

  describe('Integration Properties', () => {
    it('should have correct OpenAI integration properties', () => {
      const integration = new OpenAIIntegration();
      
      expect(integration.name).toBe('openai');
      expect(integration.provider).toBe('openai');
      expect(integration.capabilities).toContain(IntegrationCapability.TEXT_GENERATION);
      expect(integration.capabilities).toContain(IntegrationCapability.EMBEDDINGS);
      expect(integration.capabilities).toContain(IntegrationCapability.VISION);
    });
  });

  describe('Health Checks', () => {
    it('should return healthy status for empty hub', async () => {
      await hub.initialize();
      
      const health = await hub.healthCheck();
      expect(health.overall).toBe('healthy');
      expect(Object.keys(health.integrations)).toHaveLength(0);
    });
  });

  describe('Metrics', () => {
    it('should return initial metrics', async () => {
      await hub.initialize();
      
      const metrics = await hub.getMetrics();
      expect(metrics.totalCalls).toBe(0);
      expect(metrics.successfulCalls).toBe(0);
      expect(metrics.failedCalls).toBe(0);
      expect(metrics.uptime).toBeGreaterThan(0);
    });
  });

  describe('Batch Operations', () => {
    it('should handle empty batch operations', async () => {
      await hub.initialize();
      
      const result = await hub.executeBatch([]);
      expect(result.summary.total).toBe(0);
      expect(result.summary.successful).toBe(0);
      expect(result.summary.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });
});