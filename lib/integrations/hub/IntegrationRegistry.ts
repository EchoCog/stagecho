import type { AIIntegration } from "../../../types/integration";
import type { IntegrationRegistry as IIntegrationRegistry } from "../../../types/hub";

export class IntegrationRegistry implements IIntegrationRegistry {
  private integrations = new Map<string, AIIntegration>();

  async register(integration: AIIntegration): Promise<void> {
    if (this.integrations.has(integration.name)) {
      throw new Error(`Integration ${integration.name} is already registered`);
    }

    this.integrations.set(integration.name, integration);
  }

  get(name: string): AIIntegration | undefined {
    return this.integrations.get(name);
  }

  list(): AIIntegration[] {
    return Array.from(this.integrations.values());
  }

  async remove(name: string): Promise<boolean> {
    return this.integrations.delete(name);
  }

  has(name: string): boolean {
    return this.integrations.has(name);
  }
}
