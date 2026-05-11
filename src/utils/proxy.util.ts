import fs from "node:fs/promises";
import type { AxiosProxyConfig } from "axios";
import {ProxyEntry} from "../types/proxy.types";

export async function parseProxyFile(filePath: string): Promise<ProxyEntry[]> {
  const text = await fs.readFile(filePath, "utf-8");

  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith("#"))
    .map(parseProxyLine)
    .filter(proxy => proxy !== null);
}

function parseProxyLine(line: string): ProxyEntry | null {
  const parts = line.trim().split(":");

  if (parts.length === 2) {
    const [host, portRaw] = parts;
    const port = Number(portRaw);

    if (!host || !Number.isInteger(port)) return null;

    return {
      protocol: "http",
      host,
      port,
    };
  }

  if (parts.length === 4) {
    const [host, portRaw, username, password] = parts;
    const port = Number(portRaw);

    if (!host || !username || !password || !Number.isInteger(port)) return null;

    return {
      protocol: "http",
      host,
      port,
      username,
      password,
    };
  }

  return null;
}

export function toAxiosProxy(proxy: ProxyEntry): AxiosProxyConfig {
  const axiosProxy: AxiosProxyConfig = {
    protocol: proxy.protocol,
    host: proxy.host,
    port: proxy.port,
  };

  if (proxy.username) {
    axiosProxy.auth = {
      username: proxy.username,
      password: proxy.password ?? "",
    };
  }

  return axiosProxy;
}

export function getRandomProxy(proxies: ProxyEntry[]): ProxyEntry | null {
  if (proxies.length === 0) return null;

  return proxies[Math.floor(Math.random() * proxies.length)] ?? null;
}