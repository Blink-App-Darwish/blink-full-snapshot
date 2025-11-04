import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import Pages from './pages';
import { Toaster } from 'sonner';
import './App.css';

function App() {
  useEffect(() => {
    console.log('🔗 App mounted - initializing services...');
    
    // Only import NativeServices if we might need it
    // This import() is conditional at runtime, not build time
    import('./services/NativeServices')
      .then(({ initializeNativeServices }) => {
        console.log('✅ NativeServices module loaded');
        initializeNativeServices();
      })
      .catch((error) => {
        console.log('🌐 Web mode - NativeServices not available (expected)');
        console.log('Error:', error?.message);
      });
  }, []);

  return (
    <BrowserRouter>
      <Pages />
      <Toaster position="top-center" />
    </BrowserRouter>
  );
}

export default App;
