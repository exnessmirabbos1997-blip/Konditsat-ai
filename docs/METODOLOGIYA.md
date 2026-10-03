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
- **O‘lchash shovqini.** Model nominal shovqinda (×1) o‘qitilgan. Shovqin ×2 bo‘lsa, 4 soatlik normal ishlarning ≈ 30–45 % ida soxta ogohlantirish chiqadi (asosan bunker massa balansi `r_I` va qiyalikka asoslangan x₂ hisobiga); ×3 da deyarli hammasida. Shovqin ko‘p real ma’lumot uchun chegaralarni qayta sozlash kerak. (CSV rejimida qoldiqlar normal qismdagi tarqoqlikka avtomatik moslanadi.)
- **O‘lchov asboblari masshtab xatosi** (Q_g,max, Q_a1,max, F_max ±10 %) — soxta signal ≤ 10 % ishlarda (sinov bilan tekshirilgan).
- **Bug‘latish** empirik eksponenta bilan beriladi; nominalda E (1,02 t/soat) kirishdagi suvga (1,10 t/soat) yaqin, qat’iy massa balansi bo‘yicha mahsulot namligi ≈ 1,3 %, modelda ≈ 2,8 %. β ni real ma’lumotdan sozlash kerak.
- **Solishtirma energiya** ≈ 9,6 MJ/kg suv — real quritgichlarga nisbatan yuqori (η = 0,5 taxmini).
- Bitta fazali (faqat suv bug‘lanishi) model; zarrachalar o‘lchami, material issiqlik sig‘imi hisobga olinmagan.

## Yo‘l xaritasi (hali bajarilmagan)
1. Real PLC trendi (kamida bir necha smena) bilan η, β, τ ni eng kichik kvadratlar usulida sozlash — **real ma’lumot kerak**.
2. Qo‘shimcha murakkab sinovlar: bir vaqtda ikki nosozlik, sekin siljish; ROC egri chizig‘i; EWMA/CUSUM bilan solishtirish.
3. Shovqinga moslashuvchan chegaralar.
4. Operator interfeysi: ustuvorlik bo‘yicha xabarlar, tasdiqlash tugmasi, hodisalar jurnali.
5. 3D uchun yengil rejim (mobil), ko‘p tillilik (UZ/RU/EN), ishonch oralig‘i.
