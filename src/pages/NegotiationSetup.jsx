
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { NegotiationFramework, Package, Enabler, User } from "@/api/entities";
import { ArrowLeft, Save, Plus, Trash2, Sparkles, DollarSign, Calendar, Package as PackageIcon, CreditCard, Zap, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import BlinkLogo from "../components/BlinkLogo";

export default function NegotiationSetup() {
  const navigate = useNavigate();
  const [enabler, setEnabler] = useState(null);
  const [frameworks, setFrameworks] = useState([]);
  const [packages, setPackages] = useState([]);
  const [currentFramework, setCurrentFramework] = useState({
    framework_name: "",
    framework_type: "price_negotiation",
    auto_negotiate: false,
    price_flexibility: {
      allow_discount: false,
      max_discount_percentage: 0,
      discount_tiers: []
    },
    schedule_flexibility: {
      allow_date_changes: true,
      lead_time_days: 14,
      blackout_dates: [],
      preferred_days: []
    },
    package_customization: {
      allow_modifications: true,
      optional_add_ons: []
    },
    payment_terms_options: ["full_upfront", "50_50"],
    quick_accept_bonus: {
      enabled: false,
      hours_window: 24,
      discount_percentage: 5
    },
    conditional_offers: [],
    response_time_commitment: "24_hours",
    status: "active",
    linked_package_ids: [] // This field is for internal reference if frameworks stored package IDs, but packages now store framework IDs.
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showLinkPackages, setShowLinkPackages] = useState(false);
  const [selectedFrameworkForLinking, setSelectedFrameworkForLinking] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const user = await User.me();
    const selectedProfileId = localStorage.getItem("selected_enabler_profile");
    
    let enablerData;
    if (selectedProfileId) {
      const profileData = await Enabler.filter({ id: selectedProfileId, user_id: user.id });
      enablerData = profileData[0];
    } else {
      const enablers = await Enabler.filter({ user_id: user.id });
      enablerData = enablers[0];
    }
    
    if (enablerData) {
      setEnabler(enablerData);
      const frameworks = await NegotiationFramework.filter({ enabler_id: enablerData.id });
      setFrameworks(frameworks);
      
      const packagesData = await Package.filter({ enabler_id: enablerData.id });
      setPackages(packagesData);
    }
  };

  const handleSave = async () => {
    if (!enabler || !currentFramework.framework_name) {
      alert("Please enter a framework name");
      return;
    }

    const data = {
      ...currentFramework,
      enabler_id: enabler.id
    };

    try {
      if (editingId) {
        await NegotiationFramework.update(editingId, data);
      } else {
        await NegotiationFramework.create(data);
      }

      setIsEditing(false);
      setEditingId(null);
      setCurrentFramework({
        framework_name: "",
        framework_type: "price_negotiation",
        auto_negotiate: false,
        price_flexibility: { allow_discount: false, max_discount_percentage: 0, discount_tiers: [] },
        schedule_flexibility: { allow_date_changes: true, lead_time_days: 14, blackout_dates: [], preferred_days: [] },
        package_customization: { allow_modifications: true, optional_add_ons: [] },
        payment_terms_options: ["full_upfront", "50_50"],
        quick_accept_bonus: { enabled: false, hours_window: 24, discount_percentage: 5 },
        conditional_offers: [],
        response_time_commitment: "24_hours",
        status: "active",
        linked_package_ids: []
      });
      loadData();
    } catch (error) {
      console.error("Error saving framework:", error);
      alert("Failed to save framework. Please try again.");
    }
  };

  const handleEdit = (framework) => {
    setCurrentFramework(framework);
    setEditingId(framework.id);
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this negotiation framework?")) {
      try {
        // Unlink from all packages first
        const linkedPackages = packages.filter(p => 
          p.negotiation_framework_ids && p.negotiation_framework_ids.includes(id)
        );
        
        for (const pkg of linkedPackages) {
          const updatedFrameworkIds = (pkg.negotiation_framework_ids || []).filter(fid => fid !== id);
          await Package.update(pkg.id, { negotiation_framework_ids: updatedFrameworkIds });
        }
        
        await NegotiationFramework.delete(id);
        loadData();
      } catch (error) {
        console.error("Error deleting framework:", error);
        alert("Failed to delete framework. Please try again.");
      }
    }
  };

  const handleLinkToPackage = async (packageId, frameworkId) => {
    try {
      const pkg = packages.find(p => p.id === packageId);
      if (!pkg) return;

      let updatedFrameworkIds = [...(pkg.negotiation_framework_ids || [])];
      
      // If already linked, unlink
      if (updatedFrameworkIds.includes(frameworkId)) {
        updatedFrameworkIds = updatedFrameworkIds.filter(id => id !== frameworkId);
      } else {
        // Link to this framework
        updatedFrameworkIds.push(frameworkId);
      }
      
      await Package.update(packageId, { negotiation_framework_ids: updatedFrameworkIds });
      loadData();
    } catch (error) {
      console.error("Error linking package:", error);
      alert("Failed to link package. Please try again.");
    }
  };

  const openLinkPackagesModal = (framework) => {
    setSelectedFrameworkForLinking(framework);
    setShowLinkPackages(true);
  };

  const getLinkedPackagesCount = (frameworkId) => {
    return packages.filter(p => 
      p.negotiation_framework_ids && p.negotiation_framework_ids.includes(frameworkId)
    ).length;
  };

  const addConditionalOffer = () => {
    setCurrentFramework(prev => ({
      ...prev,
      conditional_offers: [...(prev.conditional_offers || []), { condition: "", benefit: "", value: 0 }]
    }));
  };

  const addAddOn = () => {
    setCurrentFramework(prev => ({
      ...prev,
      package_customization: {
        ...prev.package_customization,
        optional_add_ons: [...(prev.package_customization?.optional_add_ons || []), { name: "", price: 0, description: "" }]
      }
    }));
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Negotiation Settings</h1>
            <p className="text-xs text-gray-500">Auto-negotiate without messaging</p>
          </div>
          <BlinkLogo size="sm" />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-20 pb-8 space-y-6">
        {!isEditing ? (
          <>
            <Card className="p-6 bg-gradient-to-br from-emerald-50 to-cyan-50 border-2 border-emerald-200">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Smart Negotiation Frameworks</h3>
                  <p className="text-sm text-gray-700">
                    Create reusable negotiation rules and link them to specific packages. Each package can have its own negotiation strategy.
                  </p>
                </div>
              </div>
            </Card>

            <Button
              onClick={() => setIsEditing(true)}
              className="w-full bg-black text-white py-6"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Framework
            </Button>

            <div className="space-y-3">
              {frameworks.map((framework) => {
                const linkedCount = getLinkedPackagesCount(framework.id);
                
                return (
                  <Card key={framework.id} className="p-5 border-2 border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900">{framework.framework_name}</h4>
                        <p className="text-xs text-gray-500 capitalize mt-1">
                          {framework.framework_type.replace(/_/g, ' ')}
                        </p>
                        
                        {linkedCount > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            <Link2 className="w-3 h-3 text-emerald-600" />
                            <span className="text-xs text-emerald-600 font-medium">
                              Linked to {linkedCount} package{linkedCount > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(framework)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(framework.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {framework.auto_negotiate && (
                        <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded">
                          Auto-negotiate
                        </span>
                      )}
                      {framework.price_flexibility?.allow_discount && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          Up to {framework.price_flexibility.max_discount_percentage}% off
                        </span>
                      )}
                      {framework.quick_accept_bonus?.enabled && (
                        <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded">
                          Quick accept bonus
                        </span>
                      )}
                    </div>

                    <Button
                      onClick={() => openLinkPackagesModal(framework)}
                      variant="outline"
                      className="w-full mt-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      size="sm"
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      Link to Packages ({linkedCount})
                    </Button>
                  </Card>
                );
              })}
            </div>

            {frameworks.length === 0 && (
              <Card className="p-8 text-center border-2 border-dashed border-gray-200">
                <Sparkles className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500 mb-4">
                  No negotiation frameworks yet
                </p>
                <p className="text-xs text-gray-400">
                  Create frameworks to automate negotiations for your packages
                </p>
              </Card>
            )}
          </>
        ) : (
          <Card className="p-6">
            <h3 className="font-bold text-gray-900 mb-6">
              {editingId ? 'Edit' : 'Create'} Negotiation Framework
            </h3>

            <div className="space-y-6">
              <div>
                <Label>Framework Name</Label>
                <Input
                  value={currentFramework.framework_name}
                  onChange={(e) => setCurrentFramework({...currentFramework, framework_name: e.target.value})}
                  placeholder="e.g., Standard Price Negotiation"
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Framework Type</Label>
                <Select
                  value={currentFramework.framework_type}
                  onValueChange={(value) => setCurrentFramework({...currentFramework, framework_type: value})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price_negotiation">Price Negotiation</SelectItem>
                    <SelectItem value="schedule_flexibility">Schedule Flexibility</SelectItem>
                    <SelectItem value="package_customization">Package Customization</SelectItem>
                    <SelectItem value="payment_terms">Payment Terms</SelectItem>
                    <SelectItem value="full_service">Full Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                <div>
                  <Label className="text-sm font-bold">Auto-Negotiate</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Let AI handle offers within your rules
                  </p>
                </div>
                <Switch
                  checked={currentFramework.auto_negotiate}
                  onCheckedChange={(checked) => setCurrentFramework({...currentFramework, auto_negotiate: checked})}
                />
              </div>

              <Tabs defaultValue="price" className="w-full">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="price">Price</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  <TabsTrigger value="package">Package</TabsTrigger>
                  <TabsTrigger value="payment">Payment</TabsTrigger>
                </TabsList>

                <TabsContent value="price" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <Label>Allow Price Discounts</Label>
                    <Switch
                      checked={currentFramework.price_flexibility?.allow_discount}
                      onCheckedChange={(checked) => setCurrentFramework({
                        ...currentFramework,
                        price_flexibility: {
                          ...currentFramework.price_flexibility,
                          allow_discount: checked
                        }
                      })}
                    />
                  </div>

                  {currentFramework.price_flexibility?.allow_discount && (
                    <div>
                      <Label>Max Discount (%)</Label>
                      <Input
                        type="number"
                        value={currentFramework.price_flexibility?.max_discount_percentage || 0}
                        onChange={(e) => setCurrentFramework({
                          ...currentFramework,
                          price_flexibility: {
                            ...currentFramework.price_flexibility,
                            max_discount_percentage: parseInt(e.target.value)
                          }
                        })}
                        className="mt-2"
                      />
                    </div>
                  )}

                  <div className="p-4 bg-amber-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-bold">Quick Accept Bonus</Label>
                      <Switch
                        checked={currentFramework.quick_accept_bonus?.enabled}
                        onCheckedChange={(checked) => setCurrentFramework({
                          ...currentFramework,
                          quick_accept_bonus: {
                            ...currentFramework.quick_accept_bonus,
                            enabled: checked
                          }
                        })}
                      />
                    </div>
                    {currentFramework.quick_accept_bonus?.enabled && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Time Window (hours)</Label>
                          <Input
                            type="number"
                            value={currentFramework.quick_accept_bonus?.hours_window || 24}
                            onChange={(e) => setCurrentFramework({
                              ...currentFramework,
                              quick_accept_bonus: {
                                ...currentFramework.quick_accept_bonus,
                                hours_window: parseInt(e.target.value)
                              }
                            })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Bonus Discount (%)</Label>
                          <Input
                            type="number"
                            value={currentFramework.quick_accept_bonus?.discount_percentage || 5}
                            onChange={(e) => setCurrentFramework({
                              ...currentFramework,
                              quick_accept_bonus: {
                                ...currentFramework.quick_accept_bonus,
                                discount_percentage: parseInt(e.target.value)
                              }
                            })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="schedule" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <Label>Allow Date Changes</Label>
                    <Switch
                      checked={currentFramework.schedule_flexibility?.allow_date_changes}
                      onCheckedChange={(checked) => setCurrentFramework({
                        ...currentFramework,
                        schedule_flexibility: {
                          ...currentFramework.schedule_flexibility,
                          allow_date_changes: checked
                        }
                      })}
                    />
                  </div>

                  <div>
                    <Label>Minimum Lead Time (days)</Label>
                    <Input
                      type="number"
                      value={currentFramework.schedule_flexibility?.lead_time_days || 14}
                      onChange={(e) => setCurrentFramework({
                        ...currentFramework,
                        schedule_flexibility: {
                          ...currentFramework.schedule_flexibility,
                          lead_time_days: parseInt(e.target.value)
                        }
                      })}
                      className="mt-2"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="package" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <Label>Allow Package Modifications</Label>
                    <Switch
                      checked={currentFramework.package_customization?.allow_modifications}
                      onCheckedChange={(checked) => setCurrentFramework({
                        ...currentFramework,
                        package_customization: {
                          ...currentFramework.package_customization,
                          allow_modifications: checked
                        }
                      })}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Optional Add-Ons</Label>
                      <button
                        onClick={addAddOn}
                        className="text-xs text-emerald-600 hover:text-emerald-700"
                      >
                        + Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {currentFramework.package_customization?.optional_add_ons?.map((addon, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            placeholder="Add-on name"
                            value={addon.name}
                            onChange={(e) => {
                              const newAddOns = [...currentFramework.package_customization.optional_add_ons];
                              newAddOns[idx].name = e.target.value;
                              setCurrentFramework({
                                ...currentFramework,
                                package_customization: {
                                  ...currentFramework.package_customization,
                                  optional_add_ons: newAddOns
                                }
                              });
                            }}
                          />
                          <Input
                            type="number"
                            placeholder="Price"
                            value={addon.price}
                            onChange={(e) => {
                              const newAddOns = [...currentFramework.package_customization.optional_add_ons];
                              newAddOns[idx].price = parseFloat(e.target.value);
                              setCurrentFramework({
                                ...currentFramework,
                                package_customization: {
                                  ...currentFramework.package_customization,
                                  optional_add_ons: newAddOns
                                }
                              });
                            }}
                            className="w-24"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="payment" className="space-y-4 mt-4">
                  <div>
                    <Label>Payment Options (select multiple)</Label>
                    <div className="space-y-2 mt-2">
                      {["full_upfront", "50_50", "30_70", "installments_4"].map(option => (
                        <label key={option} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={currentFramework.payment_terms_options?.includes(option)}
                            onChange={(e) => {
                              const current = currentFramework.payment_terms_options || [];
                              const updated = e.target.checked
                                ? [...current, option]
                                : current.filter(o => o !== option);
                              setCurrentFramework({
                                ...currentFramework,
                                payment_terms_options: updated
                              });
                            }}
                            className="rounded"
                          />
                          <span className="text-sm capitalize">{option.replace(/_/g, ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div>
                <Label>Response Time Commitment</Label>
                <Select
                  value={currentFramework.response_time_commitment}
                  onValueChange={(value) => setCurrentFramework({...currentFramework, response_time_commitment: value})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1_hour">Within 1 hour</SelectItem>
                    <SelectItem value="4_hours">Within 4 hours</SelectItem>
                    <SelectItem value="24_hours">Within 24 hours</SelectItem>
                    <SelectItem value="48_hours">Within 48 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Framework
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditingId(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Link Packages Modal */}
      {showLinkPackages && selectedFrameworkForLinking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-900">Link Packages</h3>
                <button
                  onClick={() => {
                    setShowLinkPackages(false);
                    setSelectedFrameworkForLinking(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <Unlink className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Select packages to use "{selectedFrameworkForLinking.framework_name}"
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-800">
                💡 You can link multiple frameworks to the same package
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {packages.length === 0 ? (
                <div className="text-center py-8">
                  <PackageIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">No packages created yet</p>
                  <Button
                    onClick={() => {
                      setShowLinkPackages(false); 
                      navigate(createPageUrl("EnablerShop"));
                    }}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    Create Package
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {packages.map((pkg) => {
                    const isLinked = pkg.negotiation_framework_ids && 
                                    pkg.negotiation_framework_ids.includes(selectedFrameworkForLinking.id);
                    const otherFrameworksCount = (pkg.negotiation_framework_ids || []).filter(
                      id => id !== selectedFrameworkForLinking.id
                    ).length;
                    
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => handleLinkToPackage(pkg.id, selectedFrameworkForLinking.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          isLinked
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 text-sm">{pkg.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">${pkg.price}</p>
                            {otherFrameworksCount > 0 && (
                              <p className="text-xs text-blue-700 mt-1 flex items-center gap-1">
                                <Link2 className="w-3 h-3" />
                                {otherFrameworksCount} other framework{otherFrameworksCount > 1 ? 's' : ''} linked
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isLinked && (
                              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                <Link2 className="w-4 h-4 text-white" strokeWidth={2} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100">
              <Button
                onClick={() => {
                  setShowLinkPackages(false);
                  setSelectedFrameworkForLinking(null);
                }}
                className="w-full"
              >
                Done
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
