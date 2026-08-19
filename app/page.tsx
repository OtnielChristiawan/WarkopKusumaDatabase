"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  LayoutDashboard,
  RefreshCw,
  Settings,
  ShoppingBag,
  Package,
  WalletCards,
  ChevronDown,
} from "lucide-react";

import {
  MonthlyChart,
  WeekdayChart,
  ProductChart,
  PaymentChart,
  HourChart,
} from "@/components/Charts";

const money = (v: number | string | null | undefined) =>
  "Rp " +
  Number(v || 0).toLocaleString("id-ID", {
    maximumFractionDigits: 0,
  });

const num = (v: number | string | null | undefined) =>
  Number(v || 0).toLocaleString("id-ID");

type G = "day" | "month" | "year";

type Payment = {
  payment_type: string;
  revenue: number;
};

type D = {
  kpi: {
    revenue: number;
    discount: number;
    qty: number;
    transactions: number;
  };
  kpi_previous: {
    revenue: number;
    discount: number;
    qty: number;
    transactions: number;
  };
  monthly: any[];
  products: any[];
  payments: Payment[];
  hours: any[];
  weekdays: any[];
};

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function ds() {
  const now = new Date();

  // Tanggal 1 pada bulan sebelumnya
  return formatDate(
    new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    )
  );
}

function de() {
  const now = new Date();

  // Hari terakhir pada bulan sebelumnya
  return formatDate(
    new Date(
      now.getFullYear(),
      now.getMonth(),
      0
    )
  );
}

