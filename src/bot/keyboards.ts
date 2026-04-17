import { Markup } from "telegraf";
import { COUNTRIES } from "./content.js";

export const mainMenuKeyboard = Markup.keyboard([
  ["🌅 أذكار الصباح", "🌇 أذكار المساء"],
  ["🌙 أذكار النوم", "⭐ أذكار الاستيقاظ"],
  ["💓 التسابيح", "👐 الأدعية المأثورة"],
  ["✈️ أذكار السفر", "🕌 أذكار بعد الصلاة"],
  ["🏠 أذكار المناسبات", "🛡 الرقية الشرعية"],
  ["🌸 أسماء الله الحسنى"],
  ["📖 حديث اليوم", "🎲 ذكر عشوائي"],
  ["🔔 التذكير اليومي", "🌍 تغيير البلد"],
  ["ℹ️ عن البوت"],
])
  .resize()
  .persistent();

export const navigationKeyboard = (catKey: string, index: number, total: number) =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback("⬅️ السابق", `p_${catKey}_${index}`),
      Markup.button.callback(`📊 ${index + 1}/${total}`, "cnt"),
      Markup.button.callback("التالي ➡️", `n_${catKey}_${index}`),
    ],
    [Markup.button.callback("🏠 القائمة الرئيسية", "main_menu")],
  ]);

export const reminderKeyboard = (enabled: boolean) =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback(
        enabled ? "🔕 إيقاف التذكير" : "🔔 تفعيل التذكير",
        enabled ? "reminder_off" : "reminder_on"
      ),
    ],
    [Markup.button.callback("🌍 تغيير البلد", "goto_country")],
    [Markup.button.callback("🏠 القائمة الرئيسية", "main_menu")],
  ]);

export const countryKeyboard = () => {
  const countryList = Object.keys(COUNTRIES);
  const rows = [];
  for (let i = 0; i < countryList.length; i += 2) {
    const row = [Markup.button.callback(countryList[i]!, `c_${i}`)];
    if (countryList[i + 1]) {
      row.push(Markup.button.callback(countryList[i + 1]!, `c_${i + 1}`));
    }
    rows.push(row);
  }
  rows.push([Markup.button.callback("🏠 القائمة الرئيسية", "main_menu")]);
  return Markup.inlineKeyboard(rows);
};
