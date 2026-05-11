export type ProxyEntry = {
  protocol: "http" | "https";
  host: string;
  port: number;
  username?: string;
  password?: string;
};