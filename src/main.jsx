import React from 'react'
import ReactDOM from 'react-dom/client'
import PureDispatcher from './PureDispatcher.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PureDispatcher />
  </React.StrictMode>,
)
