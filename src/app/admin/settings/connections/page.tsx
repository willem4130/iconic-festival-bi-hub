'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/trpc/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ConnectFacebookButton, AccountSelector, ConnectedAccounts } from '@/components/meta'
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
  Shield,
} from 'lucide-react'

export default function ConnectionsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [syncingPlatform, setSyncingPlatform] = useState<string | null>(null)
  const [showAccountSelector, setShowAccountSelector] = useState(false)

  const utils = api.useUtils()

  // State for discovered accounts (from mutation or cookie)
  const [discoveredAccountsData, setDiscoveredAccountsData] = useState<{
    connectionId: string
    facebookPages: Array<{
      id: string
      name: string
      username?: string
      category?: string
      profilePictureUrl?: string
      followersCount?: number
      hasInstagram: boolean
    }>
    instagramAccounts: Array<{
      id: string
      username: string
      name?: string
      profilePictureUrl?: string
      followersCount?: number
      linkedFacebookPageId: string
      linkedFacebookPageName: string
    }>
  } | null>(null)

  // Check for OAuth callback status
  useEffect(() => {
    const error = searchParams.get('error')
    const errorMessage = searchParams.get('message')
    const metaConnected = searchParams.get('meta_connected')
    const showSelector = searchParams.get('show_selector')

    if (error) {
      toast({
        title: 'Connection Error',
        description: errorMessage ?? 'Failed to connect to Meta',
        variant: 'destructive',
      })
      // Clear URL params
      router.replace('/admin/settings/connections')
    }

    if (metaConnected === 'true' && showSelector === 'true') {
      setShowAccountSelector(true)
      // Clear URL params but keep showing selector
      router.replace('/admin/settings/connections')
    }
  }, [searchParams, toast, router])

  // OAuth connection status
  const oauthStatus = api.metaAuth.getConnectionStatus.useQuery()

  // Discovered accounts (from OAuth callback cookie)
  const discoveredAccounts = api.metaAuth.getDiscoveredAccounts.useQuery(undefined, {
    enabled: showAccountSelector && !discoveredAccountsData,
  })

  // Sync cookie data to state when available
  useEffect(() => {
    if (discoveredAccounts.data?.connectionId && !discoveredAccountsData) {
      setDiscoveredAccountsData({
        connectionId: discoveredAccounts.data.connectionId,
        facebookPages: discoveredAccounts.data.facebookPages,
        instagramAccounts: discoveredAccounts.data.instagramAccounts,
      })
    }
  }, [discoveredAccounts.data, discoveredAccountsData])

  // Legacy env-based connection status
  const legacyStatus = api.metaInsights.getConnectionStatus.useQuery()
  const pageInfo = api.metaInsights.getPageInfo.useQuery(undefined, {
    enabled: legacyStatus.data?.connected && !!legacyStatus.data?.pageId,
  })
  const instagramInfo = api.metaInsights.getInstagramInfo.useQuery(undefined, {
    enabled: legacyStatus.data?.connected && !!legacyStatus.data?.instagramAccountId,
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

  const handleAccountSelectorComplete = () => {
    setShowAccountSelector(false)
    setDiscoveredAccountsData(null)
    utils.metaAuth.getConnectionStatus.invalidate()
    toast({
      title: 'Setup complete',
      description: 'Your Meta accounts are now connected and ready to sync',
    })
  }

  // Refresh discovered accounts mutation
  const refreshDiscoveredAccounts = api.metaAuth.refreshDiscoveredAccounts.useMutation({
    onSuccess: (data) => {
      if (data.connectionId) {
        setDiscoveredAccountsData({
          connectionId: data.connectionId,
          facebookPages: data.facebookPages,
          instagramAccounts: data.instagramAccounts,
        })
        setShowAccountSelector(true)
      } else {
        toast({
          title: 'No accounts found',
          description: 'No Facebook Pages or Instagram accounts were found for your Meta account',
          variant: 'destructive',
        })
      }
    },
    onError: (error) => {
      toast({
        title: 'Failed to refresh accounts',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleAddMoreAccounts = () => {
    refreshDiscoveredAccounts.mutate()
  }

  const isLoading = oauthStatus.isLoading || legacyStatus.isLoading
  const hasOAuthConnection = oauthStatus.data?.connected
  const hasLegacyConnection = legacyStatus.data?.connected && !hasOAuthConnection

  // Show account selector if we just completed OAuth or clicked "Add More"
  if (showAccountSelector && discoveredAccountsData?.connectionId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Connect Your Accounts</h1>
          <p className="text-gray-500">
            Select the Facebook Pages and Instagram accounts you want to track
          </p>
        </div>
        <AccountSelector
          connectionId={discoveredAccountsData.connectionId}
          facebookPages={discoveredAccountsData.facebookPages}
          instagramAccounts={discoveredAccountsData.instagramAccounts}
          onComplete={handleAccountSelectorComplete}
          onCancel={() => {
            setShowAccountSelector(false)
            setDiscoveredAccountsData(null)
          }}
        />
      </div>
    )
  }

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

  // OAuth-connected state
  if (hasOAuthConnection) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">API Connections</h1>
            <p className="text-gray-500">Manage your social media API connections</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              oauthStatus.refetch()
              legacyStatus.refetch()
            }}
            disabled={oauthStatus.isRefetching}
          >
            {oauthStatus.isRefetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh Status
          </Button>
        </div>

        <ConnectedAccounts
          onAddMore={handleAddMoreAccounts}
          isAddingMore={refreshDiscoveredAccounts.isPending}
        />

        {/* Sync Section */}
        {oauthStatus.data?.accounts && oauthStatus.data.accounts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sync Data</CardTitle>
              <CardDescription>
                Manually sync insights data from your connected accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {oauthStatus.data.accounts.some((a) => a.platform === 'FACEBOOK') && (
                  <Button
                    onClick={() => handleSync('facebook')}
                    disabled={syncingPlatform === 'facebook'}
                    variant="outline"
                  >
                    {syncingPlatform === 'facebook' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Facebook className="mr-2 h-4 w-4 text-blue-600" />
                    )}
                    Sync Facebook
                  </Button>
                )}
                {oauthStatus.data.accounts.some((a) => a.platform === 'INSTAGRAM') && (
                  <Button
                    onClick={() => handleSync('instagram')}
                    disabled={syncingPlatform === 'instagram'}
                    variant="outline"
                  >
                    {syncingPlatform === 'instagram' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Instagram className="mr-2 h-4 w-4 text-pink-600" />
                    )}
                    Sync Instagram
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Legacy env-based connection or not connected state
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Connections</h1>
          <p className="text-gray-500">Manage your social media API connections</p>
        </div>
        <Button
          variant="outline"
          onClick={() => legacyStatus.refetch()}
          disabled={legacyStatus.isRefetching}
        >
          {legacyStatus.isRefetching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh Status
        </Button>
      </div>

      {/* Token Expiration Warning (legacy) */}
      {hasLegacyConnection && legacyStatus.data?.tokenExpiring && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Token Expiring Soon</AlertTitle>
          <AlertDescription>
            Your Meta API access token expires in {legacyStatus.data.tokenDaysRemaining} days.
            Consider switching to OAuth for automatic token management.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Connection Card */}
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
          {hasLegacyConnection ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    Connected (Legacy)
                  </p>
                  <p className="text-sm text-gray-500">Using environment variable configuration</p>
                </div>
              </div>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Upgrade Available</AlertTitle>
                <AlertDescription>
                  Switch to OAuth for automatic token refresh and easier account management.
                  <div className="mt-3">
                    <ConnectFacebookButton variant="outline" size="sm" />
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <XCircle className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-600 dark:text-gray-400">Not Connected</p>
                  <p className="text-sm text-gray-500">
                    Connect your Meta accounts to start tracking insights
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-8">
                <div className="flex gap-4">
                  <Facebook className="h-12 w-12 text-blue-600" />
                  <Instagram className="h-12 w-12 text-pink-600" />
                </div>
                <h3 className="text-lg font-medium">Connect your Meta accounts</h3>
                <p className="max-w-md text-center text-sm text-gray-500">
                  Link your Facebook Pages and Instagram Business accounts to track engagement,
                  reach, followers, and content performance.
                </p>
                <ConnectFacebookButton size="lg" />
              </div>

              {/* Required Permissions Info */}
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legacy Connected Accounts (when using env vars) */}
      {hasLegacyConnection && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Facebook Page */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Facebook className="h-5 w-5 text-blue-600" />
                  Facebook Page
                </CardTitle>
                {legacyStatus.data?.pageId ? (
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
              {legacyStatus.data?.pageId ? (
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
                {legacyStatus.data?.instagramAccountId ? (
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
              {legacyStatus.data?.instagramAccountId ? (
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
                {legacyStatus.data?.adAccountId ? (
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
              {legacyStatus.data?.adAccountId ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Account ID</p>
                    <p className="font-mono">{legacyStatus.data.adAccountId}</p>
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
        </div>
      )}
    </div>
  )
}
