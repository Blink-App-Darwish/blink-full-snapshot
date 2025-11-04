import React, { useState } from "react";
import { Edit2, Lock, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Event } from "@/api/entities";

/**
 * EventNameDisplay Component
 * Shows event display name (editable) and unique UID (locked)
 * Maintains Blink's styling
 */
export default function EventNameDisplay({ 
  event, 
  onUpdate, 
  showUID = false,
  editable = true,
  compact = false 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(event.display_name || event.name);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim()) {
      alert("Event name cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      await Event.update(event.id, { display_name: displayName, name: displayName });
      if (onUpdate) onUpdate({ ...event, display_name: displayName });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating event name:", error);
      alert("Failed to update event name");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(event.display_name || event.name);
    setIsEditing(false);
  };

  const copyUID = () => {
    if (event.event_uid) {
      navigator.clipboard.writeText(event.event_uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="text-sm h-8"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 px-2"
              >
                <Check className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <>
              <span className="font-medium text-gray-900">{displayName}</span>
              {editable && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-gray-400 hover:text-emerald-600 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </div>
        {showUID && event.event_uid && (
          <div className="flex items-center gap-1">
            <code className="text-[10px] text-gray-500 font-mono">
              {event.event_uid}
            </code>
            <Lock className="w-3 h-3 text-gray-400" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Display Name (Editable) */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-500 tracking-wide">EVENT NAME</span>
          {editable && !isEditing && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">Editable</Badge>
          )}
        </div>
        
        {isEditing ? (
          <div className="flex gap-2">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="flex-1"
              placeholder="Enter event name"
              autoFocus
            />
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-gray-900">{displayName}</h3>
            {editable && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4 text-gray-400 hover:text-emerald-600" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Unique ID (Locked) */}
      {showUID && event.event_uid && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-500 tracking-wide">UNIQUE ID</span>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-gray-100">
              <Lock className="w-2.5 h-2.5 mr-1" />
              Locked
            </Badge>
          </div>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <code className="flex-1 text-sm font-mono text-gray-700">
              {event.event_uid}
            </code>
            <button
              onClick={copyUID}
              className="p-2 hover:bg-white rounded transition-colors"
              title="Copy UID"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
          
          {/* AI Keywords */}
          {event.ai_keywords && event.ai_keywords.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-gray-400">AI Keywords:</span>
              <div className="flex gap-1">
                {event.ai_keywords.map((kw, i) => (
                  <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}