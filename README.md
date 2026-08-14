# Warkop Kusuma Analytics v2

Update dashboard:
- Palet merah/putih/biru.
- Revenue = SUM(amount + rounded_amount), transaction_type <> REFUND.
- Profit/Margin tidak dijadikan card KPI; profit hanya untuk trend analisis.
- Card Total Diskon = SUM(prorate_discount_billing).
- Produk terlaris berdasarkan Qty.
- Payment Mix diperbaiki dari fact_sales -> dim_payment.
- Filter range tanggal + granularitas hari/bulan/tahun.
- Trend jam ramai.

Setup:
1. Copy `.env.example` menjadi `.env`.
2. Isi DATABASE_URL PostgreSQL Supabase. Jangan gunakan prefix `jdbc:`.
3. `npm install`
4. `npm run dev`
5. Buka http://localhost:3000
