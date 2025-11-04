
import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Eye,
  Download,
  Send,
  DollarSign,
  Shield,
  Zap,
  RefreshCw,
  ArrowRight,
  Copy,
  ExternalLink
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export default function AdminOperationsConsole({ onClose }) {
  const [activeSection, setActiveSection] = useState("contracts");
  const [smartContracts, setSmartContracts] = useState([]);
  const [escrowAccounts, setEscrowAccounts] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState(null);
  const [selectedEscrow, setSelectedEscrow] = useState(null);

  useEffect(() => {
    loadOperationalData();
  }, []);

  const loadOperationalData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadSmartContracts(),
        loadEscrowAccounts(),
        loadPendingApprovals()
      ]);
    } catch (error) {
      console.error("Error loading operational data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSmartContracts = async () => {
    try {
      const { SmartContract } = await import("@/api/entities");
      const contracts = await SmartContract.list("-created_date", 50);
      setSmartContracts(contracts);
    } catch (error) {
      console.error("Error loading smart contracts:", error);
      setSmartContracts([]);
    }
  };

  const loadEscrowAccounts = async () => {
    try {
      const { EscrowAccount } = await import("@/api/entities");
      const accounts = await EscrowAccount.list("-created_date", 50);
      setEscrowAccounts(accounts);
    } catch (error) {
      console.error("Error loading escrow accounts:", error);
      setEscrowAccounts([]);
    }
  };

  const loadPendingApprovals = async () => {
    try {
      const { SmartContractRevision } = await import("@/api/entities");
      const revisions = await SmartContractRevision.filter({ 
        status: "PENDING" 
      }, "-created_date", 20);
      setPendingApprovals(revisions);
    } catch (error) {
      console.error("Error loading pending approvals:", error);
      setPendingApprovals([]);
    }
  };

  const handleContractAction = async (contractId, action, reason = "") => {
    try {
      const { SmartContract, AuditLog } = await import("@/api/entities");
      const user = await import("@/api/base44Client").then(m => m.base44.auth.me());

      if (action === "approve") {
        await SmartContract.update(contractId, { status: "ACTIVE" });
      } else if (action === "reject") {
        await SmartContract.update(contractId, { status: "RETIRED" });
      }

      // Create audit log
      await AuditLog.create({
        action: `contract_${action}`,
        entity_type: "SmartContract",
        entity_id: contractId,
        actor_id: user.id,
        actor_role: "admin",
        reason: reason,
        severity: "INFO"
      });

      alert(`✅ Contract ${action}d successfully`);
      await loadSmartContracts();
      setSelectedContract(null);
    } catch (error) {
      console.error("Error processing contract action:", error);
      alert("Failed to process contract action");
    }
  };

  const handleEscrowAction = async (escrowId, action, amount = null, reason = "") => {
    try {
      const { EscrowAccount, EscrowLedgerEntry, AuditLog } = await import("@/api/entities");
      const user = await import("@/api/base44Client").then(m => m.base44.auth.me());

      const escrow = escrowAccounts.find(e => e.id === escrowId);
      if (!escrow) {
        alert("Escrow account not found");
        return;
      }

      if (action === "release") {
        // Release funds to enabler
        await EscrowAccount.update(escrowId, { 
          status: "RELEASED",
          released_at: new Date().toISOString(),
          manual_action_by: user.id,
          manual_action_reason: reason
        });

        // Create ledger entry
        await EscrowLedgerEntry.create({
          escrow_id: escrowId,
          type: "RELEASE",
          amount_cents: escrow.enabler_payout_cents || escrow.amount_cents,
          currency: escrow.currency,
          description: `Manual release by admin: ${reason}`,
          created_by: user.id,
          processed_at: new Date().toISOString()
        });

      } else if (action === "refund") {
        // Refund to host
        await EscrowAccount.update(escrowId, { 
          status: "REFUNDED",
          refunded_at: new Date().toISOString(),
          manual_action_by: user.id,
          manual_action_reason: reason
        });

        // Create ledger entry
        await EscrowLedgerEntry.create({
          escrow_id: escrowId,
          type: "REFUND",
          amount_cents: amount || escrow.amount_cents,
          currency: escrow.currency,
          description: `Manual refund by admin: ${reason}`,
          created_by: user.id,
          processed_at: new Date().toISOString()
        });
      }

      // Create audit log
      await AuditLog.create({
        action: `escrow_${action}`,
        entity_type: "EscrowAccount",
        entity_id: escrowId,
        actor_id: user.id,
        actor_role: "admin",
        reason: reason,
        severity: "CRITICAL",
        changes: {
          before: { status: escrow.status },
          after: { status: action === "release" ? "RELEASED" : "REFUNDED" }
        }
      });

      alert(`✅ Escrow ${action}ed successfully`);
      await loadEscrowAccounts();
      setSelectedEscrow(null);
    } catch (error) {
      console.error("Error processing escrow action:", error);
      alert("Failed to process escrow action");
    }
  };

  const getContractStatusBadge = (status) => {
    const config = {
      DRAFT: { color: "bg-gray-100 text-teal-700", icon: Clock },
      ACTIVE: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
      RETIRED: { color: "bg-red-100 text-red-700", icon: XCircle },
      SUPERSEDED: { color: "bg-amber-100 text-amber-700", icon: AlertTriangle }
    };
    const { color, icon: Icon } = config[status] || config.DRAFT;
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getEscrowStatusBadge = (status) => {
    const config = {
      HOLD: { color: "bg-blue-100 text-teal-700", icon: Clock },
      RELEASED: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
      REFUNDED: { color: "bg-gray-100 text-teal-700", icon: RefreshCw },
      DISPUTED: { color: "bg-red-100 text-red-700", icon: AlertTriangle },
      CANCELLED: { color: "bg-gray-100 text-teal-700", icon: XCircle }
    };
    const { color, icon: Icon } = config[status] || config.HOLD;
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
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
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Active Contracts</p>
              <p className="text-2xl font-bold text-white">
                {smartContracts.filter(c => c.status === 'ACTIVE').length}
              </p>
            </div>
            <FileText className="w-8 h-8 text-emerald-400" />
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Escrow Holdings</p>
              <p className="text-2xl font-bold text-white">
                ${escrowAccounts
                  .filter(e => e.status === 'HOLD')
                  .reduce((sum, e) => sum + (e.amount_cents || 0), 0) / 100}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Pending Approvals</p>
              <p className="text-2xl font-bold text-white">{pendingApprovals.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="bg-gray-900 border border-gray-800">
          <TabsTrigger value="contracts">
            <FileText className="w-4 h-4 mr-2" />
            Smart Contracts ({smartContracts.length})
          </TabsTrigger>
          <TabsTrigger value="escrow">
            <DollarSign className="w-4 h-4 mr-2" />
            Escrow Accounts ({escrowAccounts.length})
          </TabsTrigger>
          <TabsTrigger value="approvals">
            <Shield className="w-4 h-4 mr-2" />
            Pending Approvals ({pendingApprovals.length})
          </TabsTrigger>
        </TabsList>

        {/* Smart Contracts Tab */}
        <TabsContent value="contracts" className="space-y-4">
          {smartContracts.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800 p-12 text-center">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No smart contracts found</p>
            </Card>
          ) : (
            smartContracts.map((contract) => (
              <Card key={contract.id} className="bg-gray-900 border-gray-800 p-6 hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-white font-semibold">Contract #{contract.id.slice(0, 8)}</h4>
                      {getContractStatusBadge(contract.status)}
                      {contract.pre_signed_by_enabler && (
                        <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Pre-signed
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                      <div>Enabler: {contract.enabler_id?.slice(0, 8)}</div>
                      <div>Package: {contract.package_id?.slice(0, 8)}</div>
                      <div>Version: {contract.version}</div>
                      <div>Created: {format(new Date(contract.created_date), "MMM d, yyyy")}</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                      onClick={() => setSelectedContract(contract)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {contract.status === 'DRAFT' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleContractAction(contract.id, 'approve')}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-400 hover:bg-red-500/10"
                          onClick={() => {
                            const reason = prompt("Rejection reason:");
                            if (reason) handleContractAction(contract.id, 'reject', reason);
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {contract.canonical_hash && (
                  <div className="mt-3 p-3 bg-gray-800 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span className="text-gray-400">Hash:</span>
                      <code className="text-emerald-400 font-mono">{contract.canonical_hash.slice(0, 16)}...</code>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(contract.canonical_hash);
                        alert("✅ Hash copied!");
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        {/* Escrow Accounts Tab */}
        <TabsContent value="escrow" className="space-y-4">
          {escrowAccounts.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800 p-12 text-center">
              <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No escrow accounts found</p>
            </Card>
          ) : (
            escrowAccounts.map((escrow) => (
              <Card key={escrow.id} className="bg-gray-900 border-gray-800 p-6 hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-white font-semibold">Escrow #{escrow.id.slice(0, 8)}</h4>
                      {getEscrowStatusBadge(escrow.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-3">
                      <div>Booking: {escrow.booking_id?.slice(0, 8)}</div>
                      <div>Amount: ${(escrow.amount_cents / 100).toLocaleString()}</div>
                      <div>Commission: ${((escrow.commission_cents || 0) / 100).toLocaleString()}</div>
                      <div>Payout: ${((escrow.enabler_payout_cents || 0) / 100).toLocaleString()}</div>
                    </div>
                    {escrow.stripe_payment_intent_id && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Stripe PI:</span>
                        <code className="text-blue-400">{escrow.stripe_payment_intent_id}</code>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                      onClick={() => setSelectedEscrow(escrow)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Details
                    </Button>
                    {escrow.status === 'HOLD' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => {
                            const reason = prompt("Release reason:");
                            if (reason) handleEscrowAction(escrow.id, 'release', null, reason);
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Release
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-400 hover:bg-red-500/10"
                          onClick={() => {
                            const reason = prompt("Refund reason:");
                            if (reason) handleEscrowAction(escrow.id, 'refund', null, reason);
                          }}
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Refund
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {escrow.hold_until && (
                  <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2 text-xs">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-300">Auto-release: {format(new Date(escrow.hold_until), "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        {/* Pending Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800 p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <p className="text-gray-400">No pending approvals</p>
            </Card>
          ) : (
            pendingApprovals.map((approval) => (
              <Card key={approval.id} className="bg-gray-900 border-gray-800 p-6 hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-white font-semibold mb-2">
                      Revision #{approval.revision_number} for Contract {approval.contract_id?.slice(0, 8)}
                    </h4>
                    <p className="text-sm text-gray-400 mb-3">{approval.diff_summary}</p>
                    <div className="text-xs text-gray-500">
                      Created: {format(new Date(approval.created_date), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Review
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
