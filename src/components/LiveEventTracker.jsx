import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  MapPin,
  Clock,
  CheckCircle2,
  Camera,
  MessageSquare,
  Navigation,
  Eye,
  AlertTriangle,
  Upload,
  Send,
  Image as ImageIcon,
  Phone,
  Zap
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function LiveEventTracker({ bookingId, isHost = false }) {
  const [tracking, setTracking] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [proofFiles, setProofFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (bookingId) {
      loadTracking();
      
      // Real-time polling every 10 seconds
      const interval = setInterval(loadTracking, 10000);
      return () => clearInterval(interval);
    }
  }, [bookingId]);

  const loadTracking = async () => {
    try {
      setIsLoading(true);
      const { LiveEventTracking, BookingWorkflow, Booking, Event } = await import("@/api/entities");

      const trackingData = await LiveEventTracking.filter({ booking_id: bookingId });
      const workflowData = await BookingWorkflow.filter({ booking_id: bookingId });
      
      if (trackingData[0]) {
        setTracking(trackingData[0]);
      } else {
        // Create tracking record if doesn't exist
        const booking = await Booking.filter({ id: bookingId }).then(b => b[0]);
        const event = await Event.filter({ id: booking.event_id }).then(e => e[0]);
        
        const newTracking = await LiveEventTracking.create({
          booking_id: bookingId,
          event_id: booking.event_id,
          enabler_id: booking.enabler_id,
          host_id: event.host_id,
          current_status: "pending",
          status_history: [{
            status: "pending",
            timestamp: new Date().toISOString(),
            notes: "Event tracking initialized"
          }],
          communication_hub: []
        });
        setTracking(newTracking);
      }
      
      if (workflowData[0]) {
        setWorkflow(workflowData[0]);
      }

    } catch (error) {
      console.error("Error loading tracking:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      const { LiveEventTracking, BookingWorkflow } = await import("@/api/entities");

      const statusHistory = [
        ...(tracking.status_history || []),
        {
          status: newStatus,
          timestamp: new Date().toISOString(),
          notes: `Status changed to ${newStatus}`
        }
      ];

      await LiveEventTracking.update(tracking.id, {
        current_status: newStatus,
        status_history: statusHistory
      });

      // Also update workflow
      if (workflow) {
        await BookingWorkflow.update(workflow.id, {
          live_status: {
            ...workflow.live_status,
            enabler_status: newStatus,
            last_update: new Date().toISOString()
          }
        });
      }

      await loadTracking();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  };

  const updateLocation = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported by your browser");
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });

      const { LiveEventTracking } = await import("@/api/entities");

      await LiveEventTracking.update(tracking.id, {
        location_tracking: {
          current_location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          }
        }
      });

      alert("✅ Location updated successfully!");
      await loadTracking();

    } catch (error) {
      console.error("Error updating location:", error);
      alert("Failed to get location. Please enable location services.");
    }
  };

  const uploadProofOfWork = async (file) => {
    try {
      setUploading(true);
      const { UploadFile } = await import("@/api/integrations");
      const { LiveEventTracking } = await import("@/api/entities");

      // Upload file
      const { file_url } = await UploadFile({ file });

      // Get current location
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000
            });
          });
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
        } catch (error) {
          console.warn("Could not get location for proof upload");
        }
      }

      // Add to proof of work
      const proofOfWork = [
        ...(tracking.proof_of_work || []),
        {
          proof_type: file.type.startsWith('image/') ? 'photo' : 'video',
          url: file_url,
          timestamp: new Date().toISOString(),
          location: location,
          description: "Work in progress"
        }
      ];

      await LiveEventTracking.update(tracking.id, {
        proof_of_work: proofOfWork
      });

      alert("✅ Proof uploaded successfully!");
      await loadTracking();

    } catch (error) {
      console.error("Error uploading proof:", error);
      alert("Failed to upload proof");
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    try {
      const { LiveEventTracking } = await import("@/api/entities");
      const { User } = await import("@/api/entities");
      
      const user = await User.me();

      const communicationHub = [
        ...(tracking.communication_hub || []),
        {
          sender: user.id,
          sender_name: user.full_name,
          receiver: isHost ? tracking.enabler_id : tracking.host_id,
          message: message,
          timestamp: new Date().toISOString(),
          read: false
        }
      ];

      await LiveEventTracking.update(tracking.id, {
        communication_hub: communicationHub
      });

      setMessage("");
      await loadTracking();

    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message");
    }
  };

  const acknowledgeStatus = async () => {
    try {
      const { LiveEventTracking } = await import("@/api/entities");

      const hostAcknowledgments = [
        ...(tracking.host_acknowledgments || []),
        {
          acknowledgment_type: "status_update",
          timestamp: new Date().toISOString(),
          notes: `Acknowledged ${tracking.current_status} status`
        }
      ];

      await LiveEventTracking.update(tracking.id, {
        host_acknowledgments: hostAcknowledgments
      });

      alert("✅ Status acknowledged!");
      await loadTracking();

    } catch (error) {
      console.error("Error acknowledging status:", error);
    }
  };

  const reportIncident = async () => {
    const description = prompt("Describe the incident:");
    if (!description) return;

    try {
      const { LiveEventTracking } = await import("@/api/entities");
      const { User } = await import("@/api/entities");
      
      const user = await User.me();

      const incidents = [
        ...(tracking.incidents_reported || []),
        {
          reported_by: isHost ? "host" : "enabler",
          reporter_id: user.id,
          incident_type: "quality_concern",
          severity: "medium",
          description: description,
          reported_at: new Date().toISOString(),
          resolved: false
        }
      ];

      await LiveEventTracking.update(tracking.id, {
        incidents_reported: incidents
      });

      alert("✅ Incident reported to Blink Support");
      await loadTracking();

    } catch (error) {
      console.error("Error reporting incident:", error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-gray-100 text-gray-700 border-gray-300",
      on_the_way: "bg-blue-100 text-blue-700 border-blue-300",
      arrived: "bg-purple-100 text-purple-700 border-purple-300",
      setup: "bg-indigo-100 text-indigo-700 border-indigo-300",
      active: "bg-emerald-100 text-emerald-700 border-emerald-300",
      wrapping_up: "bg-amber-100 text-amber-700 border-amber-300",
      completed: "bg-green-100 text-green-700 border-green-300"
    };
    return colors[status] || colors.pending;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!tracking) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">Live tracking not available</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Live Status Banner */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 animate-pulse"></div>
        
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse"></div>
              <div>
                <p className="text-sm font-semibold text-gray-900">LIVE EVENT MODE</p>
                <p className="text-xs text-gray-500">Real-time tracking active</p>
              </div>
            </div>

            <Badge className={`${getStatusColor(tracking.current_status)} border-2`}>
              {tracking.current_status.replace(/_/g, ' ').toUpperCase()}
            </Badge>
          </div>

          {/* Status Timeline */}
          <div className="flex items-center gap-1 mb-4">
            {['pending', 'on_the_way', 'arrived', 'setup', 'active', 'wrapping_up', 'completed'].map((status, index) => {
              const currentIndex = ['pending', 'on_the_way', 'arrived', 'setup', 'active', 'wrapping_up', 'completed'].indexOf(tracking.current_status);
              const isPast = index <= currentIndex;
              const isCurrent = index === currentIndex;

              return (
                <div key={status} className="flex-1">
                  <div className={`h-2 rounded-full transition-all ${
                    isPast 
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' 
                      : 'bg-gray-200'
                  } ${isCurrent ? 'animate-pulse' : ''}`}></div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          {!isHost && (
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={updateLocation}
                className="text-xs"
              >
                <Navigation className="w-3 h-3 mr-1" />
                Update Location
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => document.getElementById('proof-upload').click()}
                disabled={uploading}
                className="text-xs"
              >
                <Camera className="w-3 h-3 mr-1" />
                {uploading ? 'Uploading...' : 'Add Photo'}
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={reportIncident}
                className="text-xs"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Report Issue
              </Button>

              <input
                id="proof-upload"
                type="file"
                accept="image/*,video/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) uploadProofOfWork(file);
                }}
                className="hidden"
              />
            </div>
          )}

          {isHost && (
            <Button
              size="sm"
              onClick={acknowledgeStatus}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Acknowledge Status Update
            </Button>
          )}
        </div>
      </Card>

      {/* Status Control Panel (Enabler Only) */}
      {!isHost && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-500" />
            Update Status
          </h3>
          
          <div className="grid grid-cols-2 gap-2">
            {['on_the_way', 'arrived', 'setup', 'active', 'wrapping_up', 'completed'].map((status) => (
              <Button
                key={status}
                size="sm"
                onClick={() => updateStatus(status)}
                variant={tracking.current_status === status ? "default" : "outline"}
                className={`text-xs ${
                  tracking.current_status === status 
                    ? 'bg-emerald-500 hover:bg-emerald-600' 
                    : ''
                }`}
              >
                {status.replace(/_/g, ' ').toUpperCase()}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Location Tracking */}
      {tracking.location_tracking?.current_location && (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Current Location</h3>
              <p className="text-xs text-gray-600 mb-2">
                Lat: {tracking.location_tracking.current_location.lat.toFixed(6)}<br/>
                Lng: {tracking.location_tracking.current_location.lng.toFixed(6)}
              </p>
              <p className="text-[10px] text-gray-400">
                Updated: {format(new Date(tracking.location_tracking.current_location.timestamp), 'h:mm:ss a')}
              </p>
              <Badge variant="outline" className="mt-2 text-[10px]">
                Accuracy: ±{Math.round(tracking.location_tracking.current_location.accuracy)}m
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Proof of Work Gallery */}
      {tracking.proof_of_work && tracking.proof_of_work.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-500" />
            Proof of Work ({tracking.proof_of_work.length})
          </h3>
          
          <div className="grid grid-cols-3 gap-2">
            {tracking.proof_of_work.map((proof, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                {proof.proof_type === 'photo' ? (
                  <img 
                    src={proof.url} 
                    alt={`Proof ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                  <p className="text-[9px] text-white">
                    {format(new Date(proof.timestamp), 'h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Communication Hub */}
      <Card className="p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-500" />
          Live Chat
        </h3>

        <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
          {tracking.communication_hub && tracking.communication_hub.length > 0 ? (
            tracking.communication_hub.map((msg, index) => {
              const isMe = msg.sender_name === 'You' || (!isHost && msg.sender === tracking.enabler_id) || (isHost && msg.sender === tracking.host_id);
              
              return (
                <div
                  key={index}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] p-2 rounded-lg ${
                    isMe 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-xs">{msg.message}</p>
                    <p className={`text-[9px] mt-1 ${isMe ? 'text-emerald-100' : 'text-gray-400'}`}>
                      {format(new Date(msg.timestamp), 'h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">No messages yet</p>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 h-9 text-sm"
          />
          <Button
            size="sm"
            onClick={sendMessage}
            disabled={!message.trim()}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Status History */}
      <Card className="p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          Status History
        </h3>

        <div className="space-y-2">
          {tracking.status_history && tracking.status_history.slice().reverse().map((entry, index) => (
            <div key={index} className="flex items-start gap-3 text-xs">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                entry.status === tracking.current_status ? 'bg-emerald-500' : 'bg-gray-300'
              }`}></div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 capitalize">
                  {entry.status.replace(/_/g, ' ')}
                </p>
                <p className="text-gray-500">{format(new Date(entry.timestamp), 'MMM d, h:mm a')}</p>
                {entry.notes && <p className="text-gray-400 mt-0.5">{entry.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Incidents */}
      {tracking.incidents_reported && tracking.incidents_reported.length > 0 && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-900 mb-2">Reported Incidents</h4>
              <div className="space-y-2">
                {tracking.incidents_reported.map((incident, index) => (
                  <div key={index} className="text-xs text-red-800 bg-white/50 p-2 rounded">
                    <p className="font-medium">{incident.description}</p>
                    <p className="text-red-600 mt-1">
                      Reported by {incident.reported_by} - {format(new Date(incident.reported_at), 'MMM d, h:mm a')}
                    </p>
                    {incident.resolved && (
                      <Badge className="mt-1 bg-green-100 text-green-700 text-[10px]">
                        Resolved
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