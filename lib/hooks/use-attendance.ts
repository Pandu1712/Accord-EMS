import { useState, useCallback } from 'react'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, setDoc, doc, updateDoc, Timestamp } from 'firebase/firestore'

export interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  breakStart: string | null
  breakEnd: string | null
  totalBreakTime: number | null
  workingHours: number | null
  status: 'present' | 'absent' | 'leave' | 'half-day'
}

export function useAttendance() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getAttendanceRecords = useCallback(
    async (filters?: { employeeId?: string; date?: string }) => {
      try {
        setLoading(true)
        setError(null)
        
        const attendanceRef = collection(db, 'attendance')
        let q = query(attendanceRef)

        if (filters?.employeeId) {
          q = query(attendanceRef, where('employeeId', '==', filters.employeeId))
        }

        const snapshot = await getDocs(q)
        const records: AttendanceRecord[] = snapshot.docs
          .map(doc => doc.data() as AttendanceRecord)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        return records
      } catch (err: any) {
        setError(err.message)
        return []
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const checkIn = useCallback(
    async (employeeId: string, employeeName: string) => {
      try {
        setLoading(true)
        setError(null)

        const today = new Date().toISOString().split('T')[0]
        const now = new Date().toLocaleTimeString('en-IN')

        const attendanceRef = collection(db, 'attendance')
        const q = query(
          attendanceRef,
          where('employeeId', '==', employeeId),
          where('date', '==', today)
        )
        const snapshot = await getDocs(q)

        if (snapshot.empty) {
          const newDocId = doc(attendanceRef).id
          await setDoc(doc(db, 'attendance', newDocId), {
            id: newDocId,
            employeeId,
            employeeName,
            date: today,
            checkInTime: now,
            checkOutTime: null,
            breakStart: null,
            breakEnd: null,
            totalBreakTime: null,
            workingHours: null,
            status: 'present',
          })
          return { success: true, message: 'Checked in successfully' }
        } else {
          const docId = snapshot.docs[0].id
          await updateDoc(doc(db, 'attendance', docId), {
            checkInTime: now,
          })
          return { success: true, message: 'Check-in time updated' }
        }
      } catch (err: any) {
        setError(err.message)
        return { success: false, message: err.message }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const checkOut = useCallback(
    async (employeeId: string) => {
      try {
        setLoading(true)
        setError(null)

        const today = new Date().toISOString().split('T')[0]
        const now = new Date().toLocaleTimeString('en-IN')

        const attendanceRef = collection(db, 'attendance')
        const q = query(
          attendanceRef,
          where('employeeId', '==', employeeId),
          where('date', '==', today)
        )
        const snapshot = await getDocs(q)

        if (!snapshot.empty) {
          const docId = snapshot.docs[0].id
          const data = snapshot.docs[0].data()

          // Calculate working hours
          const checkIn = new Date(`2000-01-01 ${data.checkInTime}`)
          const checkOut = new Date(`2000-01-01 ${now}`)
          const diffMs = checkOut.getTime() - checkIn.getTime()
          const workingHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100

          await updateDoc(doc(db, 'attendance', docId), {
            checkOutTime: now,
            workingHours,
          })

          return { success: true, message: 'Checked out successfully', workingHours }
        }

        return { success: false, message: 'No check-in record found for today' }
      } catch (err: any) {
        setError(err.message)
        return { success: false, message: err.message }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const startBreak = useCallback(
    async (employeeId: string) => {
      try {
        setLoading(true)
        setError(null)

        const today = new Date().toISOString().split('T')[0]
        const now = new Date().toLocaleTimeString('en-IN')

        const attendanceRef = collection(db, 'attendance')
        const q = query(
          attendanceRef,
          where('employeeId', '==', employeeId),
          where('date', '==', today)
        )
        const snapshot = await getDocs(q)

        if (!snapshot.empty) {
          const docId = snapshot.docs[0].id
          await updateDoc(doc(db, 'attendance', docId), {
            breakStart: now,
          })
          return { success: true, message: 'Break started' }
        }

        return { success: false, message: 'No check-in record found' }
      } catch (err: any) {
        setError(err.message)
        return { success: false, message: err.message }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const endBreak = useCallback(
    async (employeeId: string) => {
      try {
        setLoading(true)
        setError(null)

        const today = new Date().toISOString().split('T')[0]
        const now = new Date().toLocaleTimeString('en-IN')

        const attendanceRef = collection(db, 'attendance')
        const q = query(
          attendanceRef,
          where('employeeId', '==', employeeId),
          where('date', '==', today)
        )
        const snapshot = await getDocs(q)

        if (!snapshot.empty) {
          const docId = snapshot.docs[0].id
          const data = snapshot.docs[0].data()

          // Calculate break time
          const breakStart = new Date(`2000-01-01 ${data.breakStart}`)
          const breakEnd = new Date(`2000-01-01 ${now}`)
          const breakDiffMs = breakEnd.getTime() - breakStart.getTime()
          const breakMinutes = Math.round(breakDiffMs / (1000 * 60))

          await updateDoc(doc(db, 'attendance', docId), {
            breakEnd: now,
            totalBreakTime: breakMinutes,
          })

          return { success: true, message: 'Break ended', breakMinutes }
        }

        return { success: false, message: 'No check-in record found' }
      } catch (err: any) {
        setError(err.message)
        return { success: false, message: err.message }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    loading,
    error,
    getAttendanceRecords,
    checkIn,
    checkOut,
    startBreak,
    endBreak,
  }
}
