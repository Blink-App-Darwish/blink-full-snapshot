import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, AlertCircle, DollarSign } from "lucide-react";
import { format } from "date-fns";

export default function EditHistoryView({ editRequests, enablers }) {
  if (!editRequests || editRequests.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">No edit history yet</p>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved":
      case "auto_approved":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
      case "auto_approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-3">
      {editRequests.map((request) => {
        const enabler = enablers[request.enabler_id];
        
        return (
          <Card key={request.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                {getStatusIcon(request.status)}
                <div>
                  <p className="text-sm font-semibold text-gray-900 capitalize">
                    {request.field_name.replace(/_/g, ' ')} Change
                  </p>
                  <p className="text-xs text-gray-500">
                    {enabler?.business_name || "Unknown Enabler"}
                  </p>
                </div>
              </div>
              <Badge className={`${getStatusColor(request.status)} border text-xs`}>
                {request.status === "auto_approved" ? "Auto-Approved" : request.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-2 bg-red-50 rounded-lg border border-red-100">
                <p className="text-[10px] font-medium text-red-600 mb-1">OLD</p>
                <p className="text-xs text-red-800 font-medium">{request.old_value}</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg border border-green-100">
                <p className="text-[10px] font-medium text-green-600 mb-1">NEW</p>
                <p className="text-xs text-green-800 font-medium">{request.new_value}</p>
              </div>
            </div>

            {request.compliance_check?.applied_fees > 0 && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200 mb-2">
                <DollarSign className="w-3 h-3 text-amber-600" />
                <p className="text-xs text-amber-800">
                  Change fee applied: ${request.compliance_check.applied_fees}
                </p>
              </div>
            )}

            {request.enabler_response && (
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-200 mb-2">
                <p className="text-xs text-gray-600 italic">"{request.enabler_response}"</p>
              </div>
            )}

            <p className="text-[10px] text-gray-400">
              {format(new Date(request.created_date), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </Card>
        );
      })}
    </div>
  );
}