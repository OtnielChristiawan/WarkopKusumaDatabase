import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const start = params.get("start") || `${new Date().getFullYear()}-01-01`;
  const end = params.get("end") || today;
  const product = params.get("product") || "";
  const payment = params.get("payment") || "";

  if (start > end) {
    return NextResponse.json(
      { success: false, error: "Tanggal awal tidak boleh setelah tanggal akhir." },
      { status: 400 }
    );
  }

  const filters = [
    "s.order_date >= $1::date",
    "s.order_date < ($2::date + INTERVAL '1 day')",
    "s.transaction_type <> 'REFUND'",
  ];
  const values: string[] = [start, end];

  if (product) {
    values.push(product);
    filters.push(`COALESCE(p.product_name, s.item_name, 'UNKNOWN') = $${values.length}`);
  }

  if (payment) {
    values.push(payment);
    filters.push(
      `COALESCE(NULLIF(TRIM(dp.payment_type), ''), 'Unknown') = $${values.length}`
    );
  }

  const where = filters.join(" AND ");
  const refundWhere = where.replace("s.transaction_type <> 'REFUND'", "s.transaction_type = 'REFUND'");
  let client;

  try {
    client = await pool.connect();

    const [kpi, discount, products, payments, daily, refundSummary, refundProducts, details] = await Promise.all([
      client.query(
        `SELECT
          COALESCE(SUM(s.amount + s.rounded_amount), 0) AS revenue,
          COUNT(DISTINCT s.order_no) AS transactions,
          COALESCE(SUM(s.qty), 0) AS qty
        FROM fact_sales s
        LEFT JOIN dim_product p ON s.product_key = p.product_key
        LEFT JOIN dim_payment dp ON s.payment_key = dp.payment_key
        WHERE ${where}`,
        values
      ),
      client.query(
        `SELECT
          COALESCE(SUM(s.prorate_discount_billing), 0) AS discount,
          COALESCE(SUM(s.amount + s.rounded_amount + s.prorate_discount_billing), 0) AS gross_sales
        FROM fact_sales s
        LEFT JOIN dim_product p ON s.product_key = p.product_key
        LEFT JOIN dim_payment dp ON s.payment_key = dp.payment_key
        WHERE ${where}`,
        values
      ),
      client.query(
        `SELECT COALESCE(p.product_name, s.item_name, 'UNKNOWN') AS product_name,
          COALESCE(SUM(s.qty), 0) AS qty, COALESCE(SUM(s.amount + s.rounded_amount), 0) AS revenue
        FROM fact_sales s
        LEFT JOIN dim_product p ON s.product_key = p.product_key
        LEFT JOIN dim_payment dp ON s.payment_key = dp.payment_key
        WHERE ${where}
        GROUP BY COALESCE(p.product_name, s.item_name, 'UNKNOWN')
        ORDER BY revenue DESC`,
        values
      ),
      client.query(
        `SELECT COALESCE(NULLIF(TRIM(dp.payment_type), ''), 'Unknown') AS payment_type,
          COALESCE(SUM(s.amount + s.rounded_amount), 0) AS revenue
        FROM fact_sales s
        LEFT JOIN dim_product p ON s.product_key = p.product_key
        LEFT JOIN dim_payment dp ON s.payment_key = dp.payment_key
        WHERE ${where}
        GROUP BY COALESCE(NULLIF(TRIM(dp.payment_type), ''), 'Unknown')
        ORDER BY revenue DESC`,
        values
      ),
      client.query(
        `SELECT TO_CHAR(s.order_date, 'YYYY-MM-DD') AS date,
          COALESCE(SUM(s.amount + s.rounded_amount + s.prorate_discount_billing), 0) AS gross_sales,
          COALESCE(SUM(s.amount + s.rounded_amount), 0) AS net_sales,
          COALESCE(SUM(s.qty), 0) AS qty
        FROM fact_sales s
        LEFT JOIN dim_product p ON s.product_key = p.product_key
        LEFT JOIN dim_payment dp ON s.payment_key = dp.payment_key
        WHERE ${where}
        GROUP BY s.order_date ORDER BY s.order_date`,
        values
      ),
      client.query(
        `SELECT
          COUNT(DISTINCT s.order_no) AS transactions,
          COALESCE(SUM(ABS(s.amount + s.rounded_amount)), 0) AS revenue,
          COALESCE(SUM(ABS(s.qty)), 0) AS qty
        FROM fact_sales s
        LEFT JOIN dim_product p ON s.product_key = p.product_key
        LEFT JOIN dim_payment dp ON s.payment_key = dp.payment_key
        WHERE ${refundWhere}`,
        values
      ),
      client.query(
        `SELECT COALESCE(p.product_name, s.item_name, 'UNKNOWN') AS product_name,
          COUNT(DISTINCT s.order_no) AS transactions,
          COALESCE(SUM(ABS(s.amount + s.rounded_amount)), 0) AS revenue
        FROM fact_sales s
        LEFT JOIN dim_product p ON s.product_key = p.product_key
        LEFT JOIN dim_payment dp ON s.payment_key = dp.payment_key
        WHERE ${refundWhere}
        GROUP BY COALESCE(p.product_name, s.item_name, 'UNKNOWN')
        ORDER BY revenue DESC LIMIT 8`,
        values
      ),
      client.query(
        `SELECT TO_CHAR(s.order_date, 'YYYY-MM-DD') AS date, s.order_no AS order_no,
          COALESCE(p.product_name, s.item_name, 'UNKNOWN') AS product_name,
          COALESCE(s.qty, 0) AS qty, COALESCE(s.amount + s.rounded_amount, 0) AS revenue,
          COALESCE(NULLIF(TRIM(dp.payment_type), ''), 'Unknown') AS payment_type
        FROM fact_sales s
        LEFT JOIN dim_product p ON s.product_key = p.product_key
        LEFT JOIN dim_payment dp ON s.payment_key = dp.payment_key
        WHERE ${where}
        ORDER BY s.order_date DESC, s.order_no DESC
        LIMIT 500`,
        values
      ),
    ]);

    const k = kpi.rows[0] || {};
    const d = discount.rows[0] || {};
    const revenue = Number(k.revenue || 0);
    const transactions = Number(k.transactions || 0);
    const qty = Number(k.qty || 0);
    const discountValue = Number(d.discount || 0);
    const grossSales = Number(d.gross_sales || 0);
    const refund = refundSummary.rows[0] || {};
    const refundRevenue = Number(refund.revenue || 0);
    const refundTransactions = Number(refund.transactions || 0);

    return NextResponse.json({
      success: true,
      filter: { start, end, product, payment },
      kpi: {
        revenue,
        transactions,
        qty,
        discount: discountValue,
        aov: transactions > 0 ? revenue / transactions : 0,
        itemsPerTransaction: transactions > 0 ? qty / transactions : 0,
        discountRate: grossSales > 0 ? (discountValue / grossSales) * 100 : 0,
      },
      products: products.rows.map((row) => ({
        ...row,
        revenueContribution: revenue > 0 ? (Number(row.revenue || 0) / revenue) * 100 : 0,
      })),
      payments: payments.rows,
      daily: daily.rows.map((row) => ({
        ...row,
        gross_sales: Number(row.gross_sales || 0),
        net_sales: Number(row.net_sales || 0),
      })),
      discount: { discount: discountValue, grossSales },
      refunds: {
        transactions: refundTransactions,
        revenue: refundRevenue,
        rate: revenue > 0 ? (refundRevenue / revenue) * 100 : 0,
        products: refundProducts.rows,
      },
      details: details.rows,
    });
  } catch (error: any) {
    console.error("Sales API Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Database error" },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}