interface BreachRecord {
  username: string;
  email: string;
  lastip: string;
  hash: string;
  salt: string;
  uid: string;
  created: string;
  updated: string;
}
export interface DatabaseSearchResponse {
  took: number,
  size: number,
  results: {
    [databaseName: string]: BreachRecord[];

  }
}