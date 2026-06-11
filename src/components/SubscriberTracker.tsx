import { Invoice } from "../types";
import { RefreshCw, Activity, ArrowUpRight, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface SubscriberTrackerProps {
  invoices: Invoice[];
}

export default function SubscriberTracker({ invoices }: SubscriberTrackerProps) {
  const recurringInvoices = invoices.filter(i => i.isRecurring);

  // Compute MRR
  const calculateMRR = () => {
    let mrr = 0;
    recurringInvoices.forEach(i => {
      const subtotal = i.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const tax = subtotal * (i.taxRate / 100);
      const total = Math.max(0, subtotal + tax - i.discount);

      if (i.frequency === "weekly") {
        mrr += total * 4;
      } else if (i.frequency === "monthly") {
        mrr += total;
      } else if (i.frequency === "yearly") {
        mrr += total / 12;
      }
    });
    return mrr;
  };

  const mrr = calculateMRR();
  const arr = mrr * 12;

  // Chart data forecasting subscription growth (e.g. over 6 months with hypothetical 5% Compound growth)
  const chartData = [
    { month: "Jun", ForecastedMRR: Math.round(mrr) },
    { month: "Jul", ForecastedMRR: Math.round(mrr * 1.05) },
    { month: "Aug", ForecastedMRR: Math.round(mrr * 1.10) },
    { month: "Sep", ForecastedMRR: Math.round(mrr * 1.15) },
    { month: "Oct", ForecastedMRR: Math.round(mrr * 1.22) },
    { month: "Nov", ForecastedMRR: Math.round(mrr * 1.30) },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <RefreshCw className="animate-spin-slow text-indigo-600" size={20} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Retainer Track & Subscription MRR Hub</h3>
            <p className="text-slate-500 text-xs mt-0.5">Track monthly recurring revenue, active subscription agreements, and growth forecasts.</p>
          </div>
        </div>
        <span className="text-xs bg-indigo-50 text-indigo-805 border border-indigo-200 px-3 py-1 rounded-full uppercase tracking-widest font-black">
          Live Forecast
        </span>
      </div>

      {/* Metrics widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-50/50 border border-indigo-100/50 p-5 rounded-2xl flex flex-col justify-between min-w-0">
          <span className="text-[10px] uppercase font-extrabold text-indigo-500 tracking-wider">Active Retainers</span>
          <div className="mt-3">
            <strong className="text-2xl sm:text-3xl font-black text-indigo-900 font-mono break-all leading-tight block">{recurringInvoices.length}</strong>
            <span className="text-[10px] text-indigo-605 block mt-0.5">Continuous billing streams</span>
          </div>
        </div>

        <div className="bg-slate-50 p-5 rounded-2xl flex flex-col justify-between min-w-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estimated MRR (Monthly)</span>
          <div className="mt-3">
            <strong className="text-xl sm:text-2xl md:text-xl lg:text-2xl xl:text-3xl font-black text-slate-800 font-mono break-all leading-tight block">₦ {Math.round(mrr).toLocaleString()}</strong>
            <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">Continuous cash inflow base</span>
          </div>
        </div>

        <div className="bg-slate-50 p-5 rounded-2xl flex flex-col justify-between min-w-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Projected ARR (Yearly Run Rate)</span>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <strong className="text-xl sm:text-2xl md:text-lg lg:text-xl xl:text-2xl font-black text-slate-800 font-mono break-words leading-tight block">₦ {Math.round(arr).toLocaleString()}</strong>
              <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">Base trajectory for 12 mos</span>
            </div>
            <div className="shrink-0 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-0.5">
              <TrendingUp size={11} />
              <span>+30%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pt-2">
        {/* Retainer list */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
            <Activity size={13} className="text-indigo-500" />
            <span>Recurring Invoices Directory</span>
          </h4>

          {recurringInvoices.length === 0 ? (
            <div className="bg-slate-50 p-6 rounded-2xl text-center border border-dashed border-slate-200">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-tight">No Active Subscription Retainers</p>
              <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">Configure recurring parameters on invoice sheets to stream steady forecasting.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {recurringInvoices.map(i => {
                const subtotal = i.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
                const tax = subtotal * (i.taxRate / 100);
                const total = subtotal + tax - i.discount;
                return (
                  <div key={i.id} className="bg-white border border-slate-150 p-3.5 rounded-2xl transition-all hover:bg-slate-50/50 flex items-center justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1">
                      <strong className="text-xs text-slate-800 font-black block truncate" title={i.clientDetails?.name}>{i.clientDetails?.name || "Client"}</strong>
                      <span className="text-[10px] text-slate-500 font-mono block uppercase truncate">{i.invoiceNumber} • {i.frequency} billing</span>
                    </div>
                    <div className="text-right shrink-0">
                      <strong className="text-xs text-slate-800 font-bold block font-mono">₦ {total.toLocaleString()}</strong>
                      <span className="text-[10px] text-emerald-600 font-extrabold uppercase mt-0.5 inline-block">Active ⚡</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 6 months Area graph forecasting growth */}
        <div className="lg:col-span-3 space-y-4">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
            <ArrowUpRight size={13} className="text-emerald-500" />
            <span>6-Month Compound Retainer MRR Forecast</span>
          </h4>

          <div className="h-[220px] w-full bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col justify-between">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#94a3b8" }} stroke="#cbd5e1" />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} stroke="#cbd5e1" />
                <Tooltip 
                  contentStyle={{ background: "#0f172a", border: "none", borderRadius: "12px", padding: "8px" }}
                  labelStyle={{ color: "#94a3b8", fontWeight: "bold", fontSize: "10px" }}
                  itemStyle={{ color: "#818cf8", fontSize: "11px", fontWeight: "bold" }}
                />
                <Area type="monotone" dataKey="ForecastedMRR" name="Forecasted MRR" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMrr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
