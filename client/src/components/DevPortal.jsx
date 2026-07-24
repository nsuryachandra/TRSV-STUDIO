import React, { useState, useEffect } from 'react';
import { Terminal, Activity, Download, RefreshCw, Trash2, Search, Calendar, ShieldAlert, Cpu, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DevPortal() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const getAdminHeaders = () => {
    try {
      return {
        'Authorization': `Basic ${btoa('surya_dev:surya')}`
      };
    } catch {
      return {};
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/logs', {
        headers: getAdminHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all analytics logs? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/analytics/logs/clear', {
        method: 'POST',
        headers: getAdminHeaders()
      });
      if (res.ok) {
        fetchLogs();
      }
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  const parseDetails = (detailsStr) => {
    if (!detailsStr) return '';
    try {
      const parsed = JSON.parse(detailsStr);
      if (typeof parsed === 'object') {
        return Object.entries(parsed)
          .map(([key, val]) => `${key}: ${val}`)
          .join(', ');
      }
      return detailsStr;
    } catch {
      return detailsStr;
    }
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  // Stats calculations
  const totalLogins = logs.filter(l => l.event_type === 'login').length;
  const totalDownloads = logs.filter(l => l.event_type === 'download').length;
  const uniqueUsers = new Set(logs.map(l => l.username)).size;

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ip_address.includes(searchQuery) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesType = filterType === 'all' || log.event_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 sm:space-y-8 p-1">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-yellow text-[9px] sm:text-[10px] flex items-center gap-1">
              <Cpu size={10} className="animate-pulse text-amber-700" />
              Dev Analytics Mode
            </span>
            <span className="badge-blue text-[9px] sm:text-[10px]">{logs.length} Total Logs</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-poppins">
            Developer <span className="text-indigo-600">Console & Analytics</span>
          </h1>
          <p className="text-xs sm:text-sm mt-1 text-slate-500">Monitor voter portal operations, logins, download timestamps, and client IP addresses in real-time.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="btn-yellow flex-1 sm:flex-initial flex items-center justify-center gap-1.5 shadow-sm py-2.5 sm:py-2 text-xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Logs
          </button>
          <button
            onClick={handleClearLogs}
            className="p-2.5 rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 transition-colors shadow-sm active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            title="Clear All Logs"
          >
            <Trash2 size={14} />
            Clear
          </button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Activity size={22} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Portal Logins</span>
            <span className="text-2xl font-black text-slate-950 font-poppins">{totalLogins}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Download size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Poster Downloads</span>
            <span className="text-2xl font-black text-slate-950 font-poppins">{totalDownloads}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unique Supporters Logged</span>
            <span className="text-2xl font-black text-slate-950 font-poppins">{uniqueUsers}</span>
          </div>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search by username, IP, or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="py-1.5 px-3 border border-slate-200 bg-white rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
          >
            <option value="all">All Events</option>
            <option value="login">Logins Only</option>
            <option value="download">Downloads Only</option>
          </select>
        </div>
      </div>

      {/* Log list / Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 w-44">Time</th>
                <th className="py-3 px-4 w-28">Event Type</th>
                <th className="py-3 px-4 w-44">Username / Supporter</th>
                <th className="py-3 px-4 w-36">IP Address</th>
                <th className="py-3 px-4">Details / Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    {searchQuery || filterType !== 'all' ? 'No matching logs found.' : 'No analytics events recorded yet.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        log.event_type === 'login' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : log.event_type === 'download'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          : 'bg-slate-50 text-slate-700 border border-slate-100'
                      }`}>
                        {log.event_type === 'login' ? 'Login' : log.event_type === 'download' ? 'Download' : log.event_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {log.username}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                      {log.ip_address}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate font-medium" title={parseDetails(log.details)}>
                      {parseDetails(log.details)}
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
