import { MardukHub, OpenAIIntegration } from "@browserbasehq/stagehand";
import dotenv from "dotenv";

dotenv.config();

/**
 * Example: Basic AI Integration Hub Usage
 *
 * This example demonstrates how to:
 * 1. Create and configure the Marduk AI Integration Hub
 * 2. Register built-in integrations
 * 3. Execute operations through the hub
 * 4. Monitor hub health and metrics
 */

async function basicHubExample() {
  console.log("🚀 Starting AI Integration Hub Example...");

  // Create and configure the hub
  const hub = new MardukHub({
    maxConcurrentOperations: 5,
    operationTimeout: 15000,
    integrations: {
      openai: {
        enabled: true,
        apiKey: process.env.OPENAI_API_KEY,
        customConfig: {
          model: "gpt-4-turbo-preview",
          temperature: 0.7,
        },
      },
    },
    enableMetrics: true,
    enableHealthChecks: true,
  });

  try {
    // Initialize the hub
    await hub.initialize();
    console.log("✅ Hub initialized successfully");

    // Register the OpenAI integration
    const openaiIntegration = new OpenAIIntegration();
    await hub.register(openaiIntegration);
    console.log("✅ OpenAI integration registered");

    // Check initial health
    const initialHealth = await hub.healthCheck();
    console.log(`📊 Hub health: ${initialHealth.overall}`);

    // Example 1: Generate text
    console.log("\n🤖 Generating text...");
    const textResult = await hub.execute("openai", "generateText", [
      "Explain the concept of AI integration hubs in 2 sentences.",
      { maxTokens: 100 },
    ]);
    console.log("Generated text:", textResult);

    // Example 2: Create embedding (if OpenAI API key is available)
    if (process.env.OPENAI_API_KEY) {
      console.log("\n🔍 Creating embedding...");
      const embedding = await hub.execute("openai", "createEmbedding", [
        "AI integration hub for managing multiple AI services",
      ]);
      console.log("Embedding dimensions:", (embedding as number[]).length);
    }

    // Example 3: Batch operations
    console.log("\n📦 Running batch operations...");
    const batchOps = [
      {
        integrationName: "openai",
        method: "generateText",
        params: ["What is machine learning?", { maxTokens: 50 }],
        id: "ml-question",
      },
      {
        integrationName: "openai",
        method: "generateText",
        params: ["What is deep learning?", { maxTokens: 50 }],
        id: "dl-question",
      },
    ];

    const batchResults = await hub.executeBatch(batchOps);
    console.log(
      `Batch completed: ${batchResults.summary.successful}/${batchResults.summary.total} successful`,
    );

    batchResults.results.forEach((result) => {
      if (result.success) {
        console.log(`✅ ${result.id}: ${result.result}`);
      } else {
        console.log(`❌ ${result.id}: ${result.error}`);
      }
    });

    // Example 4: Get metrics
    console.log("\n📊 Hub Metrics:");
    const metrics = await hub.getMetrics();
    console.log(`- Total calls: ${metrics.totalCalls}`);
    console.log(`- Successful calls: ${metrics.successfulCalls}`);
    console.log(`- Failed calls: ${metrics.failedCalls}`);
    console.log(
      `- Average response time: ${metrics.averageResponseTime.toFixed(2)}ms`,
    );
    console.log(`- Uptime: ${(metrics.uptime / 1000).toFixed(2)}s`);

    // Example 5: Final health check
    const finalHealth = await hub.healthCheck();
    console.log(`\n❤️ Final health check: ${finalHealth.overall}`);
    Object.entries(finalHealth.integrations).forEach(([name, status]) => {
      console.log(`  - ${name}: ${status.status}`);
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    // Always clean up
    await hub.shutdown();
    console.log("🧹 Hub shut down successfully");
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  basicHubExample().catch(console.error);
}

export { basicHubExample };
