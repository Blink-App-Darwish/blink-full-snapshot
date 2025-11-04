import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Bell,
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink,
  Filter,
  Trash2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";

export default function AdminNotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const { AdminNotification } = await import("@/api/entities");
      
      let notificationsData;
      if (filter === "unread") {
        notificationsData = await AdminNotification.filter({ read: false }, "-created_date", 100);
      } else if (filter === "all") {
        notificationsData = await AdminNotification.list("-created_date", 100);
      } else {
        notificationsData = await AdminNotification.filter({ severity: filter }, "-created_date", 100);
      }
      
      setNotifications(notificationsData);
    } catch (error) {
      console.error("Error loading notifications:", error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const { AdminNotification } = await import("@/api/entities");
      await AdminNotification.update(notificationId, { 
        read: true,
        read_at: new Date().toISOString()
      });
      await loadNotifications();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { AdminNotification } = await import("@/api/entities");
      const unreadNotifications = notifications.filter(n => !n.read);
      
      await Promise.all(
        unreadNotifications.map(notif => 
          AdminNotification.update(notif.id, { 
            read: true,
            read_at: new Date().toISOString()
          })
        )
      );
      
      await loadNotifications();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const dismissNotification = async (notificationId) => {
    try {
      const { AdminNotification } = await import("@/api/entities");
      await AdminNotification.update(notificationId, { dismissed: true });
      await loadNotifications();
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!confirm("Are you sure you want to delete this notification?")) return;

    try {
      const { AdminNotification } = await import("@/api/entities");
      await AdminNotification.delete(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      INFO: <Info className="w-5 h-5 text-blue-400" />,
      WARNING: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      CRITICAL: <AlertCircle className="w-5 h-5 text-red-400" />,
      URGENT: <Bell className="w-5 h-5 text-red-500 animate-pulse" />
    };
    return icons[severity] || icons.INFO;
  };

  const getSeverityColor = (severity) => {
    const colors = {
      INFO: "bg-blue-500/20 border-blue-500/30",
      WARNING: "bg-amber-500/20 border-amber-500/30",
      CRITICAL: "bg-red-500/20 border-red-500/30",
      URGENT: "bg-red-600/20 border-red-600/30"
    };
    return colors[severity] || colors.INFO;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin w-8 h-8 border-2 border-gray-700 border-t-emerald-500 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Notifications</h2>
          <p className="text-sm text-gray-400">
            {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={markAllAsRead}
            variant="outline"
            className="border-gray-700 text-gray-300"
            disabled={unreadCount === 0}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          className={filter === "all" ? "bg-emerald-600" : "border-gray-700 text-gray-300"}
          onClick={() => setFilter("all")}
        >
          All ({notifications.length})
        </Button>
        <Button
          size="sm"
          variant={filter === "unread" ? "default" : "outline"}
          className={filter === "unread" ? "bg-emerald-600" : "border-gray-700 text-gray-300"}
          onClick={() => setFilter("unread")}
        >
          Unread ({unreadCount})
        </Button>
        <Button
          size="sm"
          variant={filter === "URGENT" ? "default" : "outline"}
          className={filter === "URGENT" ? "bg-red-600" : "border-gray-700 text-gray-300"}
          onClick={() => setFilter("URGENT")}
        >
          Urgent
        </Button>
        <Button
          size="sm"
          variant={filter === "CRITICAL" ? "default" : "outline"}
          className={filter === "CRITICAL" ? "bg-red-600" : "border-gray-700 text-gray-300"}
          onClick={() => setFilter("CRITICAL")}
        >
          Critical
        </Button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            className={`border p-4 transition-all hover:border-gray-600 ${
              notification.read ? 'bg-gray-900 border-gray-800' : 'bg-gray-850 border-gray-700'
            } ${getSeverityColor(notification.severity)}`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg ${getSeverityColor(notification.severity)}`}>
                {getSeverityIcon(notification.severity)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-semibold">{notification.title}</h4>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      )}
                      <Badge className={`text-[10px] ${
                        notification.severity === 'URGENT' ? 'bg-red-100 text-red-700' :
                        notification.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                        notification.severity === 'WARNING' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {notification.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{notification.message}</p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {!notification.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-white"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-red-400"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {notification.action_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-700 text-gray-300 text-xs"
                    onClick={() => window.open(notification.action_url, '_self')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Take Action
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}

        {notifications.length === 0 && (
          <Card className="bg-gray-900 border-gray-800 p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <p className="text-gray-400">No notifications</p>
          </Card>
        )}
      </div>
    </div>
  );
}