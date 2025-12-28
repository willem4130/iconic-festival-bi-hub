import type { NextConfig } from 'next'
import './src/env'

const nextConfig: NextConfig = {
  env: {
    // Generate timestamp at build time - this reflects when the deployment was built
    // Vercel doesn't provide a deployment timestamp env var, so we use current time at build
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    // Also expose Vercel deployment URL for reference
    NEXT_PUBLIC_VERCEL_URL: process.env.VERCEL_URL || '',
  },
}

export default nextConfig
