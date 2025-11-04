import React, { useState } from "react";
import { X, CheckCircle2, Star, Award, MapPin, Clock, Sparkles, ChevronLeft, ChevronRight, Trophy, Medal, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function EnablerBrandModal({ enabler, onClose }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);

  if (!enabler) return null;

  const nextImage = () => {
    if (enabler.portfolio_images) {
      setSelectedImageIndex((prev) => 
        prev === enabler.portfolio_images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (enabler.portfolio_images) {
      setSelectedImageIndex((prev) => 
        prev === 0 ? enabler.portfolio_images.length - 1 : prev - 1
      );
    }
  };

  // Get enabler's first name
  const getFirstName = () => {
    if (enabler.business_name) {
      const names = enabler.business_name.split(' ');
      return names[0];
    }
    return "Professional";
  };

  // Determine rank based on rating and reviews
  const getRank = () => {
    const rating = enabler.average_rating || 0;
    const reviews = enabler.total_reviews || 0;
    
    if (rating >= 4.8 && reviews >= 50) return { name: "Elite", emoji: "👑", color: "text-yellow-600" };
    if (rating >= 4.5 && reviews >= 25) return { name: "Expert", emoji: "🏆", color: "text-purple-600" };
    if (rating >= 4.2 && reviews >= 10) return { name: "Pro", emoji: "🥇", color: "text-blue-600" };
    if (rating >= 4.0 && reviews >= 5) return { name: "Trusted", emoji: "⭐", color: "text-emerald-600" };
    return { name: "Rising", emoji: "✨", color: "text-gray-600" };
  };

  const rank = getRank();

  // Limit bio/about to 4 sentences
  const getLimitedBio = () => {
    if (!enabler.bio_story) return "";
    const sentences = enabler.bio_story.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(0, 4).join(' ');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
        style={{ 
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          padding: 0
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: '100%' }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: '100%' }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full sm:max-w-2xl sm:mx-4"
          style={{
            maxHeight: '90vh',
            background: 'white',
            borderRadius: '24px 24px 0 0',
            boxShadow: '0 -4px 60px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Sticky */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Brand Profile</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto px-6 py-6 space-y-6" style={{ maxHeight: 'calc(90vh - 80px)' }}>
            {/* Hero Section */}
            <div className="relative -mx-6 -mt-6">
              {/* Cover Image */}
              <div className="h-48 overflow-hidden bg-gradient-to-r from-emerald-400 to-cyan-400">
                {enabler.cover_image ? (
                  <img src={enabler.cover_image} alt="Cover" className="w-full h-full object-cover" />
                ) : null}
              </div>
              
              {/* Profile Info Overlay */}
              <div className="px-6 pb-6" style={{
                background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.95) 20%, rgba(255, 255, 255, 1) 100%)',
                marginTop: '-4rem'
              }}>
                <div className="flex items-end gap-4 mb-4">
                  <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-gray-200 shadow-lg flex-shrink-0">
                    {enabler.profile_image ? (
                      <img src={enabler.profile_image} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
                    )}
                  </div>
                </div>
                
                {/* Brand Name and Rank */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 mb-0">
                      {enabler.brand_name || enabler.business_name}
                    </h1>
                    <p className="text-sm text-gray-500 font-medium">by {getFirstName()}</p>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 mb-1">
                      <span className="text-2xl">{rank.emoji}</span>
                      <span className={`text-sm font-bold ${rank.color}`}>{rank.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < Math.floor(enabler.average_rating || 0)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                          strokeWidth={1.5}
                        />
                      ))}
                      <span className="ml-1 text-sm font-semibold">{enabler.average_rating || 0}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{enabler.profession_title}</p>
                
                {/* Service Area - Top Card as Selling Point */}
                {enabler.service_area && (
                  <div className="mt-3 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <div>
                        <p className="text-xs font-medium text-emerald-900">Service Area</p>
                        <p className="text-sm text-emerald-700 font-semibold">{enabler.service_area}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  {enabler.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {enabler.location}
                    </span>
                  )}
                  {enabler.years_experience && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {enabler.years_experience} years
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Specialty - Bullet Style */}
            {enabler.niche_specialty && (
              <div className="p-5 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-xl">
                <h3 className="text-xs text-gray-400 tracking-wide mb-3 uppercase">Specialty</h3>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></div>
                  <p className="text-lg font-light text-gray-900 leading-relaxed tracking-wide">
                    {enabler.niche_specialty}
                  </p>
                </div>
              </div>
            )}

            {/* About Section - Limited to 4 sentences */}
            {getLimitedBio() && (
              <div className="p-5 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-xl">
                <h3 className="text-xs text-gray-400 tracking-wide mb-3 uppercase">About</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{getLimitedBio()}</p>
              </div>
            )}

            {/* Proud Achievements */}
            {(enabler.proud_project_image || enabler.proud_project_description) && (
              <div className="p-5 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-xl">
                <h3 className="text-xs text-gray-400 tracking-wide mb-4 flex items-center gap-2 uppercase">
                  <Trophy className="w-4 h-4 text-yellow-500" strokeWidth={1.5} />
                  Proud Achievements
                </h3>
                {enabler.proud_project_image && (
                  <div className="aspect-video rounded-lg overflow-hidden bg-gray-200 mb-3 border border-gray-100">
                    <img src={enabler.proud_project_image} alt="Proud Achievement" className="w-full h-full object-cover" />
                  </div>
                )}
                {enabler.proud_project_description && (
                  <p className="text-sm text-gray-700 leading-relaxed">{enabler.proud_project_description}</p>
                )}
              </div>
            )}

            {/* Certifications */}
            {(enabler.certificate_files?.length > 0 || enabler.certifications?.length > 0) && (
              <div className="p-5 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-xl">
                <h3 className="text-xs text-gray-400 tracking-wide mb-4 flex items-center gap-2 uppercase">
                  <Award className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                  Certifications
                </h3>
                <div className="space-y-2">
                  {enabler.certifications?.map((cert, idx) => (
                    <div key={`cert-text-${idx}`} className="flex items-start gap-3 p-3 bg-white/80 rounded-lg border border-gray-50">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{cert}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Certification Details</p>
                      </div>
                    </div>
                  ))}
                  {enabler.certificate_files?.map((cert, idx) => (
                    <a
                      key={idx}
                      href={cert}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white/80 rounded-lg hover:bg-emerald-50 transition-colors text-sm text-emerald-600 font-medium border border-gray-50"
                    >
                      <Award className="w-4 h-4 flex-shrink-0" />
                      <span>Certificate {idx + 1} - Click to view</span>
                      <span className="ml-auto">→</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Services Offered - Redesigned */}
            {enabler.services_offered && enabler.services_offered.length > 0 && (
              <div className="p-5 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-xl">
                <h3 className="text-xs text-gray-400 tracking-wide mb-4 uppercase">Services Offered</h3>
                <div className="space-y-4">
                  {enabler.services_offered.map((service, idx) => (
                    <div key={idx} className="relative">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-base mb-1">{service.name}</h4>
                          <p className="text-sm text-gray-600 leading-relaxed mb-2">{service.description}</p>
                          <div className="flex items-center gap-3 flex-wrap">
                            {service.starting_price && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
                                <span>From</span>
                                <span className="font-bold">${service.starting_price}</span>
                              </span>
                            )}
                            {service.available !== false && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                                ✓ Available
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {idx < enabler.services_offered.length - 1 && (
                        <div className="mt-4 border-b border-gray-100"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio Images (Work Samples) */}
            {enabler.portfolio_images && enabler.portfolio_images.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs text-gray-400 tracking-wide uppercase">Work Samples</h3>
                  <span className="text-xs text-gray-500">{enabler.portfolio_images.length} photos</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {enabler.portfolio_images.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedImageIndex(idx);
                        setShowGallery(true);
                      }}
                      className="aspect-square rounded-lg overflow-hidden bg-gray-200 cursor-pointer hover:opacity-90 transition-opacity border border-gray-100"
                    >
                      <img
                        src={img}
                        alt={`Portfolio ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FAQs */}
            {enabler.faqs && enabler.faqs.length > 0 && (
              <div className="p-5 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-xl">
                <h3 className="text-xs text-gray-400 tracking-wide mb-4 uppercase">Frequently Asked Questions</h3>
                <div className="space-y-4">
                  {enabler.faqs.map((faq, idx) => (
                    <div key={idx} className="p-4 bg-white/80 rounded-lg border border-gray-50">
                      <h4 className="font-medium text-gray-900 text-sm mb-2">Q: {faq.question}</h4>
                      <p className="text-xs text-gray-600 pl-3 border-l-2 border-emerald-200">A: {faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Team Members */}
            {enabler.team_members && enabler.team_members.length > 0 && (
              <div className="p-5 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-xl">
                <h3 className="text-xs text-gray-400 tracking-wide mb-4 uppercase">Our Team</h3>
                <div className="grid grid-cols-2 gap-4">
                  {enabler.team_members.map((member, idx) => (
                    <div key={idx} className="text-center">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 mx-auto mb-2">
                        {member.image ? (
                          <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                        )}
                      </div>
                      <p className="font-medium text-sm text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-600">{member.role}</p>
                      {member.specialty && (
                        <p className="text-xs text-emerald-600 mt-1">{member.specialty}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collaboration */}
            {enabler.collaboration_open && (
              <div className="p-5 bg-purple-50/50 backdrop-blur-sm border border-purple-100 rounded-xl">
                <h3 className="text-sm font-medium text-purple-900 mb-2">OPEN FOR COLLABORATION</h3>
                <p className="text-xs text-purple-800">{enabler.collaboration_terms}</p>
              </div>
            )}
          </div>

          {/* Gallery Viewer Modal */}
          {showGallery && enabler.portfolio_images && (
            <div 
              className="absolute inset-0 bg-black/90 flex items-center justify-center z-20 rounded-3xl"
              onClick={() => setShowGallery(false)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGallery(false);
                }}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>

              <div className="relative w-full h-full flex items-center justify-center p-8" onClick={(e) => e.stopPropagation()}>
                <img
                  src={enabler.portfolio_images[selectedImageIndex]}
                  alt={`Portfolio ${selectedImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                />

                {enabler.portfolio_images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        prevImage();
                      }}
                      className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImage();
                      }}
                      className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <ChevronRight className="w-6 h-6 text-white" />
                    </button>
                  </>
                )}

                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full">
                  <span className="text-white text-sm">
                    {selectedImageIndex + 1} / {enabler.portfolio_images.length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}