import "dotenv/config"
import rawConfig from "../../config.json";
import {Config} from "../types/config.types";

export class ConfigService {
  private static instance: ConfigService;
  private readonly config: Config;

  private constructor() {
    this.config = rawConfig;
    if (!this.config.apiKey) {
      const apiKey: string | undefined = process.env.APIKEY;
      if (!apiKey) {
        throw new Error(".env missing APIKEY & config.json does not contain \"apiKey\": \"sbKEY\"");
      }
      this.config.apiKey = apiKey;
    }
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }

    return ConfigService.instance
  }

  public getConfig(): Config {
    return this.config;
  }
}