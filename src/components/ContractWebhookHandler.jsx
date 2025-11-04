/**
 * Contract Webhook Handler
 * Processes contract signature events from DocuSign
 * 
 * CONFIGURATION REQUIRED:
 * This handler requires backend webhook endpoints to verify signatures
 * Configure webhook secret through backend environment variables
 * 
 * Backend endpoint example: POST /api/webhooks/contract-signature
 */

import { Contract, Reservation, ReservationAuditLog } from "@/api/entities";
import IdempotencyService from "./IdempotencyService";
import ReservationService from "./ReservationService";

class ContractWebhookHandler {
  /**
   * Process contract signature webhook event
   * Should be called by backend after signature verification
   */
  async processWebhook(payload, verified = false) {
    if (!verified) {
      console.error("Webhook signature not verified");
      return { success: false, error: "Signature verification required" };
    }

    const idempotencyKey = `contract_${payload.envelope_id}_${payload.event_type}`;

    return await IdempotencyService.executeIdempotent(idempotencyKey, async () => {
      try {
        const { 
          envelope_id, 
          event_type, 
          contract_id,
          signer_email,
          signed_at 
        } = payload;

        console.log(`Processing contract webhook: ${event_type} for envelope ${envelope_id}`);

        switch (event_type) {
          case "envelope-completed":
            return await this.handleEnvelopeCompleted(contract_id, envelope_id, payload);
            
          case "recipient-signed":
            return await this.handleRecipientSigned(contract_id, signer_email, signed_at);
            
          case "envelope-declined":
            return await this.handleEnvelopeDeclined(contract_id, envelope_id);
            
          case "envelope-voided":
            return await this.handleEnvelopeVoided(contract_id, envelope_id);
            
          default:
            console.log(`Unhandled event type: ${event_type}`);
            return { success: true, message: "Event ignored" };
        }
      } catch (error) {
        console.error("Error processing contract webhook:", error);
        return { success: false, error: error.message };
      }
    });
  }

  /**
   * Handle completed envelope (all signatures collected)
   */
  async handleEnvelopeCompleted(contractId, envelopeId, payload) {
    try {
      const contracts = await Contract.filter({ id: contractId });
      if (!contracts[0]) {
        throw new Error("Contract not found");
      }

      const contract = contracts[0];

      // Update contract status
      await Contract.update(contractId, {
        status: "active",
        signatures: {
          vendor_signed: true,
          vendor_signed_at: payload.vendor_signed_at || new Date().toISOString(),
          host_signed: true,
          host_signed_at: payload.host_signed_at || new Date().toISOString()
        }
      });

      // Find associated reservation
      const reservations = await Reservation.filter({ contract_id: contractId });
      
      if (reservations[0]) {
        const reservation = reservations[0];

        // Confirm reservation via ReservationService
        const result = await ReservationService.handleContractSigned({
          reservation_id: reservation.id,
          hold_token: reservation.hold_token,
          signature_id: envelopeId,
          idempotency_key: `contract_signed_${contractId}`
        });

        if (result.success) {
          console.log(`✅ Contract ${contractId} completed and reservation confirmed`);
          return { 
            success: true, 
            contract_id: contractId,
            reservation_id: reservation.id 
          };
        } else {
          throw new Error(`Failed to confirm reservation: ${result.error}`);
        }
      }

      return { success: true, contract_id: contractId };

    } catch (error) {
      console.error("Error handling envelope completed:", error);
      throw error;
    }
  }

  /**
   * Handle individual signer completion
   */
  async handleRecipientSigned(contractId, signerEmail, signedAt) {
    try {
      const contracts = await Contract.filter({ id: contractId });
      if (!contracts[0]) {
        throw new Error("Contract not found");
      }

      const contract = contracts[0];
      const updates = { signatures: { ...contract.signatures } };

      // Determine which party signed based on email
      if (signerEmail === contract.parties.host.contact_email) {
        updates.signatures.host_signed = true;
        updates.signatures.host_signed_at = signedAt;
      } else if (signerEmail === contract.parties.vendor.contact_email) {
        updates.signatures.vendor_signed = true;
        updates.signatures.vendor_signed_at = signedAt;
      }

      await Contract.update(contractId, updates);

      console.log(`📝 ${signerEmail} signed contract ${contractId}`);
      return { success: true, contract_id: contractId };

    } catch (error) {
      console.error("Error handling recipient signed:", error);
      throw error;
    }
  }

  /**
   * Handle declined envelope
   */
  async handleEnvelopeDeclined(contractId, envelopeId) {
    try {
      await Contract.update(contractId, {
        status: "cancelled"
      });

      // Expire associated reservations
      const reservations = await Reservation.filter({ contract_id: contractId });
      for (const reservation of reservations) {
        await ReservationService.expireHold(reservation.id);
        
        await ReservationAuditLog.create({
          reservation_id: reservation.id,
          action: "CONTRACT_DECLINED",
          status_before: "HOLD",
          status_after: "EXPIRED",
          actor: "DOCUSIGN_WEBHOOK",
          details: { envelope_id: envelopeId }
        });
      }

      console.log(`❌ Contract ${contractId} declined`);
      return { success: true, contract_id: contractId };

    } catch (error) {
      console.error("Error handling envelope declined:", error);
      throw error;
    }
  }

  /**
   * Handle voided envelope
   */
  async handleEnvelopeVoided(contractId, envelopeId) {
    try {
      await Contract.update(contractId, {
        status: "cancelled"
      });

      // Expire associated reservations
      const reservations = await Reservation.filter({ contract_id: contractId });
      for (const reservation of reservations) {
        await ReservationService.expireHold(reservation.id);
        
        await ReservationAuditLog.create({
          reservation_id: reservation.id,
          action: "CONTRACT_VOIDED",
          status_before: "HOLD",
          status_after: "EXPIRED",
          actor: "DOCUSIGN_WEBHOOK",
          details: { envelope_id: envelopeId }
        });
      }

      console.log(`🚫 Contract ${contractId} voided`);
      return { success: true, contract_id: contractId };

    } catch (error) {
      console.error("Error handling envelope voided:", error);
      throw error;
    }
  }
}

export default new ContractWebhookHandler();