import React from "react";
import { ArrowLeft, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BlinkLogo from "../components/BlinkLogo";

export default function DependencyAnalysis() {
  const navigate = useNavigate();

  const analysis = {
    critical: [
      {
        area: "Direct Messaging System",
        missing: ["Message entity", "Real-time chat", "Message notifications", "File sharing in chat"],
        impact: "Hosts and enablers cannot communicate effectively within the app",
        entities_needed: ["Message", "ChatRoom", "MessageAttachment"],
        priority: "CRITICAL"
      },
      {
        area: "Payment Processing",
        missing: ["Payment gateway integration", "Escrow system", "Invoice generation", "Payment tracking", "Refund handling"],
        impact: "No actual money exchange possible, booking confirmations are theoretical",
        entities_needed: ["Payment", "Invoice", "PaymentSchedule", "Refund"],
        priority: "CRITICAL"
      },
      {
        area: "Enabler Availability System",
        missing: ["Availability calendar", "Booking conflicts detection", "Time slot management", "Blackout dates"],
        impact: "Double-bookings possible, no real-time availability",
        entities_needed: ["EnablerAvailability", "BookingSlot", "TimeBlock"],
        priority: "CRITICAL"
      },
      {
        area: "Contract Signing Flow",
        missing: ["E-signature integration", "Contract version control", "Signed contract storage", "Legal binding mechanism"],
        impact: "Contracts exist but aren't legally binding or enforceable",
        entities_needed: ["ContractSignature", "ContractVersion", "SignatureLog"],
        priority: "CRITICAL"
      }
    ],
    high: [
      {
        area: "Review & Rating System",
        missing: ["Post-event review flow", "Review verification", "Response to reviews", "Review moderation", "Photo reviews"],
        impact: "Reviews exist but no systematic way to collect them",
        entities_needed: ["ReviewRequest", "ReviewResponse", "ReviewMedia"],
        priority: "HIGH"
      },
      {
        area: "Notification System",
        missing: ["Push notifications", "Email notifications", "SMS alerts", "In-app notification center", "Notification preferences"],
        impact: "Users miss important updates and messages",
        entities_needed: ["NotificationPreference", "NotificationLog", "NotificationTemplate"],
        priority: "HIGH"
      },
      {
        area: "Trust & Verification",
        missing: ["Identity verification", "Background checks", "Insurance validation", "License verification", "Business registration check"],
        impact: "No way to verify enabler legitimacy or safety",
        entities_needed: ["Verification", "BackgroundCheck", "Insurance", "License"],
        priority: "HIGH"
      },
      {
        area: "Dispute Resolution",
        missing: ["Dispute filing", "Evidence submission", "Mediation process", "Refund disputes", "Quality disputes"],
        impact: "No formal process for handling conflicts",
        entities_needed: ["Dispute", "DisputeEvidence", "DisputeResolution"],
        priority: "HIGH"
      }
    ],
    medium: [
      {
        area: "Portfolio Management",
        missing: ["Case studies", "Before/After showcases", "Client testimonials", "Video portfolios", "Portfolio categories"],
        impact: "Limited ways for enablers to showcase their work",
        entities_needed: ["CaseStudy", "PortfolioItem", "Testimonial"],
        priority: "MEDIUM"
      },
      {
        area: "Analytics & Insights",
        missing: ["Host spending analytics", "Enabler performance metrics", "Market trends", "Seasonal insights", "ROI tracking"],
        impact: "No data-driven decision making",
        entities_needed: ["Analytics", "PerformanceMetric", "MarketInsight"],
        priority: "MEDIUM"
      },
      {
        area: "Collaboration Features",
        missing: ["Enabler-to-enabler collaboration", "Team management", "Sub-contractor system", "Crew invites"],
        impact: "Enablers can't work together on large events",
        entities_needed: ["Team", "Collaboration", "CrewMember"],
        priority: "MEDIUM"
      },
      {
        area: "Advanced Booking",
        missing: ["Recurring events", "Event templates", "Multi-day events", "Package bundles", "Group discounts"],
        impact: "Limited booking flexibility",
        entities_needed: ["EventTemplate", "RecurringEvent", "PackageBundle"],
        priority: "MEDIUM"
      }
    ],
    nice_to_have: [
      {
        area: "Social Features",
        missing: ["Follow enablers", "Event sharing", "Social media integration", "Referral system", "Community forum"],
        impact: "Limited viral growth and community building",
        entities_needed: ["Follow", "Share", "Referral", "ForumPost"],
        priority: "LOW"
      },
      {
        area: "Advanced Search",
        missing: ["AI-powered search", "Saved searches", "Search alerts", "Similar enablers", "Price comparison"],
        impact: "Harder to find perfect matches",
        entities_needed: ["SavedSearch", "SearchAlert", "Comparison"],
        priority: "LOW"
      }
    ]
  };

  const integrationGaps = [
    {
      flow: "Booking → Payment → Contract",
      current: "Broken chain - booking doesn't trigger payment or contract signing",
      needed: "Automated flow: Accept offer → Generate contract → Sign → Process payment → Confirm booking"
    },
    {
      flow: "Event Completion → Review",
      current: "No automatic review request after event",
      needed: "Auto-send review request 24h after event with easy rating interface"
    },
    {
      flow: "Message → Booking",
      current: "No messaging system to negotiate before booking",
      needed: "Chat → Send offer → Accept/Counter → Book"
    },
    {
      flow: "Availability → Booking",
      current: "No availability checking before booking",
      needed: "Check availability → Reserve time → Confirm → Block calendar"
    },
    {
      flow: "Payment → Finance Tracking",
      current: "Disconnect between payment and financial records",
      needed: "Payment → Auto-create finance entry → Update dashboard → Generate receipt"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="bg-white/70 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <BlinkLogo size="sm" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Dependency Analysis</h1>
              <p className="text-xs text-gray-600">Missing integrations & correlations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Summary */}
        <Card className="p-6 bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🚨 Analysis Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{analysis.critical.length}</p>
              <p className="text-sm text-gray-700">Critical Issues</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">{analysis.high.length}</p>
              <p className="text-sm text-gray-700">High Priority</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{analysis.medium.length}</p>
              <p className="text-sm text-gray-700">Medium Priority</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{analysis.nice_to_have.length}</p>
              <p className="text-sm text-gray-700">Nice to Have</p>
            </div>
          </div>
        </Card>

        {/* Critical Dependencies */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <XCircle className="w-6 h-6 text-red-500" />
            Critical Dependencies (Blocking Production)
          </h2>
          <div className="space-y-4">
            {analysis.critical.map((item, idx) => (
              <Card key={idx} className="p-5 border-l-4 border-red-500">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-gray-900 text-lg">{item.area}</h3>
                  <Badge className="bg-red-500 text-white">{item.priority}</Badge>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Missing:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {item.missing.map((m, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">•</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-red-900 mb-1">Impact:</p>
                    <p className="text-sm text-red-800">{item.impact}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Entities Needed:</p>
                    <div className="flex flex-wrap gap-2">
                      {item.entities_needed.map((e, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{e}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* High Priority */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            High Priority Dependencies
          </h2>
          <div className="space-y-4">
            {analysis.high.map((item, idx) => (
              <Card key={idx} className="p-5 border-l-4 border-orange-500">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-gray-900">{item.area}</h3>
                  <Badge className="bg-orange-500 text-white">{item.priority}</Badge>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Missing:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {item.missing.map((m, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-orange-500 mt-0.5">•</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="text-sm text-orange-800">{item.impact}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.entities_needed.map((e, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{e}</Badge>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Integration Gaps */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-6 h-6 text-purple-500" />
            Integration Flow Gaps
          </h2>
          <div className="space-y-4">
            {integrationGaps.map((gap, idx) => (
              <Card key={idx} className="p-5 border-l-4 border-purple-500">
                <h3 className="font-bold text-gray-900 mb-3">{gap.flow}</h3>
                <div className="space-y-3">
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-red-900 mb-1">CURRENT (BROKEN):</p>
                    <p className="text-sm text-red-800">{gap.current}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-green-900 mb-1">NEEDED:</p>
                    <p className="text-sm text-green-800">{gap.needed}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Medium Priority */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-6 h-6 text-yellow-500" />
            Medium Priority
          </h2>
          <div className="space-y-3">
            {analysis.medium.map((item, idx) => (
              <Card key={idx} className="p-4 border-l-4 border-yellow-500">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{item.area}</h3>
                  <Badge className="bg-yellow-500 text-white">{item.priority}</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">{item.impact}</p>
                <div className="flex flex-wrap gap-2">
                  {item.entities_needed.map((e, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{e}</Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Recommended Action Plan */}
        <Card className="p-6 bg-gradient-to-r from-emerald-50 to-cyan-50 border-emerald-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            Recommended Action Plan
          </h2>
          <ol className="space-y-3 text-sm text-gray-700">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <p className="font-semibold">Implement Messaging System</p>
                <p className="text-gray-600">Create Message, ChatRoom entities. Add real-time chat UI.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <p className="font-semibold">Add Enabler Availability</p>
                <p className="text-gray-600">Create EnablerAvailability, BookingSlot entities. Add calendar UI.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <p className="font-semibold">Integrate Payment Gateway</p>
                <p className="text-gray-600">Add Stripe/PayPal. Create Payment, Invoice entities.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <div>
                <p className="font-semibold">Build Contract Signing Flow</p>
                <p className="text-gray-600">Add e-signature (DocuSign/HelloSign). Create signature tracking.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
              <div>
                <p className="font-semibold">Add Notification System</p>
                <p className="text-gray-600">Push, email, SMS alerts for all key actions.</p>
              </div>
            </li>
          </ol>
        </Card>
      </div>
    </div>
  );
}