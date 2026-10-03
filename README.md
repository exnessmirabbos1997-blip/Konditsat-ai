# Quritgich AI — erta ogohlantirish va hodisa tahlili

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
| `js/sprites.js` | Mnemosxema tasvirlari (base64) |
| `js/scene3d.bundle.js`, `js/scene3d-view.js`, `js/pdf-quiz.js`, `js/mn3d.js` | 3D sahna, PDF hisobot, operator mashqi |
| `tests/` | Avtomatik sinovlar (`npm test`) |
| `docs/METODOLOGIYA.md` | Model taxminlari, cheklovlar, yo‘l xaritasi |

## Sinov
```
npm test
```
Sinovlar: normal ishda soxta signal yo‘qligi, har bir nosozlik turi topilishi va sababi to‘g‘ri aniqlanishi, massa/energiya balansi, ±10 % o‘lchov xatosiga chidamlilik, Matematik model matni bilan `config.js` mosligi. GitHub Actions har push va PRda ishga tushiradi.

## GitHub Pages
Settings → Pages → Source: **GitHub Actions**, so‘ng Actions bo‘limida "Pages" ishini qo‘lda ishga tushiring.
