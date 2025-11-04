
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Contract, Enabler, User, Package, Notification } from "@/api/entities"; // Added Package, Notification
import { Plus, FileText, CheckCircle2, Clock, AlertCircle, Eye, Edit, X, Shield, Package as PackageIcon } from "lucide-react"; // Added Shield, Package as PackageIcon
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BlinkLogo from "../components/BlinkLogo";
import { format } from "date-fns";

export default function EnablerContracts() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [enabler, setEnabler] = useState(null);
  const [user, setUser] = useState(null); // New state for user
  const [packages, setPackages] = useState([]); // New state for packages
  const [filter, setFilter] = useState("all");
  const [selectedContractForLinking, setSelectedContractForLinking] = useState(null); // New state for linking modal
  const [showLinkModal, setShowLinkModal] = useState(false); // New state for linking modal visibility

  useEffect(() => {
    loadData(); // Renamed from loadContracts to loadData
  }, []);

  const loadData = async () => { // Renamed from loadContracts to loadData
    try {
      const fetchedUser = await User.me();
      setUser(fetchedUser); // Set user in state
      const enablerData = await Enabler.filter({ user_id: fetchedUser.id });
      
      if (enablerData[0]) {
        setEnabler(enablerData[0]);
        const contractsData = await Contract.filter({ enabler_id: enablerData[0].id }, "-created_date");
        setContracts(contractsData);

        const packagesData = await Package.filter({ enabler_id: enablerData[0].id }); // Fetch packages
        setPackages(packagesData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "border-emerald-500 text-emerald-700 bg-emerald-50";
      case "pending_signature": return "border-amber-500 text-amber-700 bg-amber-50";
      case "completed": return "border-gray-500 text-gray-700 bg-gray-50";
      case "cancelled": return "border-red-500 text-red-700 bg-red-50";
      case "disputed": return "border-orange-500 text-orange-700 bg-orange-50";
      default: return "border-gray-300 text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active": return <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />;
      case "pending_signature": return <Clock className="w-4 h-4" strokeWidth={1.5} />;
      case "disputed": return <AlertCircle className="w-4 h-4" strokeWidth={1.5} />;
      default: return <FileText className="w-4 h-4" strokeWidth={1.5} />;
    }
  };

  const handleLinkToPackage = async (contractId, packageId) => {
    try {
      const contract = contracts.find(c => c.id === contractId);
      const pkg = packages.find(p => p.id === packageId);
      
      if (!contract || !pkg || !user || !enabler) { // Added user and enabler checks
          console.error("Missing contract, package, user, or enabler data for linking.");
          alert("Failed to link contract. Missing data. Please try again.");
          return;
      }

      // Link contract to package AND auto-sign by enabler
      await Package.update(packageId, { linked_contract_id: contractId });
      
      const now = new Date().toISOString();
      await Contract.update(contractId, { 
        auto_signed_by_enabler: true,
        package_id: packageId,
        signatures: {
          ...contract.signatures, // Preserve existing signatures if any
          vendor_signed: true,
          vendor_signed_at: now
        },
        // If contract is draft, move to pending_signature, otherwise keep current status
        status: contract.status === "draft" ? "pending_signature" : contract.status 
      });
      
      // Create notification for enabler
      await Notification.create({
        user_id: user.id,
        enabler_id: enabler.id,
        profile_name: enabler.profile_name || enabler.business_name,
        type: "contract_signed",
        title: "Smart Contract Activated",
        message: `Your contract for "${pkg.name}" is now active and auto-signed. Hosts can book instantly!`,
        link: createPageUrl("ContractDetail") + "?id=" + contractId
      });

      setSelectedContractForLinking(null);
      setShowLinkModal(false);
      loadData(); // Reload all data to reflect changes
      
      alert(`✅ Smart Contract Activated!\n\n"${pkg.name}" now has an auto-signed contract. When hosts book this package, they'll only need to sign - your approval is already in place!`);
    } catch (error) {
      console.error("Error linking contract:", error);
      alert("Failed to link contract. Please try again.");
    }
  };

  const filteredContracts = filter === "all" 
    ? contracts 
    : contracts.filter(c => c.status === filter);

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-100">
        <div className="max-w-md mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BlinkLogo size="sm" />
              <div>
                <h1 className="text-lg font-medium text-gray-900 tracking-tight">Contracts</h1>
                <p className="text-xs text-gray-400 tracking-wide mt-0.5">MANAGE AGREEMENTS</p>
              </div>
            </div>
            <Link to={createPageUrl("CreateContract")}>
              <button className="w-10 h-10 rounded-full border-2 border-emerald-500 flex items-center justify-center hover:bg-emerald-50 transition-all group">
                <Plus className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
              </button>
            </Link>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {["all", "draft", "pending_signature", "active", "completed"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 text-xs font-medium tracking-wide whitespace-nowrap transition-all ${
                  filter === status
                    ? "border-2 border-emerald-500 text-emerald-700 bg-emerald-50"
                    : "border border-gray-200 text-gray-600 hover:border-emerald-300"
                }`}
              >
                {status.replace(/_/g, " ").toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-8 space-y-6"> {/* Added space-y-6 here */}
        {/* New Smart Contracts Info Card */}
        <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-indigo-600" />
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Smart Contracts</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Link contracts to packages for automatic signing. When you link a contract to a package, 
                <span className="font-semibold text-indigo-700"> it's automatically signed by you</span>. 
                When a host accepts and signs, the booking is <span className="font-semibold text-indigo-700">instantly confirmed</span>.
              </p>
            </div>
          </div>
        </Card>

        {filteredContracts.length === 0 ? (
          <div className="border border-gray-100 p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-200 mb-4" strokeWidth={1.5} />
            <p className="text-sm text-gray-400 tracking-wide mb-6">NO CONTRACTS YET</p>
            <Link to={createPageUrl("CreateContract")}>
              <button className="bg-emerald-500 text-white px-8 py-3 text-xs font-medium tracking-wide hover:bg-emerald-600 transition-colors">
                CREATE YOUR FIRST CONTRACT
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContracts.map((contract) => {
              const linkedPackage = packages.find(p => p.linked_contract_id === contract.id);
              const isAutoSigned = contract.auto_signed_by_enabler;
              
              return (
                <Card // Changed from div to Card
                  key={contract.id}
                  className="p-5 border-2 border-gray-100 hover:border-emerald-500 transition-all group cursor-pointer"
                  onClick={() => navigate(`${createPageUrl("ContractDetail")}?id=${contract.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-sm tracking-tight mb-1"> {/* Changed h4 to h3 */}
                        {contract.event_details?.event_name || `Contract #${contract.id.slice(0, 8)}`} {/* Adjusted fallback text */}
                      </h3>
                      <p className="text-xs text-gray-500 tracking-wide capitalize">
                        {contract.contract_type.replace(/_/g, " ")}
                      </p>
                      
                      {linkedPackage && (
                        <div className="flex items-center gap-1 mt-2">
                          <PackageIcon className="w-3 h-3 text-indigo-600" />
                          <span className="text-xs text-indigo-600 font-medium">
                            Linked to "{linkedPackage.name}"
                          </span>
                        </div>
                      )}
                      
                      {isAutoSigned && (
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span className="text-xs text-emerald-600 font-medium">
                            Auto-signed by you
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Changed from div to Badge, adjusted for icon */}
                    <Badge className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium tracking-wide border ${getStatusColor(contract.status)}`}>
                      {getStatusIcon(contract.status)}
                      {contract.status.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs text-gray-600">
                    {contract.pricing && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Total Value</span>
                        <span className="font-medium text-emerald-600">
                          {contract.pricing.currency} {contract.pricing.total_payment?.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {contract.event_details?.start_datetime && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Event Date</span>
                        <span className="font-medium">
                          {format(new Date(contract.event_details.start_datetime), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Created</span>
                      <span>{format(new Date(contract.created_date), "MMM d, yyyy")}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`${createPageUrl("ContractDetail")}?id=${contract.id}`);
                      }}
                      className="flex-1 border border-emerald-500 text-emerald-600 py-2 text-xs font-medium tracking-wide hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" strokeWidth={1.5} />
                      VIEW
                    </button>
                    {contract.status === "draft" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`${createPageUrl("CreateContract")}?edit=${contract.id}`);
                        }}
                        className="flex-1 border border-gray-300 text-gray-600 py-2 text-xs font-medium tracking-wide hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" strokeWidth={1.5} />
                        EDIT
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Original Info Card (kept as it provides a legal disclaimer) */}
        <div className="mt-8 border border-emerald-100 p-6 bg-emerald-50/30">
          <div className="flex items-start gap-3 mb-4">
            <BlinkLogo size="sm" />
            <div>
              <h3 className="font-medium text-gray-900 text-sm tracking-tight mb-2">Smart Contracts</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Create legally-binding agreements with automated payment schedules, cancellation policies, and dispute resolution. 
                Optional blockchain deployment for maximum transparency and security.
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-500 italic border-t border-emerald-100 pt-4 mt-4">
            ⚖️ Legal Disclaimer: This tool assists with contract automation but does not constitute legal advice. 
            Parties should consult legal counsel for enforceability in their jurisdiction.
          </div>
        </div>
      </div>
    </div>
  );
}
