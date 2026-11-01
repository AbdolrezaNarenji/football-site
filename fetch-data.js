const fs = require("fs");

const KEY = process.env.FOOTBALL_API_KEY;
if (!KEY) {
  console.error("کلید پیدا نشد");
  process.exit(1);
}

const DAY = 86400000;
const fmt = (ms) => new Date(ms).toISOString().slice(0, 10);
const from = fmt(Date.now() - DAY);
const to = fmt(Date.now() + 3 * DAY);

async function main() {
  const url = `https://api.football-data.org/v4/matches?dateFrom=${from}&dateTo=${to}`;
  const res = await fetch(url, { headers: { "X-Auth-Token": KEY } });
  if (!res.ok) {
    console.error("خطا از سرور:", res.status);
    process.exit(1);
  }
  const data = await res.json();
  if (!Array.isArray(data.matches)) {
    console.error("جواب غیرمنتظره بود");
    process.exit(1);
  }

  const all = data.matches.map((m) => ({
    id: m.id,
    competition: m.competition?.name,
    date: m.utcDate,
    status: m.status,
    home: m.homeTeam?.shortName || m.homeTeam?.name,
    away: m.awayTeam?.shortName || m.awayTeam?.name,
    homeGoals: m.score?.fullTime?.home ?? null,
    awayGoals: m.score?.fullTime?.away ?? null,
  }));

  // چک سلامت: بازی تمام‌شده با نتیجه‌ی غیرعادی کنار گذاشته می‌شه
  const okGoal = (g) => Number.isInteger(g) && g >= 0 && g <= 20;
  const matches = all.filter(
    (m) => m.status !== "FINISHED" || (okGoal(m.homeGoals) && okGoal(m.awayGoals))
  );
  if (matches.length < all.length) {
    console.warn("بازی با نتیجه‌ی مشکوک:", all.length - matches.length);
  }

  // اگه همه‌ی نتیجه‌ها دقیقاً یکی باشن، داده مشکوکه و ذخیره نمی‌شه
  const finished = matches.filter((m) => m.status === "FINISHED");
  const scores = new Set(finished.map((m) => `${m.homeGoals}-${m.awayGoals}`));
  if (finished.length >= 8 && scores.size === 1) {
    console.error("همه‌ی نتیجه‌ها یکسانه؛ داده مشکوکه");
    process.exit(1);
  }

  fs.mkdirSync("data", { recursive: true });
  const out = { updatedAt: new Date().toISOString(), matches };
  fs.writeFileSync("data/matches.json", JSON.stringify(out, null, 2));
  console.log("تعداد بازی‌ها:", matches.length);
}

main();
