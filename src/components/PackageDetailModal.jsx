
import React from "react";
import { X, CheckCircle2, XCircle, Users, DollarSign, Image as ImageIcon, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function PackageDetailModal({ package: pkg, enabler, onClose, onOpenGallery, isReplaceMode, onSelectPackage }) {
  if (!pkg) return null;

  // Smart categorization helper
  const renderMenuSection = (items, title, emoji) => {
    if (!items || items.length === 0) return null;
    
    return (
      <div className="mb-3">
        <h5 className="text-[11px] font-semibold text-gray-900 mb-1.5 flex items-center gap-1">
          <span>{emoji}</span> {title.toUpperCase()}
        </h5>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {items.map((item, idx) => (
            <div key={idx} className="text-[11px] text-gray-700 flex items-start gap-1.5">
              <span className="text-gray-400 text-[8px] mt-0.5">•</span>
              <span className="leading-tight">{item}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render structured menu intelligently
  const renderSmartMenu = (menuData) => {
    if (!menuData) return null;

    // If it's an object with categories
    if (typeof menuData === 'object' && !Array.isArray(menuData)) {
      return (
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-100">
          <h4 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1">
            <span>🍽️</span> MENU
          </h4>
          <div className="space-y-3">
            {menuData.entrees && renderMenuSection(menuData.entrees, "Entrées", "🥗")}
            {menuData.mains && renderMenuSection(menuData.mains, "Mains", "🍖")}
            {menuData.sides && renderMenuSection(menuData.sides, "Sides", "🥘")}
            {menuData.desserts && renderMenuSection(menuData.desserts, "Desserts", "🍰")}
            {menuData.beverages && renderMenuSection(menuData.beverages, "Beverages", "🥤")}
            {menuData.appetizers && renderMenuSection(menuData.appetizers, "Appetizers", "🧆")}
            {menuData.salads && renderMenuSection(menuData.salads, "Salads", "🥗")}
            {menuData.soups && renderMenuSection(menuData.soups, "Soups", "🍲")}
            
            {/* Render any other custom categories */}
            {Object.keys(menuData).map((key) => {
              const standardKeys = ['entrees', 'mains', 'sides', 'desserts', 'beverages', 'appetizers', 'salads', 'soups'];
              if (!standardKeys.includes(key.toLowerCase()) && Array.isArray(menuData[key])) {
                return (
                  <div key={key}>
                    {renderMenuSection(menuData[key], key, "✨")}
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      );
    }

    // If it's a simple array
    if (Array.isArray(menuData)) {
      return (
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-100">
          <h4 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1">
            <span>🍽️</span> MENU
          </h4>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {menuData.map((item, idx) => (
              <div key={idx} className="text-[11px] text-gray-700 flex items-start gap-1.5">
                <span className="text-gray-400 text-[8px] mt-0.5">•</span>
                <span className="leading-tight">{item}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  // Render equipment/gear for photographers/videographers
  const renderEquipment = (equipment) => {
    if (!equipment || equipment.length === 0) return null;
    
    return (
      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-100">
        <h4 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1">
          <span>📷</span> EQUIPMENT
        </h4>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {equipment.map((item, idx) => (
            <div key={idx} className="text-[11px] text-gray-700 flex items-start gap-1.5">
              <span className="text-gray-400 text-[8px] mt-0.5">•</span>
              <span className="leading-tight">{item}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render venue amenities
  const renderAmenities = (amenities) => {
    if (!amenities || amenities.length === 0) return null;
    
    return (
      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-100">
        <h4 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1">
          <span>🏛️</span> AMENITIES
        </h4>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {amenities.map((item, idx) => (
            <div key={idx} className="text-[11px] text-gray-700 flex items-start gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
              <span className="leading-tight">{item}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render music setlist/repertoire
  const renderSetlist = (setlist) => {
    if (!setlist || setlist.length === 0) return null;
    
    return (
      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-100">
        <h4 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1">
          <span>🎵</span> REPERTOIRE
        </h4>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {setlist.map((item, idx) => (
            <div key={idx} className="text-[11px] text-gray-700 flex items-start gap-1.5">
              <span className="text-gray-400 text-[8px] mt-0.5">♪</span>
              <span className="leading-tight">{item}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center px-4"
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md mx-4"
          style={{
            maxHeight: '85vh',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Minimal */}
          <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 border-b border-gray-100 px-3 py-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 truncate flex-1 pr-4">{pkg.name}</h3>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Scrollable Content - Minimal Padding */}
          <div className="overflow-y-auto px-3 py-3 space-y-2" style={{ maxHeight: 'calc(85vh - 60px)' }}>
            {/* Price - Prominent with Matte Peach Background */}
            <div className="flex items-center justify-between p-2 rounded-xl" style={{
              backgroundColor: '#FCD9B8',
              filter: 'saturate(0.8)'
            }}>
              <span className="text-sm font-medium" style={{ color: '#155E63' }}>Package Price</span>
              <span className="text-2xl font-bold" style={{ color: '#155E63' }}>{pkg.currency}{pkg.price}</span>
            </div>

            {/* Additional Details - Ultra Smart Display */}
            {pkg.crucial_details && Object.keys(pkg.crucial_details).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-900 mb-1">ADDITIONAL DETAILS</h4>
                
                {/* Smart Menu Rendering */}
                {pkg.crucial_details.menu && renderSmartMenu(pkg.crucial_details.menu)}
                
                {/* Equipment for photographers/videographers */}
                {pkg.crucial_details.equipment && renderEquipment(pkg.crucial_details.equipment)}
                
                {/* Amenities for venues */}
                {pkg.crucial_details.amenities && renderAmenities(pkg.crucial_details.amenities)}
                
                {/* Setlist for musicians */}
                {pkg.crucial_details.setlist && renderSetlist(pkg.crucial_details.setlist)}
                {pkg.crucial_details.repertoire && renderSetlist(pkg.crucial_details.repertoire)}

                {/* Cuisine */}
                {pkg.crucial_details.cuisine && (
                  <div className="flex items-center gap-2 text-[11px] p-2 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-100">
                    <span>🍽️</span>
                    <span className="font-medium text-gray-700">Cuisine:</span>
                    <span className="text-gray-600">{pkg.crucial_details.cuisine}</span>
                  </div>
                )}

                {/* Duration */}
                {pkg.crucial_details.duration && (
                  <div className="flex items-center gap-2 text-[11px] p-2 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-100">
                    <span>⏱️</span>
                    <span className="font-medium text-gray-700">Duration:</span>
                    <span className="text-gray-600">{pkg.crucial_details.duration}</span>
                  </div>
                )}

                {/* Location/Coverage for venues or photographers */}
                {pkg.crucial_details.location && (
                  <div className="flex items-center gap-2 text-[11px] p-2 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-100">
                    <span>📍</span>
                    <span className="font-medium text-gray-700">Location:</span>
                    <span className="text-gray-600">{pkg.crucial_details.location}</span>
                  </div>
                )}

                {/* Capacity for venues */}
                {pkg.crucial_details.capacity && (
                  <div className="flex items-center gap-2 text-[11px] p-2 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-100">
                    <Users className="w-3 h-3 text-gray-500" />
                    <span className="font-medium text-gray-700">Capacity:</span>
                    <span className="text-gray-600">{pkg.crucial_details.capacity} people</span>
                  </div>
                )}

                {/* Service Style for caterers */}
                {pkg.crucial_details.service_style && (
                  <div className="flex items-center gap-2 text-[11px] p-2 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-100">
                    <span>🍴</span>
                    <span className="font-medium text-gray-700">Service Style:</span>
                    <span className="text-gray-600">{pkg.crucial_details.service_style}</span>
                  </div>
                )}

                {/* Allergens Warning */}
                {pkg.crucial_details.allergens && pkg.crucial_details.allergens.length > 0 && (
                  <div className="bg-amber-50/60 backdrop-blur-sm rounded-lg p-2 border border-amber-100">
                    <h5 className="text-[11px] font-semibold text-amber-900 mb-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> ALLERGEN ALERT
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {pkg.crucial_details.allergens.map((allergen, idx) => (
                        <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                          {allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Render any other custom fields not covered above */}
                {Object.keys(pkg.crucial_details).map((key) => {
                  const handledKeys = ['menu', 'equipment', 'amenities', 'setlist', 'repertoire', 'cuisine', 'duration', 'location', 'capacity', 'service_style', 'allergens'];
                  if (!handledKeys.includes(key) && pkg.crucial_details[key]) {
                    const value = pkg.crucial_details[key];
                    
                    // If it's a simple string or number
                    if (typeof value === 'string' || typeof value === 'number') {
                      return (
                        <div key={key} className="flex items-center gap-2 text-[11px] p-2 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-100">
                          <span>✨</span>
                          <span className="font-medium text-gray-700 capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span className="text-gray-600">{value}</span>
                        </div>
                      );
                    }
                    
                    // If it's an array
                    if (Array.isArray(value)) {
                      return (
                        <div key={key} className="bg-white/60 backdrop-blur-sm rounded-lg p-2 border border-gray-100">
                          <h5 className="text-[11px] font-semibold text-gray-900 mb-1 capitalize">
                            {key.replace(/_/g, ' ')}
                          </h5>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                            {value.map((item, idx) => (
                              <div key={idx} className="text-[11px] text-gray-700 flex items-start gap-1.5">
                                <span className="text-gray-400 text-[8px] mt-0.5">•</span>
                                <span className="leading-tight">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  }
                  return null;
                })}
              </div>
            )}

            {/* Guest Count */}
            {pkg.max_guests && (
              <div className="flex items-center gap-2 p-2 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-100">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-[11px] text-gray-700">Up to <strong>{pkg.max_guests}</strong> guests</span>
              </div>
            )}

            {/* What's Included - Miniature Side by Side */}
            {pkg.features && pkg.features.length > 0 && (
              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2 border border-gray-100">
                <h4 className="text-xs font-bold text-gray-900 mb-2">WHAT'S INCLUDED</h4>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  {pkg.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-1">
                      {feature.included ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
                      ) : (
                        <XCircle className="w-3 h-3 text-gray-300 flex-shrink-0 mt-0.5" strokeWidth={2} />
                      )}
                      <span className={`text-[10px] leading-tight ${feature.included ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {pkg.description && (
              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-2 border border-gray-100">
                <p className="text-[11px] text-gray-700 leading-relaxed">{pkg.description}</p>
              </div>
            )}

            {/* Negotiation Info */}
            {pkg.allow_negotiations && (
              <div className="p-2 rounded-lg border" style={{
                backgroundColor: 'rgba(168, 85, 247, 0.05)',
                borderColor: 'rgba(168, 85, 247, 0.2)'
              }}>
                <div className="flex items-center gap-2 mb-0.5">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  <h4 className="text-[11px] font-semibold text-purple-900">Negotiable</h4>
                </div>
                <p className="text-[10px] text-purple-800">
                  This package allows negotiations up to <strong>{pkg.max_discount_percentage}% discount</strong>
                </p>
              </div>
            )}

            {/* Gallery Preview */}
            {pkg.gallery_images && pkg.gallery_images.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-gray-900">GALLERY</h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenGallery && onOpenGallery(pkg.gallery_images);
                    }}
                    className="text-[10px] font-medium hover:underline" style={{ color: '#155E63' }}
                  >
                    View All ({pkg.gallery_images.length})
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {pkg.gallery_images.slice(0, 6).map((img, idx) => (
                    <div
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenGallery && onOpenGallery(pkg.gallery_images);
                      }}
                      className="aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={typeof img === 'string' ? img : img.url}
                        alt={typeof img === 'object' ? img.label : `Gallery ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {isReplaceMode && onSelectPackage && (
              <div className="pt-1">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPackage();
                  }}
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white py-4 text-sm font-semibold"
                >
                  Select This Package
                </Button>
              </div>
            )}
            {/* If there were any "View Portfolio" or "View Profile" buttons that link to EnablerProfile using enabler.id, 
                they would be added/validated here. However, no such buttons exist in the provided code. */}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
