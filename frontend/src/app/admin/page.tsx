"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Clock, CheckCircle2, RefreshCw, Scale, Users, MapPin, IndianRupee, AlertCircle, ArrowUpDown, User, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

type QueueStatus = "scheduled" | "checked_in" | "weighing" | "quality_check" | "completed" | "rejected";
type PaymentStatus = "pending" | "processing" | "completed" | "failed";

interface UserProfile {
  id: number;
  full_name: string;
  phone_number: string;
}

interface Centre {
  id: number;
  name: string;
  location: string;
  capacity_per_day: number;
}

interface Crop {
  id: number;
  name: string;
  msp: number;
}

interface Booking {
  id: number;
  farmer_id: number;
  status: QueueStatus;
  payment_status: PaymentStatus;
  token_number: string;
  quantity_expected: number;
  quantity_actual?: number;
  booking_date: string;
  created_at: string;
  centre?: Centre;
  crop?: Crop;
  farmer?: UserProfile;
}

const statusBadgeStyles: Record<QueueStatus, string> = {
  scheduled: "bg-slate-100 text-slate-700 border-slate-200",
  checked_in: "bg-blue-50 text-blue-700 border-blue-200",
  weighing: "bg-amber-50 text-amber-700 border-amber-200",
  quality_check: "bg-purple-50 text-purple-700 border-purple-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const paymentBadgeStyles: Record<PaymentStatus, string> = {
  pending: "text-amber-700 bg-amber-50 border-amber-200",
  processing: "text-indigo-700 bg-indigo-50 border-indigo-200",
  completed: "text-emerald-700 bg-emerald-50 border-emerald-200",
  failed: "text-red-700 bg-red-50 border-red-200",
};

