import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Enabler } from "@/api/entities";
import { X, Star, Award, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PortfolioView() {
  const [searchParams] = useSearchParams();
  const enablerId = searchParams.get("id");
  const [enabler, setEnabler] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    const loadPortfolio = async () => {
      if (!enablerId) return;
      
      const enablerData = await Enabler.filter({ id: enablerId });
      if (enablerData[0]) {
        setEnabler(enablerData[0]);
      }
    };

    loadPortfolio();
  }, [enablerId]);

  if (!enabler) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-end">
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl overflow-hidden transition-all duration-300 ease-in-out transform"
        style={{ height: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-4 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Professional Portfolio</h3>
            <button
              onClick={() => window.history.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto h-[calc(100%-64px)] p-4 space-y-6">
          {/* Industry & Specialization */}
          <Card className="p-6">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-500" />
              Specialization
            </h4>
            <p className="text-lg font-semibold text-gray-900">{enabler.industry}</p>
            <p className="text-sm text-gray-600 mt-1">{enabler.sub_industry}</p>
          </Card>

          {/* Certifications */}
          {enabler.certificate_files && enabler.certificate_files.length > 0 && (
            <Card className="p-6">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Certifications ({enabler.certificate_files.length})
              </h4>
              <div className="space-y-2">
                {enabler.certificate_files.map((cert, idx) => (
                  <a
                    key={idx}
                    href={cert}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <p className="text-sm font-medium text-emerald-600">Certificate {idx + 1}</p>
                  </a>
                ))}
              </div>
            </Card>
          )}

          {/* Packages */}
          {enabler.preset_packages && enabler.preset_packages.length > 0 && (
            <Card className="p-6">
              <h4 className="font-bold text-gray-900 mb-3">Service Packages</h4>
              <div className="space-y-3">
                {enabler.preset_packages.map((pkg, idx) => (
                  <div key={idx} className="p-4 bg-gradient-to-r from-emerald-50 to-cyan-50 rounded-lg border border-emerald-200">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-semibold text-gray-900">{pkg.name}</h5>
                      <Badge className="bg-emerald-500">{pkg.currency}{pkg.price}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{pkg.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Collaboration */}
          {enabler.collaboration_open && (
            <Card className="p-6 bg-blue-50 border-blue-200">
              <h4 className="font-bold text-blue-900 mb-2">Open for Collaboration</h4>
              <p className="text-sm text-blue-800">{enabler.collaboration_terms}</p>
            </Card>
          )}

          {/* Portfolio Images */}
          {enabler.portfolio_images && enabler.portfolio_images.length > 0 && (
            <Card className="p-6">
              <h4 className="font-bold text-gray-900 mb-3">Portfolio</h4>
              <div className="grid grid-cols-3 gap-2">
                {enabler.portfolio_images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className="aspect-square rounded-lg overflow-hidden bg-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <img src={img} alt={`Portfolio ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Featured Achievement */}
          {enabler.proud_project_image && (
            <Card className="p-6">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Featured Achievement
              </h4>
              <div className="aspect-video rounded-lg overflow-hidden bg-gray-200 mb-3">
                <img src={enabler.proud_project_image} alt="Featured project" className="w-full h-full object-cover" />
              </div>
              <p className="text-sm text-gray-700">{enabler.proud_project_description}</p>
            </Card>
          )}

          {/* Reviews */}
          {(enabler.google_review_link || (enabler.other_review_links && enabler.other_review_links.length > 0)) && (
            <Card className="p-6">
              <h4 className="font-bold text-gray-900 mb-3">Reviews & Recognition</h4>
              {enabler.google_review_link && (
                <a
                  href={enabler.google_review_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors mb-2"
                >
                  <p className="text-sm font-medium text-emerald-600">View Google Reviews →</p>
                </a>
              )}
              {enabler.other_review_links?.map((link, idx) => (
                <a
                  key={idx}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors mt-2"
                >
                  <p className="text-sm font-medium text-emerald-600">Review Link {idx + 1} →</p>
                </a>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}