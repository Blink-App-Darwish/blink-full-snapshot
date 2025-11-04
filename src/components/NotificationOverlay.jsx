import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Clock, DollarSign, Star, FileText, MessageSquare, Bell, Check, Calendar } from "lucide-react";
import { Notification } from "@/api/entities";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NotificationOverlay({ isOpen, onClose, notifications, onMarkAsRead, onMarkAllAsRead }) {
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [reminderDate, setReminderDate] = useState("");

  const unreadNotifications = notifications.filter(n => !n.read);
  
  // Categorize notifications
  const categorizedNotifications = {
    payments: notifications.filter(n => n.type.includes('payment')),
    bookings: notifications.filter(n => n.type.includes('booking')),
    reviews: notifications.filter(n => n.type === 'review_received'),
    contracts: notifications.filter(n => n.type === 'contract_signed'),
    messages: notifications.filter(n => n.type === 'message_received')
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "payment_received":
      case "payment_upcoming":
        return DollarSign;
      case "payment_delayed":
        return Clock;
      case "booking_request":
      case "booking_confirmed":
        return CheckCircle2;
      case "review_received":
        return Star;
      case "contract_signed":
        return FileText;
      case "message_received":
        return MessageSquare;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "payment_received":
        return "text-emerald-600 bg-emerald-50";
      case "payment_delayed":
        return "text-red-600 bg-red-50";
      case "payment_upcoming":
        return "text-amber-600 bg-amber-50";
      case "booking_request":
        return "text-blue-600 bg-blue-50";
      case "booking_confirmed":
        return "text-emerald-600 bg-emerald-50";
      case "review_received":
        return "text-yellow-600 bg-yellow-50";
      case "contract_signed":
        return "text-purple-600 bg-purple-50";
      case "message_received":
        return "text-cyan-600 bg-cyan-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
    onClose();
  };

  const handleSetReminder = async (notificationId) => {
    if (!reminderDate) return;
    
    // Here you would implement reminder logic
    // For now, just close the reminder UI
    setSelectedNotification(null);
    setReminderDate("");
  };

  const CategorySection = ({ title, items, icon: Icon, color }) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 px-4">
          <div className={`w-6 h-6 rounded-lg ${color} flex items-center justify-center`}>
            <Icon className="w-3 h-3" strokeWidth={2} />
          </div>
          <h3 className="text-[10px] font-semibold text-gray-900 uppercase tracking-wider">{title}</h3>
          <span className="text-[9px] text-gray-400 ml-auto">{items.length}</span>
        </div>
        
        <div className="space-y-2">
          {items.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const colorClass = getNotificationColor(notification.type);
            
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="px-4"
              >
                <div
                  onClick={() => handleNotificationClick(notification)}
                  className="relative p-3 rounded-xl hover:bg-gray-50 transition-all cursor-pointer group"
                  style={{
                    background: !notification.read ? 'rgba(16, 185, 129, 0.03)' : 'transparent'
                  }}
                >
                  <div className="flex gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-xs text-gray-900 line-clamp-1">{notification.title}</h4>
                        {!notification.read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5"></div>
                        )}
                      </div>
                      
                      <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2 mb-2">
                        {notification.message}
                      </p>
                      
                      {notification.amount && (
                        <p className="text-sm font-bold text-emerald-600 mb-1">
                          ${notification.amount}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-gray-400">
                          {format(new Date(notification.created_date), "MMM d, h:mm a")}
                        </p>
                        
                        {/* Reminder Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNotification(notification.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white rounded-lg"
                        >
                          <Calendar className="w-3 h-3 text-gray-400 hover:text-emerald-600" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Reminder Popup */}
                  <AnimatePresence>
                    {selectedNotification === notification.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl p-4 shadow-2xl"
                        style={{
                          background: 'rgba(255, 255, 255, 0.98)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          border: '0.5px solid rgba(156, 163, 175, 0.2)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-emerald-600" strokeWidth={1.5} />
                            <h4 className="text-xs font-semibold text-gray-900">Set Reminder</h4>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNotification(null);
                            }}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <X className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                        
                        <input
                          type="datetime-local"
                          value={reminderDate}
                          onChange={(e) => setReminderDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 mb-3"
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetReminder(notification.id);
                          }}
                          className="w-full py-2 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition-colors"
                        >
                          Set Reminder
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/10 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dropdown Panel - Mobile First */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-4 top-16 z-[70] w-[calc(100vw-2rem)] max-w-md max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '0.5px solid rgba(156, 163, 175, 0.2)'
            }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 px-4 py-4 border-b border-gray-100"
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)'
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-emerald-600" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              
              {unreadNotifications.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">
                    {unreadNotifications.length} unread
                  </span>
                  <button
                    onClick={onMarkAllAsRead}
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Mark all read
                  </button>
                </div>
              )}
            </div>

            {/* Notifications List - Categorized */}
            <div className="overflow-y-auto h-[calc(80vh-120px)] py-4">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm text-gray-500 text-center">No notifications yet</p>
                  <p className="text-xs text-gray-400 text-center mt-1">
                    We'll notify you about bookings, payments, and more
                  </p>
                </div>
              ) : (
                <>
                  <CategorySection 
                    title="Payments" 
                    items={categorizedNotifications.payments}
                    icon={DollarSign}
                    color="bg-emerald-50 text-emerald-600"
                  />
                  <CategorySection 
                    title="Bookings" 
                    items={categorizedNotifications.bookings}
                    icon={CheckCircle2}
                    color="bg-blue-50 text-blue-600"
                  />
                  <CategorySection 
                    title="Reviews" 
                    items={categorizedNotifications.reviews}
                    icon={Star}
                    color="bg-yellow-50 text-yellow-600"
                  />
                  <CategorySection 
                    title="Contracts" 
                    items={categorizedNotifications.contracts}
                    icon={FileText}
                    color="bg-purple-50 text-purple-600"
                  />
                  <CategorySection 
                    title="Messages" 
                    items={categorizedNotifications.messages}
                    icon={MessageSquare}
                    color="bg-cyan-50 text-cyan-600"
                  />
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}