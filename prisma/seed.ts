import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database for Warehouse Pick Optimizer...')

  // ==========================================
  // APP SETTINGS
  // ==========================================
  console.log('⚙️  Creating app settings...')

  await prisma.appSettings.upsert({
    where: { id: 'default' },
    update: {
      siteName: 'Warehouse Pick Optimizer',
      siteUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      timezone: 'Europe/Amsterdam',
      theme: 'system',
      accentColor: '#0070f3',
      emailNotifications: true,
      pushNotifications: false,
    },
    create: {
      id: 'default',
      siteName: 'Warehouse Pick Optimizer',
      siteUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      timezone: 'Europe/Amsterdam',
      theme: 'system',
      accentColor: '#0070f3',
      emailNotifications: true,
      pushNotifications: false,
    },
  })

  console.log('✅ Created app settings')

  // ==========================================
  // BAY CATEGORIES (for grouping/analysis)
  // ==========================================
  console.log('📦 Creating bay categories...')

  const bayCategories = [
    {
      name: 'High-Speed Picking',
      description: 'Fast-moving items with high pick frequency',
      color: '#10b981', // Green
    },
    {
      name: 'Bulk Storage',
      description: 'Large items stored in bulk',
      color: '#3b82f6', // Blue
    },
    {
      name: 'Reserve Storage',
      description: 'Overflow and reserve inventory',
      color: '#f59e0b', // Amber
    },
    {
      name: 'Seasonal',
      description: 'Seasonal products and temporary storage',
      color: '#8b5cf6', // Purple
    },
    {
      name: 'Special Handling',
      description: 'Items requiring special handling or conditions',
      color: '#ef4444', // Red
    },
  ]

  for (const category of bayCategories) {
    await prisma.bayCategory.upsert({
      where: { name: category.name },
      update: category,
      create: category,
    })
  }

  console.log(`✅ Created ${bayCategories.length} bay categories`)

  console.log('🎉 Database seeded successfully!')
  console.log('')
  console.log('Next steps:')
  console.log('1. Create an admin user via NextAuth (sign up with email)')
  console.log('2. Upload your first Excel file with warehouse data')
  console.log('3. Map columns to the template structure')
  console.log('4. Run validations and export optimized templates')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
