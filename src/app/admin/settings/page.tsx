'use client'

import { useState } from 'react'
import { api } from '@/trpc/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const { toast } = useToast()
  const { data: settings, isLoading } = api.settings.getSettings.useQuery()
  const updateGeneral = api.settings.updateGeneral.useMutation()
  const updateAppearance = api.settings.updateAppearance.useMutation()
  const updateNotifications = api.settings.updateNotifications.useMutation()

  const [generalForm, setGeneralForm] = useState({
    siteName: '',
    siteUrl: '',
    timezone: '',
  })

  const [appearanceForm, setAppearanceForm] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
    accentColor: '#000000',
  })

  const [notificationsForm, setNotificationsForm] = useState({
    emailNotifications: true,
    pushNotifications: false,
  })

  // Update forms when settings load
  if (settings && generalForm.siteName === '') {
    setGeneralForm({
      siteName: settings.siteName,
      siteUrl: settings.siteUrl ?? '',
      timezone: settings.timezone,
    })
    setAppearanceForm({
      theme: settings.theme as 'light' | 'dark' | 'system',
      accentColor: settings.accentColor,
    })
    setNotificationsForm({
      emailNotifications: settings.emailNotifications,
      pushNotifications: settings.pushNotifications,
    })
  }

  const handleSaveGeneral = async () => {
    try {
      await updateGeneral.mutateAsync(generalForm)
      toast({
        title: 'Settings saved',
        description: 'General settings have been updated successfully.',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleSaveAppearance = async () => {
    try {
      await updateAppearance.mutateAsync(appearanceForm)
      toast({
        title: 'Settings saved',
        description: 'Appearance settings have been updated successfully.',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleSaveNotifications = async () => {
    try {
      await updateNotifications.mutateAsync(notificationsForm)
      toast({
        title: 'Settings saved',
        description: 'Notification settings have been updated successfully.',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-500">Manage your application settings</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure your application's basic settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={generalForm.siteName}
                  onChange={(e) => setGeneralForm({ ...generalForm, siteName: e.target.value })}
                  placeholder="My App"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteUrl">Site URL</Label>
                <Input
                  id="siteUrl"
                  type="url"
                  value={generalForm.siteUrl}
                  onChange={(e) => setGeneralForm({ ...generalForm, siteUrl: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={generalForm.timezone}
                  onValueChange={(value) => setGeneralForm({ ...generalForm, timezone: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSaveGeneral} disabled={updateGeneral.isPending}>
                {updateGeneral.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize how your application looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={appearanceForm.theme}
                  onValueChange={(value: 'light' | 'dark' | 'system') =>
                    setAppearanceForm({ ...appearanceForm, theme: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={appearanceForm.accentColor}
                    onChange={(e) =>
                      setAppearanceForm({
                        ...appearanceForm,
                        accentColor: e.target.value,
                      })
                    }
                    className="h-10 w-20"
                  />
                  <Input
                    value={appearanceForm.accentColor}
                    onChange={(e) =>
                      setAppearanceForm({
                        ...appearanceForm,
                        accentColor: e.target.value,
                      })
                    }
                    placeholder="#000000"
                  />
                </div>
              </div>

              <Button onClick={handleSaveAppearance} disabled={updateAppearance.isPending}>
                {updateAppearance.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
                <Switch
                  checked={notificationsForm.emailNotifications}
                  onCheckedChange={(checked: boolean) =>
                    setNotificationsForm({
                      ...notificationsForm,
                      emailNotifications: checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-gray-500">
                    Receive push notifications in your browser
                  </p>
                </div>
                <Switch
                  checked={notificationsForm.pushNotifications}
                  onCheckedChange={(checked: boolean) =>
                    setNotificationsForm({
                      ...notificationsForm,
                      pushNotifications: checked,
                    })
                  }
                />
              </div>

              <Button onClick={handleSaveNotifications} disabled={updateNotifications.isPending}>
                {updateNotifications.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
