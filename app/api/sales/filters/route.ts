import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  let client;

  try {
    client = await pool.connect();
    const [products, payments] = await Promise.all([
      client.query(`SELECT DISTINCT COALESCE(p.product_name, s.item_name, 'UNKNOWN') AS product_name
        FROM fact_sales s LEFT JOIN dim_product p ON s.product_key = p.product_key
        WHERE s.transaction_type <> 'REFUND' ORDER BY product_name`),
      client.query(`SELECT DISTINCT COALESCE(NULLIF(TRIM(dp.payment_type), ''), 'Unknown') AS payment_type
        FROM fact_sales s LEFT JOIN dim_payment dp ON s.payment_key = dp.payment_key
        WHERE s.transaction_type <> 'REFUND' ORDER BY payment_type`),
    ]);

    return NextResponse.json({ success: true, products: products.rows, payments: payments.rows });
  } catch (error: any) {
    console.error("Sales Filters Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Database error" },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}