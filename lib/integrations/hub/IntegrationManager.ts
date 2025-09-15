import type { AIIntegration } from "../../../types/integration";
import type { IntegrationManager as IIntegrationManager } from "../../../types/hub";

interface IntegrationState {
  status: "initialized" | "error" | "not_initialized";
  integration: AIIntegration;
  error?: Error;
}

export class IntegrationManager implements IIntegrationManager {
  private states = new Map<string, IntegrationState>();

  async initialize(
    integration: AIIntegration,
    config: Record<string, unknown>,
  ): Promise<void> {
    try {
      await integration.initialize(config);
      this.states.set(integration.name, {
        status: "initialized",
        integration,
      });
    } catch (error) {
      this.states.set(integration.name, {
        status: "error",
        integration,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  async cleanup(integrationName: string): Promise<void> {
    const state = this.states.get(integrationName);
    if (!state) {
      return;
    }

    try {
      await state.integration.cleanup();
    } finally {
      this.states.delete(integrationName);
    }
  }

  async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.states.keys()).map((name) =>
      this.cleanup(name).catch((error) => {
        console.error(`Failed to cleanup integration ${name}:`, error);
      }),
    );

    await Promise.all(cleanupPromises);
  }

  getStatus(
    integrationName: string,
  ): "initialized" | "error" | "not_initialized" {
    const state = this.states.get(integrationName);
    return state?.status ?? "not_initialized";
  }
}