export default function AdminDashboard() {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [selectedCentreId, setSelectedCentreId] = useState<number>(0); // 0 = All Mandis
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [newlyAddedToken, setNewlyAddedToken] = useState<string | null>(null);

  useEffect(() => {
    fetchCentres();
  }, []);

  useEffect(() => {
    fetchQueue(selectedCentreId);
    const cleanupWs = setupWebSocket(selectedCentreId);
    return cleanupWs;
  }, [selectedCentreId]);

  const fetchCentres = async () => {
    try {
      const res = await api.get("/centres/");
      setCentres(res.data);
    } catch (err) {
      console.error("Failed to load centres", err);
    }
  };

  const fetchQueue = async (centreId: number) => {
    try {
      setLoading(true);
      const res = await api.get(`/bookings/centre/${centreId}`);
      setBookings(res.data);
    } catch (error) {
      console.error("Failed to fetch queue", error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = (centreId: number) => {
    const wsBase = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";
    const ws = new WebSocket(`${wsBase}/centre/${centreId}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "queue_updated") {
          setBookings((prev) =>
            prev.map((b) => (b.id === data.booking_id ? { ...b, status: data.status } : b))
          );
        } else if (data.event === "new_booking") {
          setNewlyAddedToken(data.token_number);
          // Refetch to get populated relations
          fetchQueue(selectedCentreId);
          setTimeout(() => setNewlyAddedToken(null), 5000);
        }
      } catch (e) {
        console.error("WS parse error", e);
      }
    };

    return () => {
      ws.close();
    };
  };

  const updateBookingStatus = async (bookingId: number, status: QueueStatus) => {
    try {
      setActionLoading(bookingId);
      await api.patch(`/bookings/${bookingId}/status`, { status });
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
      );
    } catch (error) {
      console.error("Failed to update queue status", error);
    } finally {
      setActionLoading(null);
    }
  };

  const updatePaymentStatus = async (bookingId: number, payment_status: PaymentStatus) => {
    try {
      setActionLoading(bookingId);
      await api.patch(`/bookings/${bookingId}/status`, { payment_status });
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, payment_status } : b))
      );
    } catch (error) {
      console.error("Failed to update payment status", error);
    } finally {
      setActionLoading(null);
    }
  };

  const currentCentre = centres.find((c) => c.id === selectedCentreId);
  const totalCapacity = selectedCentreId === 0 
    ? centres.reduce((acc, c) => acc + c.capacity_per_day, 0) || 10000 
    : currentCentre?.capacity_per_day || 1500;

  const totalExpectedQty = bookings.reduce((sum, b) => sum + (b.quantity_expected || 0), 0);
  const capacityPercent = Math.min(100, Math.round((totalExpectedQty / totalCapacity) * 100));

  return (
    <div className="space-y-6">
      {/* Centre Selector Top Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Filter By Procurement Centre / Mandi
            </label>
            <select
              value={selectedCentreId}
              onChange={(e) => setSelectedCentreId(Number(e.target.value))}
              className="mt-0.5 text-base font-bold text-slate-900 bg-transparent border-0 p-0 focus:ring-0 cursor-pointer"
            >
              <option value={0}>All Mandis (Global View across all centres)</option>
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.location} - Cap: {c.capacity_per_day} Qtl)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchQueue(selectedCentreId)}
            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Sync Live Queue
          </button>
        </div>
      </div>

      {/* New Booking Alert Badge if received via WS */}
      {newlyAddedToken && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between animate-bounce">
          <div className="flex items-center space-x-2 text-indigo-900 text-sm font-medium">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span>New slot booked in real-time! Token: <strong>{newlyAddedToken}</strong> has been added to the queue.</span>
          </div>
          <span className="text-xs font-bold text-indigo-600 uppercase">Live Update</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Booked</span>
            <span className="p-2 bg-slate-100 text-slate-700 rounded-xl"><Users className="w-4 h-4" /></span>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{bookings.length}</p>
          <span className="text-xs text-slate-500 mt-1 block">Scheduled farmer slots</span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active in Queue</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Clock className="w-4 h-4" /></span>
          </div>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {bookings.filter((b) => ["checked_in", "weighing", "quality_check"].includes(b.status)).length}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">At centre premises</span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 className="w-4 h-4" /></span>
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {bookings.filter((b) => b.status === "completed").length}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Procured & Processed</span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Volume Booked</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Scale className="w-4 h-4" /></span>
          </div>
          <p className="mt-2 text-3xl font-bold text-indigo-600">{totalExpectedQty} <span className="text-sm font-normal text-slate-500">Qtl</span></p>
          <span className="text-xs text-slate-500 mt-1 block">
            {capacityPercent}% of daily limit ({totalCapacity} Qtl)
          </span>
        </div>
      </div>

      {/* Live Queue Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Mandi Live Queue Management (Latest First)</h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time status updates broadcast directly to farmer apps</p>
          </div>
          <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span>
            WebSocket Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Token No.</th>
                <th className="px-6 py-3.5">Farmer Details</th>
                <th className="px-6 py-3.5">Mandi / Date</th>
                <th className="px-6 py-3.5">Crop & Expected Qty</th>
                <th className="px-6 py-3.5">Queue Status</th>
                <th className="px-6 py-3.5">Payment</th>
                <th className="px-6 py-3.5 text-right">Workflow Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No bookings found for the selected view.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr 
                    key={b.id} 
                    className={cn(
                      "hover:bg-slate-50/80 transition-colors",
                      newlyAddedToken === b.token_number && "bg-indigo-50/60"
                    )}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
                          {b.token_number}
                        </span>
                        {newlyAddedToken === b.token_number && (
                          <span className="text-[10px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded uppercase">NEW</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-slate-900 font-semibold">{b.farmer?.full_name || `Farmer #${b.farmer_id}`}</div>
                      <div className="text-xs text-slate-500">+91 {b.farmer?.phone_number || "9876543210"}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-slate-900 font-medium">{b.centre?.name || "APMC Mandi"}</div>
                      <div className="text-xs text-slate-500">{format(new Date(b.booking_date), "dd MMM yyyy")}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-slate-900 font-semibold">{b.quantity_expected} Quintals</div>
                      <div className="text-xs text-green-700 font-medium">{b.crop?.name || "Crop"}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={cn(
                          "px-3 py-1 text-xs font-semibold rounded-full border inline-block uppercase tracking-wider",
                          statusBadgeStyles[b.status]
                        )}
                      >
                        {b.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={b.payment_status}
                        onChange={(e) => updatePaymentStatus(b.id, e.target.value as PaymentStatus)}
                        className={cn(
                          "text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none capitalize cursor-pointer",
                          paymentBadgeStyles[b.payment_status]
                        )}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                      </select>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <select
                        value={b.status}
                        disabled={actionLoading === b.id}
                        onChange={(e) => updateBookingStatus(b.id, e.target.value as QueueStatus)}
                        className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="checked_in">Check-In Arrival</option>
                        <option value="weighing">Move to Weigh Bridge</option>
                        <option value="quality_check">Quality Assessment</option>
                        <option value="completed">Approve & Procure</option>
                        <option value="rejected">Reject Crop</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
