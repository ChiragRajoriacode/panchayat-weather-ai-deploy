import { createContext, useContext, useState, useEffect } from 'react'

const AuthCtx = createContext(null)

const USERS = [
  { id: 1, email: 'farmer@demo.in', mobile: '9876543210', password: 'demo123', name: 'Ramesh Nayak', role: 'farmer', panchayat_id: 3 },
  { id: 2, email: 'panchayat@demo.in', mobile: '9876543211', password: 'demo123', name: 'Sita Devi', role: 'panchayat_officer', panchayat_id: 3 },
  { id: 3, email: 'block@demo.in', mobile: '9876543212', password: 'demo123', name: 'A. Kumar, BDO', role: 'block_officer', panchayat_id: null },
  { id: 4, email: 'admin@demo.in', mobile: '9876543213', password: 'demo123', name: 'System Admin', role: 'admin', panchayat_id: null },
]

export const ROLE_LABELS = {
  farmer: 'Farmer',
  panchayat_officer: 'Panchayat Officer',
  block_officer: 'Block Officer',
  admin: 'Admin',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('pw_user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [otpSent, setOtpSent] = useState(false)
  const [pendingMobile, setPendingMobile] = useState(null)

  useEffect(() => {
    if (user) localStorage.setItem('pw_user', JSON.stringify(user))
    else localStorage.removeItem('pw_user')
  }, [user])

  const loginEmail = (email, password) => {
    const u = USERS.find(
      (x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password
    )
    if (!u) return { ok: false, error: 'Invalid email or password' }
    const { password: _, ...safe } = u
    setUser(safe)
    return { ok: true, user: safe }
  }

  const requestOtp = (mobile) => {
    const u = USERS.find((x) => x.mobile === mobile.trim())
    if (!u) return { ok: false, error: 'Mobile not registered (use demo numbers)' }
    setPendingMobile(mobile.trim())
    setOtpSent(true)
    // Demo OTP is always 123456
    return { ok: true, message: 'OTP sent (demo: 123456)' }
  }

  const verifyOtp = (otp) => {
    if (otp !== '123456') return { ok: false, error: 'Invalid OTP (demo: 123456)' }
    const u = USERS.find((x) => x.mobile === pendingMobile)
    if (!u) return { ok: false, error: 'Session expired' }
    const { password: _, ...safe } = u
    setUser(safe)
    setOtpSent(false)
    setPendingMobile(null)
    return { ok: true, user: safe }
  }

  const resetPassword = (email) => {
    const u = USERS.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
    if (!u) return { ok: false, error: 'Email not found' }
    return { ok: true, message: 'Password reset link sent (demo: password remains demo123)' }
  }

  const logout = () => setUser(null)

  const canSeeAllPanchayats = user && ['block_officer', 'admin'].includes(user.role)
  const canSeeModel = user && ['block_officer', 'admin', 'panchayat_officer'].includes(user.role)
  const canAdmin = user?.role === 'admin'

  return (
    <AuthCtx.Provider
      value={{
        user,
        loginEmail,
        requestOtp,
        verifyOtp,
        resetPassword,
        logout,
        otpSent,
        pendingMobile,
        canSeeAllPanchayats,
        canSeeModel,
        canAdmin,
        demoUsers: USERS.map(({ password, ...u }) => u),
      }}
    >
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth requires AuthProvider')
  return ctx
}
