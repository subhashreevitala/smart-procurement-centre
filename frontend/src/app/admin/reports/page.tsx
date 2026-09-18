"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  IndianRupee, 
  Scale, 
  TrendingUp, 
  Building2, 
  Sprout, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  BarChart3
} from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface SummaryReport {
  metrics: {
    total_farmers: number;
    total_bookings: number;
    completed_bookings: number;
    total_procured_quintals: number;
    total_expected_quintals: number;
    total_disbursed_payout_inr: number;
    total_pending_payout_inr: number;
  };
  centres: Array<{
    id: number;
    name: string;
    location: string;
    capacity_per_day: number;
    total_bookings: number;
    completed_bookings: number;
    total_procured_qty: number;
    total_expected_qty: number;
    utilization_percentage: number;
  }>;
  crops: Array<{
    id: number;
    name: string;
    msp: number;
    total_bookings: number;
    total_procured_qty: number;
    total_payout_inr: number;
  }>;
  status_distribution: Record<string, number>;
  payment_distribution: Record<string, number>;
}

export default function ReportsAnalyticsPage() {
  const [report, setReport] = useState<SummaryReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.get("/reports/summary");
      setReport(res.data);
    } catch (err) {
      console.error("Failed to load reports", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !report) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const { metrics, centres, crops, status_distribution, payment_distribution } = report;
  const completionRate = metrics.total_bookings > 0 
    ? Math.round((metrics.completed_bookings / metrics.total_bookings) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Procurement & DBT Financial Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Comprehensive analytics on crop volumes, MSP payouts, and mandi throughput</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchReport}
            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition"
          >
            <Download className="w-4 h-4 mr-2" />
            Export / Print Report
          </button>
        </div>
      </div>

      {/* Financial & Volume KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Disbursed DBT Payout</span>
            <span className="p-2 bg-slate-800 text-emerald-400 rounded-xl"><IndianRupee className="w-4 h-4" /></span>
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-400">
            ₹{metrics.total_disbursed_payout_inr.toLocaleString("en-IN")}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Completed MSP direct transfers</span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Payout Pipeline</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Clock className="w-4 h-4" /></span>
          </div>
          <p className="mt-3 text-3xl font-bold text-amber-600">
            ₹{metrics.total_pending_payout_inr.toLocaleString("en-IN")}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">In weighing / quality check</span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Volume Procured</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Scale className="w-4 h-4" /></span>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {metrics.total_procured_quintals.toLocaleString("en-IN")} <span className="text-sm font-normal text-slate-500">Qtl</span>
          </p>
          <span className="text-xs text-slate-500 mt-1 block">{metrics.total_expected_quintals} Qtl scheduled</span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Queue Throughput</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl"><TrendingUp className="w-4 h-4" /></span>
          </div>
          <p className="mt-3 text-3xl font-bold text-blue-600">
            {completionRate}%
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            {metrics.completed_bookings} of {metrics.total_bookings} slots completed
          </span>
        </div>
      </div>

      {/* Centre Utilization & Crop Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mandi Capacity & Procurement Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Mandi Capacity & Utilization</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Daily Limit Tracking</span>
          </div>

          <div className="space-y-4">
            {centres.map((c) => (
              <div key={c.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">{c.name}</h3>
                    <span className="text-xs text-slate-500">{c.location} &bull; Cap: {c.capacity_per_day} Qtl/day</span>
                  </div>
                  <span className={cn(
                    "text-xs font-bold px-2.5 py-0.5 rounded-md",
                    c.utilization_percentage > 80 ? "bg-red-100 text-red-700" :
                    c.utilization_percentage > 50 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                  )}>
                    {c.utilization_percentage}% Utilized
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 mb-2 overflow-hidden">
                  <div 
                    className={cn(
                      "h-2 rounded-full transition-all duration-500",
                      c.utilization_percentage > 80 ? "bg-red-500" :
                      c.utilization_percentage > 50 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min(100, c.utilization_percentage)}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-slate-600 pt-1">
                  <span>Procured: <strong>{c.total_procured_qty} Qtl</strong></span>
                  <span>Bookings: <strong>{c.completed_bookings} / {c.total_bookings}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MSP Crop Breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Sprout className="w-5 h-5 text-green-600" />
              <h2 className="text-base font-bold text-slate-900">Crop Distribution & MSP Payouts</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">MSP Benchmark (2026-27)</span>
          </div>

          <div className="space-y-3">
            {crops.map((crop) => (
              <div key={crop.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{crop.name}</h3>
                  <span className="text-xs text-green-700 font-medium">MSP: ₹{crop.msp}/Quintal</span>
                  <div className="text-xs text-slate-500 mt-1">{crop.total_bookings} total farmer bookings</div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-900 text-sm">{crop.total_procured_qty} Qtl</div>
                  <div className="text-xs font-semibold text-indigo-600 mt-0.5">
                    ₹{crop.total_payout_inr.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Queue & Payment Status Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center">
            <Clock className="w-4 h-4 text-indigo-600 mr-2" />
            Queue Status Breakdown
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(status_distribution).map(([status, count]) => (
              <div key={status} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-xs text-slate-500 capitalize block">{status.replace("_", " ")}</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center">
            <IndianRupee className="w-4 h-4 text-emerald-600 mr-2" />
            Payment Workflow Breakdown
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(payment_distribution).map(([status, count]) => (
              <div key={status} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-xs text-slate-500 capitalize block">{status}</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
