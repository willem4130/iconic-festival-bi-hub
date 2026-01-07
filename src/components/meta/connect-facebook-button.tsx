'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface ConnectFacebookButtonProps {
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

/**
 * Facebook-branded OAuth connect button
 * Initiates the Meta OAuth flow when clicked
 */
export function ConnectFacebookButton({
  variant = 'default',
  size = 'default',
  className,
}: ConnectFacebookButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConnect = () => {
    setIsLoading(true)
    // Redirect to OAuth initiation route
    window.location.href = '/api/auth/meta'
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
      style={{
        backgroundColor: variant === 'default' ? '#1877F2' : undefined,
        borderColor: variant === 'outline' ? '#1877F2' : undefined,
        color: variant === 'outline' ? '#1877F2' : undefined,
      }}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <svg
          className="mr-2 h-4 w-4"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      )}
      {isLoading ? 'Connecting...' : 'Connect with Facebook'}
    </Button>
  )
}
