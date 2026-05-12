export interface Config {
  /** Snusbase API key. Loaded from config.json or APIKEY env var. */
  apiKey?: string;
  /** Whether to route requests through proxies from proxies.txt */
  useProxies: boolean;
  /** Max number of search requests in flight at once. */
  concurrentBatches: number;
  /** Max number of E-Mails to be processed together. */
  batchSize: number;
  /** Max number of times a batch can be processed in case of failure. */
  attemptCount: number;
  /** Time between each batch of E-Mails is queued to be processed. */
  chunkDelaySeconds: number;
  /** Max amount of time Axios will wait for a response. */
  requestTimeoutSeconds: number;
  /** Whether your request to Snusbase.com is using a Wildcard or not. */
  wildcard: boolean;
  /** Types of data to search. Possible values: "email", "username", "lastip", "password", "hash", "name", "_domain". */
  types: string[];
  /** Default Country Code for phone number parsing to fall back on. i.g US = +1 */
  defaultISOCountryCode: string;
}