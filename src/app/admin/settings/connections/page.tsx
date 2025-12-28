'use client'

import { useState } from 'react'
import { api } from '@/trpc/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Facebook,
  Instagram,
  Megaphone,
  ExternalLink,
  Copy,
  Shield,
} from 'lucide-react'

export default function ConnectionsPage() {
  const { toast } = useToast()
  const [syncingPlatform, setSyncingPlatform] = useState<string | null>(null)

  // API queries
  const connectionStatus = api.metaInsights.getConnectionStatus.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every minute
  })
  const pageInfo = api.metaInsights.getPageInfo.useQuery(undefined, {
    enabled: connectionStatus.data?.connected && !!connectionStatus.data?.pageId,
  })
  const instagramInfo = api.metaInsights.getInstagramInfo.useQuery(undefined, {
    enabled: connectionStatus.data?.connected && !!connectionStatus.data?.instagramAccountId,
  })

  // Sync mutations
  const syncPageInsights = api.metaInsights.syncPageInsights.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Facebook sync complete',
        description: `Synced ${data.insightsStored} days of insights`,
      })
      setSyncingPlatform(null)
    },
    onError: (error) => {
      toast({
        title: 'Sync failed',
        description: error.message,
        variant: 'destructive',
      })
      setSyncingPlatform(null)
    },
  })

  const syncInstagramInsights = api.metaInsights.syncInstagramInsights.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Instagram sync complete',
        description: `Synced ${data.insightsStored} days of insights`,
      })
      setSyncingPlatform(null)
    },
    onError: (error) => {
      toast({
        title: 'Sync failed',
        description: error.message,
        variant: 'destructive',
      })
      setSyncingPlatform(null)
    },
  })

  const handleSync = (platform: 'facebook' | 'instagram') => {
    setSyncingPlatform(platform)
    if (platform === 'facebook') {
      syncPageInsights.mutate({ days: 30 })
    } else {
      syncInstagramInsights.mutate({ days: 30 })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied',
      description: 'Copied to clipboard',
    })
  }

  const isLoading = connectionStatus.isLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">API Connections</h1>
          <p className="text-gray-500">Manage your social media API connections</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const status = connectionStatus.data
  const isConnected = status?.connected
  const tokenExpiring = status?.tokenExpiring
  const daysRemaining = status?.tokenDaysRemaining

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Connections</h1>
          <p className="text-gray-500">Manage your social media API connections</p>
        </div>
        <Button
          variant="outline"
          onClick={() => connectionStatus.refetch()}
          disabled={connectionStatus.isRefetching}
        >
          {connectionStatus.isRefetching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh Status
        </Button>
      </div>

      {/* Token Expiration Warning */}
      {isConnected && tokenExpiring && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Token Expiring Soon</AlertTitle>
          <AlertDescription>
            Your Meta API access token expires in {daysRemaining} days. Please refresh your token to
            avoid service interruption.
            <Button variant="link" className="h-auto p-0 pl-1" asChild>
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get new token <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Meta API Connection
          </CardTitle>
          <CardDescription>
            Connect your Facebook Page and Instagram Business account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {isConnected ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-green-600 dark:text-green-400">Connected</p>
                  <p className="text-sm text-gray-500">
                    {daysRemaining !== null && daysRemaining !== undefined
                      ? `Token valid for ${daysRemaining} days`
                      : 'Token status unknown'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-red-600 dark:text-red-400">Not Connected</p>
                  <p className="text-sm text-gray-500">
                    {status?.error ?? 'Configure environment variables'}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions (shown when not connected) */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
            <CardDescription>Follow these steps to connect your Meta accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <h4 className="mb-2 font-medium">Required Environment Variables</h4>
              <div className="space-y-2 font-mono text-sm">
                {[
                  { key: 'META_APP_ID', desc: 'Your Meta App ID' },
                  { key: 'META_APP_SECRET', desc: 'Your Meta App Secret' },
                  { key: 'META_ACCESS_TOKEN', desc: 'Long-lived access token' },
                  { key: 'META_PAGE_ID', desc: 'Facebook Page ID (optional)' },
                  {
                    key: 'META_INSTAGRAM_ACCOUNT_ID',
                    desc: 'Instagram Business Account ID (optional)',
                  },
                  { key: 'META_AD_ACCOUNT_ID', desc: 'Ad Account ID (optional)' },
                ].map((env) => (
                  <div
                    key={env.key}
                    className="flex items-center justify-between rounded bg-white p-2 dark:bg-gray-700"
                  >
                    <div>
                      <code className="text-blue-600 dark:text-blue-400">{env.key}</code>
                      <span className="ml-2 text-gray-500">- {env.desc}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(env.key)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Quick Setup Guide</h4>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-400">
                <li>
                  Go to{' '}
                  <a
                    href="https://developers.facebook.com/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Meta for Developers
                  </a>{' '}
                  and create/select your app
                </li>
                <li>Add the Facebook Login and Instagram Graph API products</li>
                <li>
                  Use the{' '}
                  <a
                    href="https://developers.facebook.com/tools/explorer/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Graph API Explorer
                  </a>{' '}
                  to generate an access token with required permissions
                </li>
                <li>Exchange for a long-lived token (valid 60 days)</li>
                <li>
                  Copy the values to your{' '}
                  <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">.env</code> file
                </li>
                <li>Restart your development server</li>
              </ol>
            </div>

            <div className="pt-2">
              <h4 className="mb-2 font-medium">Required Permissions</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  'pages_show_list',
                  'pages_read_engagement',
                  'pages_read_user_content',
                  'read_insights',
                  'instagram_basic',
                  'instagram_manage_insights',
                  'business_management',
                ].map((perm) => (
                  <Badge key={perm} variant="secondary">
                    {perm}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Accounts */}
      {isConnected && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Facebook Page */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Facebook className="h-5 w-5 text-blue-600" />
                  Facebook Page
                </CardTitle>
                {status?.pageId ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not configured</Badge>
                )}
              </div>
              <CardDescription>Your connected Facebook Page</CardDescription>
            </CardHeader>
            <CardContent>
              {status?.pageId ? (
                <div className="space-y-4">
                  {pageInfo.isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  ) : pageInfo.data ? (
                    <div className="flex items-start gap-4">
                      {pageInfo.data.profilePictureUrl && (
                        <img
                          src={pageInfo.data.profilePictureUrl}
                          alt={pageInfo.data.name}
                          className="h-16 w-16 rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold">{pageInfo.data.name}</h4>
                        {pageInfo.data.username && (
                          <p className="text-sm text-gray-500">@{pageInfo.data.username}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {pageInfo.data.fanCount !== undefined && (
                            <Badge variant="outline">
                              {pageInfo.data.fanCount.toLocaleString()} followers
                            </Badge>
                          )}
                          <Badge variant="outline">{pageInfo.data.category}</Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Could not load page info</p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleSync('facebook')}
                      disabled={syncingPlatform === 'facebook'}
                      size="sm"
                    >
                      {syncingPlatform === 'facebook' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Sync Insights
                    </Button>
                    {pageInfo.data?.username && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`https://facebook.com/${pageInfo.data.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Page
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Add{' '}
                  <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">META_PAGE_ID</code> to
                  your environment variables
                </p>
              )}
            </CardContent>
          </Card>

          {/* Instagram Account */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Instagram className="h-5 w-5 text-pink-600" />
                  Instagram Business
                </CardTitle>
                {status?.instagramAccountId ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not configured</Badge>
                )}
              </div>
              <CardDescription>Your connected Instagram Business account</CardDescription>
            </CardHeader>
            <CardContent>
              {status?.instagramAccountId ? (
                <div className="space-y-4">
                  {instagramInfo.isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  ) : instagramInfo.data ? (
                    <div className="flex items-start gap-4">
                      {instagramInfo.data.profilePictureUrl && (
                        <img
                          src={instagramInfo.data.profilePictureUrl}
                          alt={instagramInfo.data.username}
                          className="h-16 w-16 rounded-full"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold">
                          {instagramInfo.data.name ?? instagramInfo.data.username}
                        </h4>
                        <p className="text-sm text-gray-500">@{instagramInfo.data.username}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {instagramInfo.data.followersCount !== undefined && (
                            <Badge variant="outline">
                              {instagramInfo.data.followersCount.toLocaleString()} followers
                            </Badge>
                          )}
                          {instagramInfo.data.mediaCount !== undefined && (
                            <Badge variant="outline">
                              {instagramInfo.data.mediaCount.toLocaleString()} posts
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Could not load account info</p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleSync('instagram')}
                      disabled={syncingPlatform === 'instagram'}
                      size="sm"
                    >
                      {syncingPlatform === 'instagram' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Sync Insights
                    </Button>
                    {instagramInfo.data?.username && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`https://instagram.com/${instagramInfo.data.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Profile
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Add{' '}
                  <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">
                    META_INSTAGRAM_ACCOUNT_ID
                  </code>{' '}
                  to your environment variables
                </p>
              )}
            </CardContent>
          </Card>

          {/* Ad Account */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-orange-600" />
                  Meta Ads
                </CardTitle>
                {status?.adAccountId ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not configured</Badge>
                )}
              </div>
              <CardDescription>Your connected Meta Ad Account</CardDescription>
            </CardHeader>
            <CardContent>
              {status?.adAccountId ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Account ID</p>
                    <p className="font-mono">{status.adAccountId}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href="https://business.facebook.com/adsmanager"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Ads Manager
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Add{' '}
                  <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">
                    META_AD_ACCOUNT_ID
                  </code>{' '}
                  to your environment variables
                </p>
              )}
            </CardContent>
          </Card>

          {/* Token Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600" />
                Access Token
              </CardTitle>
              <CardDescription>Token status and expiration info</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {tokenExpiring ? (
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                ) : (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                )}
                <div>
                  <p className="font-medium">
                    {tokenExpiring ? 'Token Expiring Soon' : 'Token Valid'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {daysRemaining !== null && daysRemaining !== undefined
                      ? `${daysRemaining} days remaining`
                      : 'Expiration unknown'}
                  </p>
                </div>
              </div>

              {status?.tokenExpiresAt && (
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Expires</p>
                  <p className="font-medium">
                    {new Date(status.tokenExpiresAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}

              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://developers.facebook.com/tools/explorer/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Get New Token
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
