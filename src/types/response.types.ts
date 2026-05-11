export interface BreachRecord {
  email: string;
  name?: string;
  phone?: string;
  address?: string;
  username?: string;
  lastip?: string;
  hash?: string;
  salt?: string;
  uid?: string;
  created?: string;
  updated?: string;
}
export interface DatabaseSearchResponse {
  took: number;
  size: number;
  results: {
    [databaseName: string]: BreachRecord[];
  }
}