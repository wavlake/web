export default {
  async scheduled(event, env, ctx) {
    console.log("🔄 Scheduled polling triggered:", new Date().toISOString());
    try {
      await pollRelayForUpdates(env, ctx);
    } catch (error) {
      console.error("❌ Error in scheduled polling:", error);
    }
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/health":
        return handleHealthCheck(env);
      case "/stats":
        return handleStats(env);
      case "/heartbeat":
        return handleHeartbeat(request, env);
      default:
        return new Response("Not Found", { status: 404 });
    }
  },
};

async function pollRelayForUpdates(env, ctx) {
  const relayUrl = env.RELAY_URL;
  console.log("📡 Polling relay:", relayUrl);
  
  const now = Math.floor(Date.now() / 1000);
  await env.KV.put("last_poll_time", now.toString());
  console.log("✅ Poll completed successfully");
}

async function handleHealthCheck(env) {
  const health = {
    status: "ok",
    timestamp: Date.now(),
    relay: env.RELAY_URL,
    version: "1.0.0"
  };
