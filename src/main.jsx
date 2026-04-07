import React from 'react'
import ReactDOM from 'react-dom/client'
import PureDispatcher from './PureDispatcher.jsx'
import AdminPortal from './AdminPortal.jsx'

const isAdminRoute = window.location.pathname.startsWith('/admin')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdminRoute ? <AdminPortal /> : <PureDispatcher />}
  </React.StrictMode>,
)
