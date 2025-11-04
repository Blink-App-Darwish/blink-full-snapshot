import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  CheckCircle2,
  Star,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Upload,
  MessageSquare,
  DollarSign,
  Clock,
  Award,
  Shield
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { format, differenceInHours } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function PostEventValidation({ bookingId, isHost = false }) {
  const [validation, setValidation] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState({
    rating_quality: 5,
    rating_communication: 5,
    rating_punctuality: 5,
    rating_satisfaction: 5,
    written_review: "",
    would_rebook: true
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (bookingId) {
      loadValidation();
    }
  }, [bookingId]);

  const loadValidation = async () => {
    try {
      setIsLoading(true);
      const { PostEventValidation, BookingWorkflow, Booking } = await import("@/api/entities");

      const validations = await PostEventValidation.filter({ booking_id: bookingId });
      const workflows = await BookingWorkflow.filter({ booking_id: bookingId });
      const bookingData = await Booking.filter({ id: bookingId }).then(b => b[0]);

      if (validations[0]) {
        setValidation(validations[0]);
      } else {
        // Create validation record if doesn't exist
        const workflow = workflows[0];
        
        const newValidation = await PostEventValidation.create({
          booking_id: bookingId,
          enabler_id: bookingData.enabler_id,
          host_id: workflow.host_id,
          enabler_completion_time: new Date().toISOString(),
          host_validation_status: "pending",
          host_validation_deadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours
          completion_proof: workflow.completion_proof || {},
          performance_score: workflow.performance_score || {},
          escrow_release_triggered: false,
          dispute_window_expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });
        setValidation(newValidation);
      }

      if (workflows[0]) {
        setWorkflow(workflows[0]);
      }
      
      setBooking(bookingData);

      // Load existing feedback if any
      if (validations[0] && isHost && validations[0].host_feedback) {
        setFeedback(validations[0].host_feedback);
      }

    } catch (error) {
      console.error("Error loading validation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const submitValidation = async (accepted) => {
    if (!accepted && !feedback.written_review.trim()) {
      alert("Please provide feedback if reporting issues");
      return;
    }

    if (!confirm(`Are you sure you want to ${accepted ? 'accept' : 'report issues with'} this service?`)) {
      return;
    }

    try {
      setSubmitting(true);
      const { PostEventValidation, EscrowAccount } = await import("@/api/entities");

      const updateData = {
        host_validation_status: accepted ? "accepted" : "review_requested",
        host_feedback: {
          ...feedback,
          submitted_at: new Date().toISOString()
        }
      };

      // If accepted, trigger escrow release
      if (accepted) {
        updateData.escrow_release_triggered = true;
        updateData.escrow_release_time = new Date().toISOString();
        updateData.escrow_release_amount = booking.total_amount;

        // Release escrow
        const escrows = await EscrowAccount.filter({ booking_id: bookingId });
        if (escrows[0]) {
          await EscrowAccount.update(escrows[0].id, {
            status: "RELEASED",
            released_at: new Date().toISOString()
          });
        }
      } else {
        // If issues reported, hold retention amount
        updateData.retention_amount = booking.total_amount * 0.1; // 10% retention
      }

      await PostEventValidation.update(validation.id, updateData);

      alert(accepted ? "✅ Service accepted! Payment released to enabler." : "⚠️ Issues reported. Blink support will review.");
      await loadValidation();

    } catch (error) {
      console.error("Error submitting validation:", error);
      alert("Failed to submit validation");
    } finally {
      setSubmitting(false);
    }
  };

  const calculateAIQuality = () => {
    if (!validation?.ai_quality_assessment) return null;
    
    const grades = {
      excellent: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
      good: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
      acceptable: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
      poor: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
    };

    return grades[validation.ai_quality_assessment.quality_grade] || grades.acceptable;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!validation) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">Validation data not available</p>
      </Card>
    );
  }

  const hoursUntilDeadline = differenceInHours(new Date(validation.host_validation_deadline), new Date());
  const isExpired = hoursUntilDeadline <= 0;
  const aiQuality = calculateAIQuality();

  return (
    <div className="space-y-4">
      {/* Validation Status Header */}
      <Card className={`p-6 ${
        validation.host_validation_status === 'accepted' 
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
          : validation.host_validation_status === 'review_requested'
          ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
          : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              {validation.host_validation_status === 'accepted' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Service Accepted
                </>
              ) : validation.host_validation_status === 'review_requested' ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Under Review
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 text-blue-600" />
                  Awaiting Validation
                </>
              )}
            </h2>
            <p className="text-sm text-gray-600">
              {validation.host_validation_status === 'accepted' 
                ? 'Payment has been released to enabler'
                : validation.host_validation_status === 'review_requested'
                ? 'Blink support is reviewing your feedback'
                : 'Please review the service and provide feedback'}
            </p>
          </div>

          {validation.host_validation_status === 'pending' && !isExpired && (
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{hoursUntilDeadline}h</div>
              <p className="text-xs text-gray-500">remaining</p>
            </div>
          )}
        </div>

        {validation.host_validation_status === 'pending' && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Auto-accept deadline</span>
              <span>{format(new Date(validation.host_validation_deadline), 'MMM d, h:mm a')}</span>
            </div>
            <Progress 
              value={Math.max(0, (hoursUntilDeadline / 72) * 100)} 
              className="h-2"
            />
            <p className="text-xs text-gray-500 mt-2">
              Service will be auto-accepted if no action is taken by deadline
            </p>
          </div>
        )}
      </Card>

      {/* Performance Score */}
      {validation.performance_score && Object.keys(validation.performance_score).length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-500" />
            Performance Score
          </h3>

          <div className="space-y-2">
            {Object.entries(validation.performance_score).map(([key, value]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-gray-700 capitalize">
                    {key.replace(/_score$/, '').replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs font-bold text-emerald-600">{value}%</p>
                </div>
                <Progress value={value} className="h-1.5" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AI Quality Assessment */}
      {validation.ai_quality_assessment && aiQuality && (
        <Card className={`p-4 ${aiQuality.bg} border-2 ${aiQuality.border}`}>
          <div className="flex items-start gap-3">
            <Shield className={`w-5 h-5 ${aiQuality.color} flex-shrink-0 mt-0.5`} />
            <div className="flex-1">
              <h3 className={`text-sm font-bold ${aiQuality.color} mb-2 uppercase`}>
                AI Quality: {validation.ai_quality_assessment.quality_grade}
              </h3>
              <p className="text-xs text-gray-700 mb-2">
                {validation.ai_quality_assessment.reasoning}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  Confidence: {Math.round(validation.ai_quality_assessment.confidence_score * 100)}%
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Completion Proof Gallery */}
      {validation.completion_proof && Object.keys(validation.completion_proof).length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Upload className="w-4 h-4 text-gray-500" />
            Completion Proof
          </h3>

          <div className="space-y-2 text-xs text-gray-600">
            {validation.completion_proof.photos && validation.completion_proof.photos.length > 0 && (
              <div>
                <p className="font-medium mb-1">Photos ({validation.completion_proof.photos.length})</p>
                <div className="grid grid-cols-4 gap-2">
                  {validation.completion_proof.photos.map((url, index) => (
                    <div key={index} className="aspect-square rounded border overflow-hidden">
                      <img src={url} alt={`Proof ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {validation.completion_proof.timestamp && (
              <p>Completed: {format(new Date(validation.completion_proof.timestamp), 'MMM d, h:mm a')}</p>
            )}
          </div>
        </Card>
      )}

      {/* Host Feedback Form (Only if pending) */}
      {isHost && validation.host_validation_status === 'pending' && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            Rate Your Experience
          </h3>

          <div className="space-y-4">
            {/* Rating Sliders */}
            {[
              { key: 'rating_quality', label: 'Quality of Service' },
              { key: 'rating_communication', label: 'Communication' },
              { key: 'rating_punctuality', label: 'Punctuality' },
              { key: 'rating_satisfaction', label: 'Overall Satisfaction' }
            ].map(({ key, label }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-700">{label}</label>
                  <div className="flex items-center gap-1">
                    {[...Array(feedback[key])].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={feedback[key]}
                  onChange={(e) => setFeedback({ ...feedback, [key]: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            ))}

            {/* Written Review */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-2 block">
                Written Review
              </label>
              <Textarea
                value={feedback.written_review}
                onChange={(e) => setFeedback({ ...feedback, written_review: e.target.value })}
                placeholder="Share your experience with this enabler..."
                rows={4}
                className="text-sm"
              />
            </div>

            {/* Would Rebook */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-gray-700">
                Would you book this enabler again?
              </label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={feedback.would_rebook ? "default" : "outline"}
                  onClick={() => setFeedback({ ...feedback, would_rebook: true })}
                  className="h-8"
                >
                  <ThumbsUp className="w-3 h-3 mr-1" />
                  Yes
                </Button>
                <Button
                  size="sm"
                  variant={!feedback.would_rebook ? "default" : "outline"}
                  onClick={() => setFeedback({ ...feedback, would_rebook: false })}
                  className="h-8"
                >
                  <ThumbsDown className="w-3 h-3 mr-1" />
                  No
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => submitValidation(true)}
                disabled={submitting}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {submitting ? 'Processing...' : 'Accept Service'}
              </Button>

              <Button
                onClick={() => submitValidation(false)}
                disabled={submitting || !feedback.written_review.trim()}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Report Issues
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Accepting service will release payment to the enabler
            </p>
          </div>
        </Card>
      )}

      {/* Submitted Feedback Display */}
      {validation.host_feedback && validation.host_feedback.submitted_at && (
        <Card className="p-4 bg-gray-50">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-600" />
            Host Feedback
          </h3>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-500 mb-1">Quality</p>
                <div className="flex">
                  {[...Array(validation.host_feedback.rating_quality)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Communication</p>
                <div className="flex">
                  {[...Array(validation.host_feedback.rating_communication)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Punctuality</p>
                <div className="flex">
                  {[...Array(validation.host_feedback.rating_punctuality)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Satisfaction</p>
                <div className="flex">
                  {[...Array(validation.host_feedback.rating_satisfaction)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            </div>

            {validation.host_feedback.written_review && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Review</p>
                <p className="text-sm text-gray-700">{validation.host_feedback.written_review}</p>
              </div>
            )}

            <Badge variant="outline" className={`text-xs ${
              validation.host_feedback.would_rebook 
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {validation.host_feedback.would_rebook ? '✓ Would book again' : '✗ Would not book again'}
            </Badge>

            <p className="text-xs text-gray-400">
              Submitted: {format(new Date(validation.host_feedback.submitted_at), 'MMM d, h:mm a')}
            </p>
          </div>
        </Card>
      )}

      {/* Escrow Status */}
      {validation.escrow_release_triggered && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-green-900 mb-1">Payment Released</h3>
              <p className="text-xs text-green-700">
                ${validation.escrow_release_amount} released to enabler on{' '}
                {format(new Date(validation.escrow_release_time), 'MMM d, yyyy')}
              </p>
              {validation.dispute_window_expires && (
                <p className="text-xs text-green-600 mt-2">
                  Dispute window closes: {format(new Date(validation.dispute_window_expires), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Issues Reported */}
      {validation.issues_reported && validation.issues_reported.length > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-amber-900 mb-2">Reported Issues</h4>
              <div className="space-y-2">
                {validation.issues_reported.map((issue, index) => (
                  <div key={index} className="text-xs text-amber-800 bg-white/50 p-2 rounded">
                    <p className="font-medium">{issue.issue_type.replace(/_/g, ' ').toUpperCase()}</p>
                    <p className="mt-1">{issue.description}</p>
                    {issue.severity && (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {issue.severity.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}