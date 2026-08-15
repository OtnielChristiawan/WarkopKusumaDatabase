"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ============================================================
// COLOR PALETTE — WARKOP KUSUMA
// ============================================================

const RED = "#c62828";
const BLUE = "#1557b0";
const NAVY = "#12315a";

const P = [
    BLUE,
    RED,
    NAVY,
    "#6d8fc7",
    "#e35b5b",
    "#8fa8d0",
];

// ============================================================
// HELPER
// ============================================================

const money = (value: number) =>
  "Rp " +
  Number(value || 0).toLocaleString("id-ID", {
    maximumFractionDigits: 0,
  });

// ============================================================
// 1. REVENUE & PROFIT TREND
// ============================================================

export function MonthlyChart({
  data,
}: {
  data: any[];
}) {
  return (
    <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="period" />

            <YAxis
            tickFormatter={(value) =>
                `${Number(value / 1000000).toFixed(0)}jt`
            }
            />

            {/* TOOLTIP YANG SUDAH DIPERBAIKI */}
            <Tooltip
              // Memaksa Revenue selalu di paling atas
              itemSorter={(item) => (item.dataKey === "revenue" ? -1 : 1)}
              formatter={(value, name) => [
                `Rp ${Number(value).toLocaleString("id-ID")}`,
                name
              ]}
            />

            <Legend />

            {/* LINE REVENUE */}
            <Line
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="#2563eb"
            strokeWidth={2}
            dot={true}
            />

            {/* LINE PROFIT */}
            <Line
            type="monotone"
            dataKey="profit"
            name="Profit"
            stroke="#dc2626"
            strokeWidth={2}
            dot={true}
            />
        </LineChart>
    </ResponsiveContainer>
  );
}

// ============================================================
// 2. TOP PRODUCTS
// ============================================================

export function ProductChart({
  data,
}: {
  data: any[];
}) {
  const chartData = data?.slice(0, 8) ?? [];

  if (!chartData.length) {
    return (
      <div className="empty-chart">
        Belum ada data produk pada periode ini.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={290}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{
          top: 5,
          right: 18,
          left: 8,
          bottom: 5,
        }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
        />

        <XAxis
          type="number"
          allowDecimals={false}
        />

        <YAxis
          type="category"
          dataKey="product_name"
          width={115}
          tick={{
            fontSize: 10,
          }}
        />

        <Tooltip
          formatter={(value: any) => [
            Number(value).toLocaleString("id-ID"),
            "Qty Terjual",
          ]}
        />

        <Bar
          dataKey="qty"
          name="Qty"
          fill={BLUE}
          radius={[0, 5, 5, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ============================================================
// 3. PAYMENT MIX
// ============================================================
export function PaymentChart({ data }: { data: any[] }) {
    if (!data.length) {
        return (
            <div className="empty-chart">
                Belum ada data payment pada periode ini.
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={290}>
            <PieChart>
                <Pie
                    data={data}
                    dataKey="revenue"
                    nameKey="payment_type"
                    cx="50%"
                    cy="48%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={3}
                >
                    {data.map((item: any, index: number) => (
                        <Cell
                            key={`payment-${index}`}
                            fill={P[index % P.length]}
                        />
                    ))}
                </Pie>

                <Tooltip
                    formatter={(value: any) => money(value)}
                />

                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
}

// ============================================================
// 4. BUSIEST HOURS
// ============================================================

export function HourChart({
  data,
}: {
  data: any[];
}) {
  if (!data?.length) {
    return (
      <div className="empty-chart">
        Belum ada data jam transaksi pada periode ini.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={290}>
      <BarChart
        data={data}
        margin={{
          top: 10,
          right: 15,
          left: 0,
          bottom: 4,
        }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
        />

        <XAxis
          dataKey="hour"
          tickFormatter={(hour) => `${hour}:00`}
          tick={{
            fontSize: 10,
          }}
        />

        <YAxis
          tick={{
            fontSize: 11,
          }}
          tickFormatter={(value) =>
            value >= 1_000_000
              ? `${Math.round(value / 1_000_000)}jt`
              : `${Math.round(value / 1_000)}k`
          }
        />

        <Tooltip
          labelFormatter={(hour) =>
            `${hour}:00 - ${Number(hour) + 1}:00`
          }
          formatter={(value: any) => [
            money(value),
            "Revenue",
          ]}
        />

        <Bar
          dataKey="revenue"
          name="Revenue"
          fill={RED}
          radius={[5, 5, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}