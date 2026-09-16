'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/lib/utils';
import {
  LineChart as ChartIcon,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  DollarSign,
  PieChart as PieIcon,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function AnalyticsPage() {
  const { transactions, expenses, customers } = useApp();
  const [timeframe, setTimeframe] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  // Trend Data
  const monthlyTrends = [
    { month: 'Oct', revenue: 320000, expense: 180000, profit: 140000 },
    { month: 'Nov', revenue: 410000, expense: 220000, profit: 190000 },
    { month: 'Dec', revenue: 480000, expense: 240000, profit: 240000 },
    { month: 'Jan', revenue: 390000, expense: 190000, profit: 200000 },
    { month: 'Feb', revenue: 520000, expense: 260000, profit: 260000 },
    { month: 'Mar (Proj)', revenue: 610000, expense: 280000, profit: 330000 },
  ];

  const paymentMethodShare = [
    { name: 'UPI Direct QR', value: 68, color: '#4F46E5' },
    { name: 'Bank Transfer (NEFT/IMPS)', value: 22, color: '#06B6D4' },
    { name: 'Cash', value: 7, color: '#10B981' },
    { name: 'Cheque', value: 3, color: '#F59E0B' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ChartIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Financial & Growth Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Deep performance metrics, revenue trajectories, operational burn rates, and margin forecasting
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
          <button
            onClick={() => setTimeframe('monthly')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              timeframe === 'monthly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setTimeframe('quarterly')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              timeframe === 'quarterly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'
            }`}
          >
            Quarterly
          </button>
          <button
            onClick={() => setTimeframe('yearly')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              timeframe === 'yearly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Gross Margin</div>
          <div className="text-2xl font-black font-mono text-emerald-600 mt-1">42.8%</div>
          <div className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" /> +3.4% from last quarter
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Collection Period</div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">11.4 Days</div>
          <div className="text-[11px] text-indigo-500 flex items-center gap-1 mt-1 font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> 4 days faster via UPI QR
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Working Capital Buffer</div>
          <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            {formatINR(1250000)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            4.2 months operational runway
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer Retention</div>
          <div className="text-2xl font-black font-mono text-cyan-600 mt-1">94.2%</div>
          <div className="text-[11px] text-slate-400 mt-1">
            High repeat ordering rate
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Revenue vs Profit Chart */}
        <div className="lg:col-span-8 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Revenue & Net Profit Trajectory
              </h3>
              <p className="text-xs text-slate-400">
                Tracking top-line turnover vs net profit after operational expenditure
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1 text-indigo-600">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Revenue
              </span>
              <span className="flex items-center gap-1 text-emerald-500">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Profit
              </span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '16px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, '']}
                />
                <Bar dataKey="revenue" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                <Bar dataKey="profit" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Inflow Channel Share */}
        <div className="lg:col-span-4 glass-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <PieIcon className="w-4 h-4 text-indigo-500" />
              Payment Mode Inflow
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Breakdown of incoming customer settlements
            </p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodShare}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentMethodShare.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                    formatter={(v: any) => [`${v}%`, 'Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 mt-3">
              {paymentMethodShare.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 dark:text-slate-300 font-medium">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
