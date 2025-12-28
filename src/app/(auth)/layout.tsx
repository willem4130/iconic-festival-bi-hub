export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <nav className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center px-4">
          <h1 className="text-xl font-bold">Iconic Website - Dashboard</h1>
        </div>
      </nav>
      <main className="container mx-auto p-4">{children}</main>
    </div>
  )
}
