// ===== НАСТРОЙКИ САЙТА =====
const CONFIG = {
  NAME: "MUSOR FAMILY",
  SERVER: "Region RP",
  DISCORD: "",   // ссылка-приглашение в Discord (необязательно)
  WEBHOOK: "",   // Discord webhook для заявок на вступление (необязательно)
  WEBHOOK_WAREHOUSE: "https://discord.com/api/webhooks/1575181985259716808/AC0TMRzGpLwnStMUu_I8e-SPwkN2erqBLGhPgjzpdemitL2X_BpkOTEj3q3kQZ00_5r6", // запросы склада
  // Предметы склада. Пример:
  // { id: "ammo", name: "Патроны", stock: 100, limit: 10, cooldownMin: 60 }
  // stock — сколько всего на складе, limit — макс. за один раз на человека, cooldownMin — КД в минутах
  ITEMS: [
    { id: "ak74", name: "Автомат АК-74", img: "images/ak74.jpg", stock: 10, limit: 1, cooldownMin: 240 }
  ]
};
