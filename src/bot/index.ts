import { Telegraf, Markup } from "telegraf";
import { logger } from "../lib/logger.js";
import {
  morningAzkar,
  eveningAzkar,
  sleepAzkar,
  wakeUpAzkar,
  afterPrayerAzkar,
  travelAzkar,
  occasionAzkar,
  ruqyahAzkar,
  masnooDuas,
  tasabih,
  allahNames,
  COUNTRIES,
  type Zikr,
} from "./content.js";
import {
  mainMenuKeyboard,
  navigationKeyboard,
  reminderKeyboard,
  countryKeyboard,
} from "./keyboards.js";
import { getUser, updateUser, getAllUsers } from "./storage.js";
import { startScheduler, buildHadithMessage } from "./scheduler.js";

const ADMIN_ID = process.env["ADMIN_ID"] ?? "";

const CATEGORIES: Record<string, { list: Zikr[]; emoji: string; title: string; pattern: RegExp }> = {
  morning:  { list: morningAzkar,     emoji: "🌅", title: "أذكار الصباح",      pattern: /أذكار الصباح/ },
  evening:  { list: eveningAzkar,     emoji: "🌇", title: "أذكار المساء",      pattern: /أذكار المساء/ },
  sleep:    { list: sleepAzkar,       emoji: "🌙", title: "أذكار النوم",        pattern: /أذكار النوم/ },
  wake:     { list: wakeUpAzkar,      emoji: "⭐", title: "أذكار الاستيقاظ",   pattern: /أذكار الاستيقاظ/ },
  tasabih:  { list: tasabih,          emoji: "💓", title: "التسابيح",           pattern: /التسابيح/ },
  duas:     { list: masnooDuas,       emoji: "👐", title: "الأدعية المأثورة",   pattern: /الأدعية المأثورة/ },
  travel:   { list: travelAzkar,      emoji: "✈",  title: "أذكار السفر",        pattern: /أذكار السفر/ },
  prayer:   { list: afterPrayerAzkar, emoji: "🕌", title: "أذكار بعد الصلاة",  pattern: /أذكار بعد الصلاة/ },
  occasion: { list: occasionAzkar,    emoji: "🏠", title: "أذكار المناسبات",   pattern: /أذكار المناسبات/ },
  ruqyah:   { list: ruqyahAzkar,      emoji: "🛡",  title: "الرقية الشرعية",     pattern: /الرقية الشرعية/ },
  names:    { list: allahNames,       emoji: "🌸", title: "أسماء الله الحسنى", pattern: /أسماء الله الحسنى/ },
};