export default function Home() {
  const [start, setStart] = useState(ds());
  const [end, setEnd] = useState(de());
  const [granularity, setGranularity] = useState<G>("day");

  const [data, setData] = useState<D | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = useMemo(
    () =>
      `/api/dashboard?start=${start}&end=${end}&granularity=${granularity}`,
    [start, end, granularity]
  );

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(query, {
        cache: "no-store",
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Gagal mengambil data");
      }

      // Normalisasi data dari API
      const normalized: D = {
        kpi: {
          revenue: Number(json.kpi?.revenue || 0),
          discount: Number(json.kpi?.discount || 0),
          qty: Number(json.kpi?.qty || 0),
          transactions: Number(json.kpi?.transactions || 0),
        },

        kpi_previous: {
          revenue: Number(json.kpi_previous?.revenue || 0),
          discount: Number(json.kpi_previous?.discount || 0),
          qty: Number(json.kpi_previous?.qty || 0),
          transactions: Number(json.kpi_previous?.transactions || 0),
        },

        monthly: (json.monthly || []).map((item: any) => ({
          ...item,
          revenue: Number(item.revenue || 0),
          profit: Number(item.profit || 0),
        })),

        weekdays: (json.weekdays || []).map((item: any) => ({
          day_number: Number(item.day_number || 0),
          day_name: String(item.day_name || ""),
          revenue: Number(item.revenue || 0),
          transactions: Number(item.transactions || 0),
        })),

        products: (json.products || []).map((item: any) => ({
          ...item,
          qty: Number(item.qty || 0),
          sales: Number(item.sales || 0),
          profit: Number(item.profit || 0),
        })),

        // INI YANG PENTING UNTUK PAYMENT MIX
        payments: (json.payments || []).map((item: any) => ({
          payment_type: String(item.payment_type || "Unknown"),
          revenue: Number(item.revenue || 0),
        })),

        hours: (json.hours || []).map((item: any) => ({
          ...item,
          hour: Number(item.hour || 0),
          revenue: Number(item.revenue || 0),
          transactions: Number(item.transactions || 0),
        })),
      };

      setData(normalized);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Gagal mengambil data"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [query]);

  return (
    <main className="shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">K</div>

          <div>
            <strong>Kusuma</strong>
            <span>Analytics</span>
          </div>
        </div>

        <nav>
          <a className="active">
            <LayoutDashboard />
            Beranda
          </a>

          <a href="/penjualan">
            <ShoppingBag />
            Penjualan
          </a>

          <a>
            <Package />
            Produk
            <small>soon</small>
          </a>

          <a>
            <WalletCards />
            Keuangan
            <small>soon</small>
          </a>

          <a>
            <Settings />
            Pengaturan
            <small>soon</small>
          </a>
        </nav>

        <div className="sidebar-note">
          <b>Dashboard Analitik</b>
          <p>
            Data bersumber dari data warehouse Warkop Kusuma.
          </p>
        </div>
      </aside>

      {/* CONTENT */}
      <section className="content">
        {/* HEADER */}
        <header className="topbar">
          <div>
            <div className="eyebrow">WARKOP KUSUMA</div>

            <h1>Beranda Analitik</h1>

            <p>
              Pantau performa penjualan dalam satu tampilan.
            </p>
          </div>

          <button
            className="icon-button"
            onClick={load}
            type="button"
            aria-label="Refresh data"
            suppressHydrationWarning
          >
            <RefreshCw size={18} />
          </button>
        </header>

        {/* FILTER */}
        <section className="filter-card">
          <div className="filter-title">
            <CalendarDays size={18} />
            Periode Analisis
          </div>

          <div className="filters">
            <label>
              Dari

              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>

            <label>
              Sampai

              <input
                type="date"
                min={start}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>

            <label>
              Granularitas

              <div className="select-wrap">
                <select
                  value={granularity}
                  onChange={(e) =>
                    setGranularity(e.target.value as G)
                  }
                  suppressHydrationWarning
                >
                  <option value="day">Per Hari</option>
                  <option value="month">Per Bulan</option>
                  <option value="year">Per Tahun</option>
                </select>

                <ChevronDown size={15} />
              </div>
            </label>
          </div>
        </section>

        {/* ERROR */}
        {error && <div className="error">{error}</div>}

        {/* KPI */}
        <section className="kpi-grid">
          <Kpi
            title="Total Sales Bersih"
            value={money(data?.kpi.revenue)}
            growth={
              data?.kpi.revenue && data?.kpi_previous.revenue
                ? ((data.kpi.revenue - data.kpi_previous.revenue) /
                    data.kpi_previous.revenue) *
                  100
                : undefined
            }
            accent="blue"
          />

          <Kpi
            title="Total Diskon"
            value={money(data?.kpi.discount)}
            growth={
              data?.kpi.discount && data?.kpi_previous.discount
                ? ((data.kpi.discount - data.kpi_previous.discount) /
                    data.kpi_previous.discount) *
                  100
                : undefined
            }
            accent="red"
            isDiscount={true}
          />

          <Kpi
            title="Total Qty Terjual"
            value={num(data?.kpi.qty)}
            growth={
              data?.kpi.qty && data?.kpi_previous.qty
                ? ((data.kpi.qty - data.kpi_previous.qty) /
                    data.kpi_previous.qty) *
                  100
                : undefined
            }
            accent="navy"
          />

          <Kpi
            title="Total Transaksi"
            value={num(data?.kpi.transactions)}
            growth={
              data?.kpi.transactions && data?.kpi_previous.transactions
                ? ((data.kpi.transactions - data.kpi_previous.transactions) /
                    data.kpi_previous.transactions) *
                  100
                : undefined
            }
            accent="red"
          />
        </section>

        {/* SECTION TITLE */}
        <div className="section-head">
          <h2>Performa Penjualan</h2>

          <p>
            Revenue dan profit untuk analisis tren; profit tidak
            dijadikan KPI utama.
          </p>
        </div>

        {/* CHARTS */}
        <section className="chart-grid asymmetric-grid">
          <Card title="Trend Revenue & Profit" wide>
            <MonthlyChart data={data?.monthly || []} />
          </Card>

          <Card title="Produk Terlaris" className="short-left">
            <ProductChart data={data?.products || []} />
          </Card>

          <Card title="Trend Jam Ramai" className="long-right">
            <HourChart data={data?.hours || []} />
          </Card>

          <Card title="Revenue per Hari dalam Seminggu" className="long-left">
            <WeekdayChart data={data?.weekdays || []} />
          </Card>

          <Card title="Payment Mix" className="short-right">
            <PaymentChart data={data?.payments || []} />
          </Card>
        </section>

        <style jsx global>{`
          .kpi-growth {
            display: flex;
            align-items: center;
            gap: 4px;
            margin-top: 8px;
            font-size: 13px;
            font-weight: 600;
          }

          /* Pastikan warna diterapkan ke seluruh elemen didalamnya */
          .kpi-growth.positive,
          .kpi-growth.positive .growth-icon,
          .kpi-growth.positive .growth-text {
            color: #10b981 !important; /* Hijau */
          }

          .kpi-growth.negative,
          .kpi-growth.negative .growth-icon,
          .kpi-growth.negative .growth-text {
            color: #ef4444 !important; /* Merah */
          }

          .kpi-growth.neutral,
          .kpi-growth.neutral .growth-icon,
          .kpi-growth.neutral .growth-text {
            color: #64748b !important; /* Abu-abu */
          }

          .asymmetric-grid {
            grid-template-columns: repeat(10, minmax(0, 1fr));
          }

          .asymmetric-grid .wide {
            grid-column: 1 / -1;
          }

          .asymmetric-grid .short-left,
          .asymmetric-grid .short-right {
            grid-column: span 4;
          }

          .asymmetric-grid .long-right {
            grid-column: span 6;
          }

          .asymmetric-grid .long-left {
            grid-column: span 6;
          }

          @media (max-width: 720px) {
            .asymmetric-grid {
              grid-template-columns: 1fr;
            }

            .asymmetric-grid .wide,
            .asymmetric-grid .short-left,
            .asymmetric-grid .long-left,
            .asymmetric-grid .long-right,
            .asymmetric-grid .short-right {
              grid-column: auto;
            }
          }
        `}</style>

        <footer>
          © {new Date().getFullYear()} Warkop Kusuma · Analytics Dashboard
        </footer>

        {loading && (
          <div className="loading">
            Memuat data...
          </div>
        )}
      </section>
    </main>
  );
}

function Kpi({
  title,
  value,
  growth,
  accent,
  isDiscount = false,
}: {
  title: string;
  value: string;
  growth?: number;
  accent: string;
  isDiscount?: boolean;
}) {
  const g = Number(growth || 0);
  const growthPercent = Math.abs(g).toFixed(1);

  // Arah tren riil (apakah angkanya naik atau turun)
  const isUp = g > 0;
  const isDown = g < 0;

  // Logika warna bisnis:
  // Untuk Diskon: Turun = Bagus (Hijau), Naik = Jelek (Merah)
  // Untuk Lainnya: Naik = Bagus (Hijau), Turun = Jelek (Merah)
  let statusClass = "neutral"; // Warna default/abu-abu jika 0%
  if (g !== 0) {
    const isGood = isDiscount ? isDown : isUp;
    statusClass = isGood ? "positive" : "negative";
  }

  return (
    <div className={`kpi ${accent}`}>
      <span>{title}</span>

      <strong>{value}</strong>

      {growth !== undefined && (
        <div className={`kpi-growth ${statusClass}`}>
          <span className="growth-icon">
            {isUp ? "↑" : isDown ? "↓" : "→"}
          </span>
          <span className="growth-text">{growthPercent}%</span>
        </div>
      )}

      <div className="kpi-line" />
    </div>
  );
}

function Card({
  title,
  children,
  wide = false,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <article className={`chart-card ${wide ? "wide" : ""} ${className}`}>
      <div className="chart-title">{title}</div>

      {children}
    </article>
  );
}