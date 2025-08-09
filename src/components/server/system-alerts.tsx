import { getSystemAlerts } from "@/lib/actions/dashboard-actions";
import { AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";

interface SystemError {
  id: string;
  action: string;
  resource: string;
  createdAt: string;
}

interface FailedLogin {
  id: string;
  action: string;
  ipAddress?: string | null;
  createdAt: string;
}

interface SystemHealth {
  status: string;
  message?: string;
}

interface AlertsData {
  recentErrors?: SystemError[];
  failedLogins?: FailedLogin[];
  systemHealth?: SystemHealth;
}

interface SystemAlertsProps {
  alerts?: AlertsData;
}

export async function SystemAlerts({ alerts }: SystemAlertsProps = {}) {
  let alertsData = alerts;

  if (!alertsData) {
    const alertsResult = await getSystemAlerts();
    if (alertsResult.success && alertsResult.data) {
      // Transform the data to match the expected interface
      alertsData = {
        recentErrors: alertsResult.data.recentErrors?.map((error) => ({
          id: error.id,
          action: error.action,
          resource: error.resource,
          createdAt: error.createdAt.toISOString(),
        })),
        failedLogins: alertsResult.data.failedLogins?.map((login) => ({
          id: login.id,
          action: login.action,
          ipAddress: login.ipAddress,
          createdAt: login.createdAt.toISOString(),
        })),
        systemHealth: alertsResult.data.systemHealth,
      };
    }
  }

  if (!alertsData || (!alertsData.recentErrors && !alertsData.failedLogins)) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
          <span className="text-yellow-800">Unable to load system alerts</span>
        </div>
      </div>
    );
  }

  const { recentErrors = [], failedLogins = [], systemHealth } = alertsData;
  const totalIssues = recentErrors.length + failedLogins.length;

  if (totalIssues === 0 && systemHealth?.status === "healthy") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-green-800">All systems operational</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Recent Errors */}
      {recentErrors.map((error: SystemError, index: number) => (
        <div
          key={`error-${index}`}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium mb-1 text-red-800">System Error</h4>
              <p className="text-sm text-red-700">Action: {error.action}</p>
              <p className="text-sm text-red-700">Resource: {error.resource}</p>
              <p className="text-xs mt-2 text-red-600">
                {new Date(error.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Failed Logins */}
      {failedLogins.map((login: FailedLogin, index: number) => (
        <div
          key={`login-${index}`}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
        >
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium mb-1 text-yellow-800">Failed Login</h4>
              <p className="text-sm text-yellow-700">Action: {login.action}</p>
              {login.ipAddress && (
                <p className="text-sm text-yellow-700">IP: {login.ipAddress}</p>
              )}
              <p className="text-xs mt-2 text-yellow-600">
                {new Date(login.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* System Health Warning */}
      {systemHealth?.status !== "healthy" && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-orange-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium mb-1 text-orange-800">
                System Health Alert
              </h4>
              <p className="text-sm text-orange-700">
                Status: {systemHealth?.status}
              </p>
              {systemHealth?.message && (
                <p className="text-sm text-orange-700">
                  {systemHealth.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
