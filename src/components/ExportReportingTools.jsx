import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Calendar,
  Filter
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function ExportReportingTools() {
  const [exportJobs, setExportJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [exportForm, setExportForm] = useState({
    export_type: "bookings",
    format: "csv",
    date_range: {
      start: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd')
    }
  });

  useEffect(() => {
    loadExportJobs();
  }, []);

  const loadExportJobs = async () => {
    setIsLoading(true);
    try {
      const { ExportJob } = await import("@/api/entities");
      const user = await base44.auth.me();
      
      const jobs = await ExportJob.filter({
        requested_by: user.id
      }, "-created_date", 50);
      
      setExportJobs(jobs);
    } catch (error) {
      console.error("Error loading export jobs:", error);
      setExportJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createExportJob = async () => {
    try {
      const { ExportJob } = await import("@/api/entities");
      const user = await base44.auth.me();

      console.log("📥 Creating export job:", exportForm);

      const job = await ExportJob.create({
        ...exportForm,
        requested_by: user.id,
        status: "pending"
      });

      alert("✅ Export job created! Processing...");
      
      // Simulate processing
      setTimeout(async () => {
        await processExport(job.id);
      }, 3000);
      
      await loadExportJobs();
    } catch (error) {
      console.error("Error creating export job:", error);
      alert("Failed to create export job");
    }
  };

  const processExport = async (jobId) => {
    try {
      const { ExportJob } = await import("@/api/entities");
      
      // Simulate export generation
      const dummyFileUrl = `https://example.com/exports/export_${jobId}.${exportForm.format}`;
      const dummyRowCount = Math.floor(Math.random() * 1000) + 100;
      
      await ExportJob.update(jobId, {
        status: "completed",
        file_url: dummyFileUrl,
        row_count: dummyRowCount,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      console.log("✅ Export completed:", jobId);
      await loadExportJobs();
    } catch (error) {
      console.error("Error processing export:", error);
      
      try {
        const { ExportJob } = await import("@/api/entities");
        await ExportJob.update(jobId, { status: "failed" });
      } catch (updateError) {
        console.error("Error updating failed status:", updateError);
      }
    }
  };

  const downloadExport = (fileUrl) => {
    window.open(fileUrl, '_blank');
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <Clock className="w-4 h-4 text-amber-400" />,
      processing: <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />,
      completed: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      failed: <XCircle className="w-4 h-4 text-red-400" />
    };
    return icons[status] || icons.pending;
  };

  const getFormatIcon = (format) => {
    const icons = {
      csv: <FileSpreadsheet className="w-5 h-5 text-emerald-400" />,
      xlsx: <FileSpreadsheet className="w-5 h-5 text-blue-400" />,
      json: <FileJson className="w-5 h-5 text-purple-400" />,
      pdf: <FileText className="w-5 h-5 text-red-400" />
    };
    return icons[format] || icons.csv;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin w-8 h-8 border-2 border-gray-700 border-t-emerald-500 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Export & Reporting</h2>
        <p className="text-sm text-gray-400">Export data for analysis and reporting</p>
      </div>

      {/* Export Form */}
      <Card className="bg-gray-900 border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Create New Export</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label className="text-gray-300">Export Type</Label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white mt-1"
              value={exportForm.export_type}
              onChange={(e) => setExportForm({...exportForm, export_type: e.target.value})}
            >
              <option value="users">Users</option>
              <option value="bookings">Bookings</option>
              <option value="revenue">Revenue</option>
              <option value="disputes">Disputes</option>
              <option value="contracts">Contracts</option>
              <option value="enablers">Enablers</option>
              <option value="hosts">Hosts</option>
              <option value="analytics">Analytics</option>
              <option value="audit_log">Audit Log</option>
            </select>
          </div>

          <div>
            <Label className="text-gray-300">Format</Label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white mt-1"
              value={exportForm.format}
              onChange={(e) => setExportForm({...exportForm, format: e.target.value})}
            >
              <option value="csv">CSV</option>
              <option value="xlsx">Excel (XLSX)</option>
              <option value="json">JSON</option>
              <option value="pdf">PDF</option>
            </select>
          </div>

          <div>
            <Label className="text-gray-300">Start Date</Label>
            <input
              type="date"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white mt-1"
              value={exportForm.date_range.start}
              onChange={(e) => setExportForm({
                ...exportForm,
                date_range: {...exportForm.date_range, start: e.target.value}
              })}
            />
          </div>

          <div>
            <Label className="text-gray-300">End Date</Label>
            <input
              type="date"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white mt-1"
              value={exportForm.date_range.end}
              onChange={(e) => setExportForm({
                ...exportForm,
                date_range: {...exportForm.date_range, end: e.target.value}
              })}
            />
          </div>
        </div>

        <Button
          onClick={createExportJob}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Create Export
        </Button>
      </Card>

      {/* Export Jobs List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Exports</h3>
          <Button
            size="sm"
            variant="outline"
            className="border-gray-700 text-gray-300"
            onClick={loadExportJobs}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="space-y-3">
          {exportJobs.map((job) => (
            <Card key={job.id} className="bg-gray-900 border-gray-800 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {getFormatIcon(job.format)}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-semibold capitalize">
                        {job.export_type.replace(/_/g, ' ')}
                      </p>
                      <Badge className={`text-xs ${
                        job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        job.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        job.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {getStatusIcon(job.status)}
                        <span className="ml-1">{job.status}</span>
                      </Badge>
                      <Badge className="bg-gray-100 text-gray-700 text-xs">
                        {job.format.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>
                        {format(new Date(job.date_range.start), 'MMM d, yyyy')} - {format(new Date(job.date_range.end), 'MMM d, yyyy')}
                      </span>
                      {job.row_count && (
                        <span>{job.row_count.toLocaleString()} rows</span>
                      )}
                      <span>{format(new Date(job.created_date), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                </div>

                {job.status === 'completed' && job.file_url && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => downloadExport(job.file_url)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                )}
              </div>
            </Card>
          ))}

          {exportJobs.length === 0 && (
            <Card className="bg-gray-900 border-gray-800 p-12 text-center">
              <Download className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No exports yet</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}