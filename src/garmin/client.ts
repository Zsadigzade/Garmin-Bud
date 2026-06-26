import type { GarminConnectInstance } from "./garminConnect.js";
import { authenticateGarmin } from "./auth.js";
import { logger } from "../utils/logger.js";
import { GarminApiError } from "./types.js";

// SECTION: Garmin Client Singleton

let clientInstance: GarminConnectInstance | null = null;
let clientPromise: Promise<GarminConnectInstance> | null = null;

export async function getGarminClient(forceAuth = false): Promise<GarminConnectInstance> {
  if (forceAuth) {
    clientInstance = await authenticateGarmin(true);
    clientPromise = Promise.resolve(clientInstance);
    return clientInstance;
  }

  if (clientInstance) {
    return clientInstance;
  }

  if (!clientPromise) {
    clientPromise = authenticateGarmin(false).then((client) => {
      clientInstance = client;
      return client;
    });
  }

  return clientPromise;
}

export function resetGarminClient(): void {
  clientInstance = null;
  clientPromise = null;
}

function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("401") ||
    message.includes("403") ||
    message.includes("unauthorized") ||
    message.includes("token") ||
    message.includes("login failed")
  );
}

function toRateLimitError(error: unknown): GarminApiError | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const message = error.message.toLowerCase();
  if (!message.includes("429") && !message.includes("rate limit")) {
    return null;
  }

  return new GarminApiError("Garmin rate limit reached. Retry in about 60 seconds.", 429, 60);
}

export async function withGarminClient<T>(
  operation: (client: GarminConnectInstance) => Promise<T>
): Promise<T> {
  try {
    const client = await getGarminClient(false);
    return await operation(client);
  } catch (error) {
    const rateLimitError = toRateLimitError(error);
    if (rateLimitError) {
      throw rateLimitError;
    }

    if (!isAuthError(error)) {
      throw error;
    }

    logger.warn({ error }, "Garmin request failed auth, retrying once");
    resetGarminClient();
    const client = await getGarminClient(true);
    return await operation(client);
  }
}
