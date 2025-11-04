import React, { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { Package, Contract } from "@/api/entities";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  DollarSign, 
  Clock, 
  List, 
  FileText, 
  Link as LinkIcon,
  CheckCircle2,
  X,
  Plus,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PackageNegotiationSettings({ packageId, onSave, onClose }) {
  const [pkg, setPackage] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [settings, setSettings] = useState({
    price_negotiable: false,
    price_range: { min: 0, max: 0 },
    duration_negotiable: false,
    duration_options: [],
    inclusions_negotiable: false,
    negotiable_inclusions: [],
    terms_negotiable: false,
    custom_terms: [],
    auto_accept_threshold: 5
  });
  const [linkedContract, setLinkedContract] = useState(null);
  const [newDuration, setNewDuration] = useState("");
  const [newInclusion, setNewInclusion] = useState("");
  const [newTerm, setNewTerm] = useState({ term: "", options: [""] });

  useEffect(() => {
    loadPackageAndContracts();
  }, [packageId]);

  const loadPackageAndContracts = async () => {
    try {
      const pkgData = await Package.filter({ id: packageId });
      if (pkgData[0]) {
        setPackage(pkgData[0]);
        
        // Load existing settings
        if (pkgData[0].negotiation_settings) {
          setSettings(pkgData[0].negotiation_settings);
        } else {
          // Initialize with package price range
          setSettings(prev => ({
            ...prev,
            price_range: {
              min: Math.floor(pkgData[0].price * 0.7),
              max: pkgData[0].price
            }
          }));
        }

        // Load linked contract if exists
        if (pkgData[0].linked_contract_id) {
          const contractData = await Contract.filter({ id: pkgData[0].linked_contract_id });
          if (contractData[0]) {
            setLinkedContract(contractData[0]);
          }
        }
      }

      // Load all contracts for this enabler
      const contractsData = await Contract.filter({ enabler_id: pkgData[0].enabler_id });
      setContracts(contractsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleLinkContract = async (contractId) => {
    try {
      await Package.update(packageId, {
        linked_contract_id: contractId
      });

      const contractData = await Contract.filter({ id: contractId });
      setLinkedContract(contractData[0]);
    } catch (error) {
      console.error("Error linking contract:", error);
    }
  };

  const handleUnlinkContract = async () => {
    try {
      await Package.update(packageId, {
        linked_contract_id: null
      });
      setLinkedContract(null);
    } catch (error) {
      console.error("Error unlinking contract:", error);
    }
  };

  const addDurationOption = () => {
    if (newDuration.trim()) {
      setSettings({
        ...settings,
        duration_options: [...settings.duration_options, newDuration.trim()]
      });
      setNewDuration("");
    }
  };

  const removeDurationOption = (index) => {
    setSettings({
      ...settings,
      duration_options: settings.duration_options.filter((_, i) => i !== index)
    });
  };

  const addInclusion = () => {
    if (newInclusion.trim()) {
      setSettings({
        ...settings,
        negotiable_inclusions: [...settings.negotiable_inclusions, newInclusion.trim()]
      });
      setNewInclusion("");
    }
  };

  const removeInclusion = (index) => {
    setSettings({
      ...settings,
      negotiable_inclusions: settings.negotiable_inclusions.filter((_, i) => i !== index)
    });
  };

  const addCustomTerm = () => {
    if (newTerm.term.trim() && newTerm.options.some(opt => opt.trim())) {
      setSettings({
        ...settings,
        custom_terms: [...settings.custom_terms, {
          term: newTerm.term.trim(),
          options: newTerm.options.filter(opt => opt.trim())
        }]
      });
      setNewTerm({ term: "", options: [""] });
    }
  };

  const removeCustomTerm = (index) => {
    setSettings({
      ...settings,
      custom_terms: settings.custom_terms.filter((_, i) => i !== index)
    });
  };

  const handleSave = async () => {
    try {
      await Package.update(packageId, {
        negotiation_settings: settings
      });

      if (onSave) onSave(settings);
      if (onClose) onClose();
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    }
  };

  if (!pkg) {
    return <div className="flex items-center justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Smart Negotiations</h2>
                <p className="text-sm text-gray-500 mt-0.5">{pkg.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-220px)] overflow-y-auto">
          {/* Contract Linking */}
          <Card className="p-5 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-purple-600" strokeWidth={1.5} />
                <Label className="text-sm font-semibold text-purple-900">Linked Smart Contract</Label>
              </div>
              {linkedContract && (
                <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                  <CheckCircle2 className="w-3 h-3 mr-1" strokeWidth={2} />
                  Linked
                </Badge>
              )}
            </div>

            {linkedContract ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-purple-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{linkedContract.human_readable_summary?.split('\n')[0] || "Smart Contract"}</p>
                    <p className="text-xs text-gray-600 mt-1">Created {new Date(linkedContract.created_date).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={handleUnlinkContract}
                    className="text-red-500 hover:text-red-700 transition-colors p-2"
                  >
                    <X className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-3">Select a contract to link with this package:</p>
                {contracts.length === 0 ? (
                  <div className="bg-white/60 rounded-lg p-4 text-center border border-dashed border-purple-300">
                    <FileText className="w-8 h-8 text-purple-400 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-gray-600">No contracts available</p>
                    <Button
                      size="sm"
                      className="mt-3 bg-purple-600 hover:bg-purple-700"
                      onClick={() => window.location.href = createPageUrl("CreateContract")}
                    >
                      Create Contract
                    </Button>
                  </div>
                ) : (
                  contracts.map((contract) => (
                    <button
                      key={contract.id}
                      onClick={() => handleLinkContract(contract.id)}
                      className="w-full bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-purple-200 hover:border-purple-400 hover:bg-white transition-all text-left"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {contract.human_readable_summary?.split('\n')[0] || "Smart Contract"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {contract.contract_type} • Created {new Date(contract.created_date).toLocaleDateString()}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </Card>

          {/* Price Negotiation */}
          <Card className="p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" strokeWidth={1.5} />
                <Label className="text-sm font-semibold text-gray-900">Price Negotiation</Label>
              </div>
              <button
                onClick={() => setSettings({ ...settings, price_negotiable: !settings.price_negotiable })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.price_negotiable ? "bg-emerald-500" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.price_negotiable ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <AnimatePresence>
              {settings.price_negotiable && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600 mb-1.5">Minimum Price</Label>
                      <Input
                        type="number"
                        value={settings.price_range.min}
                        onChange={(e) => setSettings({
                          ...settings,
                          price_range: { ...settings.price_range, min: parseFloat(e.target.value) || 0 }
                        })}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1.5">Maximum Price</Label>
                      <Input
                        type="number"
                        value={settings.price_range.max}
                        onChange={(e) => setSettings({
                          ...settings,
                          price_range: { ...settings.price_range, max: parseFloat(e.target.value) || 0 }
                        })}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 mb-1.5">Auto-Accept Threshold (%)</Label>
                    <Input
                      type="number"
                      value={settings.auto_accept_threshold}
                      onChange={(e) => setSettings({ ...settings, auto_accept_threshold: parseInt(e.target.value) || 0 })}
                      className="text-sm"
                      placeholder="e.g., 5% within original price"
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-accept offers within this % of your price</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Duration Negotiation */}
          <Card className="p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
                <Label className="text-sm font-semibold text-gray-900">Duration Options</Label>
              </div>
              <button
                onClick={() => setSettings({ ...settings, duration_negotiable: !settings.duration_negotiable })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.duration_negotiable ? "bg-emerald-500" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.duration_negotiable ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <AnimatePresence>
              {settings.duration_negotiable && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-2"
                >
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., 4 hours, Full day"
                      value={newDuration}
                      onChange={(e) => setNewDuration(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addDurationOption()}
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={addDurationOption}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      <Plus className="w-4 h-4" strokeWidth={2} />
                    </Button>
                  </div>
                  {settings.duration_options.map((duration, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex items-center justify-between bg-blue-50 rounded-lg p-2 px-3"
                    >
                      <span className="text-sm text-gray-900">{duration}</span>
                      <button
                        onClick={() => removeDurationOption(index)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Inclusions Negotiation */}
          <Card className="p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <List className="w-5 h-5 text-purple-600" strokeWidth={1.5} />
                <Label className="text-sm font-semibold text-gray-900">Negotiable Inclusions</Label>
              </div>
              <button
                onClick={() => setSettings({ ...settings, inclusions_negotiable: !settings.inclusions_negotiable })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.inclusions_negotiable ? "bg-emerald-500" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.inclusions_negotiable ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <AnimatePresence>
              {settings.inclusions_negotiable && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-2"
                >
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., Extra lighting, Extended coverage"
                      value={newInclusion}
                      onChange={(e) => setNewInclusion(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addInclusion()}
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={addInclusion}
                      className="bg-purple-500 hover:bg-purple-600"
                    >
                      <Plus className="w-4 h-4" strokeWidth={2} />
                    </Button>
                  </div>
                  {settings.negotiable_inclusions.map((inclusion, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex items-center justify-between bg-purple-50 rounded-lg p-2 px-3"
                    >
                      <span className="text-sm text-gray-900">{inclusion}</span>
                      <button
                        onClick={() => removeInclusion(index)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Custom Terms */}
          <Card className="p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" strokeWidth={1.5} />
                <Label className="text-sm font-semibold text-gray-900">Custom Terms</Label>
              </div>
              <button
                onClick={() => setSettings({ ...settings, terms_negotiable: !settings.terms_negotiable })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.terms_negotiable ? "bg-emerald-500" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.terms_negotiable ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <AnimatePresence>
              {settings.terms_negotiable && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="bg-amber-50 rounded-lg p-3 space-y-2">
                    <Input
                      placeholder="Term name (e.g., Payment Schedule)"
                      value={newTerm.term}
                      onChange={(e) => setNewTerm({ ...newTerm, term: e.target.value })}
                      className="text-sm bg-white"
                    />
                    {newTerm.options.map((option, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          placeholder={`Option ${idx + 1}`}
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...newTerm.options];
                            newOptions[idx] = e.target.value;
                            setNewTerm({ ...newTerm, options: newOptions });
                          }}
                          className="text-sm bg-white"
                        />
                        {idx === newTerm.options.length - 1 && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setNewTerm({ ...newTerm, options: [...newTerm.options, ""] })}
                            variant="outline"
                          >
                            <Plus className="w-4 h-4" strokeWidth={2} />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      onClick={addCustomTerm}
                      className="w-full bg-amber-500 hover:bg-amber-600"
                    >
                      Add Custom Term
                    </Button>
                  </div>
                  {settings.custom_terms.map((term, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="bg-amber-50 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">{term.term}</span>
                        <button
                          onClick={() => removeCustomTerm(index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {term.options.map((opt, optIdx) => (
                          <span key={optIdx} className="text-xs bg-white px-2 py-1 rounded border border-amber-200">
                            {opt}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" strokeWidth={2} />
            Save Settings
          </Button>
        </div>
      </motion.div>
    </div>
  );
}