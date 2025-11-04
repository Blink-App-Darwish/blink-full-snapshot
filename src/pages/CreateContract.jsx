import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Contract, Enabler, Package, User } from "@/api/entities";
import { ArrowLeft, ArrowRight, Save, X, Info, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BlinkLogo from "../components/BlinkLogo";

const CANCELLATION_WINDOWS = [
  { days: 30, refund: 100, label: "30+ days: 100% refund" },
  { days: 14, refund: 75, label: "14-29 days: 75% refund" },
  { days: 7, refund: 50, label: "7-13 days: 50% refund" },
  { days: 3, refund: 25, label: "3-6 days: 25% refund" },
  { days: 0, refund: 0, label: "0-2 days: No refund" }
];

const WEATHER_CONDITIONS = [
  "Heavy Rain", "Snow/Ice", "Extreme Heat", "Lightning/Thunder", "Hurricane/Typhoon", "Flooding"
];

export default function CreateContract() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  
  const [step, setStep] = useState(1);
  const [enabler, setEnabler] = useState(null);
  const [packages, setPackages] = useState([]);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    contract_type: "service_agreement",
    package_id: "",
    total_payment: "",
    currency: "USD",
    deposit_percentage: 50,
    payment_schedule: "split_50_50",
    cancellation_windows: CANCELLATION_WINDOWS.slice(0, 3),
    force_majeure: true,
    weather_cancellation: false,
    weather_conditions: [],
    rescheduling_allowed: true,
    rescheduling_notice_days: 14,
    rescheduling_fee: 0,
    max_reschedules: 1,
    insurance_required: true,
    minimum_coverage: 1000000,
    equipment_liability_cap: 10000,
    damage_deposit: 0,
    photo_rights: "shared",
    video_rights: "shared",
    usage_restrictions: "",
    dispute_method: "arbitration",
    jurisdiction: "",
    use_blockchain: false,
    blockchain_chain: "off_chain",
    use_escrow: false,
    use_multisig: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await User.me();
      
      const selectedProfileId = localStorage.getItem("selected_enabler_profile");
      let enablerData;
      
      if (selectedProfileId) {
        const filterResult = await Enabler.filter({ id: selectedProfileId, user_id: user.id });
        enablerData = filterResult[0];
      } else {
        const filterResult = await Enabler.filter({ user_id: user.id }, "-created_date");
        enablerData = filterResult[0];
        if (enablerData) {
          localStorage.setItem("selected_enabler_profile", enablerData.id);
        }
      }
      
      if (enablerData) {
        setEnabler(enablerData);
        
        const packagesData = await Package.filter({ enabler_id: enablerData.id }, "-created_date");
        setPackages(packagesData);
      }

      if (editId) {
        const contractData = await Contract.filter({ id: editId });
        if (contractData[0]) {
          setFormData({
            ...formData,
            ...contractData[0]
          });
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleSave = async (isDraft = true) => {
    setSaving(true);
    try {
      const user = await User.me();
      
      const selectedPackage = packages.find(p => p.id === formData.package_id);
      
      const totalPayment = formData.total_payment || (selectedPackage ? selectedPackage.price : 0);
      const currency = formData.currency || (selectedPackage ? selectedPackage.currency : "USD");
      
      const contractData = {
        enabler_id: enabler.id,
        host_id: user.id,
        package_id: formData.package_id,
        contract_type: formData.contract_type,
        status: isDraft ? "draft" : "pending_signature",
        
        parties: {
          vendor: {
            name: enabler.business_name,
            wallet_address: "",
            contact_email: user.email,
            contact_phone: user.phone || ""
          },
          host: {
            name: "",
            wallet_address: "",
            contact_email: "",
            contact_phone: ""
          }
        },
        
        event_details: selectedPackage ? {
          event_name: selectedPackage.name,
          start_datetime: "",
          end_datetime: "",
          timezone: "UTC",
          location_address: "",
          expected_attendees: selectedPackage.max_guests || 0,
          setup_time_hours: 2,
          teardown_time_hours: 1
        } : {},
        
        pricing: {
          total_payment: parseFloat(totalPayment) || 0,
          currency: currency,
          deposit_amount: (parseFloat(totalPayment) || 0) * (formData.deposit_percentage / 100),
          deposit_percentage: formData.deposit_percentage,
          payment_schedule: formData.payment_schedule,
          payment_milestones: []
        },
        
        cancellation_policy: {
          host_cancellation_windows: formData.cancellation_windows,
          vendor_cancellation_penalty: 0,
          force_majeure_clause: formData.force_majeure,
          weather_cancellation: formData.weather_cancellation,
          weather_conditions: formData.weather_conditions
        },
        
        rescheduling_policy: {
          allowed: formData.rescheduling_allowed,
          notice_period_days: formData.rescheduling_notice_days,
          fee: formData.rescheduling_fee,
          max_reschedules: formData.max_reschedules
        },
        
        equipment_damage: {
          liability_cap: formData.equipment_liability_cap,
          insurance_required: formData.insurance_required,
          damage_deposit: formData.damage_deposit
        },
        
        insurance_requirements: {
          required: formData.insurance_required,
          minimum_coverage: formData.minimum_coverage,
          proof_required: true,
          verification_method: "upload"
        },
        
        intellectual_property: {
          photo_rights: formData.photo_rights,
          video_rights: formData.video_rights,
          usage_restrictions: formData.usage_restrictions
        },
        
        dispute_resolution: {
          method: formData.dispute_method,
          arbitrator: "",
          jurisdiction: formData.jurisdiction
        },
        
        data_handling: {
          gdpr_compliant: true,
          data_retention_days: 365,
          third_party_sharing: false
        },
        
        blockchain_config: {
          chain: formData.blockchain_chain,
          use_escrow: formData.use_escrow,
          use_multisig: formData.use_multisig,
          use_oracles: false,
          ipfs_hash: "",
          contract_address: ""
        },
        
        signatures: {
          vendor_signed: false,
          host_signed: false,
          witness_required: false
        },
        
        attachments: [],
        contract_json: JSON.stringify(formData),
        human_readable_summary: generateSummary(formData, selectedPackage)
      };

      if (editId) {
        await Contract.update(editId, contractData);
      } else {
        await Contract.create(contractData);
      }

      navigate(createPageUrl("EnablerContracts"));
    } catch (error) {
      console.error("Error saving contract:", error);
      alert("Failed to save contract. Please try again.");
    }
    setSaving(false);
  };

  const generateSummary = (data, selectedPackage) => {
    const totalPayment = data.total_payment || (selectedPackage ? selectedPackage.price : 0);
    const currency = data.currency || (selectedPackage ? selectedPackage.currency : "USD");
    
    return `
SERVICE AGREEMENT

Package: ${selectedPackage?.name || "TBD"}
Service Provider: ${enabler?.business_name}
Total Fee: ${currency} ${totalPayment}
Deposit: ${data.deposit_percentage}% (${currency} ${(parseFloat(totalPayment) || 0) * (data.deposit_percentage / 100)})

CANCELLATION POLICY:
${data.cancellation_windows.map(w => `- ${w.days}+ days: ${w.refund}% refund`).join('\n')}

RESCHEDULING: ${data.rescheduling_allowed ? `Allowed with ${data.rescheduling_notice_days} days notice` : "Not allowed"}

INSURANCE: ${data.insurance_required ? `Required (min ${currency} ${data.minimum_coverage})` : "Not required"}

DISPUTE RESOLUTION: ${data.dispute_method}

This is a legally binding agreement. Both parties should review carefully before signing.
    `.trim();
  };

  const nextStep = () => setStep(Math.min(step + 1, 5));
  const prevStep = () => setStep(Math.max(step - 1, 1));

  useEffect(() => {
    if (formData.package_id) {
      const selectedPackage = packages.find(p => p.id === formData.package_id);
      if (selectedPackage) {
        setFormData(prev => ({
          ...prev,
          total_payment: selectedPackage.price.toString(),
          currency: selectedPackage.currency || "USD"
        }));
      }
    }
  }, [formData.package_id, packages]);

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-100">
        <div className="max-w-md mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:border-emerald-500 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
            </button>
            <div className="flex-1 text-center">
              <h1 className="text-lg font-medium text-gray-900 tracking-tight">Create Contract</h1>
              <p className="text-xs text-gray-400 tracking-wide mt-0.5">STEP {step} OF 5</p>
            </div>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="w-10 h-10 rounded-full border border-emerald-500 flex items-center justify-center hover:bg-emerald-50 transition-all"
            >
              <Save className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1 transition-all ${
                  s <= step ? "bg-emerald-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-8">
        {step === 1 && (
          <div className="space-y-6">
            <div className="border border-emerald-100 p-4 bg-emerald-50/30">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 mt-0.5" strokeWidth={1.5} />
                <p className="text-xs text-gray-700 leading-relaxed">
                  Start by selecting your service package and defining the basic terms. This will form the foundation of your contract.
                </p>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500 tracking-wide mb-2">CONTRACT TYPE *</Label>
              <Select value={formData.contract_type} onValueChange={(v) => setFormData({...formData, contract_type: v})}>
                <SelectTrigger className="border-gray-200 focus:border-emerald-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service_agreement">Service Agreement</SelectItem>
                  <SelectItem value="venue_rental">Venue Rental</SelectItem>
                  <SelectItem value="full_event_package">Full Event Package</SelectItem>
                  <SelectItem value="collaboration">Collaboration Agreement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-gray-500 tracking-wide mb-2">SELECT PACKAGE *</Label>
              <Select value={formData.package_id} onValueChange={(v) => setFormData({...formData, package_id: v})}>
                <SelectTrigger className="border-gray-200 focus:border-emerald-500">
                  <SelectValue placeholder="Choose a package" />
                </SelectTrigger>
                <SelectContent>
                  {packages.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No packages available. Create packages first.
                    </div>
                  ) : (
                    packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} - {pkg.currency}{pkg.price}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">Select the service package this contract applies to</p>
              
              {packages.length === 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() => navigate(createPageUrl("EnablerShop"))}
                >
                  Create Your First Package
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500 tracking-wide mb-2">TOTAL PAYMENT *</Label>
                <Input
                  type="number"
                  placeholder="5000"
                  value={formData.total_payment}
                  onChange={(e) => setFormData({...formData, total_payment: e.target.value})}
                  className="border-gray-200 focus:border-emerald-500"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 tracking-wide mb-2">CURRENCY</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({...formData, currency: v})}>
                  <SelectTrigger className="border-gray-200 focus:border-emerald-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">$ USD</SelectItem>
                    <SelectItem value="AED">AED</SelectItem>
                    <SelectItem value="EGP">EGP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500 tracking-wide mb-2">DEPOSIT ({formData.deposit_percentage}%)</Label>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={formData.deposit_percentage}
                onChange={(e) => setFormData({...formData, deposit_percentage: parseInt(e.target.value)})}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span className="font-medium text-emerald-600">
                  {formData.currency} {((parseFloat(formData.total_payment) || 0) * (formData.deposit_percentage / 100)).toLocaleString()}
                </span>
                <span>100%</span>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500 tracking-wide mb-2">PAYMENT SCHEDULE</Label>
              <Select value={formData.payment_schedule} onValueChange={(v) => setFormData({...formData, payment_schedule: v})}>
                <SelectTrigger className="border-gray-200 focus:border-emerald-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_booking">Full payment on booking</SelectItem>
                  <SelectItem value="split_50_50">50% deposit + 50% on event day</SelectItem>
                  <SelectItem value="milestone_based">Milestone-based payments</SelectItem>
                  <SelectItem value="on_completion">Full payment after completion</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="border border-emerald-100 p-4 bg-emerald-50/30">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 mt-0.5" strokeWidth={1.5} />
                <p className="text-xs text-gray-700 leading-relaxed">
                  Define cancellation terms. Industry standard includes declining refunds as the event date approaches.
                </p>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500 tracking-wide mb-3">CANCELLATION WINDOWS</Label>
              <div className="space-y-2">
                {CANCELLATION_WINDOWS.map((window) => {
                  const isSelected = formData.cancellation_windows.some(w => w.days === window.days);
                  return (
                    <div
                      key={window.days}
                      onClick={() => {
                        if (isSelected) {
                          setFormData({
                            ...formData,
                            cancellation_windows: formData.cancellation_windows.filter(w => w.days !== window.days)
                          });
                        } else {
                          setFormData({
                            ...formData,
                            cancellation_windows: [...formData.cancellation_windows, { days: window.days, refund: window.refund }]
                          });
                        }
                      }}
                      className={`border p-4 cursor-pointer transition-all ${
                        isSelected 
                          ? "border-emerald-500 bg-emerald-50" 
                          : "border-gray-200 hover:border-emerald-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{window.label}</span>
                        {isSelected && <Check className="w-5 h-5 text-emerald-500" strokeWidth={2} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-gray-500 tracking-wide">FORCE MAJEURE CLAUSE</Label>
                <Checkbox
                  checked={formData.force_majeure}
                  onCheckedChange={(checked) => setFormData({...formData, force_majeure: checked})}
                  className="border-emerald-500 data-[state=checked]:bg-emerald-500"
                />
              </div>
              <p className="text-xs text-gray-600">
                Protects both parties from liability due to extraordinary events (natural disasters, pandemics, war, etc.)
              </p>
            </div>

            <div className="border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-gray-500 tracking-wide">WEATHER CANCELLATION</Label>
                <Checkbox
                  checked={formData.weather_cancellation}
                  onCheckedChange={(checked) => setFormData({...formData, weather_cancellation: checked})}
                  className="border-emerald-500 data-[state=checked]:bg-emerald-500"
                />
              </div>
              {formData.weather_cancellation && (
                <div className="mt-3 space-y-2">
                  <Label className="text-xs text-gray-500">QUALIFYING CONDITIONS</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {WEATHER_CONDITIONS.map((condition) => (
                      <div
                        key={condition}
                        onClick={() => {
                          const isSelected = formData.weather_conditions.includes(condition);
                          setFormData({
                            ...formData,
                            weather_conditions: isSelected
                              ? formData.weather_conditions.filter(c => c !== condition)
                              : [...formData.weather_conditions, condition]
                          });
                        }}
                        className={`text-xs p-2 cursor-pointer border transition-all ${
                          formData.weather_conditions.includes(condition)
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 text-gray-600 hover:border-emerald-300"
                        }`}
                      >
                        {condition}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="border border-emerald-100 p-4 bg-emerald-50/30">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 mt-0.5" strokeWidth={1.5} />
                <p className="text-xs text-gray-700 leading-relaxed">
                  Set rescheduling terms and insurance requirements to protect both parties.
                </p>
              </div>
            </div>

            <div className="border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-xs text-gray-500 tracking-wide">ALLOW RESCHEDULING</Label>
                <Checkbox
                  checked={formData.rescheduling_allowed}
                  onCheckedChange={(checked) => setFormData({...formData, rescheduling_allowed: checked})}
                  className="border-emerald-500 data-[state=checked]:bg-emerald-500"
                />
              </div>

              {formData.rescheduling_allowed && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-500 tracking-wide mb-2">NOTICE PERIOD (DAYS)</Label>
                    <Input
                      type="number"
                      value={formData.rescheduling_notice_days}
                      onChange={(e) => setFormData({...formData, rescheduling_notice_days: parseInt(e.target.value) || 0})}
                      className="border-gray-200 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-gray-500 tracking-wide mb-2">RESCHEDULING FEE ({formData.currency})</Label>
                    <Input
                      type="number"
                      value={formData.rescheduling_fee}
                      onChange={(e) => setFormData({...formData, rescheduling_fee: parseInt(e.target.value) || 0})}
                      className="border-gray-200 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-gray-500 tracking-wide mb-2">MAX RESCHEDULES</Label>
                    <Select 
                      value={String(formData.max_reschedules)} 
                      onValueChange={(v) => setFormData({...formData, max_reschedules: parseInt(v)})}
                    >
                      <SelectTrigger className="border-gray-200 focus:border-emerald-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 time</SelectItem>
                        <SelectItem value="2">2 times</SelectItem>
                        <SelectItem value="3">3 times</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div className="border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-xs text-gray-500 tracking-wide">REQUIRE INSURANCE</Label>
                <Checkbox
                  checked={formData.insurance_required}
                  onCheckedChange={(checked) => setFormData({...formData, insurance_required: checked})}
                  className="border-emerald-500 data-[state=checked]:bg-emerald-500"
                />
              </div>

              {formData.insurance_required && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-500 tracking-wide mb-2">MINIMUM COVERAGE ({formData.currency})</Label>
                    <Input
                      type="number"
                      value={formData.minimum_coverage}
                      onChange={(e) => setFormData({...formData, minimum_coverage: parseInt(e.target.value) || 0})}
                      className="border-gray-200 focus:border-emerald-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Standard: $1,000,000</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border border-gray-200 p-4">
              <Label className="text-xs text-gray-500 tracking-wide mb-3">EQUIPMENT DAMAGE</Label>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-500 tracking-wide mb-2">LIABILITY CAP ({formData.currency})</Label>
                  <Input
                    type="number"
                    value={formData.equipment_liability_cap}
                    onChange={(e) => setFormData({...formData, equipment_liability_cap: parseInt(e.target.value) || 0})}
                    className="border-gray-200 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-500 tracking-wide mb-2">DAMAGE DEPOSIT ({formData.currency})</Label>
                  <Input
                    type="number"
                    value={formData.damage_deposit}
                    onChange={(e) => setFormData({...formData, damage_deposit: parseInt(e.target.value) || 0})}
                    className="border-gray-200 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="border border-emerald-100 p-4 bg-emerald-50/30">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 mt-0.5" strokeWidth={1.5} />
                <p className="text-xs text-gray-700 leading-relaxed">
                  Define intellectual property rights and how disputes will be resolved.
                </p>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500 tracking-wide mb-3">INTELLECTUAL PROPERTY RIGHTS</Label>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-500 mb-2">PHOTO RIGHTS</Label>
                  <Select value={formData.photo_rights} onValueChange={(v) => setFormData({...formData, photo_rights: v})}>
                    <SelectTrigger className="border-gray-200 focus:border-emerald-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendor">Vendor owns all rights</SelectItem>
                      <SelectItem value="host">Host owns all rights</SelectItem>
                      <SelectItem value="shared">Shared rights (both can use)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-gray-500 mb-2">VIDEO RIGHTS</Label>
                  <Select value={formData.video_rights} onValueChange={(v) => setFormData({...formData, video_rights: v})}>
                    <SelectTrigger className="border-gray-200 focus:border-emerald-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendor">Vendor owns all rights</SelectItem>
                      <SelectItem value="host">Host owns all rights</SelectItem>
                      <SelectItem value="shared">Shared rights (both can use)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-gray-500 mb-2">USAGE RESTRICTIONS</Label>
                  <Textarea
                    placeholder="e.g., Vendor may use photos for portfolio and marketing with host approval"
                    value={formData.usage_restrictions}
                    onChange={(e) => setFormData({...formData, usage_restrictions: e.target.value})}
                    className="border-gray-200 focus:border-emerald-500"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500 tracking-wide mb-3">DISPUTE RESOLUTION</Label>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-500 mb-2">METHOD</Label>
                  <Select value={formData.dispute_method} onValueChange={(v) => setFormData({...formData, dispute_method: v})}>
                    <SelectTrigger className="border-gray-200 focus:border-emerald-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arbitration">Arbitration (recommended)</SelectItem>
                      <SelectItem value="mediation">Mediation</SelectItem>
                      <SelectItem value="legal">Legal proceedings</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.dispute_method === "arbitration" && "Binding arbitration by neutral third party"}
                    {formData.dispute_method === "mediation" && "Non-binding mediation to reach agreement"}
                    {formData.dispute_method === "legal" && "Court proceedings in specified jurisdiction"}
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-gray-500 mb-2">JURISDICTION</Label>
                  <Input
                    placeholder="e.g., Dubai, UAE"
                    value={formData.jurisdiction}
                    onChange={(e) => setFormData({...formData, jurisdiction: e.target.value})}
                    className="border-gray-200 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div className="border border-emerald-100 p-4 bg-emerald-50/30">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 mt-0.5" strokeWidth={1.5} />
                <p className="text-xs text-gray-700 leading-relaxed">
                  Optionally deploy to blockchain for transparent, immutable record-keeping and automated payment execution.
                </p>
              </div>
            </div>

            <div className="border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Label className="text-xs text-gray-500 tracking-wide">USE BLOCKCHAIN</Label>
                  <p className="text-xs text-gray-500 mt-1">Deploy contract on-chain</p>
                </div>
                <Checkbox
                  checked={formData.use_blockchain}
                  onCheckedChange={(checked) => setFormData({...formData, use_blockchain: checked})}
                  className="border-emerald-500 data-[state=checked]:bg-emerald-500"
                />
              </div>

              {formData.use_blockchain && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-500 mb-2">BLOCKCHAIN</Label>
                    <Select value={formData.blockchain_chain} onValueChange={(v) => setFormData({...formData, blockchain_chain: v})}>
                      <SelectTrigger className="border-gray-200 focus:border-emerald-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ethereum">Ethereum (higher gas fees)</SelectItem>
                        <SelectItem value="polygon">Polygon (lower fees)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <Label className="text-xs text-gray-500">Use Escrow</Label>
                    <Checkbox
                      checked={formData.use_escrow}
                      onCheckedChange={(checked) => setFormData({...formData, use_escrow: checked})}
                      className="border-emerald-500 data-[state=checked]:bg-emerald-500"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <Label className="text-xs text-gray-500">Multi-Signature Required</Label>
                    <Checkbox
                      checked={formData.use_multisig}
                      onCheckedChange={(checked) => setFormData({...formData, use_multisig: checked})}
                      className="border-emerald-500 data-[state=checked]:bg-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border border-emerald-500 p-6 bg-emerald-50/30">
              <h3 className="font-medium text-gray-900 mb-4 text-sm tracking-tight flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
                CONTRACT SUMMARY
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Payment</span>
                  <span className="font-medium">{formData.currency} {parseFloat(formData.total_payment || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Deposit</span>
                  <span className="font-medium">
                    {formData.deposit_percentage}% ({formData.currency} {((parseFloat(formData.total_payment) || 0) * (formData.deposit_percentage / 100)).toLocaleString()})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cancellation Windows</span>
                  <span className="font-medium">{formData.cancellation_windows.length} tiers</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rescheduling</span>
                  <span className="font-medium">{formData.rescheduling_allowed ? "Allowed" : "Not allowed"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Insurance Required</span>
                  <span className="font-medium">{formData.insurance_required ? "Yes" : "No"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dispute Resolution</span>
                  <span className="font-medium capitalize">{formData.dispute_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Blockchain</span>
                  <span className="font-medium">{formData.use_blockchain ? formData.blockchain_chain : "Off-chain"}</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 p-4 text-xs text-gray-600 italic">
              ⚖️ <strong>Legal Disclaimer:</strong> This tool assists with contract automation but does not constitute legal advice. 
              Parties should consult legal counsel to ensure enforceability in their jurisdiction.
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
          {step > 1 && (
            <button
              onClick={prevStep}
              className="flex-1 border border-gray-300 text-gray-700 py-3 text-xs font-medium tracking-wide hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              BACK
            </button>
          )}
          
          {step < 5 ? (
            <button
              onClick={nextStep}
              disabled={step === 1 && !formData.package_id}
              className="flex-1 bg-emerald-500 text-white py-3 text-xs font-medium tracking-wide hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              NEXT
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          ) : (
            <button
              onClick={() => handleSave(false)}
              disabled={saving || !formData.package_id}
              className="flex-1 bg-emerald-500 text-white py-3 text-xs font-medium tracking-wide hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? "CREATING..." : "CREATE CONTRACT"}
              <Check className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}