import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Review, Booking, Enabler, User } from "@/api/entities";
import { ArrowLeft, Star, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import BlinkLogo from "../components/BlinkLogo";

export default function ReviewSubmit() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get("booking_id");
  
  const [booking, setBooking] = useState(null);
  const [enabler, setEnabler] = useState(null);
  const [user, setUser] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [bookingId]);

  const loadData = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
      
      if (bookingId) {
        const bookingData = await Booking.filter({ id: bookingId });
        if (bookingData[0]) {
          setBooking(bookingData[0]);
          
          const enablerData = await Enabler.filter({ id: bookingData[0].enabler_id });
          if (enablerData[0]) {
            setEnabler(enablerData[0]);
          }
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      alert("Please select a rating");
      return;
    }
    
    if (!comment.trim()) {
      alert("Please write a review");
      return;
    }

    setIsSubmitting(true);
    try {
      await Review.create({
        enabler_id: enabler.id,
        reviewer_name: user.full_name,
        rating,
        comment: comment.trim(),
        event_type: booking?.event_type || "other"
      });

      // Update enabler's average rating
      const existingReviews = await Review.filter({ enabler_id: enabler.id });
      const totalRating = existingReviews.reduce((sum, r) => sum + r.rating, 0) + rating;
      const avgRating = (totalRating / (existingReviews.length + 1)).toFixed(1);
      
      await Enabler.update(enabler.id, {
        average_rating: parseFloat(avgRating),
        total_reviews: existingReviews.length + 1
      });

      alert("Thank you for your review!");
      navigate(createPageUrl("MyEvents"));
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!enabler) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <BlinkLogo size="lg" className="animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Write a Review</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Enabler Info */}
        <Card className="p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4">
            {enabler.profile_image ? (
              <img
                src={enabler.profile_image}
                alt={enabler.business_name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="text-3xl">👤</span>
            )}
          </div>
          <h2 className="text-lg font-bold text-gray-900">{enabler.business_name}</h2>
          <p className="text-sm text-gray-600 capitalize">{enabler.category.replace(/_/g, ' ')}</p>
        </Card>

        {/* Rating */}
        <Card className="p-6">
          <p className="text-sm font-medium text-gray-700 mb-4 text-center">
            How would you rate your experience?
          </p>
          <div className="flex justify-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-12 h-12 ${
                    star <= (hoveredRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500">
            {rating === 0 && "Tap to rate"}
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Very Good"}
            {rating === 5 && "Excellent"}
          </p>
        </Card>

        {/* Comment */}
        <Card className="p-6">
          <label className="text-sm font-medium text-gray-700 mb-3 block">
            Share your experience
          </label>
          <Textarea
            placeholder="What did you like about working with this enabler? What could be improved?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={6}
            className="resize-none"
          />
          <p className="text-xs text-gray-500 mt-2">
            {comment.length} / 500 characters
          </p>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || rating === 0 || !comment.trim()}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Send className="w-5 h-5" />
          {isSubmitting ? "Submitting..." : "Submit Review"}
        </Button>

        <p className="text-xs text-center text-gray-500">
          Your review will be visible to other users and will help others make informed decisions.
        </p>
      </form>
    </div>
  );
}