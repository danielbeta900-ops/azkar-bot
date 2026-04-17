import cron from "node-cron";
import type { Telegraf } from "telegraf";
import { getAllUsers } from "./storage.js";
import {
  morningAzkar,
  eveningAzkar,
  sleepAzkar,
  tasabih,
  masnooDuas,
  afterPrayerAzkar,
} from "./content.js";
import { HADITH_OF_DAY } from "./hadith.js";

// ─── الأوقات المجدولة (ساعة، دقيقة) ────────────────────────────────────────
const TIMES = {
  morning:   { hour: 6,  minute: 0 },   // أذكار الصباح
  noon:      { hour: 12, minute: 0 },   // ذكر الظهر
  afternoon: { hour: 15, minute: 30 },  // ذكر العصر
  evening:   { hour: 19, minute: 0 },   // أذكار المساء
  night:     { hour: 21, minute: 30 },  // ذكر الليل
  sleep:     { hour: 23, minute: 0 },   // أذكار النوم
};

function getRandomItem<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

function getTimeInTimezone(timezone: string): { hour: number; minute: number } {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const rawHour = parts.find((p) => p.type === "hour")?.value ?? "0";
    const rawMinute = parts.find((p) => p.type === "minute")?.value ?? "0";
    return { hour: parseInt(rawHour) % 24, minute: parseInt(rawMinute) };
  } catch {
    return { hour: 0, minute: 0 };
  }
}

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function isTime(current: { hour: number; minute: number }, target: { hour: number; minute: number }): boolean {
  return current.hour === target.hour && current.minute === target.minute;
}

// ─── بناء الرسائل ────────────────────────────────────────────────────────────

function buildMorningMessage(): string {
  const zikr = getRandomItem(morningAzkar);
  return (
    `🌅 صباح الذكر والإيمان\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${zikr.text}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🔢 العدد: ${zikr.count} ${zikr.count === 1 ? "مرة" : "مرات"}\n` +
    `${zikr.source}` +
    (zikr.benefit ? `\n\nالفضل: ${zikr.benefit}` : "") +
    `\n\nاضغط /start لفتح القائمة`
  );
}

function buildNoonMessage(): string {
  const lists = [...tasabih, ...afterPrayerAzkar];
  const zikr = getRandomItem(lists);
  return (
    `🕛 تذكير وقت الظهر\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${zikr.text}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🔢 العدد: ${zikr.count} ${zikr.count === 1 ? "مرة" : "مرات"}\n` +
    `${zikr.source}` +
    (zikr.benefit ? `\n\nالفضل: ${zikr.benefit}` : "") +
    `\n\nاضغط /start لفتح القائمة`
  );
}

function buildAfternoonMessage(): string {
  const zikr = getRandomItem(masnooDuas);
  return (
    `🕒 تذكير وقت العصر\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${zikr.text}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🔢 العدد: ${zikr.count} ${zikr.count === 1 ? "مرة" : "مرات"}\n` +
    `${zikr.source}` +
    (zikr.benefit ? `\n\nالفضل: ${zikr.benefit}` : "") +
    `\n\nاضغط /start لفتح القائمة`
  );
}

function buildEveningMessage(): string {
  const zikr = getRandomItem(eveningAzkar);
  return (
    `🌇 مساء الذكر والإيمان\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${zikr.text}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🔢 العدد: ${zikr.count} ${zikr.count === 1 ? "مرة" : "مرات"}\n` +
    `${zikr.source}` +
    (zikr.benefit ? `\n\nالفضل: ${zikr.benefit}` : "") +
    `\n\nاضغط /start لفتح القائمة`
  );
}

function buildNightMessage(): string {
  const lists = [...tasabih, ...masnooDuas];
  const zikr = getRandomItem(lists);
  return (
    `🌙 تذكير المساء\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${zikr.text}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🔢 العدد: ${zikr.count} ${zikr.count === 1 ? "مرة" : "مرات"}\n` +
    `${zikr.source}` +
    (zikr.benefit ? `\n\nالفضل: ${zikr.benefit}` : "") +
    `\n\nاضغط /start لفتح القائمة`
  );
}

function buildSleepMessage(): string {
  const zikr = getRandomItem(sleepAzkar);
  return (
    `🌙 أذكار قبل النوم\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${zikr.text}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🔢 العدد: ${zikr.count} ${zikr.count === 1 ? "مرة" : "مرات"}\n` +
    `${zikr.source}` +
    (zikr.benefit ? `\n\nالفضل: ${zikr.benefit}` : "") +
    `\n\nاضغط /start لفتح القائمة`
  );
}

export function buildHadithMessage(): string {
  const dayIndex = getDayOfYear() % HADITH_OF_DAY.length;
  const hadith = HADITH_OF_DAY[dayIndex]!;
  return (
    `📖 حديث اليوم\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${hadith.text}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `${hadith.source}`
  );
}

// ─── المُجدِّد الرئيسي ────────────────────────────────────────────────────────

export function startScheduler(bot: Telegraf) {
  // يعمل كل دقيقة — يتحقق من وقت كل مستخدم حسب منطقته الزمنية
  cron.schedule("* * * * *", async () => {
    const users = getAllUsers();

    for (const [userId, userData] of Object.entries(users)) {
      if (!userData.reminderEnabled) continue;

      try {
        const current = getTimeInTimezone(userData.timezone);

        // 🌅 6:00 صباحاً — أذكار الصباح
        if (isTime(current, TIMES.morning)) {
          await bot.telegram.sendMessage(userId, buildMorningMessage());
        }

        // 🕛 12:00 ظهراً — ذكر الظهر
        if (isTime(current, TIMES.noon)) {
          await bot.telegram.sendMessage(userId, buildNoonMessage());
        }

        // 🕒 3:30 عصراً — ذكر العصر
        if (isTime(current, TIMES.afternoon)) {
          await bot.telegram.sendMessage(userId, buildAfternoonMessage());
        }

        // 🌇 7:00 مساءً — أذكار المساء
        if (isTime(current, TIMES.evening)) {
          await bot.telegram.sendMessage(userId, buildEveningMessage());
        }

        // 🌙 9:30 مساءً — ذكر الليل
        if (isTime(current, TIMES.night)) {
          await bot.telegram.sendMessage(userId, buildNightMessage());
        }

        // 🛌 11:00 مساءً — أذكار النوم
        if (isTime(current, TIMES.sleep)) {
          await bot.telegram.sendMessage(userId, buildSleepMessage());
        }
      } catch {
        // تجاهل الأخطاء الفردية
      }
    }
  });

  // حديث اليوم — يُرسل الساعة 8 صباحاً بتوقيت السيرفر
  cron.schedule("0 8 * * *", async () => {
    const users = getAllUsers();
    const message = buildHadithMessage();
    for (const [userId, userData] of Object.entries(users)) {
      if (!userData.reminderEnabled) continue;
      try {
        await bot.telegram.sendMessage(userId, message);
      } catch { }
    }
  });
}
