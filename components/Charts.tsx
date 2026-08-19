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
  ComposedChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
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
// 2. REVENUE PER WEEKDAY
// ============================================================

export function WeekdayChart({ data }: { data: any[] }) {
  const chartData = data.map((item) => ({
    day: item.day_name,
    revenue: Number(item.revenue || 0),
    transactions: Number(item.transactions || 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={chartData}
        margin={{
          top: 10,
          right: 10,
          left: 10,
          bottom: 10,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="day" />
        <YAxis
          tickFormatter={(value) =>
            `${(value / 1000000).toFixed(0)}M`
          }
        />
        <Tooltip
          formatter={(value, name) =>
            name === "Revenue"
              ? `Rp ${Number(value).toLocaleString("id-ID")}`
              : Number(value).toLocaleString("id-ID")
          }
        />
        <Bar
          dataKey="revenue"
          name="Revenue"
          fill={BLUE}
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
// ============================================================
// 3. TOP PRODUCTS
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

  // 1. Cari nilai qty tertinggi dari data produk
  const maxQty = Math.max(...chartData.map((item) => Number(item.qty || 0)), 0);

  // 2. Bulatkan ke kelipatan 50 terdekat ke atas (misal: 410 jadi 450)
  const dynamicMax = Math.ceil(maxQty / 50) * 50;

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
          domain={[0, dynamicMax]} // 3. Terapkan batas maksimal dinamis di sini
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
// 4. PAYMENT MIX
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
// 5. BUSIEST HOURS
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

export function SalesTrendChart({ data }: { data: any[] }) {
  return <ResponsiveContainer width="100%" height={290}><ComposedChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}jt`} /><Tooltip formatter={(value: any, name: any) => [money(value), name]} /><Legend /><Area type="monotone" dataKey="gross_sales" name="Gross Sales" fill="#dbeafe" stroke={BLUE} strokeWidth={2} /><Line type="monotone" dataKey="net_sales" name="Net Sales" stroke={RED} strokeWidth={2} dot={false} /></ComposedChart></ResponsiveContainer>;
}

export function RevenueContributionChart({ data }: { data: any[] }) {
  const chartData = data.slice(0, 8);
  if (!chartData.length) return <div className="empty-chart">Belum ada data produk pada periode ini.</div>;
  return <ResponsiveContainer width="100%" height={290}><BarChart data={chartData} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={(value) => `${Number(value).toFixed(0)}%`} /><YAxis type="category" dataKey="product_name" width={115} tick={{ fontSize: 10 }} /><Tooltip formatter={(value: any) => [`${Number(value).toFixed(2)}%`, "Kontribusi omzet"]} /><Bar dataKey="revenueContribution" name="Kontribusi omzet" fill={BLUE} radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer>;
}

export function QuantityRevenueChart({ data }: { data: any[] }) {
  const chartData = data.map((item) => ({ ...item, qty: Number(item.qty || 0), revenue: Number(item.revenue || 0) }));
  if (!chartData.length) return <div className="empty-chart">Belum ada data produk pada periode ini.</div>;
  return <ResponsiveContainer width="100%" height={290}><ScatterChart><CartesianGrid /><XAxis type="number" dataKey="qty" name="Quantity" /><YAxis type="number" dataKey="revenue" name="Revenue" tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}jt`} /><ZAxis type="number" dataKey="qty" range={[50, 300]} /><Tooltip content={({ active, payload }) => active && payload?.length ? <div className="chart-tooltip"><strong>{payload[0].payload.product_name}</strong><span>Qty: {Number(payload[0].payload.qty).toLocaleString("id-ID")}</span><span>Revenue: {money(payload[0].payload.revenue)}</span></div> : null} /><Scatter name="Produk" data={chartData} fill={RED} /></ScatterChart></ResponsiveContainer>;
}

export function DiscountImpactChart({ data }: { data: any[] }) {
  return <ResponsiveContainer width="100%" height={290}><ComposedChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}jt`} /><Tooltip formatter={(value: any, name: any) => [money(value), name]} /><Legend /><Bar dataKey="gross_sales" name="Gross Sales" fill="#8fa8d0" /><Bar dataKey="net_sales" name="Net Sales" fill={BLUE} /></ComposedChart></ResponsiveContainer>;
}

export function RefundChart({ data }: { data: any[] }) {
  if (!data.length) return <div className="empty-chart">Belum ada refund pada periode ini.</div>;
  return <ResponsiveContainer width="100%" height={220}><BarChart data={data} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} /><YAxis type="category" dataKey="product_name" width={115} tick={{ fontSize: 10 }} /><Tooltip formatter={(value: any) => [money(value), "Nilai refund"]} /><Bar dataKey="revenue" name="Nilai refund" fill={RED} radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer>;
}