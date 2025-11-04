import React, { useState, useEffect } from "react";
import { Enabler, Booking, User } from "@/api/entities";
import { TrendingUp, Users, DollarSign, Calendar, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BlinkLogo from "../components/BlinkLogo";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { InvokeLLM } from "@/api/integrations";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function EnablerAnalytics() {
  const [enabler, setEnabler] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    const user = await User.me();
    const enablerData = await Enabler.filter({ user_id: user.id });
    
    if (enablerData[0]) {
      setEnabler(enablerData[0]);
      
      const bookingsData = await Booking.filter({ enabler_id: enablerData[0].id });
      setBookings(bookingsData);
    }
  };

  const generateInsights = async () => {
    if (!enabler) return;
    
    setLoadingInsights(true);
    try {
      const insights = await InvokeLLM({
        prompt: `As a market analyst for the events industry, provide insights and trends for a ${enabler.category.replace(/_/g, ' ')} professional. Include:
        1. Current market trends in the event industry
        2. Pricing recommendations for their category
        3. Popular services clients are looking for
        4. Tips to stand out from competition
        5. Seasonal opportunities
        
        Keep it practical, actionable, and specific to ${enabler.category.replace(/_/g, ' ')} services.`,
        add_context_from_internet: true
      });
      
      setInsights(insights);
    } catch (error) {
      console.error("Error generating insights:", error);
    }
    setLoadingInsights(false);
  };

  const bookingsByMonth = {};
  bookings.forEach(booking => {
    const month = format(new Date(booking.created_date), "MMM yyyy");
    bookingsByMonth[month] = (bookingsByMonth[month] || 0) + 1;
  });

  const monthlyBookingsData = Object.entries(bookingsByMonth)
    .slice(-6)
    .map(([month, count]) => ({ month, bookings: count }));

  const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
  const avgBookingValue = bookings.length > 0 ? totalRevenue / bookings.length : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <BlinkLogo size="md" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics & Trends</h1>
              <p className="text-sm text-gray-600">Business insights and market trends</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-500" />
              <p className="text-sm text-gray-600">Total Clients</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <p className="text-sm text-gray-600">Avg. Booking</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">${avgBookingValue.toFixed(0)}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-yellow-500" />
              <p className="text-sm text-gray-600">Rating</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{enabler?.average_rating || 0}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              <p className="text-sm text-gray-600">This Month</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {bookings.filter(b => 
                new Date(b.created_date).getMonth() === new Date().getMonth()
              ).length}
            </p>
          </Card>
        </div>

        {/* Booking Trends Chart */}
        <Card className="p-4">
          <h3 className="font-bold text-gray-900 mb-4">Booking Trends</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyBookingsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="bookings" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Market Insights */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Market Insights
            </h3>
            <Button
              size="sm"
              onClick={generateInsights}
              disabled={loadingInsights}
              className="bg-emerald-500 hover:bg-emerald-600 flex items-center gap-1"
            >
              <BlinkLogo size="xs" />
              {loadingInsights ? "Generating..." : "Get Insights"}
            </Button>
          </div>

          {insights ? (
            <div className="prose prose-sm max-w-none">
              <div className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 p-4 rounded-lg">
                {insights}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p>Click "Get Insights" to receive AI-powered market analysis</p>
              <p className="text-xs mt-1">
                Based on current trends in the {enabler?.category.replace(/_/g, ' ')} industry
              </p>
            </div>
          )}
        </Card>

        {/* Performance Tips */}
        <Card className="p-6 bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-200">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <BlinkLogo size="xs" />
            💡 Performance Tips
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✓ Keep your portfolio updated with recent work</li>
            <li>✓ Respond to booking requests within 24 hours</li>
            <li>✓ Maintain a 4.5+ star rating for better visibility</li>
            <li>✓ Offer multiple package options for different budgets</li>
            <li>✓ Encourage satisfied clients to leave reviews</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}