import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, ExternalLink, Copy, Terminal, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DeploymentGuide() {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">🚀 Backend Integration Guide</h1>
        <p className="text-gray-600">Complete implementation guide for external services</p>
      </div>

      {/* Critical Notice */}
      <Alert className="mb-8 bg-amber-50 border-amber-200">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>BACKEND REQUIRED:</strong> The following endpoints must be implemented on your backend server before the app is production-ready.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="docusign" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="docusign">DocuSign Contracts</TabsTrigger>
          <TabsTrigger value="calendar">Google Calendar</TabsTrigger>
          <TabsTrigger value="stripe">Stripe Payments</TabsTrigger>
        </TabsList>

        {/* DocuSign Tab */}
        <TabsContent value="docusign" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <Badge className="bg-orange-500">Required</Badge>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">DocuSign Contract Signing</h2>
                <p className="text-gray-600">Enable digital contract signatures with legal binding</p>
              </div>
            </div>

            <div className="space-y-6 mt-6">
              {/* Setup Steps */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold mb-3">📋 Setup Checklist</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span>Create DocuSign Developer account at <a href="https://developers.docusign.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">developers.docusign.com</a></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span>Create Integration Key (My Apps & Keys)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span>Configure Connect webhooks for envelope events</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span>Implement server endpoints (see below)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span>Test with sample contract</span>
                  </li>
                </ul>
              </div>

              {/* Required Endpoints */}
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Required Backend Endpoints
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-sm font-mono bg-white px-3 py-1 rounded">
                        POST /api/contracts/:id/initiate-signing
                      </code>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard("POST /api/contracts/:id/initiate-signing")}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-700 ml-4">Creates DocuSign envelope and returns signing URL</p>
                    <pre className="mt-2 ml-4 bg-white p-3 rounded text-xs overflow-x-auto">
{`// Example implementation (Node.js + DocuSign SDK)
import docusign from 'docusign-esign';

export async function initiateContractSigning(req, res) {
  const { contract_id } = req.params;
  const { signer_email, signer_name, return_url } = req.body;
  
  // Load contract from database
  const contract = await Contract.find(contract_id);
  
  // Initialize DocuSign API client
  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);
  apiClient.addDefaultHeader(
    'Authorization',
    'Bearer ' + accessToken
  );
  
  // Create envelope definition
  const envelopeDefinition = {
    emailSubject: \`Please sign: \${contract.event_name}\`,
    documents: [{
      documentBase64: await generateContractPDF(contract),
      name: 'Service Agreement',
      fileExtension: 'pdf',
      documentId: '1'
    }],
    recipients: {
      signers: [{
        email: signer_email,
        name: signer_name,
        recipientId: '1',
        tabs: {
          signHereTabs: [{
            documentId: '1',
            pageNumber: '1',
            xPosition: '100',
            yPosition: '150'
          }]
        }
      }]
    },
    status: 'sent'
  };
  
  // Create envelope
  const envelopesApi = new docusign.EnvelopesApi(apiClient);
  const results = await envelopesApi.createEnvelope(
    process.env.DOCUSIGN_ACCOUNT_ID,
    { envelopeDefinition }
  );
  
  // Create recipient view (signing URL)
  const viewRequest = {
    returnUrl: return_url,
    authenticationMethod: 'none',
    email: signer_email,
    userName: signer_name,
    clientUserId: signer_email
  };
  
  const viewResult = await envelopesApi.createRecipientView(
    process.env.DOCUSIGN_ACCOUNT_ID,
    results.envelopeId,
    { recipientViewRequest: viewRequest }
  );
  
  res.json({
    envelope_id: results.envelopeId,
    signing_url: viewResult.url
  });
}`}
                    </pre>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-sm font-mono bg-white px-3 py-1 rounded">
                        POST /api/webhooks/docusign
                      </code>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard("POST /api/webhooks/docusign")}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-700 ml-4">Receives envelope status updates</p>
                    <pre className="mt-2 ml-4 bg-white p-3 rounded text-xs overflow-x-auto">
{`import { handleContractSignatureWebhook } from '@/components/WebhookEndpoints';

export async function docusignWebhook(req, res) {
  // Verify webhook signature
  const isValid = verifyDocuSignSignature(
    req.body,
    req.headers['x-docusign-signature'],
    process.env.DOCUSIGN_WEBHOOK_SECRET
  );
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const { envelopeId, status, recipients } = req.body;
  
  // Find contract by envelope ID
  const contract = await Contract.findOne({
    docusign_envelope_id: envelopeId
  });
  
  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' });
  }
  
  // Process webhook through client-side handler
  const payload = {
    envelope_id: envelopeId,
    envelope_status: status,
    contract_id: contract.id,
    event_type: mapDocuSignEvent(status),
    host_signed_at: recipients.signers[0]?.signedDateTime,
    vendor_signed_at: recipients.signers[1]?.signedDateTime
  };
  
  const result = await handleContractSignatureWebhook(payload, true);
  res.json(result);
}`}
                    </pre>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-sm font-mono bg-white px-3 py-1 rounded">
                        GET /api/contracts/:id/download
                      </code>
                      <Button size="sm" variant="ghost">
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-700 ml-4">Downloads signed contract PDF</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-sm font-mono bg-white px-3 py-1 rounded">
                        POST /api/contracts/:id/resend-email
                      </code>
                      <Button size="sm" variant="ghost">
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-700 ml-4">Resends signing reminder to signer</p>
                  </div>
                </div>
              </div>

              {/* Webhook Configuration */}
              <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                <h3 className="font-bold text-purple-900 mb-4">🔗 Webhook Configuration</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium mb-1">URL:</p>
                    <code className="block bg-white p-2 rounded">
                      https://your-domain.com/api/webhooks/docusign
                    </code>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Events to subscribe:</p>
                    <ul className="list-disc ml-6 space-y-1 text-gray-700">
                      <li>envelope-completed</li>
                      <li>recipient-signed</li>
                      <li>envelope-declined</li>
                      <li>envelope-voided</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Configure at:</p>
                    <p className="text-gray-700">DocuSign Admin → Connect → Add Configuration</p>
                  </div>
                </div>
              </div>

              {/* Testing Checklist */}
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <h3 className="font-bold text-green-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Testing Checklist
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Create contract through UI</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Initiate signing flow successfully</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Complete signing (host signs)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Webhook updates contract status to "active"</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Download signed PDF successfully</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Email notifications sent</span>
                  </label>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <Badge className="bg-blue-500">Required</Badge>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">Google Calendar OAuth & Sync</h2>
                <p className="text-gray-600">Enable calendar synchronization to prevent double bookings</p>
              </div>
            </div>

            <div className="space-y-6 mt-6">
              {/* Setup Steps */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold mb-3">📋 Setup Checklist</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span>Create project at <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span>Enable Google Calendar API</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span>Create OAuth 2.0 credentials</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span>Add authorized redirect URI</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <input type="checkbox" className="rounded" />
                    <span>Implement OAuth flow (see below)</span>
                  </li>
                </ul>
              </div>

              {/* OAuth Flow Implementation */}
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  OAuth 2.0 Implementation
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-sm font-mono bg-white px-3 py-1 rounded">
                        POST /api/calendar/google/oauth/init
                      </code>
                      <Button size="sm" variant="ghost">
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <pre className="mt-2 bg-white p-3 rounded text-xs overflow-x-auto">
{`import { google } from 'googleapis';

export async function initiateOAuth(req, res) {
  const { enabler_id, redirect_uri } = req.body;
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    redirect_uri
  );
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    state: enabler_id // Pass enabler ID in state
  });
  
  res.json({ auth_url: authUrl });
}`}
                    </pre>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-sm font-mono bg-white px-3 py-1 rounded">
                        POST /api/calendar/google/oauth/callback
                      </code>
                      <Button size="sm" variant="ghost">
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <pre className="mt-2 bg-white p-3 rounded text-xs overflow-x-auto">
{`export async function handleOAuthCallback(req, res) {
  const { code, state: enabler_id } = req.body;
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    \`\${process.env.APP_URL}/calendar-oauth-callback\`
  );
  
  // Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code);
  
  // Store refresh token encrypted in database
  await CalendarConnection.create({
    enabler_id,
    provider: 'google',
    refresh_token: encrypt(tokens.refresh_token),
    access_token: encrypt(tokens.access_token),
    expires_at: new Date(tokens.expiry_date)
  });
  
  res.json({ success: true });
}`}
                    </pre>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-sm font-mono bg-white px-3 py-1 rounded">
                        POST /api/calendar/google/sync
                      </code>
                      <Button size="sm" variant="ghost">
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <pre className="mt-2 bg-white p-3 rounded text-xs overflow-x-auto">
{`export async function syncCalendar(req, res) {
  const { enabler_id } = req.body;
  
  // Load connection
  const connection = await CalendarConnection.findOne({ enabler_id });
  
  // Refresh access token if needed
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: decrypt(connection.access_token),
    refresh_token: decrypt(connection.refresh_token)
  });
  
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  // Fetch events
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 100,
    singleEvents: true,
    orderBy: 'startTime'
  });
  
  const events = response.data.items.map(event => ({
    id: event.id,
    summary: event.summary,
    description: event.description,
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
    location: event.location,
    all_day: !event.start.dateTime
  }));
  
  res.json({ events, synced_count: events.length });
}`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Environment Variables */}
              <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                <h3 className="font-bold text-purple-900 mb-4">🔑 Environment Variables</h3>
                <div className="space-y-2">
                  <code className="block bg-white p-2 rounded text-xs">
                    GOOGLE_CALENDAR_CLIENT_ID=...apps.googleusercontent.com
                  </code>
                  <code className="block bg-white p-2 rounded text-xs">
                    GOOGLE_CALENDAR_CLIENT_SECRET=...
                  </code>
                  <code className="block bg-white p-2 rounded text-xs">
                    APP_URL=https://your-domain.com
                  </code>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Stripe Tab - Reference to existing guide */}
        <TabsContent value="stripe">
          <Card className="p-6">
            <p className="text-gray-600">
              Stripe implementation guide already provided in previous deliverables.
              See <code className="bg-gray-100 px-2 py-1 rounded">pages/DeploymentSetup.jsx</code> for complete Stripe integration guide.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}