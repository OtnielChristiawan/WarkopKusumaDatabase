import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;

  const today = new Date().toISOString().slice(0, 10);

  const start =
    params.get("start") ||
    `${new Date().getFullYear()}-01-01`;

  const end =
    params.get("end") ||
    today;

  const granularity =
    params.get("granularity") === "day"
      ? "day"
      : params.get("granularity") === "year"
      ? "year"
      : "month";

  // Validasi tanggal
  if (start > end) {
    return NextResponse.json(
      {
        error: "Tanggal awal tidak boleh setelah tanggal akhir.",
      },
      { status: 400 }
    );
  }

  /*
   * Menentukan grouping trend:
   *
   * day   → 2026-08-14
   * month → 2026-08
   * year  → 2026
   */
  const periodExpression =
    granularity === "day"
      ? `TO_CHAR(s.order_date, 'YYYY-MM-DD')`
      : granularity === "year"
      ? `TO_CHAR(s.order_date, 'YYYY')`
      : `TO_CHAR(s.order_date, 'YYYY-MM')`;

  try {
    // =========================================================
    // 1. KPI
    // =========================================================

    const kpiQuery = pool.query(
      `
      SELECT

        -- Total Revenue
        COALESCE(
          SUM(
            CASE
              WHEN transaction_type <> 'REFUND'
              THEN amount + rounded_amount
              ELSE 0
            END
          ),
          0
        ) AS revenue,

        -- Total Diskon
        COALESCE(
          SUM(prorate_discount_billing),
          0
        ) AS discount,

        -- Total Qty
        COALESCE(
          SUM(
            CASE
              WHEN transaction_type <> 'REFUND'
              THEN qty
              ELSE 0
            END
          ),
          0
        ) AS qty,

        -- Total Transaksi
        COUNT(
          DISTINCT CASE
            WHEN transaction_type <> 'REFUND'
            THEN order_no
          END
        ) AS transactions

      FROM fact_sales

      WHERE order_date BETWEEN $1::date AND $2::date
      `,
      [start, end]
    );

    // =========================================================
    // 2. TREND REVENUE & PROFIT
    // =========================================================

    const monthlyQuery = pool.query(
      `
      SELECT

        ${periodExpression} AS period,

        -- Revenue
        COALESCE(
          SUM(
            CASE
              WHEN s.transaction_type <> 'REFUND'
              THEN s.amount + s.rounded_amount
              ELSE 0
            END
          ),
          0
        ) AS revenue,

        -- Profit sistem
        COALESCE(
          SUM(
            CASE
              WHEN s.transaction_type <> 'REFUND'
              THEN s.profit
              ELSE 0
            END
          ),
          0
        ) AS profit

      FROM fact_sales s

      WHERE s.order_date BETWEEN $1::date AND $2::date

      GROUP BY ${periodExpression}

      ORDER BY period
      `,
      [start, end]
    );

    // =========================================================
    // 3. PRODUK TERLARIS
    // =========================================================
    //
    // Ranking berdasarkan QTY.
    //
    // Revenue/profit tetap dikirim supaya frontend bisa
    // menampilkan informasi tambahan kalau diperlukan.
    //

    const productsQuery = pool.query(
      `
      SELECT

        COALESCE(
          p.product_name,
          s.item_name,
          'UNKNOWN'
        ) AS product_name,

        -- Qty terjual
        COALESCE(
          SUM(
            CASE
              WHEN s.transaction_type <> 'REFUND'
              THEN s.qty
              ELSE 0
            END
          ),
          0
        ) AS qty,

        -- Revenue produk
        COALESCE(
          SUM(
            CASE
              WHEN s.transaction_type <> 'REFUND'
              THEN s.amount + s.rounded_amount
              ELSE 0
            END
          ),
          0
        ) AS sales,

        -- Profit sistem
        COALESCE(
          SUM(
            CASE
              WHEN s.transaction_type <> 'REFUND'
              THEN s.profit
              ELSE 0
            END
          ),
          0
        ) AS profit

      FROM fact_sales s

      LEFT JOIN dim_product p
        ON s.product_key = p.product_key

      WHERE s.order_date BETWEEN $1::date AND $2::date

      GROUP BY
        COALESCE(
          p.product_name,
          s.item_name,
          'UNKNOWN'
        )

      ORDER BY qty DESC

      LIMIT 10
      `,
      [start, end]
    );

    // =========================================================
    // 4. PAYMENT MIX
    // =========================================================

    const paymentsQuery = pool.query(`
    SELECT
        COALESCE(
            NULLIF(TRIM(dp.payment_type), ''),
            'Unknown'
        ) AS payment_type,

        COALESCE(
            SUM(
                CASE
                    WHEN s.transaction_type <> 'REFUND'
                    THEN s.amount + s.rounded_amount
                    ELSE 0
                END
            ),
            0
        ) AS revenue

    FROM fact_sales s

    LEFT JOIN dim_payment dp
        ON s.payment_key = dp.payment_key

    WHERE
        s.order_date BETWEEN $1::date AND $2::date
        AND s.transaction_type <> 'REFUND'

    GROUP BY
        COALESCE(
            NULLIF(TRIM(dp.payment_type), ''),
            'Unknown'
        )

    HAVING
        SUM(
            CASE
                WHEN s.transaction_type <> 'REFUND'
                THEN s.amount + s.rounded_amount
                ELSE 0
            END
        ) <> 0

    ORDER BY revenue DESC
`, [start, end]);

    // =========================================================
    // 5. TREND JAM RAMAI
    // =========================================================
    //
    // Menggunakan transaction_hour.
    //
    // Contoh:
    // 18 → revenue jam 18
    // 19 → revenue jam 19
    // dst.
    //

    const hoursQuery = pool.query(
      `
      SELECT

        s.transaction_hour AS hour,

        -- Revenue per jam
        COALESCE(
          SUM(
            CASE
              WHEN s.transaction_type <> 'REFUND'
              THEN s.amount + s.rounded_amount
              ELSE 0
            END
          ),
          0
        ) AS revenue,

        -- Jumlah transaksi per jam
        COUNT(
          DISTINCT CASE
            WHEN s.transaction_type <> 'REFUND'
            THEN s.order_no
          END
        ) AS transactions

      FROM fact_sales s

      WHERE s.order_date BETWEEN $1::date AND $2::date

        AND s.transaction_hour BETWEEN 0 AND 23

      GROUP BY
        s.transaction_hour

      ORDER BY
        s.transaction_hour
      `,
      [start, end]
    );

    // =========================================================
    // JALANKAN SEMUA QUERY
    // =========================================================

    const [
      kpi,
      monthly,
      products,
      payments,
      hours,
    ] = await Promise.all([
      kpiQuery,
      monthlyQuery,
      productsQuery,
      paymentsQuery,
      hoursQuery,
    ]);

    // =========================================================
    // RESPONSE
    // =========================================================

    return NextResponse.json({
      success: true,

      filter: {
        start,
        end,
        granularity,
      },

      kpi: kpi.rows[0],

      monthly: monthly.rows,

      products: products.rows,

      payments: payments.rows,

      hours: hours.rows,
    });

  } catch (error: any) {

    console.error(
      "Dashboard API Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Database error",
      },
      { status: 500 }
    );
  }
}