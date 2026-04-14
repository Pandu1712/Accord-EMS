import { useState, useCallback } from 'react'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, setDoc, doc, updateDoc } from 'firebase/firestore'

export interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  appliedOn: string
  approvedBy?: string
  approvalDate?: string
}

export interface LeaveBalance {
  employeeId: string
  casualLeaves: number
  sickLeaves: number
  personalLeaves: number
  year: number
}

export function useLeaveManagement() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getLeaveRequests = useCallback(
    async (filters?: { employeeId?: string; status?: string }) => {
      try {
        setLoading(true)
        setError(null)

        const leavesRef = collection(db, 'leaves')
        let q = query(leavesRef)

        if (filters?.employeeId) {
          q = query(leavesRef, where('employeeId', '==', filters.employeeId))
        }

        const snapshot = await getDocs(q)
        const leaves: LeaveRequest[] = snapshot.docs
          .map(doc => doc.data() as LeaveRequest)
          .sort((a, b) => new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime())

        return filters?.status ? leaves.filter(l => l.status === filters.status) : leaves
      } catch (err: any) {
        setError(err.message)
        return []
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const submitLeaveRequest = useCallback(
    async (
      employeeId: string,
      employeeName: string,
      leaveType: string,
      startDate: string,
      endDate: string,
      reason: string
    ) => {
      try {
        setLoading(true)
        setError(null)

        const leavesRef = collection(db, 'leaves')
        const newDocId = doc(leavesRef).id

        await setDoc(doc(db, 'leaves', newDocId), {
          id: newDocId,
          employeeId,
          employeeName,
          leaveType,
          startDate,
          endDate,
          reason,
          status: 'pending',
          appliedOn: new Date().toISOString(),
        })

        return { success: true, message: 'Leave request submitted successfully', docId: newDocId }
      } catch (err: any) {
        setError(err.message)
        return { success: false, message: err.message }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const approveLeaveRequest = useCallback(
    async (leaveId: string, approvedBy: string) => {
      try {
        setLoading(true)
        setError(null)

        await updateDoc(doc(db, 'leaves', leaveId), {
          status: 'approved',
          approvedBy,
          approvalDate: new Date().toISOString(),
        })

        return { success: true, message: 'Leave approved successfully' }
      } catch (err: any) {
        setError(err.message)
        return { success: false, message: err.message }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const rejectLeaveRequest = useCallback(
    async (leaveId: string, rejectedBy: string) => {
      try {
        setLoading(true)
        setError(null)

        await updateDoc(doc(db, 'leaves', leaveId), {
          status: 'rejected',
          approvedBy: rejectedBy,
          approvalDate: new Date().toISOString(),
        })

        return { success: true, message: 'Leave rejected successfully' }
      } catch (err: any) {
        setError(err.message)
        return { success: false, message: err.message }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const getLeaveBalance = useCallback(
    async (employeeId: string, year: number) => {
      try {
        setLoading(true)
        setError(null)

        // For now, return default balance. In production, fetch from database
        const defaultBalance: LeaveBalance = {
          employeeId,
          casualLeaves: 12,
          sickLeaves: 6,
          personalLeaves: 3,
          year,
        }

        return defaultBalance
      } catch (err: any) {
        setError(err.message)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const calculateLeaveDays = useCallback((startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }, [])

  return {
    loading,
    error,
    getLeaveRequests,
    submitLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    getLeaveBalance,
    calculateLeaveDays,
  }
}
