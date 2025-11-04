import React, { useState, useEffect } from "react";
import { Enabler, Review, User } from "@/api/entities";
import { Star, ThumbsUp, MessageSquare, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import BlinkLogo from "../components/BlinkLogo";
import { format } from "date-fns";

export default function EnablerReviews() {
  const [enabler, setEnabler] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [googleReviewLink, setGoogleReviewLink] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    const user = await User.me();
    const enablerData = await Enabler.filter({ user_id: user.id });
    
    if (enablerData[0]) {
      setEnabler(enablerData[0]);
      
      const reviewsData = await Review.filter(
        { enabler_id: enablerData[0].id },
        "-created_date"
      );
      setReviews(reviewsData);
      
      setGoogleReviewLink(enablerData[0].google_review_link || "");
    }
  };

  const saveGoogleLink = async () => {
    if (enabler && googleReviewLink) {
      await Enabler.update(enabler.id, { google_review_link: googleReviewLink });
      setShowLinkInput(false);
      alert("Google Reviews link saved!");
    }
  };

  const getRatingBreakdown = () => {
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      breakdown[review.rating] = (breakdown[review.rating] || 0) + 1;
    });
    return breakdown;
  };

  const ratingBreakdown = getRatingBreakdown();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <BlinkLogo size="md" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reviews & Ratings</h1>
              <p className="text-sm text-gray-600">Manage your reputation</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Overall Rating */}
        <Card className="p-6 bg-gradient-to-r from-yellow-50 to-amber-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Overall Rating</p>
              <div className="flex items-center gap-2">
                <p className="text-4xl font-bold text-gray-900">
                  {enabler?.average_rating || 0}
                </p>
                <Star className="w-8 h-8 fill-yellow-400 text-yellow-400" />
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Based on {reviews.length} reviews
              </p>
            </div>
          </div>

          {/* Rating Breakdown */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = ratingBreakdown[rating] || 0;
              const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              
              return (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-sm w-8">{rating}★</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Google Reviews Integration */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-emerald-500" />
              Google Reviews
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowLinkInput(!showLinkInput)}
            >
              {googleReviewLink ? "Update" : "Link"}
            </Button>
          </div>

          {showLinkInput ? (
            <div className="space-y-3">
              <Input
                placeholder="Paste your Google Reviews link"
                value={googleReviewLink}
                onChange={(e) => setGoogleReviewLink(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  onClick={saveGoogleLink}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                >
                  Save Link
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowLinkInput(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : googleReviewLink ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-sm text-emerald-800 mb-2">✓ Google Reviews linked</p>
              <a
                href={googleReviewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-emerald-600 hover:underline"
              >
                View on Google →
              </a>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Connect your Google Reviews to import ratings and build trust
            </p>
          )}
        </Card>

        {/* Reviews List */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4">Client Reviews</h3>
          {reviews.length === 0 ? (
            <Card className="p-8 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-600">No reviews yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Your clients can leave reviews after booking
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <Card key={review.id} className="p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                      {review.reviewer_name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {review.reviewer_name}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="text-xs text-gray-500 ml-2">
                          {format(new Date(review.created_date), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 italic">
                    "{review.comment}"
                  </p>
                  {review.event_type && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {review.event_type}
                    </Badge>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}