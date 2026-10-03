# Metodologiya, cheklovlar va yo‘l xaritasi

## Model
Gorelka–o‘txona (birinchi tartibli inersiya), havo bilan aralashtirish, bug‘latish qobiliyati `E = κ·Q·c·(T_d − T_chiq)/r`, mahsulot namligi `w* = w_kir·exp(−β·E/W)` (3 daqiqa kechikish bilan), bunker massa balansi, PLC himoya chegaralari. Formulalar va birliklar — sahifadagi "Matematik model" bo‘limida; sonlar `js/config.js` da.

## AI qismi
1. Fizik izchillik qoldiqlari (7 ta, `r_T … r_W`), har biri nominal tarqoqlikka normallashtirilgan.
2. Isolation Forest (100 daraxt, 256 tanlanma, takrorlanmas tanlama) — normal ssenariylarda o‘qitiladi.
3. Dinamik xavf indeksi `R = max_j(w₁x₁ⱼ + w₂x₂ⱼ) + w₃x₃ + w₄x₄`.
4. Sabab tashxisi: qoldiq chegaradan (|r| ≥ 4) eng erta o‘tgan belgi asosiy sabab deb olinadi (teng vaqtda ustuvorlik bo‘yicha).

## Ma’lum cheklovlar (sinovlarda o‘lchangan)
- **Barcha parametrlar taxminiy.** η, β, τ lar real PLC ma’lumoti bilan sozlanmagan. Natijalar (masalan 100 % tashxis) sintetik nosozliklar va shu modelning o‘zida olingan — real qurilma uchun kafolat emas.
- **O‘lchash shovqini.** Model nominal shovqinda (×1) o‘qitilgan. Xavf indeksi chegaraga yaqinlik va qiyalikni 1 daqiqalik (shovqin oshgan sari uzoqroq) harakatlanuvchi o‘rtacha bo‘yicha hisoblaydi, bunker massa balansi esa LT01 qiyaligini eng kichik kvadratlar bilan baholaydi. Natijada soxta signal (4 soatlik normal ishlarda): ×1 da 0/30, ×2 da 0/30, ×3 da ≈ 11/30. Bundan yuqori shovqin uchun chegaralarni qayta sozlash kerak.
- **O‘lchov asboblari masshtab xatosi** (Q_g,max, Q_a1,max, F_max ±10 %) — soxta signal ≤ 10 % ishlarda (sinov bilan tekshirilgan).
- **Bug‘latish** empirik eksponenta bilan beriladi; nominalda E (1,02 t/soat) kirishdagi suvga (1,10 t/soat) yaqin, qat’iy massa balansi bo‘yicha mahsulot namligi ≈ 1,3 %, modelda ≈ 2,8 %. β ni real ma’lumotdan sozlash kerak.
- **Solishtirma energiya** ≈ 9,6 MJ/kg suv — real quritgichlarga nisbatan yuqori (η = 0,5 taxmini).
- Bitta fazali (faqat suv bug‘lanishi) model; zarrachalar o‘lchami, material issiqlik sig‘imi hisobga olinmagan.

## Taqqoslash (benchmark)
`npm run benchmark` AI indeksini oddiy EWMA va CUSUM bilan solishtiradi (ROC/AUC, soxta signal ≤ 2 % da aniqlash va ogohlantirish muddati; nominal, shovqin ×2, yengil nosozlik, sekin rivojlanish ssenariylari). Natijalar: [BENCHMARK.md](BENCHMARK.md). **Muhim xulosa:** sintetik ma’lumotda oddiy EWMA ham ogohlantirish muddati bo‘yicha AI indeksiga teng yoki biroz ilgari signal beradi; AI ning aniq ustunligi — sababni aniqlash (tashxis, 100 %) va fizik izchillik qoldiqlari. CUSUM bu ma’lumotda ancha past (AUC ≈ 0,75–0,94).

## Interfeys
- Hodisalar jurnali: PLC, AI va tizim voqealari, operator tasdiqlashi (ACK, brauzerda saqlanadi), CSV eksport; tasdiqlanmagan kritik/ogohlantirish soni menyuda ko‘rsatiladi.
- AI xabarlari ustuvorlik bo‘yicha saralanadi (kritik → ogohlantirish → diagnostika).
- TT02 trendida modeldan kutilgan qiymat ±2σ chiziqlari.
- Til: UZ / RU / EN (menyu, sarlavhalar, tugmalar, yorliqlar). Formulalar va jarayon xabarlari (AI xabarlari, Review matni) o‘zbek tilida qoladi.
- 3D: sifat tanlovi va kadr tezligi pasayganda avtomatik yengillashtirish.

## Yo‘l xaritasi (hali bajarilmagan)
1. Real PLC trendi (kamida bir necha smena) bilan η, β, τ ni eng kichik kvadratlar usulida sozlash — **real ma’lumot kerak**.
2. Bug‘latish modelini real ma’lumot bilan qayta sozlash (hozirgi β — taxminiy; massa balansi bo‘yicha E ≈ kirishdagi suv).
3. Shovqin ×3 va undan yuqori uchun chegaralarni avtomatik moslash.
4. Jarayon xabarlari va Review matnini RU/EN ga tarjima qilish; interaktiv ROC grafigi interfeysda.
