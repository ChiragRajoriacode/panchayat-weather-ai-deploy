import { createContext, useContext, useState } from 'react'

const SelCtx = createContext(null)

export function SelectionProvider({ children }) {
  const [selectedPanchayatId, setSelectedPanchayatId] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const openPanchayat = (id) => {
    setSelectedPanchayatId(id)
    setDrawerOpen(true)
  }
  const closeDrawer = () => setDrawerOpen(false)

  return (
    <SelCtx.Provider value={{ selectedPanchayatId, setSelectedPanchayatId, drawerOpen, openPanchayat, closeDrawer }}>
      {children}
    </SelCtx.Provider>
  )
}

export function useSelection() {
  const ctx = useContext(SelCtx)
  if (!ctx) throw new Error('useSelection requires SelectionProvider')
  return ctx
}
