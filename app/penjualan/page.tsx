"use client";

import { CalendarDays, LayoutDashboard, Package, RefreshCw, Settings, ShoppingBag, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DiscountImpactChart, QuantityRevenueChart, RefundChart, RevenueContributionChart, SalesTrendChart } from "@/components/Charts";

const money = (value: number) => "Rp " + Number(value || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });
const num = (value: number) => Number(value || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const defaultStart = () => { const now = new Date(); return formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)); };
const defaultEnd = () => { const now = new Date(); return formatDate(new Date(now.getFullYear(), now.getMonth(), 0)); };

type Detail = { date: string; order_no: string; product_name: string; qty: number; revenue: number; payment_type: string };
type SalesData = { kpi: { revenue: number; transactions: number; qty: number; aov: number; itemsPerTransaction: number; discount: number; discountRate: number }; products: any[]; daily: any[]; discount: { discount: number; grossSales: number }; refunds: { transactions: number; revenue: number; rate: number; products: any[] }; details: Detail[] };

export default function SalesPage() {
  const [start, setStart] = useState(defaultStart());
  const [end, setEnd] = useState(defaultEnd());
  const [product, setProduct] = useState("");
  const [payment, setPayment] = useState("");
  const [products, setProducts] = useState<string[]>([]);
  const [payments, setPayments] = useState<string[]>([]);
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const query = useMemo(() => `/api/sales?start=${start}&end=${end}&product=${encodeURIComponent(product)}&payment=${encodeURIComponent(payment)}`, [start, end, product, payment]);

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch(query, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal mengambil data");
      setData({
        kpi: Object.fromEntries(Object.entries(json.kpi || {}).map(([key, value]) => [key, Number(value || 0)])) as SalesData["kpi"],
        products: (json.products || []).map((item: any) => ({ ...item, qty: Number(item.qty || 0), revenue: Number(item.revenue || 0), revenueContribution: Number(item.revenueContribution || 0) })),
        daily: (json.daily || []).map((item: any) => ({ ...item, gross_sales: Number(item.gross_sales || 0), net_sales: Number(item.net_sales || 0) })),
        discount: { discount: Number(json.discount?.discount || 0), grossSales: Number(json.discount?.grossSales || 0) },
        refunds: { transactions: Number(json.refunds?.transactions || 0), revenue: Number(json.refunds?.revenue || 0), rate: Number(json.refunds?.rate || 0), products: json.refunds?.products || [] },
        details: (json.details || []).map((item: Detail) => ({ ...item, qty: Number(item.qty || 0), revenue: Number(item.revenue || 0) })),
      });
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal mengambil data"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetch("/api/sales/filters", { cache: "no-store" }).then((response) => response.json()).then((json) => { setProducts((json.products || []).map((item: { product_name: string }) => item.product_name)); setPayments((json.payments || []).map((item: { payment_type: string }) => item.payment_type)); }).catch(() => setError("Gagal mengambil pilihan filter")); }, []);
  useEffect(() => { load(); }, [query]);

  const discountRate = data?.discount.grossSales ? (data.discount.discount / data.discount.grossSales) * 100 : 0;
  const refundRate = data?.refunds.rate || 0;

  return <main className="shell"><aside className="sidebar"><div className="brand"><div className="brand-mark">K</div><div><strong>Kusuma</strong><span>Analytics</span></div></div><nav><a href="/"><LayoutDashboard />Beranda</a><a className="active"><ShoppingBag />Penjualan</a><a><Package />Produk<small>soon</small></a><a><WalletCards />Keuangan<small>soon</small></a><a><Settings />Pengaturan<small>soon</small></a></nav><div className="sidebar-note"><b>Dashboard Analitik</b><p>Data bersumber dari data warehouse Warkop Kusuma.</p></div></aside>
    <section className="content"><header className="topbar"><div><div className="eyebrow">WARKOP KUSUMA</div><h1>Penjualan</h1><p>Telusuri transaksi dan nilai penjualan berdasarkan periode.</p></div><button className="icon-button" onClick={load} type="button" aria-label="Refresh data" suppressHydrationWarning><RefreshCw size={18} /></button></header>
      <section className="filter-card"><div className="filter-title"><CalendarDays size={18} />Filter Penjualan</div><div className="filters"><label>Dari<input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label><label>Sampai<input type="date" min={start} value={end} onChange={(event) => setEnd(event.target.value)} /></label><label>Produk<div className="select-wrap"><select value={product} onChange={(event) => setProduct(event.target.value)} suppressHydrationWarning><option value="">Semua Produk</option>{products.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></label><label>Payment<div className="select-wrap"><select value={payment} onChange={(event) => setPayment(event.target.value)} suppressHydrationWarning><option value="">Semua Payment</option>{payments.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></label></div></section>
      {error && <div className="error">{error}</div>}<section className="kpi-grid"><Kpi title="Revenue Bersih" value={money(data?.kpi.revenue || 0)} accent="blue" /><Kpi title="Transaksi" value={num(data?.kpi.transactions || 0)} accent="red" /><Kpi title="AOV" value={money(data?.kpi.aov || 0)} accent="navy" /><Kpi title="Item / Transaksi" value={num(data?.kpi.itemsPerTransaction || 0)} accent="red" /></section>
      <div className="section-head"><h2>Analisis Penjualan</h2><p>{loading ? "Memuat data..." : "Ringkasan perilaku transaksi dan kontribusi produk"}</p></div>
      <section className="chart-grid"><ChartCard title="Trend Gross Sales vs Net Sales" className="wide"><SalesTrendChart data={data?.daily || []} /></ChartCard><ChartCard title="Revenue Contribution per Product"><RevenueContributionChart data={data?.products || []} /></ChartCard><ChartCard title="Quantity vs Revenue"><QuantityRevenueChart data={data?.products || []} /></ChartCard><ChartCard title="Discount Impact"><DiscountImpactChart data={data?.daily || []} /><div className="chart-stat"><span>Total discount</span><strong>{money(data?.discount.discount || 0)}</strong><em>{discountRate.toFixed(2)}% dari gross sales</em></div></ChartCard><ChartCard title="Refund Analysis"><div className="refund-stats"><div><span>Total refund</span><strong>{money(data?.refunds.revenue || 0)}</strong></div><div><span>Transaksi refund</span><strong>{num(data?.refunds.transactions || 0)}</strong></div><div><span>Refund rate</span><strong>{refundRate.toFixed(2)}%</strong></div></div><RefundChart data={data?.refunds.products || []} /></ChartCard></section><style jsx global>{` .chart-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; margin-bottom:28px; } .chart-card { min-width:0; padding:18px 16px 12px; } .chart-card.wide { grid-column:1 / -1; } .chart-card h3 { margin:0 0 4px; color:var(--navy); font-size:14px; } .chart-tooltip { display:grid; gap:4px; padding:9px 11px; border:1px solid var(--line); border-radius:8px; background:#fff; font-size:11px; } .chart-stat,.refund-stats { display:flex; gap:18px; align-items:baseline; border-top:1px solid var(--line); padding:10px 4px 0; font-size:11px; color:var(--muted); } .chart-stat strong,.refund-stats strong { display:block; color:var(--navy); font-size:15px; } .chart-stat em { font-style:normal; color:var(--red); } .refund-stats { align-items:flex-start; justify-content:space-between; } @media (max-width:720px) { .chart-grid { grid-template-columns:1fr; } .chart-card.wide { grid-column:auto; } } `}</style>
      <footer>© {new Date().getFullYear()} Warkop Kusuma · Analytics Dashboard</footer><style jsx global>{`\n        .table-card { overflow: hidden; }\n        .table-scroll { overflow-x: auto; }\n        table { width: 100%; border-collapse: collapse; min-width: 760px; }\n        th, td { padding: 13px 16px; border-bottom: 1px solid var(--line); text-align: left; white-space: nowrap; font-size: 12px; }\n        th { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .04em; background: #fafbfc; }\n        td:nth-child(4), td:nth-child(5) { text-align: right; }\n        .payment-tag { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #eef4ff; color: var(--blue); font-size: 11px; }\n        .empty-table { padding: 34px 20px; text-align: center; color: var(--muted); font-size: 13px; }\n        @media (max-width: 720px) { table { min-width: 680px; } }\n      `}</style></section></main>;
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) { return <article className={`chart-card ${className}`}><h3>{title}</h3>{children}</article>; }
function Kpi({ title, value, accent }: { title: string; value: string; accent: string }) { return <div className={`kpi ${accent}`}><span>{title}</span><strong>{value}</strong><div className="kpi-line" /></div>; }