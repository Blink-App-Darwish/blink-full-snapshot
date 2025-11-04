import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User, Enabler, FinancialTransaction, ExpenseCategory } from "@/api/entities";
import { ArrowLeft, Upload, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import DoubleEntryBookkeeping from "../components/DoubleEntryBookkeeping";
import { UploadFile } from "@/api/integrations";

export default function AddExpense() {
  const navigate = useNavigate();
  const [enabler, setEnabler] = useState(null);
  const [categories, setCategories] = useState([]);
  const [expense, setExpense] = useState({
    amount: "",
    category: "",
    vendor_name: "",
    description: "",
    payment_method: "credit_card",
    tags: [],
    notes: ""
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const user = await User.me();
    const selectedProfileId = localStorage.getItem("selected_enabler_profile");
    
    let enablerData;
    if (selectedProfileId) {
      const profiles = await Enabler.filter({ id: selectedProfileId, user_id: user.id });
      enablerData = profiles[0];
    } else {
      const profiles = await Enabler.filter({ user_id: user.id });
      enablerData = profiles[0];
    }
    
    if (enablerData) {
      setEnabler(enablerData);
      const categoriesData = await ExpenseCategory.filter({ 
        enabler_id: enablerData.id, 
        is_active: true 
      });
      setCategories(categoriesData);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceiptFile(file);
    }
  };

  const toggleTag = (tag) => {
    setExpense({
      ...expense,
      tags: expense.tags.includes(tag)
        ? expense.tags.filter(t => t !== tag)
        : [...expense.tags, tag]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!enabler || !expense.amount || !expense.category) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload receipt if provided
      let receiptUrl = null;
      if (receiptFile) {
        const uploadResult = await UploadFile({ file: receiptFile });
        receiptUrl = uploadResult.file_url;
      }

      // Create transaction
      const transaction = await FinancialTransaction.create({
        enabler_id: enabler.id,
        transaction_type: "expense",
        amount: parseFloat(expense.amount),
        category: expense.category,
        vendor_name: expense.vendor_name,
        description: expense.description,
        payment_method: expense.payment_method,
        tags: expense.tags,
        notes: expense.notes,
        receipt_url: receiptUrl,
        status: "completed",
        processed_date: new Date().toISOString(),
        source: "manual"
      });

      // Create ledger entries (double-entry bookkeeping)
      await DoubleEntryBookkeeping.recordTransaction(transaction);

      navigate(createPageUrl("EnablerFinance"));
    } catch (error) {
      console.error("Error adding expense:", error);
      alert("Failed to add expense. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!enabler) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Add Expense</h1>
            <p className="text-sm text-gray-600">Log a business expense</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={expense.amount}
                    onChange={(e) => setExpense({...expense, amount: e.target.value})}
                    placeholder="0.00"
                    className="mt-2"
                    required
                  />
                </div>

                <div>
                  <Label>Category *</Label>
                  <Select
                    value={expense.category}
                    onValueChange={(value) => setExpense({...expense, category: value})}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length > 0 ? (
                        categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="Equipment">Equipment</SelectItem>
                          <SelectItem value="Travel">Travel</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                          <SelectItem value="Supplies">Supplies</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Vendor Name</Label>
                <Input
                  value={expense.vendor_name}
                  onChange={(e) => setExpense({...expense, vendor_name: e.target.value})}
                  placeholder="Who did you pay?"
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={expense.description}
                  onChange={(e) => setExpense({...expense, description: e.target.value})}
                  placeholder="What was this expense for?"
                  className="mt-2"
                  rows={3}
                />
              </div>

              <div>
                <Label>Payment Method</Label>
                <Select
                  value={expense.payment_method}
                  onValueChange={(value) => setExpense({...expense, payment_method: value})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {["business", "tax_deductible", "recurring"].map(tag => (
                    <Badge
                      key={tag}
                      variant={expense.tags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Receipt Upload */}
              <div>
                <Label>Receipt</Label>
                <div className="mt-2">
                  <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors">
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        {receiptFile ? receiptFile.name : "Click to upload receipt"}
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={expense.notes}
                  onChange={(e) => setExpense({...expense, notes: e.target.value})}
                  placeholder="Additional notes..."
                  className="mt-2"
                  rows={2}
                />
              </div>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {isSubmitting ? "Adding..." : "Add Expense"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}