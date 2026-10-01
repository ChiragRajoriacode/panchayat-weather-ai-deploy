import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { LiveDataProvider } from './context/LiveDataContext'
import { AuthProvider } from './context/AuthContext'
import { SelectionProvider } from './context/SelectionContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LiveDataProvider>
          <SelectionProvider>
            <App />
          </SelectionProvider>
        </LiveDataProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
