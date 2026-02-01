'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'

export default function FavoritesBadge() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/favorites')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!cancelled && data?.favorites && Array.isArray(data.favorites)) {
          setCount(data.favorites.length)
        }
      })
      .catch(() => { /* erreur réseau : ne pas faire échouer la page */ })
    return () => { cancelled = true }
  }, [])

  if (count === null || count === 0) return null

  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
      {count > 99 ? '99+' : count}
    </span>
  )
}
