# Benchmark: AI xavf indeksi va EWMA / CUSUM

Sintetik ma'lumotda: 100 ta normal ish va 10 turdagi nosozlikdan 30 tadan (3 tasi bir vaqtdagi ikki nosozlik). Baho oynasi — nosozlik boshlanishidan 5 daqiqa oldin → himoya ishlagunicha; normal ishda 30 daqiqadan keyingi butun davr. Chegara har bir usul uchun normal ishlarning ≤ 2 % ida soxta signal beradigan eng past qiymat qilib tanlangan (adolatli taqqoslash). Baza usullar 9 ta datchikning har biriga alohida (EWMA λ = 0,2; CUSUM k = 0,5σ), nominal normal ma'lumotdan olingan o'rtacha va σ bilan; AI modeli nominal shovqinda o'qitilgan.

## Nominal sharoit (shovqin ×1, nosozlik jiddiyligi tasodifiy)

| Usul | AUC | Soxta signal | Aniqlangan (TPR) | O'rtacha ogohlantirish, min | Aniqlangan / himoya ishlagan |
|---|---|---|---|---|---|
| AI xavf indeksi R | 1.000 | 2 % | 100 % | 35.7 | 300 / 300 |
| EWMA (9 datchik) | 1.000 | 2 % | 100 % | 36.1 | 300 / 300 |
| CUSUM (9 datchik) | 0.783 | 2 % | 33 % | 29.9 | 99 / 300 |

## Shovqin ×2 (model ×1 da o‘qitilgan)

| Usul | AUC | Soxta signal | Aniqlangan (TPR) | O'rtacha ogohlantirish, min | Aniqlangan / himoya ishlagan |
|---|---|---|---|---|---|
| AI xavf indeksi R | 1.000 | 2 % | 100 % | 27.3 | 300 / 300 |
| EWMA (9 datchik) | 1.000 | 2 % | 100 % | 33.8 | 300 / 300 |
| CUSUM (9 datchik) | 0.750 | 2 % | 30 % | 29.8 | 91 / 300 |

## Yengil nosozliklar (jiddiylik 0,3)

| Usul | AUC | Soxta signal | Aniqlangan (TPR) | O'rtacha ogohlantirish, min | Aniqlangan / himoya ishlagan |
|---|---|---|---|---|---|
| AI xavf indeksi R | 1.000 | 2 % | 100 % | 36.7 | 300 / 300 |
| EWMA (9 datchik) | 1.000 | 2 % | 100 % | 39.9 | 300 / 300 |
| CUSUM (9 datchik) | 0.786 | 2 % | 41 % | 29.8 | 122 / 300 |

## Sekin rivojlanish (×3 sekinroq)

| Usul | AUC | Soxta signal | Aniqlangan (TPR) | O'rtacha ogohlantirish, min | Aniqlangan / himoya ishlagan |
|---|---|---|---|---|---|
| AI xavf indeksi R | 1.000 | 2 % | 100 % | 68.5 | 279 / 279 |
| EWMA (9 datchik) | 1.000 | 2 % | 100 % | 79.8 | 279 / 279 |
| CUSUM (9 datchik) | 0.938 | 2 % | 73 % | 44.4 | 202 / 279 |

**Xulosa uchun eslatma:** oddiy EWMA ham aniqlash vaqtida AI ga yaqin; AI ning asosiy ustunligi — sababni aniqlash (tashxis) va fizik izchillik qoldiqlari, EWMA/CUSUM esa faqat "nimadir o'zgardi" deydi. Ma'lumot shu simulyatorning o'zidan, real qurilmada natija boshqacha bo'lishi mumkin.
