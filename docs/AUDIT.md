# Yakuniy sifat auditi (2026-10) va tuzatishlar

Audit usuli: Chromium'da 375/768/1024/1400 px, qorong'i va yorug' mavzu, `axe-core`, buzuq CSV va zararli sxema fayllari bilan chegaraviy sinovlar, unumdorlik o'lchovi, GitHub Pages kichik yo'li simulyatsiyasi.

| # | Topilma | Holat |
|---|---|---|
| S1 | Sxema importi/`localStorage` orqali XSS (atributlarga ekranlanmagan `c`, `id` va h.k.) | Tuzatildi: `sanitizeMnemo()` (tur/id/son/satr oq ro'yxati), import va yuklashda qo'llanadi; CSP meta qo'shildi; sinov bor |
| M1 | Mobil 3D: asboblar paneli ekranning 41 % ini egallaydi | Tuzatildi: "☰ Boshqaruv" menyusi, taqqoslash paneli yig'iladi |
| M2 | Mobil birinchi ekran juda band | Ixchamlashtirildi (topbar, boshqaruv paneli) |
| M3 | CSV: bo'sh fayl xom xatosi, qo'shtirnoq, matnli/manfiy ustunlar, `dt ≤ 0` | Tuzatildi: `parseCsvText`, `validateTable`, diskretlik/qism tekshiruvi, xatoda holat tiklanadi; sinovlar |
| M4 | `#constructor`/`#__proto__` hash bo'sh sahifa | `hasOwnProperty` bilan tuzatildi |
| M5 | Ommaviy sinov paytida "Qo'llash" yoqiq (eskirgan natija) | Sinov paytida `apply/reset` o'chiriladi |
| M6 | Yashirin bo'limlarda ham 60 Hz rAF; reduced-motion hisobga olinmaydi | Tsikl yashirin paytda to'xtaydi (rAF/s: 60 → 0), sensorli qurilmada 30 kadr/s, reduced-motion'da pauza |
| M7 | Ishga tushishda 505 ms blok | Model o'qitish bo'laklarga bo'lindi, IF kalibrovkasi tezlashtirildi (eng uzun blok ≈ 150 ms) |
| Q1–Q8 | Jurnal doirasi, mavzu saqlanishi, favicon/meta, sozlamalar chegaralari, vaznlar 0, `color-mix`/`backdrop-filter` zaxirasi, sana formati, `.gitignore`, kesh versiyasi, Pages sinovga bog'liq | Tuzatildi |
| A11y | Kontrast (acc, nishonlar), `#k3dQ` yorlig'i, `<main>`, sarlavha tartibi, canvas muqobili, fokuslanadigan skroll hududlari, kichik shriftlar | Tuzatildi; `axe-core`: 0 buzilish |

Hali qolgan (ma'lum cheklovlar): dinamik matnlar (AI xabarlari, Review) faqat o'zbekcha; 3D unumdorligi qurilma GPU siga bog'liq (avtomatik sifat pasaytirish bor); real PLC ma'lumoti bilan sozlash.
