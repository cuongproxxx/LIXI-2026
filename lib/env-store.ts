import { promises as fs } from "node:fs";
import path from "node:path";

type EnvKey = "ADMIN_PASSWORD";

const ENV_FILE_PATH = path.join(process.cwd(), ".env.local");

function parseEnv(content: string): Record<string, string> {
  return content.split(/\r?\n/).reduce<Record<string, string>>((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return acc;

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) return acc;

    const key = trimmed.slice(0, equalIndex).trim();
    const value = trimmed.slice(equalIndex + 1).trim().replace(/^"(.*)"$/, "$1");
    if (key) acc[key] = value;
    return acc;
  }, {});
}

async function readEnvFile(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(ENV_FILE_PATH, "utf-8");
    return parseEnv(raw);
  } catch {
    return {};
  }
}

export async function getServerEnv(key: EnvKey): Promise<string> {
  const envFile = await readEnvFile();
  return (envFile[key] ?? process.env[key] ?? "").trim();
}
