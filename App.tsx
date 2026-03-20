import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ScanProvider, useScan } from './contexts/ScanContext';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ScannerScreen from './screens/ScannerScreen';
import ProgressScreen from './screens/ProgressScreen';

type Screen = 'login' | 'home' | 'scanner' | 'progress';

function AppContent() {
  const { userId } = useAuth();
  const { setScanType } = useScan();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  if (!userId) {
    return <LoginScreen />;
  }

  const handleSelectScanType = (type: 'long' | 'short') => {
    setScanType(type);
    setCurrentScreen('scanner');
  };

  const handleScanComplete = () => {
    setCurrentScreen('progress');
  };

  const handleProgressComplete = () => {
    setCurrentScreen('home');
  };

  return (
    <div className="transition-opacity duration-300">
      {currentScreen === 'home' && (
        <HomeScreen onSelectScanType={handleSelectScanType} />
      )}
      {currentScreen === 'scanner' && (
        <ScannerScreen onComplete={handleScanComplete} onBack={() => setCurrentScreen('home')} />
      )}
      {currentScreen === 'progress' && (
        <ProgressScreen onComplete={handleProgressComplete} />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ScanProvider>
        <AppContent />
      </ScanProvider>
    </AuthProvider>
  );
}

export default App;
