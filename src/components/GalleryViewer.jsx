import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function GalleryViewer({ images, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      nextImage();
    }
    if (touchStart - touchEnd < -75) {
      prevImage();
    }
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const getImagePosition = (index) => {
    const diff = index - currentIndex;
    if (diff === 0) return "translate-x-0 scale-100 z-30 opacity-100 rotate-0";
    if (diff === 1 || diff === -(images.length - 1)) return "translate-x-[70%] scale-90 z-20 opacity-60 rotate-6";
    if (diff === -1 || diff === images.length - 1) return "translate-x-[-70%] scale-90 z-20 opacity-60 -rotate-6";
    if (diff === 2 || diff === -(images.length - 2)) return "translate-x-[140%] scale-75 z-10 opacity-30 rotate-12";
    if (diff === -2 || diff === images.length - 2) return "translate-x-[-140%] scale-75 z-10 opacity-30 -rotate-12";
    return "translate-x-[200%] scale-50 z-0 opacity-0";
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(20, 20, 20, 0.95))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-lg"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Image Counter */}
      <div className="absolute top-4 left-4 z-50 px-4 py-2 bg-white/10 rounded-full backdrop-blur-lg">
        <p className="text-white text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </p>
      </div>

      {/* Gallery Container */}
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden px-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Images with Tilted Overlapping Effect */}
        <div className="relative w-full max-w-2xl" style={{ height: '70vh' }}>
          {images.map((img, index) => {
            const imageUrl = typeof img === 'string' ? img : img.url;
            const imageLabel = typeof img === 'object' ? img.label : null;
            
            return (
              <div
                key={index}
                className={`absolute inset-0 transition-all duration-500 ease-out ${getImagePosition(index)}`}
                style={{
                  transformOrigin: 'center center',
                }}
              >
                <div className="w-full h-full p-4">
                  <div 
                    className="w-full h-full rounded-2xl overflow-hidden shadow-2xl"
                    style={{
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt={imageLabel || `Gallery image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Label */}
                  {imageLabel && index === currentIndex && (
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-white/95 rounded-full backdrop-blur-lg shadow-lg max-w-[80%]">
                      <p className="text-sm font-medium text-gray-900 truncate">{imageLabel}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-lg z-40"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-lg z-40"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {images.length > 1 && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-40">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-white w-8'
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}