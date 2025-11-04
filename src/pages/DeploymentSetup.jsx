import React from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Server, 
  Calendar, 
  CreditCard, 
  FileText, 
  AlertTriangle,
  CheckCircle2,
  Code,
  Database,
  Shield
} from "lucide-react";
import BlinkLogo from "../components/BlinkLogo";

export default function DeploymentSetup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BlinkLogo size="lg" />
            <h1 className="text-4xl font-bold">Production Deployment Guide</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Complete setup guide for background jobs, webhooks, and external integrations
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="jobs">Background Jobs</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Server className="w-6 h-6" />
                Architecture Overview
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Blink uses a <strong>serverless architecture</strong> with external schedulers and webhook endpoints 
                  for background processing. All sensitive operations are handled server-side.
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-bold text-blue-900 mb-2">⚠️ CRITICAL: Server-Side Requirements</h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li>• All API endpoints must be deployed as serverless functions or backend routes</li>
                    <li>• Never expose API keys or secrets in client-side code</li>
                    <li>• Webhook endpoints must validate signatures server-side</li>
                    <li>• Background jobs must be triggered by external schedulers</li>
                  </ul>
                </div>

                <h3 className="font-bold text-lg mt-6">Required Server-Side Endpoints:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="font-mono text-sm text-gray-800">POST /api/jobs/expire-reservations</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="font-mono text-sm text-gray-800">POST /api/jobs/sync-calendars</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="font-mono text-sm text-gray-800">POST /api/webhooks/stripe</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="font-mono text-sm text-gray-800">POST /api/webhooks/docusign</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="font-mono text-sm text-gray-800">POST /api/payment/create-intent</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="font-mono text-sm text-gray-800">GET /api/calendar/oauth/url</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Background Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Background Jobs Setup</h2>
              
              <Alert className="mb-6 bg-yellow-50 border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-800" />
                <AlertDescription className="text-yellow-800">
                  Jobs must be implemented as <strong>server-side API routes</strong> and triggered by external schedulers.
                  The provided code in pages/JobsApi.jsx is reference implementation only.
                </AlertDescription>
              </Alert>

              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg mb-3">Required Jobs:</h3>
                  <div className="space-y-3">
                    <JobCard
                      name="expire-reservations"
                      schedule="Every 1 minute"
                      description="Expires holds older than 20 minutes, notifies waitlist"
                    />
                    <JobCard
                      name="sync-calendars"
                      schedule="Every 5 minutes"
                      description="Syncs Google Calendar events for all connected enablers"
                    />
                    <JobCard
                      name="send-reminders"
                      schedule="Every 1 hour"
                      description="Sends event reminders 24 hours before events"
                    />
                    <JobCard
                      name="cleanup-old-data"
                      schedule="Daily at 2 AM"
                      description="Archives old logs and expired idempotency records"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-3">Scheduler Options:</h3>
                  <Tabs defaultValue="vercel" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="vercel">Vercel Cron</TabsTrigger>
                      <TabsTrigger value="github">GitHub Actions</TabsTrigger>
                      <TabsTrigger value="cronjob">cron-job.org</TabsTrigger>
                      <TabsTrigger value="heroku">Heroku</TabsTrigger>
                    </TabsList>

                    <TabsContent value="vercel" className="space-y-3">
                      <p className="text-sm text-gray-700">Create <code className="bg-gray-100 px-2 py-1 rounded">vercel.json</code> in project root:</p>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
{`{
  "crons": [
    {
      "path": "/api/jobs/expire-reservations",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/jobs/sync-calendars",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/jobs/send-reminders",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/jobs/cleanup-old-data",
      "schedule": "0 2 * * *"
    }
  ]
}`}
                      </pre>
                      <p className="text-sm text-gray-600">Deploy with: <code className="bg-gray-100 px-2 py-1 rounded">vercel --prod</code></p>
                    </TabsContent>

                    <TabsContent value="github" className="space-y-3">
                      <p className="text-sm text-gray-700">Create <code className="bg-gray-100 px-2 py-1 rounded">.github/workflows/background-jobs.yml</code>:</p>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
{`name: Background Jobs
on:
  schedule:
    - cron: '* * * * *'  # Expire reservations
    - cron: '*/5 * * * *'  # Sync calendars
  workflow_dispatch:

jobs:
  trigger-job:
    runs-on: ubuntu-latest
    steps:
      - name: Call API
        run: |
          curl -X POST \${{ secrets.APP_URL }}/api/jobs/expire-reservations \\
            -H "Authorization: Bearer \${{ secrets.CRON_SECRET }}"`}
                      </pre>
                      <p className="text-sm text-gray-600">Add secrets: APP_URL and CRON_SECRET to GitHub repository</p>
                    </TabsContent>

                    <TabsContent value="cronjob" className="space-y-3">
                      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                        <li>Sign up at <a href="https://cron-job.org" target="_blank" className="text-blue-600 underline">cron-job.org</a></li>
                        <li>Create job: "Blink - Expire Reservations"</li>
                        <li>URL: <code className="bg-gray-100 px-2 py-1 rounded">https://your-app.com/api/jobs/expire-reservations</code></li>
                        <li>Schedule: Every 1 minute, Method: POST</li>
                        <li>Add header: <code className="bg-gray-100 px-2 py-1 rounded">Authorization: Bearer YOUR_SECRET</code></li>
                        <li>Repeat for other jobs with appropriate schedules</li>
                      </ol>
                    </TabsContent>

                    <TabsContent value="heroku" className="space-y-3">
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
{`# Install scheduler addon
heroku addons:create scheduler:standard

# Open scheduler dashboard
heroku addons:open scheduler

# Add job:
curl -X POST https://your-app.herokuapp.com/api/jobs/expire-reservations`}
                      </pre>
                      <p className="text-sm text-gray-600">Configure frequency via Heroku dashboard</p>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Webhook Configuration</h2>

              <Alert className="mb-6 bg-red-50 border-red-200">
                <Shield className="h-4 w-4 text-red-800" />
                <AlertDescription className="text-red-800">
                  <strong>CRITICAL SECURITY:</strong> Webhooks MUST verify signatures server-side using provider libraries.
                  Never trust webhook payloads without validation.
                </AlertDescription>
              </Alert>

              <div className="space-y-6">
                {/* Stripe */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-lg">Stripe Payment Webhooks</h3>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-semibold mb-1">Endpoint:</p>
                      <code className="bg-gray-100 px-2 py-1 rounded">POST /api/webhooks/stripe</code>
                    </div>

                    <div>
                      <p className="font-semibold mb-1">Events to Subscribe:</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li><code>payment_intent.succeeded</code> - Payment captured successfully</li>
                        <li><code>payment_intent.payment_failed</code> - Payment declined</li>
                        <li><code>charge.refunded</code> - Refund issued</li>
                      </ul>
                    </div>

                    <div>
                      <p className="font-semibold mb-1">Setup:</p>
                      <ol className="list-decimal list-inside space-y-1 text-gray-700">
                        <li>Go to Stripe Dashboard → Developers → Webhooks</li>
                        <li>Add endpoint: <code>https://your-app.com/api/webhooks/stripe</code></li>
                        <li>Select events above</li>
                        <li>Copy webhook signing secret to env: <code>STRIPE_WEBHOOK_SECRET</code></li>
                      </ol>
                    </div>

                    <div className="bg-gray-900 text-gray-100 p-3 rounded mt-2">
                      <p className="text-xs mb-2">Server-side signature verification (Node.js):</p>
                      <pre className="text-xs overflow-x-auto">
{`const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/webhooks/stripe', (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send('Invalid signature');
  }
  
  // Process event...
  res.json({received: true});
});`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* DocuSign */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-lg">DocuSign Contract Webhooks</h3>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-semibold mb-1">Endpoint:</p>
                      <code className="bg-gray-100 px-2 py-1 rounded">POST /api/webhooks/docusign</code>
                    </div>

                    <div>
                      <p className="font-semibold mb-1">Events to Subscribe:</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li><code>envelope-completed</code> - All parties signed</li>
                        <li><code>recipient-signed</code> - One party signed</li>
                        <li><code>envelope-declined</code> - Contract declined</li>
                        <li><code>envelope-voided</code> - Contract cancelled</li>
                      </ul>
                    </div>

                    <div>
                      <p className="font-semibold mb-1">Setup:</p>
                      <ol className="list-decimal list-inside space-y-1 text-gray-700">
                        <li>Go to DocuSign Admin → Connect</li>
                        <li>Create new configuration</li>
                        <li>URL: <code>https://your-app.com/api/webhooks/docusign</code></li>
                        <li>Configure HMAC secret</li>
                        <li>Select events above</li>
                      </ol>
                    </div>

                    <div className="bg-gray-900 text-gray-100 p-3 rounded mt-2">
                      <p className="text-xs mb-2">Server-side HMAC verification:</p>
                      <pre className="text-xs overflow-x-auto">
{`const crypto = require('crypto');

app.post('/api/webhooks/docusign', (req, res) => {
  const signature = req.headers['x-docusign-signature-1'];
  const hmac = crypto.createHmac('sha256', process.env.DOCUSIGN_HMAC_KEY);
  hmac.update(JSON.stringify(req.body));
  const computedSig = hmac.digest('base64');
  
  if (signature !== computedSig) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook...
  res.json({received: true});
});`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Google Calendar */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <h3 className="font-bold text-lg">Google Calendar Push Notifications</h3>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-semibold mb-1">Endpoint:</p>
                      <code className="bg-gray-100 px-2 py-1 rounded">POST /api/webhooks/google-calendar</code>
                    </div>

                    <p className="text-gray-700">
                      Google Calendar push notifications are set up automatically during calendar sync setup.
                      Your server creates a "watch" channel that Google will notify when calendars change.
                    </p>

                    <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                      <p className="text-blue-900 text-xs">
                        <strong>Note:</strong> Channels expire after 7 days and must be renewed.
                        Implement auto-renewal in your sync-calendars background job.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">External Integrations Setup</h2>

              <div className="space-y-6">
                <IntegrationCard
                  name="Stripe"
                  icon={<CreditCard className="w-6 h-6" />}
                  description="Payment processing for booking deposits and final payments"
                  envVars={["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"]}
                  setupSteps={[
                    "Sign up at stripe.com",
                    "Get API keys from Dashboard → Developers → API keys",
                    "Use test keys for development (sk_test_...)",
                    "Configure webhooks (see Webhooks tab)",
                    "Add to server environment variables"
                  ]}
                />

                <IntegrationCard
                  name="DocuSign"
                  icon={<FileText className="w-6 h-6" />}
                  description="Electronic signature for contracts between hosts and enablers"
                  envVars={["DOCUSIGN_CLIENT_ID", "DOCUSIGN_CLIENT_SECRET", "DOCUSIGN_ACCOUNT_ID", "DOCUSIGN_HMAC_KEY"]}
                  setupSteps={[
                    "Create DocuSign developer account",
                    "Create new integration (OAuth 2.0)",
                    "Generate OAuth credentials",
                    "Configure redirect URIs",
                    "Set up Connect webhooks (see Webhooks tab)"
                  ]}
                />

                <IntegrationCard
                  name="Google Calendar"
                  icon={<Calendar className="w-6 h-6" />}
                  description="Calendar sync for enabler availability management"
                  envVars={["GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET", "GOOGLE_CALENDAR_REDIRECT_URI"]}
                  setupSteps={[
                    "Go to Google Cloud Console",
                    "Create new project or select existing",
                    "Enable Google Calendar API",
                    "Create OAuth 2.0 credentials (Web application)",
                    "Add authorized redirect URIs",
                    "Configure consent screen"
                  ]}
                />

                <IntegrationCard
                  name="SendGrid (Optional)"
                  icon={<Server className="w-6 h-6" />}
                  description="Email notifications for bookings, reminders, and alerts"
                  envVars={["SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL"]}
                  setupSteps={[
                    "Sign up at sendgrid.com",
                    "Verify sender email address",
                    "Generate API key",
                    "Add to server environment",
                    "Test with sample email"
                  ]}
                />
              </div>
            </Card>
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Monitoring & Alerts</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-lg mb-3">Built-in Dashboards:</h3>
                  <div className="space-y-2">
                    <DashboardLink
                      path="/jobs-dashboard"
                      name="Jobs Dashboard"
                      description="Monitor background job execution, success rates, and errors"
                    />
                    <DashboardLink
                      path="/admin-dashboard"
                      name="Admin Dashboard"
                      description="System-wide stats, recent activity, and error logs"
                    />
                    <DashboardLink
                      path="/system-analysis"
                      name="System Analysis"
                      description="Production readiness score and detailed health checks"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-3">Environment Variables:</h3>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`# Authentication
CRON_SECRET=your-random-secret-token

# Monitoring & Alerts
ADMIN_EMAIL=admin@yourdomain.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Job Configuration
RESERVATION_EXPIRY_MINUTES=20
CALENDAR_SYNC_BATCH_SIZE=10
DATA_RETENTION_DAYS=90

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# DocuSign
DOCUSIGN_CLIENT_ID=your-client-id
DOCUSIGN_CLIENT_SECRET=your-client-secret
DOCUSIGN_ACCOUNT_ID=your-account-id

# Google Calendar
GOOGLE_CALENDAR_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=your-client-secret
GOOGLE_CALENDAR_REDIRECT_URI=https://your-app.com/api/calendar/oauth/callback

# SendGrid (Optional)
SENDGRID_API_KEY=SG.your-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com`}
                  </pre>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-bold text-yellow-900 mb-2">🔐 Security Best Practices:</h3>
                  <ul className="space-y-1 text-sm text-yellow-800">
                    <li>• Never commit .env files to git</li>
                    <li>• Use different keys for development and production</li>
                    <li>• Rotate secrets regularly</li>
                    <li>• Use environment-specific configuration</li>
                    <li>• Enable 2FA on all service accounts</li>
                    <li>• Monitor webhook endpoints for suspicious activity</li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Production Checklist */}
        <Card className="p-6 mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-blue-600" />
            Production Deployment Checklist
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChecklistItem text="All API endpoints deployed server-side" />
            <ChecklistItem text="Background jobs scheduler configured" />
            <ChecklistItem text="Stripe webhooks registered" />
            <ChecklistItem text="DocuSign webhooks configured" />
            <ChecklistItem text="Google Calendar OAuth set up" />
            <ChecklistItem text="All environment variables set" />
            <ChecklistItem text="SSL certificate installed" />
            <ChecklistItem text="Monitoring dashboards accessible" />
            <ChecklistItem text="Email/Slack alerts configured" />
            <ChecklistItem text="Backup strategy implemented" />
            <ChecklistItem text="Error logging enabled" />
            <ChecklistItem text="Rate limiting configured" />
          </div>
        </Card>
      </div>
    </div>
  );
}

// Helper Components
function JobCard({ name, schedule, description }) {
  return (
    <div className="bg-gray-50 p-4 rounded border">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-mono text-sm font-bold">{name}</h4>
        <Badge variant="outline" className="text-xs">{schedule}</Badge>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function IntegrationCard({ name, icon, description, envVars, setupSteps }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <h3 className="font-bold text-lg">{name}</h3>
      </div>
      <p className="text-sm text-gray-700 mb-3">{description}</p>
      
      <div className="mb-3">
        <p className="font-semibold text-sm mb-2">Environment Variables:</p>
        <div className="flex flex-wrap gap-2">
          {envVars.map(env => (
            <code key={env} className="bg-gray-100 px-2 py-1 rounded text-xs">{env}</code>
          ))}
        </div>
      </div>

      <div>
        <p className="font-semibold text-sm mb-2">Setup Steps:</p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          {setupSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function DashboardLink({ path, name, description }) {
  return (
    <a 
      href={path} 
      className="block bg-gray-50 hover:bg-gray-100 p-3 rounded border transition-colors"
    >
      <p className="font-mono text-sm font-bold text-blue-600">{path}</p>
      <p className="text-sm font-semibold">{name}</p>
      <p className="text-xs text-gray-600">{description}</p>
    </a>
  );
}

function ChecklistItem({ text }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 rounded border-2 border-blue-600 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-3 h-3 text-blue-600" />
      </div>
      <span className="text-sm">{text}</span>
    </div>
  );
}