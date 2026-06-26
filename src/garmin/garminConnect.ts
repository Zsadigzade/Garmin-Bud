import { createRequire } from "node:module";
import type {
  HeartRateData,
  IActivity,
  SleepData,
  StoredSessionTokens,
  WeightDataResponse,
} from "./garminApiTypes.js";

const require = createRequire(import.meta.url);

interface GarminConnectModule {
  GarminConnect: new (credentials?: { username: string; password: string }) => GarminConnectInstance;
}

export interface GarminConnectInstance {
  login: (username?: string, password?: string) => Promise<GarminConnectInstance>;
  loadToken: (oauth1: StoredSessionTokens["oauth1"], oauth2: StoredSessionTokens["oauth2"]) => void;
  exportToken: () => StoredSessionTokens;
  getUserProfile: () => Promise<unknown>;
  getActivities: (start?: number, limit?: number) => Promise<IActivity[]>;
  getSleepData: (date?: Date) => Promise<SleepData>;
  getHeartRate: (date?: Date) => Promise<HeartRateData>;
  getDailyWeightData: (date?: Date) => Promise<WeightDataResponse>;
}

const moduleRef = require("garmin-connect") as GarminConnectModule;

export const GarminConnect = moduleRef.GarminConnect;
