import fs from "node:fs";
import path from "node:path";

export interface UserData {
  country: string;
  timezone: string;
  reminderEnabled: boolean;
  reminderTime: string;
}

const DEFAULT_USER: UserData = {
  country: "🇩🇿 الجزائر",
  timezone: "Africa/Algiers",
  reminderEnabled: false,
  reminderTime: "07:00",
};

const DATA_FILE = path.join(process.cwd(), "bot_users.json");

let cache: Record<string, UserData> = {};

function loadData(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      cache = JSON.parse(raw) as Record<string, UserData>;
    }
  } catch {
    cache = {};
  }
}

function saveData(): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2), "utf-8");
  } catch {
  }
}

loadData();

export function getUser(userId: string): UserData {
  if (!cache[userId]) {
    cache[userId] = { ...DEFAULT_USER };
    saveData();
  }
  return cache[userId]!;
}

export function updateUser(userId: string, data: Partial<UserData>): void {
  cache[userId] = { ...getUser(userId), ...data };
  saveData();
}

export function getAllUsers(): Record<string, UserData> {
  return cache;
}
