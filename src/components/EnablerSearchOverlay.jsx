import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, X, ArrowRight, Clock, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Booking, Event, Invoice } from "@/api/entities";

export default function EnablerSearchOverlay({ isOpen, onClose, enablerId }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ packages: [], bookings: [], invoices: [] });
  const [recentSearches, setRecentSearches] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load recent searches from localStorage
      const stored = localStorage.getItem("enabler_recent_searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } else {
      setQuery("");
      setResults({ packages: [], bookings: [], invoices: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.length > 0) {
      performSearch();
    } else {
      setResults({ packages: [], bookings: [], invoices: [] });
    }
  }, [query]);

  const performSearch = async () => {
    setIsSearching(true);
    try {
      const searchTerm = query.toLowerCase();
      
      // Search packages
      const packages = await Package.filter({ enabler_id: enablerId });
      const matchedPackages = packages.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        (p.description && p.description.toLowerCase().includes(searchTerm))
      ).slice(0, 3);

      // Search bookings
      const bookings = await Booking.filter({ enabler_id: enablerId });
      const matchedBookings = bookings.filter(b =>
        b.id.toLowerCase().includes(searchTerm)
      ).slice(0, 3);

      // Search invoices
      const invoices = await Invoice.filter({ enabler_id: enablerId });
      const matchedInvoices = invoices.filter(inv =>
        inv.invoice_number?.toLowerCase().includes(searchTerm)
      ).slice(0, 3);

      setResults({
        packages: matchedPackages,
        bookings: matchedBookings,
        invoices: matchedInvoices
      });
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const saveRecentSearch = (searchQuery) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("enabler_recent_searches", JSON.stringify(updated));
  };

  const handleResultClick = (type, id) => {
    saveRecentSearch(query);
    onClose();
    
    switch(type) {
      case "package":
        navigate(createPageUrl("EnablerShop"));
        break;
      case "booking":
        navigate(createPageUrl("EnablerBookings"));
        break;
      case "invoice":
        navigate(createPageUrl("EnablerFinance"));
        break;
    }
  };

  const totalResults = results.packages.length + results.bookings.length + results.invoices.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-white"
        >
          {/* Header */}
          <div className="border-b border-gray-100 bg-white/95 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={1.5} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search packages, bookings, invoices..."
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  autoFocus
                />
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="overflow-y-auto h-[calc(100vh-80px)] px-4 py-6">
            {query.length === 0 ? (
              <div className="space-y-6">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                      <p className="text-xs font-medium text-gray-400 tracking-wide">RECENT SEARCHES</p>
                    </div>
                    <div className="space-y-2">
                      {recentSearches.map((search, idx) => (
                        <button
                          key={idx}
                          onClick={() => setQuery(search)}
                          className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm text-gray-700"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                    <p className="text-xs font-medium text-gray-400 tracking-wide">QUICK ACCESS</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { onClose(); navigate(createPageUrl("EnablerBookings")); }}
                      className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl text-left group hover:shadow-md transition-all"
                    >
                      <p className="text-sm font-medium text-gray-900 mb-1">Bookings</p>
                      <p className="text-xs text-gray-600">View all bookings</p>
                    </button>
                    <button
                      onClick={() => { onClose(); navigate(createPageUrl("EnablerFinance")); }}
                      className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl text-left group hover:shadow-md transition-all"
                    >
                      <p className="text-sm font-medium text-gray-900 mb-1">Finance</p>
                      <p className="text-xs text-gray-600">Manage finances</p>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Results count */}
                <p className="text-xs text-gray-400 tracking-wide">
                  {isSearching ? "SEARCHING..." : `${totalResults} RESULT${totalResults !== 1 ? 'S' : ''}`}
                </p>

                {/* Packages */}
                {results.packages.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 tracking-wide mb-3">PACKAGES</p>
                    <div className="space-y-2">
                      {results.packages.map(pkg => (
                        <button
                          key={pkg.id}
                          onClick={() => handleResultClick("package", pkg.id)}
                          className="w-full p-4 bg-white border border-gray-100 rounded-xl hover:border-emerald-200 hover:bg-emerald-50/30 transition-all text-left group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm mb-1">{pkg.name}</p>
                              <p className="text-xs text-gray-500 truncate">{pkg.description}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 flex-shrink-0 ml-2" strokeWidth={1.5} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bookings */}
                {results.bookings.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 tracking-wide mb-3">BOOKINGS</p>
                    <div className="space-y-2">
                      {results.bookings.map(booking => (
                        <button
                          key={booking.id}
                          onClick={() => handleResultClick("booking", booking.id)}
                          className="w-full p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm mb-1">#{booking.id.slice(0, 8)}</p>
                              <p className="text-xs text-gray-500">{booking.status}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0 ml-2" strokeWidth={1.5} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invoices */}
                {results.invoices.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 tracking-wide mb-3">INVOICES</p>
                    <div className="space-y-2">
                      {results.invoices.map(invoice => (
                        <button
                          key={invoice.id}
                          onClick={() => handleResultClick("invoice", invoice.id)}
                          className="w-full p-4 bg-white border border-gray-100 rounded-xl hover:border-amber-200 hover:bg-amber-50/30 transition-all text-left group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm mb-1">#{invoice.invoice_number}</p>
                              <p className="text-xs text-gray-500">${invoice.total_amount}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600 flex-shrink-0 ml-2" strokeWidth={1.5} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No results */}
                {!isSearching && totalResults === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">No results found</p>
                    <p className="text-xs text-gray-400">Try a different search term</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}