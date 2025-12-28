import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, CheckCircle2, FileText, Clock, DollarSign, Bell } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <h1 className="text-xl font-semibold">Next.js Fullstack Template</h1>
          </div>
          <Link href="/admin/dashboard">
            <Button>
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container px-4 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Build Your Next Project Faster
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Production-ready automation system for contract distribution, hours reminders, and
            invoice generation
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/admin/dashboard">
              <Button size="lg">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/workflows">
              <Button size="lg" variant="outline">
                View Workflows
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/50">
        <div className="container px-4 py-24">
          <div className="mx-auto max-w-5xl">
            <h3 className="text-center text-3xl font-bold">Core Features</h3>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <FileText className="h-8 w-8 text-purple-600" />
                  <CardTitle className="mt-4">Contract Distribution</CardTitle>
                  <CardDescription>
                    Automatically send contracts to team members when new projects are created
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Automatic contract generation
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Team member notifications
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Document tracking & status
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Clock className="h-8 w-8 text-blue-600" />
                  <CardTitle className="mt-4">Hours Reminders</CardTitle>
                  <CardDescription>
                    Smart reminders for team members to submit their hours on time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Configurable reminder schedule
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Multi-channel notifications
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Hours tracking & approval
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <CardTitle className="mt-4">Invoice Generation</CardTitle>
                  <CardDescription>
                    Automatic invoice creation based on approved hours and project rates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Automatic invoice creation
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Approved hours integration
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Type-safe API
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Bell className="h-8 w-8 text-orange-600" />
                  <CardTitle className="mt-4">Notifications</CardTitle>
                  <CardDescription>
                    Multi-channel notifications with user preferences and settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Email notifications
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Slack integration
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      In-app notifications
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t">
        <div className="container px-4 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h3 className="text-3xl font-bold">Ready to get started?</h3>
            <p className="mt-4 text-lg text-muted-foreground">
              Access the admin dashboard to manage users and configure your application settings
            </p>
            <div className="mt-8">
              <Link href="/admin/dashboard">
                <Button size="lg">
                  Open Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container flex h-16 items-center justify-between px-4 text-sm text-muted-foreground">
          <p>Next.js Fullstack Template - Built with tRPC & Prisma</p>
          <p>Built with Next.js, tRPC & Prisma</p>
        </div>
      </footer>
    </main>
  )
}
