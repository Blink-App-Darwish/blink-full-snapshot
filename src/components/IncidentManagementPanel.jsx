import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Shield,
  XCircle,
  CheckCircle2,
  Eye,
  Send,
  TrendingUp,
  Clock,
  User
} from "lucide-react";
import { format } from "date-fns";

export default function IncidentManagementPanel({ incidents, onRefresh }) {
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");

  const handleAssignIncident = async (incidentId, role) => {
    try {
      const { CIUIncident } = await import("@/api/entities");
      const user = await base44.auth.me();

      await CIUIncident.update(incidentId, {
        assigned_to: user.id,
        assigned_role: role,
        status: "investigating"
      });

      alert(`✅ Incident assigned to ${role}`);
      onRefresh();

    } catch (error) {
      console.error("Error assigning incident:", error);
      alert("Failed to assign incident");
    }
  };

  const handleResolveIncident = async (incidentId) => {
    if (!resolutionNotes.trim()) {
      alert("Please provide resolution notes");
      return;
    }

    try {
      const { CIUIncident } = await import("@/api/entities");

      await CIUIncident.update(incidentId, {
        status: "resolved",
        resolution_notes: resolutionNotes,
        resolved_at: new Date().toISOString()
      });

      alert("✅ Incident resolved");
      setSelectedIncident(null);
      setResolutionNotes("");
      onRefresh();

    } catch (error) {
      console.error("Error resolving incident:", error);
      alert("Failed to resolve incident");
    }
  };

  const getSeverityColor = (severity) => {
    return severity === 'critical' ? 'bg-red-100 text-red-700' :
           severity === 'high' ? 'bg-amber-100 text-amber-700' :
           severity === 'medium' ? 'bg-blue-100 text-blue-700' :
           'bg-gray-100 text-gray-700';
  };

  const getRoleLabel = (role) => {
    const roles = {
      COC: "Chief Operations Controller",
      AISA: "AI Systems Analyst",
      CRO: "Compliance & Risk Officer",
      FEM: "Finance & Escrow Manager",
      DRO: "Dispute Resolution Officer",
      QTO: "Quality & Trust Officer",
      DFE: "Data & Forecast Engineer"
    };
    return roles[role] || role;
  };

  const filteredIncidents = filterSeverity === 'all' 
    ? incidents 
    : incidents.filter(i => i.severity === filterSeverity);

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Incident Management</h3>
          <p className="text-sm text-gray-400 mt-1">Centralized incident tracking and resolution</p>
        </div>

        <select
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Incidents List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredIncidents.map((incident) => (
          <Card 
            key={incident.id} 
            className={`bg-gray-900 border-gray-800 p-6 hover:border-gray-700 transition-colors cursor-pointer ${
              selectedIncident?.id === incident.id ? 'border-amber-500' : ''
            }`}
            onClick={() => setSelectedIncident(incident)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className={`p-2 rounded-lg ${
                  incident.severity === 'critical' ? 'bg-red-500/10' :
                  incident.severity === 'high' ? 'bg-amber-500/10' :
                  'bg-blue-500/10'
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${
                    incident.severity === 'critical' ? 'text-red-400' :
                    incident.severity === 'high' ? 'text-amber-400' :
                    'text-blue-400'
                  }`} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-base font-semibold text-white">{incident.title}</h4>
                    <Badge className={getSeverityColor(incident.severity)}>
                      {incident.severity}
                    </Badge>
                    <Badge className="bg-gray-700 text-gray-300 text-[10px]">
                      {incident.engine_code}
                    </Badge>
                  </div>

                  <p className="text-sm text-gray-300 mb-3">{incident.description}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(incident.created_date), "MMM d, HH:mm")}
                    </div>
                    
                    {incident.assigned_to && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {incident.assigned_role && getRoleLabel(incident.assigned_role)}
                      </div>
                    )}

                    <Badge className={`text-[10px] ${
                      incident.status === 'open' ? 'bg-blue-100 text-blue-700' :
                      incident.status === 'investigating' ? 'bg-purple-100 text-purple-700' :
                      incident.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {incident.status}
                    </Badge>
                  </div>

                  {incident.ai_recommendation && (
                    <div className="mt-3 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                      <p className="text-xs font-semibold text-purple-300 mb-1">AI Recommendation:</p>
                      <p className="text-xs text-purple-200">{incident.ai_recommendation.reasoning}</p>
                      <p className="text-xs text-purple-300 mt-1">
                        Suggested: {incident.ai_recommendation.action}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {incident.status === 'open' && (
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      const role = prompt("Assign to role (COC/AISA/CRO/FEM/DRO/QTO/DFE):");
                      if (role) handleAssignIncident(incident.id, role);
                    }}
                  >
                    <User className="w-4 h-4 mr-1" />
                    Assign
                  </Button>
                )}
                
                {incident.status === 'investigating' && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIncident(incident);
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}

        {filteredIncidents.length === 0 && (
          <Card className="bg-gray-900 border-gray-800 p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <p className="text-gray-400">No incidents found</p>
          </Card>
        )}
      </div>

      {/* Resolution Modal */}
      {selectedIncident && selectedIncident.status === 'investigating' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="bg-gray-900 border-gray-800 max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white">Resolve Incident</h4>
              <Button
                variant="ghost"
                onClick={() => setSelectedIncident(null)}
              >
                <XCircle className="w-5 h-5" />
              </Button>
            </div>

            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-300 mb-1">{selectedIncident.title}</p>
              <p className="text-xs text-gray-400">{selectedIncident.description}</p>
            </div>

            <div className="mb-4">
              <label className="text-sm text-gray-300 mb-2 block">Resolution Notes (Required)</label>
              <Textarea
                className="bg-gray-800 border-gray-700 text-white h-24"
                placeholder="Describe how the incident was resolved..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleResolveIncident(selectedIncident.id)}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark as Resolved
              </Button>
              <Button
                variant="outline"
                className="border-gray-700 text-gray-300"
                onClick={() => setSelectedIncident(null)}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}