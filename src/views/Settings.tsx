import { useState, useEffect } from 'react';
import { Link as LinkIcon, Mail, Trash2, Save, XCircle, Loader, CreditCard, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { updateAccount } from '../services/firestore.ts';
import { authorizeGmailAccess, isGmailAuthorized, fetchUniqueSenderDomains, fetchEmailsFromDomain, fetchRecentEmails, markEmailAsRead } from '../services/gmailService.ts';
import DomainSearchDropdown from '../components/DomainSearchDropdown.tsx';
import { processEmailTransaction } from '../services/emailParser.ts';

export default function Settings() {
  const { accounts } = useStore();
  const uid = useAuth();
  const [emailDomains, setEmailDomains] = useState<Record<string, string>>(
    accounts.reduce((acc, account) => {
      if (account.email_domain) {
        acc[account.id] = account.email_domain;
      }
      return acc;
    }, {} as Record<string, string>)
  );
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [tempDomain, setTempDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if Gmail is already authorized on mount
  useEffect(() => {
    const checkAuthorization = async () => {
      setCheckingAuth(true);
      const authorized = await isGmailAuthorized();
      setGmailConnected(authorized);
      setCheckingAuth(false);
    };
    checkAuthorization();
  }, []);

  const handleStartEdit = (accountId: string, currentDomain?: string) => {
    setEditingAccountId(accountId);
    setTempDomain(currentDomain || '');
    setError(null);
  };

  const handleSave = async (accountId: string) => {
    if (!uid) {
      setError('You must be logged in');
      return;
    }

    const domain = tempDomain.trim();
    if (!domain) {
      setError('Email domain cannot be empty');
      return;
    }

    // Basic email domain validation
    const emailDomainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailDomainRegex.test(domain)) {
      setError('Please enter a valid email domain (e.g., chase.com, bankofamerica.com)');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateAccount(uid, accountId, { email_domain: domain });
      setEmailDomains({ ...emailDomains, [accountId]: domain });
      setEditingAccountId(null);
      setTempDomain('');
    } catch (err) {
      console.error('Error updating email domain:', err);
      setError('Failed to save email domain. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (accountId: string) => {
    if (!uid) {
      setError('You must be logged in');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateAccount(uid, accountId, { email_domain: null });
      const newDomains = { ...emailDomains };
      delete newDomains[accountId];
      setEmailDomains(newDomains);
    } catch (err) {
      console.error('Error removing email domain:', err);
      setError('Failed to remove email domain. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingAccountId(null);
    setTempDomain('');
    setError(null);
  };

  const handleAuthorizeGmail = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    setError(null);

    try {
      const result = await authorizeGmailAccess();
      setGmailConnected(result.success);
      setConnectionStatus({
        success: result.success,
        message: result.message,
      });
    } catch (err) {
      setGmailConnected(false);
      setConnectionStatus({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to authorize Gmail',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleFetchEmails = async () => {
    if (!uid) {
      setError('You must be logged in');
      return;
    }

    setTestingConnection(true);
    setError(null);

    try {
      // Get all linked domains from accounts
      const linkedDomains = accounts
        .map(account => account.email_domain)
        .filter((domain): domain is string => !!domain);

      if (linkedDomains.length === 0) {
        setConnectionStatus({
          success: false,
          message: 'No email domains linked to accounts. Please link at least one domain first.',
        });
        setTestingConnection(false);
        return;
      }

      console.log(`📧 Starting email sync from ${linkedDomains.length} linked domain(s): ${JSON.stringify(linkedDomains)}`);

      // Fetch emails from all linked domains
      const emailPromises = linkedDomains.map(domain =>
        fetchEmailsFromDomain(domain, 50)
      );

      const emailArrays = await Promise.all(emailPromises);
      const emails = emailArrays.flat();

      if (emails.length === 0) {
        setConnectionStatus({
          success: true,
          message: 'No unread emails found from linked domains',
        });
        setTestingConnection(false);
        return;
      }

      console.log(`📧 Found ${emails.length} unread email(s) from linked domains. Processing...`);

      // Process each email
      let imported = 0;
      let skipped = 0;

      for (const email of emails) {
        console.log(`\n📧 Processing email from "${email.from}"`);
        console.log(`   Subject: "${email.subject}"`);

        const result = await processEmailTransaction(uid, email, accounts);

        if (result.success) {
          imported++;
          console.log(`   ✅ SUCCESS: Transaction imported (ID: ${result.transactionId})`);

          // Mark email as read after successful import
          if (email.messageId) {
            try {
              await markEmailAsRead(email.messageId);
              console.log(`   📬 Marked as read`);
            } catch (err) {
              console.warn(`   ⚠️ Failed to mark as read:`, err);
            }
          }
        } else {
          skipped++;
          console.log(`   ❌ SKIPPED: ${result.error}`);
        }
      }

      console.log(`\n📊 Email sync complete:`);
      console.log(`   Total processed: ${emails.length}`);
      console.log(`   Successfully imported: ${imported}`);
      console.log(`   Skipped: ${skipped}`);

      setConnectionStatus({
        success: true,
        message: `Scanned ${emails.length} unread email(s) from ${linkedDomains.length} domain(s): ${imported} imported, ${skipped} skipped`,
      });
    } catch (err) {
      console.error('❌ Email sync failed:', err);
      setConnectionStatus({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to fetch emails',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 pt-8 pb-24">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-blue-100 mt-1">Manage email alerts and integrations</p>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 mt-6 pb-6 space-y-6">
        {/* Gmail Connection Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Gmail Connection</h2>
                  <p className="text-sm text-gray-600">Connect your Gmail inbox to automatically import bank emails</p>
                </div>
              </div>
              {gmailConnected && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">Connected</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Connection Status */}
            {connectionStatus && (
              <div className={`p-4 rounded-xl border ${
                connectionStatus.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  {connectionStatus.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <p className={`text-sm font-medium ${
                    connectionStatus.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {connectionStatus.message}
                  </p>
                </div>
              </div>
            )}

            {/* Connection Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="text-sm text-blue-900">
                {!gmailConnected ? (
                  <>
                    <p className="font-semibold mb-2">Setup Instructions:</p>
                    <ol className="list-decimal list-inside space-y-2 text-blue-800">
                      <li>Click "Authorize Gmail" to grant one-time access</li>
                      <li>Grant permission to read your emails (read-only access)</li>
                      <li>Your authorization will be saved - you won't need to sign in again</li>
                      <li>Link bank email domains to your accounts below</li>
                    </ol>
                  </>
                ) : (
                  <>
                    <p className="font-semibold mb-2">✅ Gmail is authorized!</p>
                    <p className="text-blue-800">
                      Your Gmail access is saved. You can now sync emails anytime without re-authorizing.
                      Use "Test Connection" to verify it's still working.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {!gmailConnected ? (
                <button
                  onClick={handleAuthorizeGmail}
                  disabled={testingConnection || checkingAuth}
                  className="flex-1 px-4 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                >
                  {testingConnection || checkingAuth ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      {checkingAuth ? 'Checking...' : 'Authorizing...'}
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Authorize Gmail
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleFetchEmails}
                  disabled={testingConnection}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                >
                  {testingConnection ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Sync Emails
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Email Domain Linking Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Section Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Email Domain Linking</h2>
                <p className="text-sm text-gray-600">Link bank email domains to accounts for automatic transaction imports</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-6 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Info Box */}
          <div className="mx-6 mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex gap-3">
              <LinkIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Click "Find Domains" to search your recent emails for bank sender domains</li>
                  <li>Link your bank's email domain (e.g., alerts.chase.com, scotiabank.com) to an account</li>
                  <li>Email sync fetches <strong>unread emails from linked domains only</strong></li>
                  <li>Successfully imported transactions are marked as read</li>
                  <li>Failed imports remain unread for retry</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Account List */}
          <div className="p-6 space-y-4">
            {accounts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No accounts found. Create an account first.</p>
              </div>
            ) : (
              accounts.map((account) => {
                const isEditing = editingAccountId === account.id;
                const currentDomain = emailDomains[account.id];
                const hasLinkedDomain = !isEditing && currentDomain;

                return (
                  <div
                    key={account.id}
                    className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Account Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-sm">
                              {account.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{account.name}</h3>
                            <p className="text-xs text-gray-500 capitalize">{account.type}</p>
                          </div>
                        </div>

                        {/* Email Domain Input or Display */}
                        {isEditing ? (
                          <div className="mt-3 space-y-3">
                            <div>
                              <label className="text-sm font-semibold text-gray-700 ml-1 mb-1.5 block">
                                Email Domain
                              </label>
                              <DomainSearchDropdown
                                value={tempDomain}
                                onChange={setTempDomain}
                                onSearchDomains={fetchUniqueSenderDomains}
                                disabled={saving}
                                placeholder="Search or type email domain (e.g., alerts.chase.com)"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSave(account.id)}
                                disabled={saving || !tempDomain.trim()}
                                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                <Save className="w-4 h-4" />
                                {saving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={handleCancel}
                                disabled={saving}
                                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : hasLinkedDomain ? (
                          <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                            <Mail className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-900">{currentDomain}</span>
                          </div>
                        ) : (
                          <div className="mt-3 text-sm text-gray-500 italic">
                            No email domain linked
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {!isEditing && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStartEdit(account.id, currentDomain)}
                            disabled={saving}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                          >
                            <LinkIcon className="w-4 h-4" />
                            {hasLinkedDomain ? 'Edit' : 'Link'}
                          </button>
                          {hasLinkedDomain && (
                            <button
                              onClick={() => handleRemove(account.id)}
                              disabled={saving}
                              className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
