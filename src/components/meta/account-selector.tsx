'use client'

import { useState } from 'react'
import { api } from '@/trpc/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Facebook, Instagram, Users, Image } from 'lucide-react'

interface AccountSelectorProps {
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
  onComplete: () => void
  onCancel: () => void
}

/**
 * Account selection UI after OAuth callback
 * Allows user to select which Facebook Pages and Instagram accounts to connect
 */
export function AccountSelector({
  connectionId,
  facebookPages,
  instagramAccounts,
  onComplete,
  onCancel,
}: AccountSelectorProps) {
  const { toast } = useToast()
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())

  const connectAccounts = api.metaAuth.connectAccounts.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Accounts connected',
        description: `Connected ${data.connectedAccounts.length} account(s)`,
      })
      onComplete()
    },
    onError: (error) => {
      toast({
        title: 'Connection failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const toggleAccount = (accountId: string) => {
    const newSelected = new Set(selectedAccounts)
    if (newSelected.has(accountId)) {
      newSelected.delete(accountId)
    } else {
      newSelected.add(accountId)
    }
    setSelectedAccounts(newSelected)
  }

  const handleConnect = () => {
    if (selectedAccounts.size === 0) {
      toast({
        title: 'No accounts selected',
        description: 'Please select at least one account to connect',
        variant: 'destructive',
      })
      return
    }

    connectAccounts.mutate({
      connectionId,
      accountIds: Array.from(selectedAccounts),
    })
  }

  const selectAll = () => {
    const allIds = new Set(facebookPages.map((p) => p.id))
    setSelectedAccounts(allIds)
  }

  const selectNone = () => {
    setSelectedAccounts(new Set())
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Accounts to Connect</CardTitle>
        <CardDescription>
          Choose which Facebook Pages and Instagram accounts you want to track. Instagram accounts
          linked to selected pages will be connected automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick select buttons */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={selectNone}>
            Select None
          </Button>
        </div>

        {/* Facebook Pages */}
        {facebookPages.length > 0 && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 font-medium">
              <Facebook className="h-4 w-4 text-blue-600" />
              Facebook Pages
            </h4>
            <div className="grid gap-3">
              {facebookPages.map((page) => (
                <div
                  key={page.id}
                  className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
                    selectedAccounts.has(page.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
                >
                  <Checkbox
                    id={`page-${page.id}`}
                    checked={selectedAccounts.has(page.id)}
                    onCheckedChange={() => toggleAccount(page.id)}
                  />
                  <div className="flex flex-1 items-center gap-4">
                    {page.profilePictureUrl ? (
                      <img
                        src={page.profilePictureUrl}
                        alt={page.name}
                        className="h-12 w-12 rounded-lg"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700">
                        <Facebook className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <label htmlFor={`page-${page.id}`} className="cursor-pointer font-medium">
                        {page.name}
                      </label>
                      {page.username && <p className="text-sm text-gray-500">@{page.username}</p>}
                      <div className="mt-1 flex flex-wrap gap-2">
                        {page.category && <Badge variant="secondary">{page.category}</Badge>}
                        {page.followersCount !== undefined && (
                          <Badge variant="outline" className="gap-1">
                            <Users className="h-3 w-3" />
                            {page.followersCount.toLocaleString()}
                          </Badge>
                        )}
                        {page.hasInstagram && (
                          <Badge variant="outline" className="gap-1 text-pink-600">
                            <Instagram className="h-3 w-3" />
                            Instagram linked
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instagram Accounts Preview */}
        {instagramAccounts.length > 0 && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 font-medium">
              <Instagram className="h-4 w-4 text-pink-600" />
              Linked Instagram Accounts
              <span className="text-sm font-normal text-gray-500">
                (automatically connected with Facebook Page)
              </span>
            </h4>
            <div className="grid gap-3 opacity-75">
              {instagramAccounts.map((account) => {
                const isLinkedPageSelected = selectedAccounts.has(account.linkedFacebookPageId)

                return (
                  <div
                    key={account.id}
                    className={`flex items-center gap-4 rounded-lg border p-4 ${
                      isLinkedPageSelected
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-950'
                        : 'border-dashed'
                    }`}
                  >
                    <div className="flex flex-1 items-center gap-4">
                      {account.profilePictureUrl ? (
                        <img
                          src={account.profilePictureUrl}
                          alt={account.username}
                          className="h-12 w-12 rounded-full"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                          <Instagram className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{account.name ?? account.username}</p>
                        <p className="text-sm text-gray-500">@{account.username}</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {account.followersCount !== undefined && (
                            <Badge variant="outline" className="gap-1">
                              <Users className="h-3 w-3" />
                              {account.followersCount.toLocaleString()} followers
                            </Badge>
                          )}
                          <Badge variant="outline" className="gap-1">
                            <Image className="h-3 w-3" />
                            Linked to {account.linkedFacebookPageName}
                          </Badge>
                        </div>
                      </div>
                      {isLinkedPageSelected ? (
                        <Badge className="bg-pink-600">Will be connected</Badge>
                      ) : (
                        <Badge variant="outline">Select page to connect</Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* No accounts found */}
        {facebookPages.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Facebook className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 font-medium">No Facebook Pages Found</h3>
            <p className="mt-2 text-sm text-gray-500">
              You don&apos;t have access to any Facebook Pages, or the required permissions were not
              granted.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={selectedAccounts.size === 0 || connectAccounts.isPending}
          >
            {connectAccounts.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              `Connect ${selectedAccounts.size} Account${selectedAccounts.size !== 1 ? 's' : ''}`
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
