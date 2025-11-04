import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Pages from './pages';
import './index.css';

// CRITICAL: Import Capacitor App plugin to register it
import '@capacitor/app';
import ScriptInjector from './components/ScriptInjector';
console.log('🚀 main.tsx loading');

const root = createRoot(document.getElementById('root')!);

console.log('🚀 Starting React app');
root.render(
  <StrictMode>
    <ScriptInjector />
    <Pages />
  </StrictMode>
);

console.log('🚀 React app started');
