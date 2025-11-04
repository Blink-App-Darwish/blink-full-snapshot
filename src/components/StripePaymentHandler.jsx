import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Lock } from "lucide-react";

/**
 * Stripe Payment Handler Component
 * 
 * In production, this would integrate with Stripe Elements for PCI compliance.
 * For now, this is a simulation showing the flow.
 * 
 * To implement real Stripe integration:
 * 1. Add Stripe.js to your project
 * 2. Create Stripe Elements for card input
 * 3. Use Stripe Payment Intents API
 * 4. Implement 3D Secure authentication
 */

export default function StripePaymentHandler({ amount, currency = "USD", reservations, onSuccess, onError }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvc: "",
    name: ""
  });

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // PRODUCTION: Replace with actual Stripe API calls
      // const stripe = window.Stripe('your_publishable_key');
      // const { paymentIntent, error } = await stripe.createPaymentIntent({...});
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful payment
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // In production, handle payment confirmation and 3D Secure here
      
      onSuccess(paymentId);
      
    } catch (error) {
      console.error("Payment error:", error);
      onError("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + (v.length > 2 ? '/' + v.substring(2, 4) : '');
    }
    return v;
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-lg text-white mb-6">
        <div className="flex items-center justify-between mb-4">
          <CreditCard className="w-8 h-8" />
          <span className="text-sm font-medium">SECURE PAYMENT</span>
        </div>
        <p className="text-3xl font-bold mb-1">
          {currency} {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-sm opacity-90">Deposit payment</p>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2">Cardholder Name</Label>
        <Input
          placeholder="John Doe"
          value={cardDetails.name}
          onChange={(e) => setCardDetails({...cardDetails, name: e.target.value})}
          disabled={isProcessing}
          className="border-gray-300"
        />
      </div>

      <div>
        <Label className="text-sm font-medium mb-2">Card Number</Label>
        <Input
          placeholder="1234 5678 9012 3456"
          value={cardDetails.number}
          onChange={(e) => setCardDetails({...cardDetails, number: formatCardNumber(e.target.value)})}
          maxLength={19}
          disabled={isProcessing}
          className="border-gray-300"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium mb-2">Expiry Date</Label>
          <Input
            placeholder="MM/YY"
            value={cardDetails.expiry}
            onChange={(e) => setCardDetails({...cardDetails, expiry: formatExpiry(e.target.value)})}
            maxLength={5}
            disabled={isProcessing}
            className="border-gray-300"
          />
        </div>
        <div>
          <Label className="text-sm font-medium mb-2">CVC</Label>
          <Input
            placeholder="123"
            type="password"
            value={cardDetails.cvc}
            onChange={(e) => setCardDetails({...cardDetails, cvc: e.target.value.replace(/[^0-9]/g, '')})}
            maxLength={4}
            disabled={isProcessing}
            className="border-gray-300"
          />
        </div>
      </div>

      <Button
        onClick={handlePayment}
        disabled={isProcessing || !cardDetails.name || !cardDetails.number || !cardDetails.expiry || !cardDetails.cvc}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 text-lg font-semibold"
      >
        {isProcessing ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Processing...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5 mr-2" />
            Pay {currency} {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </>
        )}
      </Button>

      <div className="flex items-center justify-center gap-4 pt-4">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/512px-Stripe_Logo%2C_revised_2016.svg.png" alt="Stripe" className="h-6 opacity-50" />
        <span className="text-xs text-gray-500">Powered by Stripe</span>
      </div>

      <p className="text-xs text-center text-gray-500 mt-4">
        🔒 Your payment information is encrypted and secure. We use industry-standard SSL encryption.
      </p>

      {/* Production Note */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-800 font-medium mb-1">⚠️ Development Mode</p>
        <p className="text-xs text-yellow-700">
          This is a simulation. In production, integrate with Stripe Elements for PCI-compliant payment processing.
        </p>
        <p className="text-xs text-yellow-600 mt-2">
          Use test card: 4242 4242 4242 4242, any future date, any CVC
        </p>
      </div>
    </div>
  );
}