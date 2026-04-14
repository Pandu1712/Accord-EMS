'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { Megaphone, X, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // We removed the 'where' clause here to avoid requiring a composite index
    const q = query(
      collection(db, 'announcements'), 
      orderBy('postedAt', 'desc'), 
      limit(10)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any))
      // Filter for priority in memory
      const priorityAnnouncement = docs.find(a => a.type === 'priority')
      
      if (priorityAnnouncement) {
        setAnnouncement(priorityAnnouncement)
        setIsVisible(true)
      } else {
        setAnnouncement(null)
      }
    })

    return () => unsubscribe()
  }, [])

  if (!announcement || !isVisible) return null

  return (
    <div className="relative isolate flex items-center gap-x-6 overflow-hidden bg-zinc-950 px-6 py-2.5 sm:px-3.5 sm:before:flex-1 rounded-3xl mx-4 mb-8 border border-zinc-800 shadow-2xl animate-in slide-in-from-top duration-500">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-sm leading-6 text-white flex items-center gap-2">
          <strong className="font-black italic uppercase tracking-widest text-primary flex items-center gap-2">
             <Megaphone size={14} className="animate-bounce" /> Priority Broadcast
          </strong>
          <svg viewBox="0 0 2 2" className="mx-2 inline h-0.5 w-0.5 fill-current" aria-hidden="true"><circle cx="1" cy="1" r="1" /></svg>
          <span className="italic font-medium text-zinc-300">{announcement.title}</span>
          <span className="hidden md:inline text-zinc-500 opacity-50 px-2">|</span>
          <span className="hidden md:inline text-zinc-400 font-medium truncate max-w-[400px]">{announcement.content}</span>
        </p>
        <Link
          href="/dashboard/announcements"
          className="flex-none rounded-full bg-primary px-3.5 py-1 text-[10px] font-black italic uppercase text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          View Center <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
      <div className="flex flex-1 justify-end">
        <button type="button" onClick={() => setIsVisible(false)} className="-m-3 p-3 focus-visible:outline-offset-[-4px]">
          <span className="sr-only">Dismiss</span>
          <X className="h-5 w-5 text-zinc-400" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
