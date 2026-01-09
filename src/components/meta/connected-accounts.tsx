'use client'

import { api } from '@/trpc/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Facebook,
  Instagram,
  Trash2,
  Plus,
  Shield,
  Clock,
} from 'lucide-react'

interface ConnectedAccountsProps {
  onAddMore: () => void
  isAddingMore?: boolean
}

/**
 * Displays and manages connected Meta accounts
 */
export function ConnectedAccounts({ onAddMore, isAddingMore }: ConnectedAccountsProps) {
  const { toast } = useToast()
  const utils = api.useUtils()

  const { data: status, isLoading } = api.metaAuth.getConnectionStatus.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every minute
  })

  const refreshToken = api.metaAuth.refreshToken.useMutation({
    onSuccess: () => {
      toast({
        title: 'Token refreshed',
        description: 'Your Meta connection has been refreshed',
      })
      utils.metaAuth.getConnectionStatus.invalidate()
    },
    onError: (error) => {
      toast({
        title: 'Refresh failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const disconnectAccount = api.metaAuth.disconnectAccount.useMutation({
    onSuccess: () => {
      toast({
        title: 'Account disconnected',
        description: 'The account has been disconnected',
      })
      utils.metaAuth.getConnectionStatus.invalidate()
    },
    onError: (error) => {
      toast({
        title: 'Disconnect failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const disconnectAll = api.metaAuth.disconnectAll.useMutation({
    onSuccess: () => {
      toast({
        title: 'All accounts disconnected',
        description: 'Your Meta connection has been removed',
      })
      utils.metaAuth.getConnectionStatus.invalidate()
    },
    onError: (error) => {
      toast({
        title: 'Disconnect failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!status?.connected) {
    return null
  }

  const connection = status.connection
  const accounts = status.accounts
  const tokenExpiringSoon =
    connection !== null && connection.daysRemaining !== null && connection.daysRemaining <= 14

  return (
    <div className="space-y-6">
      {/* Token expiration warning */}
      {tokenExpiringSoon && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Token Expiring Soon</AlertTitle>
          <AlertDescription>
            Your Meta access token expires in {connection?.daysRemaining} days. Refresh it now to
            avoid disconnection.
            <Button
              variant="link"
              className="h-auto p-0 pl-1"
              onClick={() => refreshToken.mutate()}
              disabled={refreshToken.isPending}
            >
              {refreshToken.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3 w-3" />
              )}
              Refresh now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Connection status card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                Meta Connection Active
              </CardTitle>
              <CardDescription>
                Connected as {connection?.metaUserName ?? 'Meta User'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshToken.mutate()}
                disabled={refreshToken.isPending}
              >
                {refreshToken.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh Token
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Disconnect All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Meta Connection?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will disconnect all Facebook and Instagram accounts and revoke access.
                      You&apos;ll need to reconnect to continue syncing data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => disconnectAll.mutate()}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {disconnectAll.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Disconnect All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Token Status:</span>
                {connection?.tokenValid ? (
                  <Badge className="bg-green-600">Valid</Badge>
                ) : (
                  <Badge variant="destructive">Invalid</Badge>
                )}
              </div>
              {connection && connection.daysRemaining !== null && (
                <p className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock className="h-3 w-3" />
                  Expires in {connection.daysRemaining} days
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected accounts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>
                Manage your connected Facebook Pages and Instagram accounts
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onAddMore} disabled={isAddingMore}>
              {isAddingMore ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {isAddingMore ? 'Loading...' : 'Add More'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Facebook className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 font-medium">No accounts connected</h3>
              <p className="mt-2 text-sm text-gray-500">
                Connect your Facebook Pages and Instagram accounts to start tracking insights.
              </p>
              <Button className="mt-4" onClick={onAddMore} disabled={isAddingMore}>
                {isAddingMore ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {isAddingMore ? 'Loading...' : 'Connect Accounts'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center gap-4 rounded-lg border p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    {account.platform === 'FACEBOOK' ? (
                      <Facebook className="h-6 w-6 text-blue-600" />
                    ) : (
                      <Instagram className="h-6 w-6 text-pink-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{account.name}</span>
                      <Badge variant="outline">
                        {account.platform === 'FACEBOOK' ? 'Page' : 'Business'}
                      </Badge>
                      {account.isActive ? (
                        <Badge className="bg-green-600">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    {account.username && (
                      <p className="text-sm text-gray-500">@{account.username}</p>
                    )}
                    {account.lastSyncAt && (
                      <p className="text-xs text-gray-400">
                        Last synced: {new Date(account.lastSyncAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <XCircle className="h-4 w-4 text-gray-400 hover:text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect {account.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will stop syncing data for this account. Historical data will be
                          preserved.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => disconnectAccount.mutate({ accountId: account.id })}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
