import { IntegrationCapability } from "../../../types/integration";
import type {
  AIIntegration,
  IntegrationConfig,
} from "../../../types/integration";

/**
 * OpenAI Integration for the Marduk AI Hub
 * Provides access to OpenAI's API services through the hub
 */
export class OpenAIIntegration implements AIIntegration {
  name = "openai";
  version = "1.0.0";
  description =
    "OpenAI API integration for text generation, embeddings, and vision";
  provider = "openai";
  capabilities = [
    IntegrationCapability.TEXT_GENERATION,
    IntegrationCapability.EMBEDDINGS,
    IntegrationCapability.VISION,
  ];

  config: IntegrationConfig = {
    enabled: false,
  };

  private apiKey?: string;
  private baseUrl = "https://api.openai.com/v1";

  async initialize(config: Record<string, unknown>): Promise<void> {
    this.apiKey = config.apiKey as string;
    this.baseUrl = (config.baseUrl as string) || this.baseUrl;

    if (!this.apiKey) {
      throw new Error("OpenAI API key is required");
    }

    // Test the connection
    await this.testConnection();
  }

  async call(method: string, params: unknown[]): Promise<unknown> {
    if (!this.apiKey) {
      throw new Error("OpenAI integration not initialized");
    }

    switch (method) {
      case "generateText":
        return this.generateText(
          params[0] as string,
          params[1] as Record<string, unknown>,
        );
      case "createEmbedding":
        return this.createEmbedding(params[0] as string);
      case "analyzeImage":
        return this.analyzeImage(params[0] as string, params[1] as string);
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  async cleanup(): Promise<void> {
    this.apiKey = undefined;
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.testConnection();
      return true;
    } catch {
      return false;
    }
  }

  private async generateText(
    prompt: string,
    options: Record<string, unknown> = {},
  ): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model || "gpt-4-turbo-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        ...options,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data.choices[0]?.message?.content;
  }

  private async createEmbedding(text: string): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data.data[0]?.embedding;
  }

  private async analyzeImage(
    imageUrl: string,
    prompt: string,
  ): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data.choices[0]?.message?.content;
  }

  private async testConnection(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI connection test failed: ${response.status} ${response.statusText}`,
      );
    }
  }
}
