import React, { useState, useEffect } from "react";
import { Notification, User } from "@/api/entities";
import { Bell, X, Check, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState("all"); // all, unread

  useEffect(() => {
    loadNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const user = await User.me();
      const data = await Notification.filter(
        { user_id: user.id },
        "-created_date",
        50
      );
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await Notification.update(notificationId, { read: true });
      await loadNotifications();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifs = notifications.filter(n => !n.read);
      await Promise.all(unreadNotifs.map(n => Notification.update(n.id, { read: true })));
      await loadNotifications();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await Notification.delete(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      payment_received: "💰",
      payment_delayed: "⚠️",
      payment_upcoming: "⏰",
      booking_request: "📋",
      booking_confirmed: "✅",
      review_received: "⭐",
      contract_signed: "📝",
      message_received: "💬",
      profile_update: "👤",
      system: "🔔"
    };
    return icons[type] || icons.system;
  };

  const filteredNotifications = notifications.filter(n => 
    filter === "all" || (filter === "unread" && !n.read)
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Bell className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
            >
              <span className="text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </motion.div>
          )}
        </button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md overflow-hidden flex flex-col">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold">Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-emerald-600 hover:text-emerald-700"
              >
                Mark all read
              </Button>
            )}
          </div>
          
          {/* Filter Tabs */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filter === "all"
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filter === "unread"
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </SheetHeader>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredNotifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className={`group relative py-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors ${
                    !notif.read ? 'bg-emerald-50/30' : ''
                  }`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notif.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                        {notif.message}
                      </p>
                      
                      {notif.profile_name && (
                        <Badge variant="secondary" className="text-[10px] mb-2">
                          {notif.profile_name}
                        </Badge>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-gray-400">
                          {format(new Date(notif.created_date), "MMM d, h:mm a")}
                        </p>
                        
                        {notif.link && (
                          <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notif.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notif.id);
                          }}
                          className="p-1 hover:bg-emerald-100 rounded transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                        }}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}