function formatZikr(zikr: Zikr, index: number, total: number, emoji: string, title: string): string {
  let msg = `${emoji} *${title}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `${zikr.text}\n\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🔢 *العدد:* ${zikr.count} ${zikr.count === 1 ? "مرة" : "مرات"}\n`;
  msg += `${zikr.source}`;
  if (zikr.benefit) msg += `\n\n✨ *الفضل:* ${zikr.benefit}`;
  msg += `\n\n📌 ${index + 1} / ${total}`;
  return msg;
}

function reminderText(country: string, enabled: boolean): string {
  return (
    `🔔 التذكير اليومي\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📍 البلد: ${country}\n` +
    `📡 الحالة: ${enabled ? "✅ مفعّل" : "❌ موقوف"}\n\n` +
    `🗓 جدول التذكيرات اليومية:\n` +
    `🌅 06:00 ص — أذكار الصباح\n` +
    `📖 08:00 ص — حديث اليوم\n` +
    `🕛 12:00 ظ — ذكر الظهر\n` +
    `🕒 03:30 م — ذكر العصر\n` +
    `🌇 07:00 م — أذكار المساء\n` +
    `🌙 09:30 م — ذكر الليل\n` +
    `🛌 11:00 م — أذكار النوم\n\n` +
    `يرسل البوت الأذكار تلقائياً حسب توقيت بلدك`
  );
}

const MAIN_MENU_MSG = "اختر من القائمة 👇\n\n_اضغط على أي قسم للبدء_";

export function initBot(): void {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) {
    logger.error("TELEGRAM_BOT_TOKEN is not set");
    return;
  }

  const bot = new Telegraf(token);

  // ── /start ──────────────────────────────────────────────────────────────
  bot.start(async (ctx) => {
    const name = ctx.from?.first_name ?? "أخي";
    getUser(String(ctx.from?.id));
    await ctx.reply(
      `السلام عليكم ورحمة الله وبركاته 🌿\n\n` +
      `أهلاً وسهلاً *${name}*\n\n` +
      `🕌 بوت *حصن المسلم* يرافقك في يومك بالأذكار والأدعية الثابتة عن النبي ﷺ\n\n` +
      `🔔 *مميزات البوت:*\n` +
      `• أذكار الصباح والمساء والنوم والاستيقاظ\n` +
      `• أذكار بعد الصلاة والسفر والمناسبات\n` +
      `• الرقية الشرعية وأسماء الله الحسنى\n` +
      `• حديث اليوم يومياً\n` +
      `• تذكير تلقائي الساعة 6 صباحاً و7 مساءً\n\n` +
      `اختر من القائمة أدناه ⬇️`,
      { parse_mode: "Markdown", ...mainMenuKeyboard }
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  أزرار لوحة المفاتيح — regex لتجنب مشكلة variation selectors في الإيموجي
  // ══════════════════════════════════════════════════════════════════════════

  bot.hears(/القائمة الرئيسية|^رجوع$|^قائمة$/, async (ctx) => {
    await ctx.reply(MAIN_MENU_MSG, { parse_mode: "Markdown", ...mainMenuKeyboard });
  });

  for (const [catKey, catData] of Object.entries(CATEGORIES)) {
    bot.hears(catData.pattern, async (ctx) => {
      const { list, emoji, title } = catData;
      await ctx.reply(
        formatZikr(list[0]!, 0, list.length, emoji, title),
        { parse_mode: "Markdown", ...navigationKeyboard(catKey, 0, list.length) }
      );
    });
  }

  bot.hears(/حديث اليوم/, async (ctx) => {
    await ctx.reply(buildHadithMessage(), { parse_mode: "Markdown" });
  });

  bot.hears(/ذكر عشوائي/, async (ctx) => {
    const all = [...morningAzkar, ...eveningAzkar, ...sleepAzkar, ...wakeUpAzkar, ...tasabih, ...masnooDuas];
    const zikr = all[Math.floor(Math.random() * all.length)]!;
    let msg = `🎲 *ذكر عشوائي*\n━━━━━━━━━━━━━━━━━━━━\n\n${zikr.text}\n\n━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🔢 *العدد:* ${zikr.count} ${zikr.count === 1 ? "مرة" : "مرات"}\n${zikr.source}`;
    if (zikr.benefit) msg += `\n\n✨ *الفضل:* ${zikr.benefit}`;
    await ctx.reply(msg, { parse_mode: "Markdown" });
  });

  bot.hears(/التذكير اليومي/, async (ctx) => {
    const user = getUser(String(ctx.from?.id));
    await ctx.reply(reminderText(user.country, user.reminderEnabled), {
      parse_mode: "Markdown",
      ...reminderKeyboard(user.reminderEnabled),
    });
  });

  bot.hears(/تغيير البلد/, async (ctx) => {
    const user = getUser(String(ctx.from?.id));
    await ctx.reply(
      `🌍 *اختر بلدك*\n\n📍 *البلد الحالي:* ${user.country}\n\nسيتم إرسال التذكيرات حسب توقيت بلدك`,
      { parse_mode: "Markdown", ...countryKeyboard() }
    );
  });

  bot.hears(/عن البوت/, async (ctx) => {
    const shareText = encodeURIComponent("اكتشف بوت حصن المسلم للأذكار اليومية والتذكيرات الإسلامية 🌿");
    const shareUrl = `https://t.me/share/url?url=https://t.me/IslamicAzkar_Bot&text=${shareText}`;

    await ctx.reply(
      `📿 بوت حصن المسلم\n━━━━━━━━━━━━━━━━━━━━\n\n` +
      `بوت إسلامي متكامل يحتوي على الأذكار والأدعية الثابتة بالدليل من القرآن الكريم والسنة النبوية الصحيحة.\n\n` +
      `📚 يحتوي على:\n` +
      `• أذكار الصباح والمساء\n• أذكار النوم والاستيقاظ\n• أذكار بعد الصلاة\n` +
      `• أذكار السفر والمناسبات\n• الرقية الشرعية\n• أسماء الله الحسنى الـ99\n` +
      `• التسابيح والأدعية المأثورة\n• حديث اليوم يومياً\n• تذكير تلقائي 6 مرات يومياً\n\n` +
      `🔔 جدول التذكيرات:\n` +
      `🌅 06:00 صباحاً — أذكار الصباح\n` +
      `📖 08:00 صباحاً — حديث اليوم\n` +
      `🕛 12:00 ظهراً — ذكر الظهر\n` +
      `🕒 03:30 عصراً — ذكر العصر\n` +
      `🌇 07:00 مساءً — أذكار المساء\n` +
      `🌙 09:30 مساءً — ذكر الليل\n` +
      `🛌 11:00 مساءً — أذكار النوم\n\n` +
      `🤲 دعاء لصاحب البوت:\n` +
      `اللهم اغفر لصاحب هذا البوت وأهله وذريته وارزقه في الدنيا والآخرة\n\n` +
      `من دل على خير فله مثل أجر فاعله`,
      {
        ...Markup.inlineKeyboard([
          [Markup.button.url("📤 شارك البوت مع أصدقائك", shareUrl)],
          [Markup.button.url("🔗 فتح البوت", "https://t.me/IslamicAzkar_Bot")],
        ]),
      }
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  Inline Callbacks
  // ══════════════════════════════════════════════════════════════════════════

  bot.action("main_menu", async (ctx) => {
    await ctx.answerCbQuery();
    try { await ctx.editMessageReplyMarkup(undefined); } catch { /* ok */ }
    await ctx.reply(MAIN_MENU_MSG, { parse_mode: "Markdown", ...mainMenuKeyboard });
  });

  bot.action("cnt", async (ctx) => {
    await ctx.answerCbQuery("📊 موقعك في الأذكار");
  });

  bot.action(/^n_(\w+)_(\d+)$/, async (ctx) => {
    const [, catKey, idxStr] = ctx.match as RegExpMatchArray;
    const cat = CATEGORIES[catKey!];
    if (!cat) { await ctx.answerCbQuery("⚠️ حدث خطأ"); return; }
    const next = (parseInt(idxStr!) + 1) % cat.list.length;
    try {
      await ctx.editMessageText(
        formatZikr(cat.list[next]!, next, cat.list.length, cat.emoji, cat.title),
        { parse_mode: "Markdown", ...navigationKeyboard(catKey!, next, cat.list.length) }
      );
    } catch { /* same text */ }
    await ctx.answerCbQuery();
  });

  bot.action(/^p_(\w+)_(\d+)$/, async (ctx) => {
    const [, catKey, idxStr] = ctx.match as RegExpMatchArray;
    const cat = CATEGORIES[catKey!];
    if (!cat) { await ctx.answerCbQuery("⚠️ حدث خطأ"); return; }
    const prev = (parseInt(idxStr!) - 1 + cat.list.length) % cat.list.length;
    try {
      await ctx.editMessageText(
        formatZikr(cat.list[prev]!, prev, cat.list.length, cat.emoji, cat.title),
        { parse_mode: "Markdown", ...navigationKeyboard(catKey!, prev, cat.list.length) }
      );
    } catch { /* same text */ }
    await ctx.answerCbQuery();
  });

  bot.action("reminder_on", async (ctx) => {
    updateUser(String(ctx.from?.id), { reminderEnabled: true });
    const user = getUser(String(ctx.from?.id));
    try {
      await ctx.editMessageText(reminderText(user.country, true),
        { parse_mode: "Markdown", ...reminderKeyboard(true) });
    } catch { /* ok */ }
    await ctx.answerCbQuery("✅ تم تفعيل التذكير");
  });

  bot.action("reminder_off", async (ctx) => {
    updateUser(String(ctx.from?.id), { reminderEnabled: false });
    const user = getUser(String(ctx.from?.id));
    try {
      await ctx.editMessageText(reminderText(user.country, false),
        { parse_mode: "Markdown", ...reminderKeyboard(false) });
    } catch { /* ok */ }
    await ctx.answerCbQuery("🔕 تم إيقاف التذكير");
  });

  bot.action("goto_country", async (ctx) => {
    await ctx.answerCbQuery();
    const user = getUser(String(ctx.from?.id));
    try {
      await ctx.editMessageText(
        `🌍 *اختر بلدك*\n\n📍 *البلد الحالي:* ${user.country}\n\nسيتم إرسال التذكيرات حسب توقيت بلدك`,
        { parse_mode: "Markdown", ...countryKeyboard() }
      );
    } catch { /* ok */ }
  });

  bot.action(/^c_(\d+)$/, async (ctx) => {
    const idx = parseInt((ctx.match as RegExpMatchArray)[1]!);
    const countryList = Object.keys(COUNTRIES);
    const countryName = countryList[idx];
    if (!countryName) { await ctx.answerCbQuery("⚠️ حدث خطأ"); return; }
    updateUser(String(ctx.from?.id), { country: countryName, timezone: COUNTRIES[countryName]! });
    try {
      await ctx.editMessageText(
        `✅ *تم تغيير البلد*\n\n📍 *البلد:* ${countryName}\n🕐 *المنطقة الزمنية:* ${COUNTRIES[countryName]}\n\n` +
        `🌅 أذكار الصباح ← 6:00 صباحاً\n📖 حديث اليوم ← 8:00 صباحاً\n🌇 أذكار المساء ← 7:00 مساءً\n\n` +
        `_حسب توقيت ${countryName}_`,
        { parse_mode: "Markdown", ...Markup.inlineKeyboard([[Markup.button.callback("🏠 القائمة الرئيسية", "main_menu")]]) }
      );
    } catch { /* ok */ }
    await ctx.answerCbQuery(`✅ ${countryName}`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  أوامر الإدارة
  // ══════════════════════════════════════════════════════════════════════════

  bot.command("broadcast", async (ctx) => {
    if (String(ctx.from?.id) !== ADMIN_ID) { await ctx.reply("⛔ غير مصرح لك"); return; }
    const text = ctx.message.text.replace("/broadcast", "").trim();
    if (!text) { await ctx.reply("⚠️ اكتب الرسالة بعد /broadcast"); return; }
    const users = getAllUsers();
    let sent = 0, failed = 0;
    for (const uid of Object.keys(users)) {
      try { await bot.telegram.sendMessage(uid, `📢 *إعلان:*\n\n${text}`, { parse_mode: "Markdown" }); sent++; }
      catch { failed++; }
    }
    await ctx.reply(`✅ اكتمل الإرسال\n📤 نجح: ${sent}\n❌ فشل: ${failed}`);
  });

  bot.command("stats", async (ctx) => {
    if (String(ctx.from?.id) !== ADMIN_ID) return;
    const users = getAllUsers();
    const total = Object.keys(users).length;
    const withReminder = Object.values(users).filter(u => u.reminderEnabled).length;
    const countries: Record<string, number> = {};
    for (const u of Object.values(users)) countries[u.country] = (countries[u.country] ?? 0) + 1;
    const top = Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, n]) => `  ${c}: ${n}`).join("\n");
    await ctx.reply(
      `📊 *إحصائيات البوت:*\n\n👥 المستخدمون: ${total}\n🔔 التذكير مفعّل: ${withReminder}\n🔕 موقوف: ${total - withReminder}\n\n🌍 *أكثر البلدان:*\n${top}`,
      { parse_mode: "Markdown" }
    );
  });

  bot.command("hadith", async (ctx) => {
    await ctx.reply(buildHadithMessage(), { parse_mode: "Markdown" });
  });

  // ── أي رسالة أخرى ────────────────────────────────────────────────────────
  bot.on("message", async (ctx) => {
    await ctx.reply(MAIN_MENU_MSG, { parse_mode: "Markdown", ...mainMenuKeyboard });
  });

  // معالج الأخطاء العام — يمنع البوت من التوقف عند أي خطأ
  bot.catch((err, ctx) => {
    logger.error({ err, update: ctx.update }, "Bot error");
  });

  startScheduler(bot);
  bot.launch({ dropPendingUpdates: true });
  logger.info("🤖 Telegram bot started successfully");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
