# Quritgich aparat AI — erta ogohlantirish va hodisa tahlili

Nam materialni quritish qurilmasining brauzerdagi simulyatori: jarayon modeli, PLC himoyasi, AI xavf indeksi (Isolation Forest + fizik qoldiqlar), sabab tashxisi, mnemosxema va 3D ko‘rinish.

## Ishga tushirish
`index.html` ni brauzerda oching (server shart emas).

## Tuzilma
| Yo‘l | Vazifasi |
|---|---|
| `index.html` | Sahifa tuzilmasi |
| `css/style.css` | Uslublar |
| `js/config.js` | **Jarayon parametrlari — yagona manba** |
| `js/sim.js` | Jarayon modeli, PLC himoyasi, qoldiqlar, xavf indeksi, tashxis, Excel o‘qish/yozish |
| `js/app.js` | Interfeys, grafiklar, mnemosxema, ommaviy sinov |
| `js/journal.js` | Hodisalar jurnali, tasdiqlash (ACK), CSV eksport |
| `js/i18n.js` | UZ / RU / EN tarjimalari |
| `js/sprites.js` | Mnemosxema tasvirlari (base64) |
| `js/scene3d.bundle.js`, `js/scene3d-view.js`, `js/pdf-quiz.js`, `js/mn3d.js` | 3D sahna, PDF hisobot, operator mashqi |
| `electron/main.js`, `build/icon.png` | Windows ish stoli dasturi (Electron) |
| `tests/` | Avtomatik sinovlar (`npm test`) |
| `tools/benchmark.js` | AI ni EWMA / CUSUM bilan solishtirish (`npm run benchmark` → `docs/BENCHMARK.md`) |
| `docs/METODOLOGIYA.md` | Model taxminlari, cheklovlar, yo‘l xaritasi |

## Sinov
```
npm test
```
Sinovlar: normal ishda soxta signal yo‘qligi, har bir nosozlik turi topilishi va sababi to‘g‘ri aniqlanishi, massa/energiya balansi, ±10 % o‘lchov xatosiga chidamlilik, Matematik model matni bilan `config.js` mosligi. GitHub Actions har push va PRda ishga tushiradi.

## Windows dastur (o'rnatiladigan)
Internet va brauzersiz ishlaydi (Electron). **Yuklab olish:** repoda **Releases** bo'limi → `Quritgich-aparat-AI-Setup-<versiya>.exe`. Yangi versiya yig'ish: Actions → "Windows dastur" → Run workflow (versiya tegini kiriting, masalan `v1.0.0`).
Dastur imzosiz: Windows SmartScreen chiqarsa, "Qo'shimcha ma'lumot" → "Baribir ishga tushirish".
Mahalliy sinov: `npm install` so'ng `npm run desktop`; o'rnatuvchi: `npm run dist:win` (Windows'da).

## Bitta faylli versiya
`node tools/build-single.js` → `dist/Quritgich-aparat-AI.html` (butun ilova bitta fayl, ikki marta bosib ochiladi, internet kerak emas). `--artifact` bayrog‘i claude.ai Artifact uchun variant yaratadi. Eslatma: Artifact ichida fayl yuklab olish (Excel/CSV eksport) va PDF chop etish brauzer cheklovi tufayli ishlamaydi; ular Windows dasturida va oddiy saytda ishlaydi.

## GitHub Pages
Settings → Pages → Source: **GitHub Actions**. Sayt `main` branchga har merge’dan keyin avtomatik yangilanadi (Actions → "Pages" dan qo‘lda ham ishga tushirish mumkin).
