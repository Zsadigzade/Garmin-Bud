import { createPairToken, getPairToken, approvePairToken, deletePairToken, listPendingPairTokens } from "./appDb.js";
import { appConfig } from "./config.js";

// SECTION: Pairing API

export interface PairRequestResult {
  code: string;
  expires_in: number;
}

export interface PairStatusResult {
  approved: boolean;
  api_key?: string;
  server_url?: string;
}

export function requestPairing(): PairRequestResult {
  const token = createPairToken();
  const now = Math.floor(Date.now() / 1000);
  return {
    code: token.code,
    expires_in: token.expires_at - now,
  };
}

export function checkPairStatus(code: string): PairStatusResult | null {
  const token = getPairToken(code);
  if (!token) return null;

  const now = Math.floor(Date.now() / 1000);
  if (token.expires_at < now) return null;

  if (token.approved_at !== null) {
    deletePairToken(code);
    return {
      approved: true,
      api_key: appConfig.mcpApiKey,
      server_url: appConfig.publicUrl,
    };
  }

  return { approved: false };
}

export function approvePairing(code: string): boolean {
  return approvePairToken(code);
}

export function getPendingPairings() {
  return listPendingPairTokens();
}
