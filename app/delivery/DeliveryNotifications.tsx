'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

type DeliveryNotificationsProps = {
  initialOrdersCount: number
  currentUserName: string
}

export default function DeliveryNotifications({ 
  initialOrdersCount, 
  currentUserName 
}: DeliveryNotificationsProps) {
  const router = useRouter()
  const [ordersCount, setOrdersCount] = useState(initialOrdersCount)
  const [isPolling, setIsPolling] = useState(true)
  const hasNotifiedRef = useRef(false)

  // Check immediately on mount and then poll
  useEffect(() => {
    if (!isPolling) return

    const checkForNewOrders = async () => {
      try {
        const response = await fetch('/api/delivery/orders-count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userName: currentUserName }),
          cache: 'no-store'
        })
        
        if (response.ok) {
          const data = await response.json()
          const newCount = data.count || 0
          
          // Only notify if count increased (not on initial load)
          if (hasNotifiedRef.current && newCount > ordersCount) {
            const newOrders = newCount - ordersCount
            toast.success(
              `📦 ${newOrders} nouvelle${newOrders > 1 ? 's' : ''} commande${newOrders > 1 ? 's' : ''} expédiée${newOrders > 1 ? 's' : ''} !`,
              {
                duration: 6000,
                style: {
                  fontSize: '16px',
                  padding: '16px',
                },
              }
            )
            // Refresh the page to show new orders
            setTimeout(() => {
              router.refresh()
            }, 500)
          }
          
          // Mark that we've done the initial check
          if (!hasNotifiedRef.current) {
            hasNotifiedRef.current = true
          }
          
          setOrdersCount(newCount)
        }
      } catch (error) {
        // Silently fail - don't spam errors
        console.error('Failed to check for new orders:', error)
      }
    }

    // Check immediately on mount
    checkForNewOrders()

    // Then poll every 10 seconds (very frequent for better responsiveness)
    const interval = setInterval(checkForNewOrders, 10000)

    return () => clearInterval(interval)
  }, [ordersCount, isPolling, currentUserName, router])

  // Also check when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPolling) {
        // Immediately check when page becomes visible
        fetch('/api/delivery/orders-count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userName: currentUserName }),
          cache: 'no-store'
        })
          .then(res => (res.ok ? res.json() : null))
          .then(data => {
            if (!data) return
            const newCount = data.count || 0
            if (newCount > ordersCount && hasNotifiedRef.current) {
              const newOrders = newCount - ordersCount
              toast.success(
                `📦 ${newOrders} nouvelle${newOrders > 1 ? 's' : ''} commande${newOrders > 1 ? 's' : ''} expédiée${newOrders > 1 ? 's' : ''} !`,
                { duration: 6000 }
              )
              setTimeout(() => router.refresh(), 500)
            }
            setOrdersCount(newCount)
          })
          .catch(() => { /* erreur réseau : ne pas faire échouer la page */ })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [ordersCount, isPolling, currentUserName, router])

  return null // This component doesn't render anything visible
}
