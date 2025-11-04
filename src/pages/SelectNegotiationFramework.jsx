import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Package, NegotiationFramework, Enabler } from "@/api/entities";
import { ArrowLeft, Sparkles, DollarSign, Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import BlinkLogo from "../components/BlinkLogo";

export default function SelectNegotiationFramework() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const enablerId = searchParams.get("enabler_id");
  const eventId = searchParams.get("event_id");
  const packageId = searchParams.get("package_id");

  const [enabler, setEnabler] = useState(null);
  const [pkg, setPackage] = useState(null);
  const [frameworks, setFrameworks] = useState([]);
  const [selectedFramework, setSelectedFramework] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load enabler
      const enablerData = await Enabler.filter({ id: enablerId });
      if (enablerData[0]) setEnabler(enablerData[0]);

      // Load package
      const packageData = await Package.filter({ id: packageId });
      if (packageData[0]) {
        setPackage(packageData[0]);

        // Load frameworks
        if (packageData[0].negotiation_framework_ids && packageData[0].negotiation_framework_ids.length > 0) {
          const frameworksData = await NegotiationFramework.filter({
            id: packageData[0].negotiation_framework_ids
          });
          setFrameworks(frameworksData);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleSelectFramework = () => {
    if (!selectedFramework) {
      alert("Please select a negotiation option");
      return;
    }

    navigate(`${createPageUrl("StructuredNegotiate")}?enabler_id=${enablerId}&event_id=${eventId}&package_id=${packageId}&framework_id=${selectedFramework}`);
  };

  const getFrameworkIcon = (type) => {
    switch (type) {
      case "price_negotiation":
        return DollarSign;
      case "schedule_flexibility":
        return Calendar;
      default:
        return Sparkles;
    }
  };

  if (!pkg || !enabler) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <BlinkLogo size="lg" className="animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Choose Negotiation Style</h1>
            <p className="text-xs text-gray-500">{enabler.business_name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Package Info */}
        <Card className="p-5 bg-gradient-to-r from-emerald-50 to-cyan-50 border-2 border-emerald-200">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-gray-900 mb-1">{pkg.name}</h3>
              <p className="text-sm text-gray-700 mb-2">
                Multiple negotiation options available. Choose the one that works best for you!
              </p>
              <Badge className="bg-emerald-500 text-white">
                ${pkg.price}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Framework Selection */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Select Your Preferred Terms
          </h2>
          
          <RadioGroup value={selectedFramework} onValueChange={setSelectedFramework}>
            <div className="space-y-3">
              {frameworks.map((framework) => {
                const Icon = getFrameworkIcon(framework.framework_type);
                
                return (
                  <label
                    key={framework.id}
                    className={`flex items-start gap-3 p-5 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedFramework === framework.id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <RadioGroupItem value={framework.id} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-5 h-5 text-emerald-600" />
                        <h4 className="font-bold text-gray-900">{framework.framework_name}</h4>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3 capitalize">
                        {framework.framework_type.replace(/_/g, " ")}
                      </p>

                      {/* Framework Features */}
                      <div className="space-y-1.5">
                        {framework.price_flexibility?.allow_discount && (
                          <div className="flex items-center gap-2 text-xs text-gray-700">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Up to {framework.price_flexibility.max_discount_percentage}% price flexibility</span>
                          </div>
                        )}
                        {framework.auto_negotiate && (
                          <div className="flex items-center gap-2 text-xs text-gray-700">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Instant auto-negotiation</span>
                          </div>
                        )}
                        {framework.schedule_flexibility?.allow_date_changes && (
                          <div className="flex items-center gap-2 text-xs text-gray-700">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Flexible scheduling options</span>
                          </div>
                        )}
                        {framework.package_customization?.allow_modifications && (
                          <div className="flex items-center gap-2 text-xs text-gray-700">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Customize package inclusions</span>
                          </div>
                        )}
                        {framework.quick_accept_bonus?.enabled && (
                          <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>Quick accept bonus: {framework.quick_accept_bonus.discount_percentage}% off</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          Response time: {framework.response_time_commitment.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </RadioGroup>
        </div>

        {/* Continue Button */}
        <Button
          onClick={handleSelectFramework}
          disabled={!selectedFramework}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 text-lg font-semibold rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue with Selected Terms
        </Button>

        <p className="text-xs text-center text-gray-500">
          You can customize your offer in the next step
        </p>
      </div>
    </div>
  );
}