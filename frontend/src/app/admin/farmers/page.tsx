"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Users, Search, UserCheck, Sprout, Calendar, Phone, ArrowRight, X, ShieldCheck, Scale, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface FarmerSummary {
  id: number;
  full_name: string;
  phone_number: string;
  role: string;
  is_active: boolean;
  created_at: string;
  total_bookings: int;
  completed_bookings: int;
  total_quantity_procured: number;
}

interface FarmerDetails {
  farmer: {
    id: number;
    full_name: string;
    phone_number: string;
    is_active: boolean;
    created_at: string;
  };
  bookings: Array<{
    id: number;
    token_number: string;
    booking_date: string;
    quantity_expected: number;
    quantity_actual?: number;
    status: string;
    payment_status: string;
  }>;
}

export default function FarmersDirectoryPage() {
  const [farmers, setFarmers] = useState<FarmerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFarmerId, setSelectedFarmerId] = useState<number | null>(null);
  const [farmerDetails, setFarmerDetails] = useState<FarmerDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchFarmers();
  }, [searchQuery]);

  const fetchFarmers = async () => {
    try {
      setLoading(true);
      const params = searchQuery ? { search: searchQuery } : {};
      const res = await api.get("/farmers/", { params });
      setFarmers(res.data);
    } catch (err) {
      console.error("Failed to load farmers", err);
    } finally {
      setLoading(false);
    }
  };

  const openFarmerHistory = async (farmerId: number) => {
    try {
      setSelectedFarmerId(farmerId);
      setDetailsLoading(true);
      const res = await api.get(`/farmers/${farmerId}/details`);
      setFarmerDetails(res.data);
    } catch (err) {
      console.error("Failed to load farmer details", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const totalProcuredOverall = farmers.reduce((sum, f) => sum + (f.total_quantity_procured || 0), 0);
  const totalBookingsOverall = farmers.reduce((sum, f) => sum + (f.total_bookings || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Search */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Registered Farmers Directory</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage farmer profiles, verified registrations, and procurement histories</p>
        </div>

        <div className="relative min-w-[320px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or 10-digit mobile..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Registered</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Users className="w-4 h-4" /></span>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{farmers.length}</p>
          <span className="text-xs text-slate-500 mt-1 block">Verified farmers</span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Farmers</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><UserCheck className="w-4 h-4" /></span>
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{farmers.filter(f => f.is_active).length}</p>
          <span className="text-xs text-slate-500 mt-1 block">Eligible for slot bookings</span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Slots Booked</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Calendar className="w-4 h-4" /></span>
          </div>
          <p className="mt-2 text-3xl font-bold text-blue-600">{totalBookingsOverall}</p>
          <span className="text-xs text-slate-500 mt-1 block">Across all APMC Mandis</span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Procured</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Scale className="w-4 h-4" /></span>
          </div>
          <p className="mt-2 text-3xl font-bold text-purple-600">{Math.round(totalProcuredOverall)} <span className="text-sm font-normal text-slate-500">Qtl</span></p>
          <span className="text-xs text-slate-500 mt-1 block">Completed deliveries</span>
        </div>
      </div>

      {/* Farmers Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Farmer Profile</th>
                <th className="px-6 py-3.5">Mobile Number</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Total Bookings</th>
                <th className="px-6 py-3.5">Delivered Quantity</th>
                <th className="px-6 py-3.5">Registration Date</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading farmers list...
                  </td>
                </tr>
              ) : farmers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No farmers found matching your search.
                  </td>
                </tr>
              ) : (
                farmers.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs border border-slate-200">
                          {f.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{f.full_name}</div>
                          <div className="text-xs text-slate-400">Farmer ID: #{f.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        +91 {f.phone_number}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 text-xs font-semibold rounded-full border inline-flex items-center",
                        f.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", f.is_active ? "bg-emerald-500" : "bg-red-500")} />
                        {f.is_active ? "Verified" : "Suspended"}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{f.total_bookings} slots</div>
                      <div className="text-xs text-slate-500">{f.completed_bookings} completed</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-900">
                      {f.total_quantity_procured} Qtl
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs">
                      {f.created_at ? format(new Date(f.created_at), "dd MMM yyyy") : "N/A"}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => openFarmerHistory(f.id)}
                        className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
                      >
                        View History
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Farmer History Modal */}
      {selectedFarmerId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Farmer Procurement History</h3>
                <p className="text-xs text-slate-500">{farmerDetails?.farmer.full_name} &bull; +91 {farmerDetails?.farmer.phone_number}</p>
              </div>
              <button
                onClick={() => { setSelectedFarmerId(null); setFarmerDetails(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {detailsLoading ? (
                <div className="py-12 text-center text-slate-400 text-sm">Loading booking logs...</div>
              ) : farmerDetails?.bookings.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">No bookings recorded for this farmer.</div>
              ) : (
                farmerDetails?.bookings.map((b) => (
                  <div key={b.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-300">{b.token_number}</span>
                        <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">{b.status.replace("_", " ")}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        Scheduled: <strong>{format(new Date(b.booking_date), "dd MMM yyyy")}</strong> &bull; Qty: <strong>{b.quantity_expected} Qtl</strong>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={cn(
                        "text-xs font-semibold px-2.5 py-1 rounded-full border capitalize inline-block",
                        b.payment_status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        Payment: {b.payment_status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
