import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, CreditCard, DollarSign, Plus, Trash2, Download, FileText, Building, Wallet, Apple, CheckCircle2, AlertCircle, Eye, EyeOff, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import BlinkLogo from "../components/BlinkLogo";

export default function PaymentsFinancials() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddBank, setShowAddBank] = useState(false);

  // Payment Methods
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [applePay, setApplePay] = useState(false);

  // Bank Account
  const [bankAccount, setBankAccount] = useState(null);

  // Currency
  const [defaultCurrency, setDefaultCurrency] = useState("USD");

  // Stripe Connection
  const [stripeConnected, setStripeConnected] = useState(false);

  // Transactions (mock data for now)
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Load saved payment info
      if (userData.payment_settings) {
        setPaymentMethods(userData.payment_settings.payment_methods || []);
        setApplePay(userData.payment_settings.apple_pay || false);
        setBankAccount(userData.payment_settings.bank_account || null);
        setDefaultCurrency(userData.payment_settings.default_currency || "USD");
        setStripeConnected(userData.payment_settings.stripe_connected || false);
      }
      
      // Load mock transactions
      setTransactions([
        { id: 1, type: "payment", amount: 500, date: "2025-01-15", description: "Event booking deposit", status: "completed" },
        { id: 2, type: "payout", amount: 1200, date: "2025-01-10", description: "Monthly payout", status: "completed" },
        { id: 3, type: "payment", amount: 350, date: "2025-01-05", description: "Service payment", status: "pending" }
      ]);
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePaymentSettings = async (settings) => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({ payment_settings: settings });
    } catch (error) {
      console.error("Error saving payment settings:", error);
      alert("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    // In production, this would integrate with Stripe
    const newCard = {
      id: Date.now().toString(),
      last4: "4242",
      brand: "visa",
      exp_month: 12,
      exp_year: 2027,
      is_default: paymentMethods.length === 0
    };
    
    const updated = [...paymentMethods, newCard];
    setPaymentMethods(updated);
    await savePaymentSettings({ payment_methods: updated, apple_pay: applePay, bank_account: bankAccount, default_currency: defaultCurrency, stripe_connected: stripeConnected });
    setShowAddCard(false);
  };

  const handleRemoveCard = async (cardId) => {
    if (confirm("Remove this payment method?")) {
      const updated = paymentMethods.filter(c => c.id !== cardId);
      setPaymentMethods(updated);
      await savePaymentSettings({ payment_methods: updated, apple_pay: applePay, bank_account: bankAccount, default_currency: defaultCurrency, stripe_connected: stripeConnected });
    }
  };

  const handleConnectStripe = async () => {
    // In production, redirect to Stripe Connect OAuth
    alert("In production, this would redirect to Stripe Connect for secure account linking.");
    setStripeConnected(true);
    await savePaymentSettings({ payment_methods: paymentMethods, apple_pay: applePay, bank_account: bankAccount, default_currency: defaultCurrency, stripe_connected: true });
  };

  const handleDisconnectStripe = async () => {
    if (confirm("Disconnect Stripe account? You won't be able to receive payouts.")) {
      setStripeConnected(false);
      await savePaymentSettings({ payment_methods: paymentMethods, apple_pay: applePay, bank_account: bankAccount, default_currency: defaultCurrency, stripe_connected: false });
    }
  };

  const handleDownloadReceipts = () => {
    alert("Downloading all receipts and invoices...");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <BlinkLogo size="lg" className="animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
            <h1 className="text-xl font-bold text-gray-900">Payments & Financials</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage your payment methods and transactions</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-24">
        <Tabs defaultValue="methods" className="space-y-6">
          <TabsList className="w-full grid grid-cols-4 bg-white/50 backdrop-blur-xl border border-gray-100">
            <TabsTrigger value="methods">Methods</TabsTrigger>
            <TabsTrigger value="bank">Bank</TabsTrigger>
            <TabsTrigger value="transactions">History</TabsTrigger>
            <TabsTrigger value="tax">Tax & Docs</TabsTrigger>
          </TabsList>

          {/* Payment Methods Tab */}
          <TabsContent value="methods" className="space-y-4">
            {/* Apple Pay Toggle */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center">
                    <Apple className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Apple Pay</p>
                    <p className="text-xs text-gray-500 mt-0.5">Fast and secure payments</p>
                  </div>
                </div>
                <Switch
                  checked={applePay}
                  onCheckedChange={async (checked) => {
                    setApplePay(checked);
                    await savePaymentSettings({ payment_methods: paymentMethods, apple_pay: checked, bank_account: bankAccount, default_currency: defaultCurrency, stripe_connected: stripeConnected });
                  }}
                />
              </div>
            </Card>

            {/* Payment Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Payment Cards</h3>
                <Button
                  size="sm"
                  onClick={() => setShowAddCard(true)}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Card
                </Button>
              </div>

              {paymentMethods.length === 0 ? (
                <Card className="p-8 text-center">
                  <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-600 mb-2">No payment methods yet</p>
                  <p className="text-xs text-gray-500">Add a card to make payments</p>
                </Card>
              ) : (
                paymentMethods.map((card) => (
                  <Card key={card.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 capitalize">{card.brand} •••• {card.last4}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Expires {card.exp_month}/{card.exp_year}</p>
                          {card.is_default && (
                            <Badge className="mt-1 bg-green-100 text-green-800 text-[9px]">Default</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCard(card.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Default Currency */}
            <Card className="p-4">
              <Label className="text-sm font-semibold text-gray-900 mb-3 block">Default Currency</Label>
              <Select
                value={defaultCurrency}
                onValueChange={async (value) => {
                  setDefaultCurrency(value);
                  await savePaymentSettings({ payment_methods: paymentMethods, apple_pay: applePay, bank_account: bankAccount, default_currency: value, stripe_connected: stripeConnected });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                  <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
                  <SelectItem value="AED">AED (د.إ) - UAE Dirham</SelectItem>
                  <SelectItem value="CAD">CAD (C$) - Canadian Dollar</SelectItem>
                </SelectContent>
              </Select>
            </Card>
          </TabsContent>

          {/* Bank Account Tab */}
          <TabsContent value="bank" className="space-y-4">
            {/* Stripe Connection */}
            <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">Stripe Connect</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {stripeConnected 
                      ? "Your Stripe account is connected and ready to receive payments." 
                      : "Connect your Stripe account to receive payouts securely."}
                  </p>
                  {stripeConnected ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-700">Connected</span>
                    </div>
                  ) : (
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                  )}
                </div>
              </div>
              
              {stripeConnected ? (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => alert("Opening Stripe Dashboard...")}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Stripe Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleDisconnectStripe}
                  >
                    Disconnect Stripe
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={handleConnectStripe}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Stripe Account
                </Button>
              )}
            </Card>

            {/* Bank Account Info */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Bank Account</h3>
                {!bankAccount && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddBank(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>

              {bankAccount ? (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Building className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-900">{bankAccount.bank_name}</p>
                      <p className="text-xs text-gray-500">•••• {bankAccount.last4}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Remove bank account?")) {
                        setBankAccount(null);
                        savePaymentSettings({ payment_methods: paymentMethods, apple_pay: applePay, bank_account: null, default_currency: defaultCurrency, stripe_connected: stripeConnected });
                      }
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-600">No bank account linked</p>
                  <p className="text-xs text-gray-500 mt-1">Add your bank to receive payouts</p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Transaction History Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Recent Transactions</h3>
              <Button size="sm" variant="outline">
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>

            {transactions.length === 0 ? (
              <Card className="p-8 text-center">
                <DollarSign className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-600">No transactions yet</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <Card key={tx.id} className="p-4 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.type === "payment" ? "bg-red-100" : "bg-green-100"
                        }`}>
                          <DollarSign className={`w-5 h-5 ${
                            tx.type === "payment" ? "text-red-600" : "text-green-600"
                          }`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{tx.description}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{tx.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${
                          tx.type === "payment" ? "text-red-600" : "text-green-600"
                        }`}>
                          {tx.type === "payment" ? "-" : "+"}${tx.amount}
                        </p>
                        <Badge className={`text-[9px] mt-1 ${
                          tx.status === "completed" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tax & Documents Tab */}
          <TabsContent value="tax" className="space-y-4">
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Tax Information</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Download Tax Summary (2024)
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Download All Invoices
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Download All Receipts
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Tax Compliance</h4>
                  <p className="text-sm text-blue-800">
                    Keep your tax information up to date for smooth payouts and compliance. Download your documents anytime for your records.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <Button
                className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                onClick={handleDownloadReceipts}
              >
                <Download className="w-4 h-4 mr-2" />
                Download All Financial Documents
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Card Modal */}
      <AnimatePresence>
        {showAddCard && (
          <div 
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
            onClick={() => setShowAddCard(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30 }}
              className="w-full max-w-md bg-white rounded-t-3xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add Payment Card</h3>
              <form onSubmit={handleAddCard} className="space-y-4">
                <div>
                  <Label>Card Number</Label>
                  <Input placeholder="1234 5678 9012 3456" className="mt-2" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Expiry</Label>
                    <Input placeholder="MM/YY" className="mt-2" required />
                  </div>
                  <div>
                    <Label>CVV</Label>
                    <Input placeholder="123" type="password" className="mt-2" required />
                  </div>
                </div>
                <div>
                  <Label>Cardholder Name</Label>
                  <Input placeholder="John Doe" className="mt-2" required />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600">
                    Add Card
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddCard(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}