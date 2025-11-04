import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, MessageCircle, Mail, BookOpen, AlertCircle, Lightbulb, HelpCircle, Activity, Send, ExternalLink, FileQuestion, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { SendEmail } from "@/api/integrations";

const BABY_BLINK_IMAGE = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68debc13e09ac863690db587/dd26bcf28_Untitleddesign-5.png";

export default function SupportHelp() {
  const navigate = useNavigate();
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [featureSuggestion, setFeatureSuggestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [systemStatus, setSystemStatus] = useState("operational"); // operational, degraded, down

  const faqs = [
    {
      category: "Getting Started",
      questions: [
        { q: "How do I create my first event?", a: "Click the 'Create Event' button on the home screen and follow our guided setup process." },
        { q: "What is Blink AI?", a: "Blink AI helps you plan perfect events by generating personalized event ideas based on your description." },
        { q: "How do I save professionals?", a: "Tap the heart icon on any professional's profile to add them to your favorites." }
      ]
    },
    {
      category: "Bookings & Payments",
      questions: [
        { q: "How do payments work?", a: "Payments are processed securely through Stripe. You can pay with cards, Apple Pay, or bank transfer." },
        { q: "Can I negotiate prices?", a: "Yes! Many professionals enable price negotiation. Look for the 'Negotiable' badge on their packages." },
        { q: "What is the cancellation policy?", a: "Cancellation policies vary by professional. Check each contract's terms before booking." }
      ]
    },
    {
      category: "For Enablers",
      questions: [
        { q: "How do I become an Enabler?", a: "Switch to Enabler mode from your profile and create your business profile to start offering services." },
        { q: "When do I get paid?", a: "Payouts are processed weekly to your connected bank account via Stripe." },
        { q: "How does calendar sync work?", a: "Connect your Google or Apple Calendar to automatically sync your availability and bookings." }
      ]
    }
  ];

  const tutorials = [
    { title: "Creating Your First Event", duration: "3 min", link: "#" },
    { title: "Understanding AI Suggestions", duration: "2 min", link: "#" },
    { title: "Booking & Negotiation Guide", duration: "5 min", link: "#" },
    { title: "Managing Your Calendar", duration: "4 min", link: "#" },
    { title: "Setting Up Payment Methods", duration: "3 min", link: "#" }
  ];

  const handleSendProblem = async () => {
    if (!problemDescription.trim()) {
      alert("Please describe the problem");
      return;
    }

    setIsSending(true);
    try {
      const user = await base44.auth.me();
      await SendEmail({
        to: "support@blinkapp.com",
        subject: `Problem Report from ${user.email}`,
        body: `User: ${user.full_name} (${user.email})\n\nProblem Description:\n${problemDescription}`
      });
      alert("Problem reported! Our team will investigate and get back to you soon.");
      setProblemDescription("");
    } catch (error) {
      console.error("Error sending problem report:", error);
      alert("Failed to send report. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendFeature = async () => {
    if (!featureSuggestion.trim()) {
      alert("Please describe your feature idea");
      return;
    }

    setIsSending(true);
    try {
      const user = await base44.auth.me();
      await SendEmail({
        to: "feedback@blinkapp.com",
        subject: `Feature Suggestion from ${user.email}`,
        body: `User: ${user.full_name} (${user.email})\n\nFeature Suggestion:\n${featureSuggestion}`
      });
      alert("Feature suggestion submitted! We love hearing your ideas. 💡");
      setFeatureSuggestion("");
    } catch (error) {
      console.error("Error sending feature suggestion:", error);
      alert("Failed to send suggestion. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleStartChat = () => {
    setShowChat(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white/70 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Support & Help</h1>
            <p className="text-xs text-gray-500 mt-0.5">We're here to help you!</p>
          </div>
          {/* Baby Blink Icon */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 p-1 animate-pulse">
            <img 
              src={BABY_BLINK_IMAGE}
              alt="Baby Blink"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-24 space-y-6">
        {/* Baby Blink Welcome Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-6 bg-gradient-to-br from-purple-100 via-pink-100 to-purple-50 border-purple-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-300/20 rounded-full blur-3xl"></div>
            <div className="relative flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/80 backdrop-blur-sm p-2 flex-shrink-0 shadow-lg">
                <img 
                  src={BABY_BLINK_IMAGE}
                  alt="Baby Blink"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-purple-900 mb-1">Hi! I'm Baby Blink 👋</h2>
                <p className="text-sm text-purple-800 leading-relaxed">
                  Your personal helper! I'm here to guide you through Blink, answer questions, and make your event planning magical. ✨
                </p>
                <Button
                  onClick={handleStartChat}
                  className="mt-3 bg-purple-600 hover:bg-purple-700 text-white"
                  size="sm"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat with me
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* System Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                systemStatus === "operational" ? "bg-green-100" : 
                systemStatus === "degraded" ? "bg-yellow-100" : "bg-red-100"
              }`}>
                <Activity className={`w-5 h-5 ${
                  systemStatus === "operational" ? "text-green-600" : 
                  systemStatus === "degraded" ? "text-yellow-600" : "text-red-600"
                }`} />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">System Status</p>
                <p className={`text-xs mt-0.5 ${
                  systemStatus === "operational" ? "text-green-600" : 
                  systemStatus === "degraded" ? "text-yellow-600" : "text-red-600"
                }`}>
                  {systemStatus === "operational" ? "All systems operational" : 
                   systemStatus === "degraded" ? "Some services degraded" : "System maintenance"}
                </p>
              </div>
            </div>
            <Badge className={`${
              systemStatus === "operational" ? "bg-green-100 text-green-800" : 
              systemStatus === "degraded" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
            }`}>
              {systemStatus}
            </Badge>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Card 
            className="p-4 hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => window.open("mailto:support@blinkapp.com")}
          >
            <Mail className="w-8 h-8 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-gray-900 text-sm">Email Support</p>
            <p className="text-xs text-gray-500 mt-1">Get help via email</p>
          </Card>

          <Card 
            className="p-4 hover:shadow-lg transition-all cursor-pointer group"
            onClick={handleStartChat}
          >
            <MessageCircle className="w-8 h-8 text-pink-500 mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-gray-900 text-sm">Live Chat</p>
            <p className="text-xs text-gray-500 mt-1">Chat with Baby Blink</p>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="faq" className="space-y-4">
          <TabsList className="w-full grid grid-cols-4 bg-white/50 backdrop-blur-xl border border-gray-100">
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="tutorials">Tutorials</TabsTrigger>
            <TabsTrigger value="report">Report</TabsTrigger>
            <TabsTrigger value="suggest">Suggest</TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-4">
            {faqs.map((category, idx) => (
              <Card key={idx} className="p-5">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileQuestion className="w-5 h-5 text-purple-500" />
                  {category.category}
                </h3>
                <div className="space-y-4">
                  {category.questions.map((faq, qIdx) => (
                    <div key={qIdx} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                      <p className="font-semibold text-gray-900 text-sm mb-2">{faq.q}</p>
                      <p className="text-sm text-gray-600">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* Tutorials Tab */}
          <TabsContent value="tutorials" className="space-y-3">
            <Card className="p-4">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-500" />
                Knowledge Base
              </h3>
              <div className="space-y-2">
                {tutorials.map((tutorial, idx) => (
                  <button
                    key={idx}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group text-left"
                    onClick={() => alert(`Opening tutorial: ${tutorial.title}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{tutorial.title}</p>
                        <p className="text-xs text-gray-500">{tutorial.duration} read</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </button>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Report Problem Tab */}
          <TabsContent value="report" className="space-y-4">
            <Card className="p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Report a Problem
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Describe the issue
                  </label>
                  <Textarea
                    placeholder="Tell us what went wrong..."
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                </div>
                <Button
                  onClick={handleSendProblem}
                  disabled={isSending}
                  className="w-full bg-red-500 hover:bg-red-600"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSending ? "Sending..." : "Submit Report"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Suggest Feature Tab */}
          <TabsContent value="suggest" className="space-y-4">
            <Card className="p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Suggest a Feature
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Share your idea
                  </label>
                  <Textarea
                    placeholder="We'd love to hear your feature ideas..."
                    value={featureSuggestion}
                    onChange={(e) => setFeatureSuggestion(e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                </div>
                <Button
                  onClick={handleSendFeature}
                  disabled={isSending}
                  className="w-full bg-yellow-500 hover:bg-yellow-600"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isSending ? "Sending..." : "Submit Suggestion"}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Contact Info */}
        <Card className="p-5 bg-gradient-to-br from-gray-50 to-white">
          <h3 className="font-bold text-gray-900 mb-3">Direct Contact</h3>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 text-gray-600">
              <Mail className="w-4 h-4 text-purple-500" />
              <span>support@blinkapp.com</span>
            </p>
            <p className="flex items-center gap-2 text-gray-600">
              <MessageCircle className="w-4 h-4 text-pink-500" />
              <span>Live chat available 24/7</span>
            </p>
          </div>
        </Card>
      </div>

      {/* Floating Baby Blink Chat (when opened) */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed bottom-24 right-4 z-50 w-80 max-h-96 bg-white rounded-2xl shadow-2xl border border-purple-200 overflow-hidden"
          >
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm p-1">
                  <img src={BABY_BLINK_IMAGE} alt="Baby Blink" className="w-full h-full object-contain" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">Baby Blink</p>
                  <p className="text-xs text-white/80">Online now</p>
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Chat Body */}
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 p-1 flex-shrink-0">
                  <img src={BABY_BLINK_IMAGE} alt="Baby Blink" className="w-full h-full object-contain" />
                </div>
                <div className="bg-purple-100 rounded-2xl rounded-tl-none p-3 max-w-[80%]">
                  <p className="text-sm text-gray-800">
                    Hi! 👋 I'm here to help. What can I assist you with today?
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-gray-100 flex gap-2">
              <Input
                placeholder="Type your message..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    alert(`Baby Blink: Thanks for your message! In production, this would connect to live chat support. 💬`);
                    setChatMessage("");
                  }
                }}
                className="flex-1"
              />
              <Button
                size="icon"
                className="bg-purple-500 hover:bg-purple-600"
                onClick={() => {
                  alert(`Baby Blink: Thanks for your message! In production, this would connect to live chat support. 💬`);
                  setChatMessage("");
                }}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}