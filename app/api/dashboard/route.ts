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

  // =========================================================
  // VALIDASI TANGGAL
  // =========================================================

  if (start > end) {
    return NextResponse.json(
      {
        success: false,
        error: "Tanggal awal tidak boleh setelah tanggal akhir.",
      },
      { status: 400 }
    );
  }

  // =========================================================
  // GROUPING TREND
  // =========================================================

  const periodExpression =
    granularity === "day"
      ? `TO_CHAR(s.order_date, 'YYYY-MM-DD')`
      : granularity === "year"
      ? `TO_CHAR(s.order_date, 'YYYY')`
      : `TO_CHAR(s.order_date, 'YYYY-MM')`;

  // =========================================================
  // HITUNG PERIOD SEBELUMNYA UNTUK GROWTH
  // =========================================================

  const daysDiff = Math.ceil(
    (new Date(end).getTime() - new Date(start).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const prevEnd = new Date(new Date(start).getTime() - 1000 * 60 * 60 * 24)
    .toISOString()
    .slice(0, 10);

  const prevStart = new Date(
    new Date(prevEnd).getTime() - daysDiff * 1000 * 60 * 60 * 24
  )
    .toISOString()
    .slice(0, 10);

  let client;

  try {
    // =======================================================
    // AMBIL 1 KONEKSI SAJA
    // =======================================================

    client = await pool.connect();

    // =======================================================
    // 1. KPI
    // =======================================================

    const kpi = await client.query(
      `
      SELECT

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

        COALESCE(
          SUM(s.prorate_discount_billing),
          0
        ) AS discount,

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

        COUNT(
          DISTINCT CASE
            WHEN s.transaction_type <> 'REFUND'
            THEN s.order_no
          END
        ) AS transactions

      FROM fact_sales s

      WHERE
        s.order_date >= $1::date
        AND s.order_date < ($2::date + INTERVAL '1 day')
      `,
      [start, end]
    );

    // =======================================================
    // 1B. KPI PREVIOUS PERIOD (UNTUK GROWTH)
    // =======================================================

    const kpiPrevious = await client.query(
      `
      SELECT

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

        COALESCE(
          SUM(s.prorate_discount_billing),
          0
        ) AS discount,

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

        COUNT(
          DISTINCT CASE
            WHEN s.transaction_type <> 'REFUND'
            THEN s.order_no
          END
        ) AS transactions

      FROM fact_sales s

      WHERE
        s.order_date >= $1::date
        AND s.order_date < ($2::date + INTERVAL '1 day')
      `,
      [prevStart, prevEnd]
    );

    // =======================================================
    // 2. TREND REVENUE & PROFIT
    // =======================================================

    const monthly = await client.query(
      `
      SELECT

        ${periodExpression} AS period,

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

      WHERE
        s.order_date >= $1::date
        AND s.order_date < ($2::date + INTERVAL '1 day')

      GROUP BY ${periodExpression}

      ORDER BY period
      `,
      [start, end]
    );

    // =======================================================
    // 2B. REVENUE PER HARI DALAM SEMINGGU
    // =======================================================

    const weekdays = await client.query(
      `
      SELECT

        EXTRACT(ISODOW FROM s.order_date)::int AS day_number,

        CASE EXTRACT(ISODOW FROM s.order_date)::int
          WHEN 1 THEN 'Senin'
          WHEN 2 THEN 'Selasa'
          WHEN 3 THEN 'Rabu'
          WHEN 4 THEN 'Kamis'
          WHEN 5 THEN 'Jumat'
          WHEN 6 THEN 'Sabtu'
          WHEN 7 THEN 'Minggu'
        END AS day_name,

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

        COUNT(
          DISTINCT CASE
            WHEN s.transaction_type <> 'REFUND'
            THEN s.order_no
          END
        ) AS transactions

      FROM fact_sales s

      WHERE
        s.order_date >= $1::date
        AND s.order_date < ($2::date + INTERVAL '1 day')

      GROUP BY
        EXTRACT(ISODOW FROM s.order_date)::int

      ORDER BY
        day_number
      `,
      [start, end]
    );

    // =======================================================
    // 3. PRODUK TERLARIS
    // =======================================================

    const products = await client.query(
      `
      SELECT

        COALESCE(
          p.product_name,
          s.item_name,
          'UNKNOWN'
        ) AS product_name,

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

      WHERE
        s.order_date >= $1::date
        AND s.order_date < ($2::date + INTERVAL '1 day')

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

    // =======================================================
    // 4. PAYMENT MIX
    // =======================================================

    const payments = await client.query(
      `
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
        s.order_date >= $1::date
        AND s.order_date < ($2::date + INTERVAL '1 day')
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
      `,
      [start, end]
    );

    // =======================================================
    // 5. TREND JAM RAMAI
    // =======================================================

    const hours = await client.query(
      `
      SELECT

        s.transaction_hour AS hour,

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

        COUNT(
          DISTINCT CASE
            WHEN s.transaction_type <> 'REFUND'
            THEN s.order_no
          END
        ) AS transactions

      FROM fact_sales s

      WHERE
        s.order_date >= $1::date
        AND s.order_date < ($2::date + INTERVAL '1 day')

        AND s.transaction_hour BETWEEN 0 AND 23

      GROUP BY
        s.transaction_hour

      ORDER BY
        s.transaction_hour
      `,
      [start, end]
    );

    // =======================================================
    // RESPONSE
    // =======================================================

    return NextResponse.json({
      success: true,

      filter: {
        start,
        end,
        granularity,
      },

      kpi: kpi.rows[0],

      kpi_previous: kpiPrevious.rows[0],

      monthly: monthly.rows,

      weekdays: weekdays.rows,

      products: products.rows,

      payments: payments.rows,

      hours: hours.rows,
    });

  } catch (error: any) {

    console.error("Dashboard API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Database error",
      },
      { status: 500 }
    );

  } finally {

    // =======================================================
    // WAJIB: KEMBALIKAN KONEKSI KE POOL
    // =======================================================

    if (client) {
      client.release();
    }
  }
}