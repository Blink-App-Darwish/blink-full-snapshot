
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Event } from "@/api/entities";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Calendar, MapPin, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BlinkLogo from "../components/BlinkLogo";

const eventTypes = [
  { label: "Wedding", value: "wedding" },
  { label: "Birthday Party", value: "birthday" },
  { label: "Corporate Event", value: "corporate" },
  { label: "Conference", value: "conference" },
  { label: "Product Launch", value: "product_launch" },
  { label: "Baby Shower", value: "baby_shower" },
  { label: "Dinner Party", value: "dinner" },
  { label: "Other", value: "other" }
];

export default function CreateEvent() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    date: "",
    location: "",
    guest_count: "",
    budget: "",
    theme: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const user = await base44.auth.me();
      
      const eventData = {
        ...formData,
        host_id: user.id,
        guest_count: parseInt(formData.guest_count) || 0,
        budget: parseFloat(formData.budget) || 0,
        status: "planning"
      };

      const newEvent = await Event.create(eventData);
      
      navigate(`${createPageUrl("MyEvents")}?highlight=${newEvent.id}`);
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Made fixed */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <BlinkLogo size="sm" />
            <h1 className="text-xl font-bold text-gray-900">Create Your Event</h1>
          </div>
        </div>
      </div>

      {/* Main Content Form - Adjusted padding for fixed header and footer */}
      <form id="create-event-form" onSubmit={handleSubmit} className="max-w-md mx-auto px-4 pt-20 pb-40 space-y-6">
        <div>
          <Label htmlFor="name" className="text-base font-semibold">Event Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Sarah & John's Wedding"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="type" className="text-base font-semibold">Event Type *</Label>
          <Select value={formData.type} onValueChange={(value) => handleChange("type", value)} required>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Choose event type" />
            </SelectTrigger>
            <SelectContent>
              {eventTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date" className="text-base font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date *
            </Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleChange("date", e.target.value)}
              required
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="guest_count" className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Guests
            </Label>
            <Input
              id="guest_count"
              type="number"
              placeholder="100"
              value={formData.guest_count}
              onChange={(e) => handleChange("guest_count", e.target.value)}
              className="mt-2"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="location" className="text-base font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location
          </Label>
          <Input
            id="location"
            placeholder="City or venue name"
            value={formData.location}
            onChange={(e) => handleChange("location", e.target.value)}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="budget" className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Budget
          </Label>
          <Input
            id="budget"
            type="number"
            placeholder="10000"
            value={formData.budget}
            onChange={(e) => handleChange("budget", e.target.value)}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="theme" className="text-base font-semibold">Theme / Style</Label>
          <Textarea
            id="theme"
            placeholder="Describe your vision, colors, style..."
            value={formData.theme}
            onChange={(e) => handleChange("theme", e.target.value)}
            className="mt-2"
            rows={3}
          />
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
          <BlinkLogo size="xs" className="mt-0.5" />
          <p className="text-sm text-emerald-800">
            💡 After creating your event, our AI will suggest the perfect enablers for your needs!
          </p>
        </div>
      </form>

      {/* Fixed Footer Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-md mx-auto"> {/* To center the button within the fixed footer */}
          <Button
            form="create-event-form" // Associate button with the form by ID
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 text-lg font-semibold rounded-full flex items-center justify-center gap-2"
          >
            <BlinkLogo size="xs" />
            {isSubmitting ? "Creating Event..." : "Create Event"}
          </Button>
        </div>
      </div>
    </div>
  );
}
