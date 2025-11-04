
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Copy,
  Play,
  Pause,
  Eye,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Filter,
  Download,
  Settings,
  Zap,
  Target,
  BarChart3,
  Globe,
  Users,
  XCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "sonner";
import SubscriptionPackageManager from "./SubscriptionPackageManager";

export default function MonetizationManagement() {
  const [channels, setChannels] = useState([]);
  const [metrics, setMetrics] = useState({
    total_monthly_revenue: 0,
    channel_contribution: {},
    active_channels: 0,
    inactive_channels: 0,
    growth_trend: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showSubscriptionManager, setShowSubscriptionManager] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPortal, setFilterPortal] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadChannels(),
        loadMetrics()
      ]);
    } catch (error) {
      console.error("Error loading monetization data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChannels = async () => {
    try {
      const { MonetizationChannel } = await import("@/api/entities");
      const channelsData = await MonetizationChannel.list("-created_date", 100);
      setChannels(channelsData);
    } catch (error) {
      console.error("Error loading channels:", error);
      setChannels([]);
    }
  };

  const loadMetrics = async () => {
    try {
      const { MonetizationMetrics } = await import("@/api/entities");
      
      // Get current month metrics
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const monthlyMetrics = await MonetizationMetrics.filter({
        metric_date: { $gte: format(startOfMonth, 'yyyy-MM-dd') }
      });

      const totalRevenue = monthlyMetrics.reduce((sum, m) => sum + (m.total_revenue || 0), 0);
      
      // Calculate channel contribution
      const channelContribution = {};
      monthlyMetrics.forEach(m => {
        if (!channelContribution[m.channel_name]) {
          channelContribution[m.channel_name] = 0;
        }
        channelContribution[m.channel_name] += m.total_revenue || 0;
      });

      // Calculate growth (compare to last month)
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
      
      const lastMonthMetrics = await MonetizationMetrics.filter({
        metric_date: {
          $gte: format(lastMonthStart, 'yyyy-MM-dd'),
          $lte: format(lastMonthEnd, 'yyyy-MM-dd')
        }
      });
      
      const lastMonthRevenue = lastMonthMetrics.reduce((sum, m) => sum + (m.total_revenue || 0), 0);
      const growthTrend = lastMonthRevenue > 0 
        ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
        : 0;

      setMetrics({
        total_monthly_revenue: totalRevenue,
        channel_contribution: channelContribution,
        active_channels: channels.filter(c => c.is_active).length,
        inactive_channels: channels.filter(c => !c.is_active).length,
        growth_trend: parseFloat(growthTrend)
      });
    } catch (error) {
      console.error("Error loading metrics:", error);
    }
  };

  const createNewChannel = () => {
    setSelectedChannel({
      channel_name: "",
      category: "subscription",
      description: "",
      associated_portals: ["both"],
      operational_mode: "draft",
      is_active: false,
      pricing_model: "fixed",
      pricing_variables: {
        base_price: 0,
        currency: "USD"
      },
      payout_rules: {
        platform_fee_percentage: 15,
        enabler_payout_percentage: 85,
        auto_payout_enabled: true
      },
      kpis_and_triggers: [],
      linked_ai_models: [],
      notes: ""
    });
    setShowChannelModal(true);
  };

  const saveChannel = async (channelData) => {
    try {
      const { MonetizationChannel, MonetizationAuditLog } = await import("@/api/entities");
      const user = await base44.auth.me();

      let savedChannel;
      if (channelData.id) {
        // Update existing
        const beforeSnapshot = channels.find(c => c.id === channelData.id);
        savedChannel = await MonetizationChannel.update(channelData.id, channelData);
        
        // Audit log
        await MonetizationAuditLog.create({
          action_type: "channel_edited",
          entity_type: "monetization_channel",
          entity_id: channelData.id,
          performed_by: user.id,
          performed_by_name: user.full_name,
          change_summary: `Updated channel: ${channelData.channel_name}`,
          before_snapshot: JSON.stringify(beforeSnapshot),
          after_snapshot: JSON.stringify(channelData)
        });
        
        toast.success("Channel updated successfully");
      } else {
        // Create new
        savedChannel = await MonetizationChannel.create({
          ...channelData,
          last_modified_by: user.id,
          version: 1
        });
        
        await MonetizationAuditLog.create({
          action_type: "channel_created",
          entity_type: "monetization_channel",
          entity_id: savedChannel.id,
          performed_by: user.id,
          performed_by_name: user.full_name,
          change_summary: `Created channel: ${channelData.channel_name}`,
          after_snapshot: JSON.stringify(savedChannel)
        });
        
        toast.success("Channel created successfully");
      }

      await loadChannels();
      setShowChannelModal(false);
      setSelectedChannel(null);
    } catch (error) {
      console.error("Error saving channel:", error);
      toast.error("Failed to save channel");
    }
  };

  const cloneChannel = async (channel) => {
    const cloned = {
      ...channel,
      id: null,
      channel_name: `${channel.channel_name} (Copy)`,
      operational_mode: "draft",
      is_active: false
    };
    setSelectedChannel(cloned);
    setShowChannelModal(true);
  };

  const toggleChannelStatus = async (channel) => {
    try {
      const { MonetizationChannel, MonetizationAuditLog } = await import("@/api/entities");
      const user = await base44.auth.me();
      const newStatus = !channel.is_active;

      await MonetizationChannel.update(channel.id, { is_active: newStatus });
      
      await MonetizationAuditLog.create({
        action_type: newStatus ? "channel_activated" : "channel_deactivated",
        entity_type: "monetization_channel",
        entity_id: channel.id,
        performed_by: user.id,
        performed_by_name: user.full_name,
        change_summary: `${newStatus ? 'Activated' : 'Deactivated'} channel: ${channel.channel_name}`
      });

      toast.success(`Channel ${newStatus ? 'activated' : 'deactivated'}`);
      await loadChannels();
    } catch (error) {
      console.error("Error toggling channel:", error);
      toast.error("Failed to toggle channel status");
    }
  };

  const deleteChannel = async (channel) => {
    if (!confirm(`Are you sure you want to delete "${channel.channel_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { MonetizationChannel, MonetizationAuditLog } = await import("@/api/entities");
      const user = await base44.auth.me();

      await MonetizationAuditLog.create({
        action_type: "channel_deleted",
        entity_type: "monetization_channel",
        entity_id: channel.id,
        performed_by: user.id,
        performed_by_name: user.full_name,
        change_summary: `Deleted channel: ${channel.channel_name}`,
        before_snapshot: JSON.stringify(channel)
      });

      await MonetizationChannel.delete(channel.id);
      
      toast.success("Channel deleted successfully");
      await loadChannels();
    } catch (error) {
      console.error("Error deleting channel:", error);
      toast.error("Failed to delete channel");
    }
  };

  const filteredChannels = channels.filter(channel => {
    const matchesCategory = filterCategory === "all" || channel.category === filterCategory;
    const matchesPortal = filterPortal === "all" || channel.associated_portals?.includes(filterPortal);
    const matchesSearch = channel.channel_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesPortal && matchesSearch;
  });

  const categories = ["all", "subscription", "commission", "add_on", "partner", "data", "api_access", "premium_features", "other"];
  const portals = ["all", "host", "enabler", "both"];

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
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-emerald-400" />
            Monetization Management
          </h2>
          <p className="text-sm text-gray-400 mt-1">Manage revenue channels and subscription packages</p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowSubscriptionManager(true)}
            variant="outline"
            className="border-gray-700 text-gray-300"
          >
            <Settings className="w-4 h-4 mr-2" />
            Subscription Packages
          </Button>
          <Button
            onClick={createNewChannel}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Channel
          </Button>
          <Button
            onClick={loadData}
            variant="outline"
            className="border-gray-700 text-gray-300"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-500/30 p-6">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="text-xs text-emerald-300 mb-1">Total Monthly Revenue</p>
          <p className="text-3xl font-bold text-white">${metrics.total_monthly_revenue.toLocaleString()}</p>
          {metrics.growth_trend !== 0 && (
            <div className={`flex items-center gap-1 text-xs mt-2 ${metrics.growth_trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {metrics.growth_trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(metrics.growth_trend)}% vs last month</span>
            </div>
          )}
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/30 p-6">
          <div className="flex items-center justify-between mb-3">
            <Activity className="w-8 h-8 text-blue-400" />
          </div>
          <p className="text-xs text-blue-300 mb-1">Active Channels</p>
          <p className="text-3xl font-bold text-white">{metrics.active_channels}</p>
          <p className="text-xs text-gray-400 mt-2">{metrics.inactive_channels} inactive</p>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/30 p-6">
          <div className="flex items-center justify-between mb-3">
            <Target className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-xs text-purple-300 mb-1">Top Channel</p>
          <p className="text-lg font-bold text-white">
            {Object.keys(metrics.channel_contribution).length > 0
              ? Object.entries(metrics.channel_contribution)
                  .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'
              : 'N/A'
            }
          </p>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/30 p-6">
          <div className="flex items-center justify-between mb-3">
            <BarChart3 className="w-8 h-8 text-amber-400" />
          </div>
          <p className="text-xs text-amber-300 mb-1">Avg Channel Revenue</p>
          <p className="text-3xl font-bold text-white">
            ${metrics.active_channels > 0
              ? Math.round(metrics.total_monthly_revenue / metrics.active_channels).toLocaleString()
              : 0
            }
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <Input
          placeholder="Search channels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs bg-gray-800 border-gray-700 text-white"
        />

        <select
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === "all" ? "All Categories" : cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>

        <select
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          value={filterPortal}
          onChange={(e) => setFilterPortal(e.target.value)}
        >
          {portals.map(portal => (
            <option key={portal} value={portal}>
              {portal === "all" ? "All Portals" : portal.charAt(0).toUpperCase() + portal.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Channels List */}
      <div className="space-y-4">
        {filteredChannels.map((channel) => (
          <Card key={channel.id} className="bg-gray-900 border-gray-800 p-6 hover:border-gray-700 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-lg font-semibold text-white">{channel.channel_name}</h4>
                  <Badge className={`text-xs ${
                    channel.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'
                  }`}>
                    {channel.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge className={`text-xs ${
                    channel.operational_mode === 'live' ? 'bg-blue-500/20 text-blue-400' :
                    channel.operational_mode === 'testing' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-gray-700 text-gray-400'
                  }`}>
                    {channel.operational_mode}
                  </Badge>
                  <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                    {channel.category.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <p className="text-sm text-gray-400 mb-3">{channel.description}</p>

                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-gray-500">Pricing Model</p>
                    <p className="text-white font-semibold">{channel.pricing_model}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Portals</p>
                    <p className="text-white font-semibold">
                      {channel.associated_portals?.join(', ') || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Revenue (MTD)</p>
                    <p className="text-emerald-400 font-semibold">
                      ${(channel.performance_metrics?.total_revenue || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last Modified</p>
                    <p className="text-white font-semibold">
                      {format(new Date(channel.updated_date), 'MMM d')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-700 text-gray-300"
                  onClick={() => toggleChannelStatus(channel)}
                >
                  {channel.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-700 text-gray-300"
                  onClick={() => {
                    setSelectedChannel(channel);
                    setShowChannelModal(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-700 text-gray-300"
                  onClick={() => cloneChannel(channel)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500 text-red-400"
                  onClick={() => deleteChannel(channel)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {filteredChannels.length === 0 && (
          <Card className="bg-gray-900 border-gray-800 p-12 text-center">
            <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No monetization channels found</p>
            <Button
              onClick={createNewChannel}
              className="mt-4 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Channel
            </Button>
          </Card>
        )}
      </div>

      {/* Channel Modal */}
      {showChannelModal && selectedChannel && (
        <ChannelModal
          channel={selectedChannel}
          onSave={saveChannel}
          onClose={() => {
            setShowChannelModal(false);
            setSelectedChannel(null);
          }}
        />
      )}

      {/* Subscription Manager */}
      {showSubscriptionManager && (
        <SubscriptionPackageManager
          onClose={() => setShowSubscriptionManager(false)}
        />
      )}
    </div>
  );
}

// Channel Modal Component
function ChannelModal({ channel, onSave, onClose }) {
  const [formData, setFormData] = useState(channel);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <Card className="bg-gray-900 border-gray-800 max-w-4xl w-full my-8">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-white">
              {formData.id ? 'Edit Channel' : 'Create New Channel'}
            </h3>
            <Button type="button" variant="ghost" onClick={onClose}>
              <XCircle className="w-5 h-5" />
            </Button>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400">Channel Name *</label>
              <Input
                value={formData.channel_name}
                onChange={(e) => setFormData({...formData, channel_name: e.target.value})}
                required
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="subscription">Subscription</option>
                <option value="commission">Commission</option>
                <option value="add_on">Add-on</option>
                <option value="partner">Partner</option>
                <option value="data">Data</option>
                <option value="api_access">API Access</option>
                <option value="premium_features">Premium Features</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400">Pricing Model *</label>
              <select
                value={formData.pricing_model}
                onChange={(e) => setFormData({...formData, pricing_model: e.target.value})}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="fixed">Fixed</option>
                <option value="percentage">Percentage</option>
                <option value="tiered">Tiered</option>
                <option value="dynamic">Dynamic</option>
                <option value="pay_per_use">Pay Per Use</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400">Base Price (USD)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.pricing_variables?.base_price || 0}
                onChange={(e) => setFormData({
                  ...formData,
                  pricing_variables: {
                    ...formData.pricing_variables,
                    base_price: parseFloat(e.target.value)
                  }
                })}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          {/* Operational Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400">Operational Mode</label>
              <select
                value={formData.operational_mode}
                onChange={(e) => setFormData({...formData, operational_mode: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="draft">Draft</option>
                <option value="testing">Testing</option>
                <option value="live">Live</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4"
              />
              <label className="text-sm text-gray-400">Active</label>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {formData.id ? 'Update Channel' : 'Create Channel'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-gray-700 text-gray-300"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
