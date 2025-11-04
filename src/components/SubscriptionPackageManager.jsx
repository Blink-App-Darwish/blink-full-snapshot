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
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Crown,
  Star
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function SubscriptionPackageManager({ onClose }) {
  const [tiers, setTiers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState(null);
  const [showTierModal, setShowTierModal] = useState(false);
  const [userType, setUserType] = useState("host");

  useEffect(() => {
    loadTiers();
  }, [userType]);

  const loadTiers = async () => {
    setIsLoading(true);
    try {
      const { SubscriptionTier } = await import("@/api/entities");
      const tiersData = await SubscriptionTier.filter(
        { user_type: userType },
        "display_order"
      );
      setTiers(tiersData);
    } catch (error) {
      console.error("Error loading tiers:", error);
      setTiers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewTier = () => {
    setSelectedTier({
      tier_name: "",
      tier_level: tiers.length,
      user_type: userType,
      price_monthly: 0,
      price_yearly: 0,
      currency: "USD",
      trial_duration_days: 0,
      features: [],
      operational_mode: "draft",
      is_active: false,
      is_popular: false,
      billing_cycle: "monthly",
      support_level: "email",
      display_order: tiers.length
    });
    setShowTierModal(true);
  };

  const saveTier = async (tierData) => {
    try {
      const { SubscriptionTier } = await import("@/api/entities");

      if (tierData.id) {
        await SubscriptionTier.update(tierData.id, tierData);
        toast.success("Tier updated successfully");
      } else {
        await SubscriptionTier.create({
          ...tierData,
          version: 1
        });
        toast.success("Tier created successfully");
      }

      await loadTiers();
      setShowTierModal(false);
      setSelectedTier(null);
    } catch (error) {
      console.error("Error saving tier:", error);
      toast.error("Failed to save tier");
    }
  };

  const toggleTierStatus = async (tier) => {
    try {
      const { SubscriptionTier } = await import("@/api/entities");
      await SubscriptionTier.update(tier.id, { is_active: !tier.is_active });
      toast.success(`Tier ${!tier.is_active ? 'activated' : 'deactivated'}`);
      await loadTiers();
    } catch (error) {
      console.error("Error toggling tier:", error);
      toast.error("Failed to toggle tier status");
    }
  };

  const deleteTier = async (tier) => {
    if (!confirm(`Are you sure you want to delete "${tier.tier_name}"?`)) {
      return;
    }

    try {
      const { SubscriptionTier } = await import("@/api/entities");
      await SubscriptionTier.delete(tier.id);
      toast.success("Tier deleted successfully");
      await loadTiers();
    } catch (error) {
      console.error("Error deleting tier:", error);
      toast.error("Failed to delete tier");
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-gray-700 border-t-emerald-500 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <Card className="bg-gray-900 border-gray-800 max-w-6xl w-full my-8">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">Subscription Package Manager</h3>
              <p className="text-sm text-gray-400 mt-1">Manage subscription tiers and features</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={createNewTier}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Tier
              </Button>
              <Button variant="ghost" onClick={onClose}>
                <XCircle className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* User Type Selector */}
          <div className="flex gap-2">
            <Button
              variant={userType === "host" ? "default" : "outline"}
              className={userType === "host" ? "bg-blue-600 hover:bg-blue-700" : "border-gray-700 text-gray-300"}
              onClick={() => setUserType("host")}
            >
              Host Tiers
            </Button>
            <Button
              variant={userType === "enabler" ? "default" : "outline"}
              className={userType === "enabler" ? "bg-emerald-600 hover:bg-emerald-700" : "border-gray-700 text-gray-300"}
              onClick={() => setUserType("enabler")}
            >
              Enabler Tiers
            </Button>
          </div>

          {/* Tiers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <Card 
                key={tier.id} 
                className={`bg-gray-800 border-gray-700 p-6 hover:border-emerald-500 transition-colors ${
                  tier.is_popular ? 'border-emerald-500 relative' : ''
                }`}
              >
                {tier.is_popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-emerald-500 text-white">
                      <Crown className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h4 className="text-2xl font-bold text-white mb-2">{tier.tier_name}</h4>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-emerald-400">
                      ${tier.price_monthly}
                    </span>
                    <span className="text-gray-400 text-sm">/month</span>
                  </div>
                  {tier.price_yearly > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      ${tier.price_yearly}/year (save ${(tier.price_monthly * 12 - tier.price_yearly).toFixed(0)})
                    </p>
                  )}
                </div>

                <div className="space-y-2 mb-6">
                  <Badge className={`w-full justify-center ${
                    tier.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'
                  }`}>
                    {tier.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge className={`w-full justify-center ${
                    tier.operational_mode === 'live' ? 'bg-blue-500/20 text-blue-400' :
                    tier.operational_mode === 'testing' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-gray-700 text-gray-400'
                  }`}>
                    {tier.operational_mode}
                  </Badge>
                </div>

                <div className="space-y-2 mb-6">
                  {tier.features?.slice(0, 5).map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      {feature.included ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? 'text-gray-300' : 'text-gray-600'}>
                        {feature.feature_name}
                      </span>
                    </div>
                  ))}
                  {tier.features?.length > 5 && (
                    <p className="text-xs text-gray-500 text-center pt-2">
                      +{tier.features.length - 5} more features
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-gray-700 text-gray-300"
                    onClick={() => toggleTierStatus(tier)}
                  >
                    {tier.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-gray-700 text-gray-300"
                    onClick={() => {
                      setSelectedTier(tier);
                      setShowTierModal(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500 text-red-400"
                    onClick={() => deleteTier(tier)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}

            {tiers.length === 0 && (
              <div className="col-span-3 text-center py-12">
                <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No subscription tiers yet</p>
                <Button
                  onClick={createNewTier}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Tier
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Tier Modal */}
      {showTierModal && selectedTier && (
        <TierModal
          tier={selectedTier}
          onSave={saveTier}
          onClose={() => {
            setShowTierModal(false);
            setSelectedTier(null);
          }}
        />
      )}
    </div>
  );
}

// Tier Modal Component
function TierModal({ tier, onSave, onClose }) {
  const [formData, setFormData] = useState(tier);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <Card className="bg-gray-900 border-gray-800 max-w-2xl w-full my-8">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h4 className="text-xl font-bold text-white mb-4">
            {formData.id ? 'Edit Tier' : 'Create New Tier'}
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400">Tier Name *</label>
              <Input
                value={formData.tier_name}
                onChange={(e) => setFormData({...formData, tier_name: e.target.value})}
                required
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400">Tier Level *</label>
              <Input
                type="number"
                value={formData.tier_level}
                onChange={(e) => setFormData({...formData, tier_level: parseInt(e.target.value)})}
                required
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400">Monthly Price (USD) *</label>
              <Input
                type="number"
                step="0.01"
                value={formData.price_monthly}
                onChange={(e) => setFormData({...formData, price_monthly: parseFloat(e.target.value)})}
                required
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400">Yearly Price (USD)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.price_yearly}
                onChange={(e) => setFormData({...formData, price_yearly: parseFloat(e.target.value)})}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400">Trial Duration (days)</label>
              <Input
                type="number"
                value={formData.trial_duration_days}
                onChange={(e) => setFormData({...formData, trial_duration_days: parseInt(e.target.value)})}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400">Support Level</label>
              <select
                value={formData.support_level}
                onChange={(e) => setFormData({...formData, support_level: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="community">Community</option>
                <option value="email">Email</option>
                <option value="priority">Priority</option>
                <option value="24_7">24/7</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4"
              />
              Active
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={formData.is_popular}
                onChange={(e) => setFormData({...formData, is_popular: e.target.checked})}
                className="w-4 h-4"
              />
              Mark as Popular
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              {formData.id ? 'Update Tier' : 'Create Tier'}
            </Button>
            <Button type="button" variant="outline" className="border-gray-700 text-gray-300" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}