import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { WyshProvider } from './WyshContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WyshProvider>
      <App />
    </WyshProvider>
  </React.StrictMode>
);
