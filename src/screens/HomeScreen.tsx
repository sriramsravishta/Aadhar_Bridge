import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useScan } from '../contexts/ScanContext';

interface HomeScreenProps {
  onSelectScanType: (type: 'long' | 'short') => void;
}

export default function HomeScreen({ onSelectScanType }: HomeScreenProps) {
  const { logout } = useAuth();
  const { reset } = useScan();

  const handleLogout = async () => {
    reset();
    await logout();
  };

  const handleSelectType = (type: 'long' | 'short') => {
    reset();
    onSelectScanType(type);
  };

  return (
    <div className="min-h-screen bg-surface p-5">
      <div className="max-w-sm mx-auto">
        <div className="fixed top-0 left-0 right-0 bg-surface/95 backdrop-blur-[2px] border-b border-border z-50">
          <div className="max-w-sm mx-auto flex justify-between items-center px-5 h-14">
            <h1 className="text-[17px] font-semibold text-text-primary tracking-tight">Aadhaar Bridge</h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-text-secondary transition-all duration-200 ease-ink active:scale-[0.97]"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-[13px] font-medium">Logout</span>
            </button>
          </div>
        </div>

        <div className="pt-20 space-y-3">
          <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wider mb-4 px-1">Select Document Type</p>

          <button
            onClick={() => handleSelectType('long')}
            className="w-full paper-card p-6 transition-all duration-200 ease-ink active:scale-[0.98] animate-fade-up"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-frame/10 rounded-card flex-shrink-0 flex items-center justify-center">
                <svg width="24" height="36" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="28" height="44" rx="2" stroke="#8A9A8E" strokeWidth="1.5" fill="none"/>
                  <line x1="6" y1="10" x2="26" y2="10" stroke="#8A9A8E" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="6" y1="16" x2="26" y2="16" stroke="#8A9A8E" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="6" y1="22" x2="22" y2="22" stroke="#8A9A8E" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="6" y1="28" x2="24" y2="28" stroke="#8A9A8E" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="6" y1="34" x2="20" y2="34" stroke="#8A9A8E" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="text-left">
                <h2 className="text-[16px] font-semibold text-text-primary mb-0.5">Long Aadhaar</h2>
                <p className="text-text-secondary text-[13px]">Letter format &middot; 1 side</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleSelectType('short')}
            className="w-full paper-card p-6 transition-all duration-200 ease-ink active:scale-[0.98] animate-fade-up"
            style={{ animationDelay: '80ms' }}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-frame/10 rounded-card flex-shrink-0 flex items-center justify-center">
                <svg width="36" height="24" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="44" height="28" rx="2" stroke="#8A9A8E" strokeWidth="1.5" fill="none"/>
                  <circle cx="12" cy="12" r="5" stroke="#8A9A8E" strokeWidth="1.5" fill="none"/>
                  <line x1="22" y1="8" x2="42" y2="8" stroke="#8A9A8E" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="22" y1="13" x2="38" y2="13" stroke="#8A9A8E" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="6" y1="22" x2="42" y2="22" stroke="#8A9A8E" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="text-left">
                <h2 className="text-[16px] font-semibold text-text-primary mb-0.5">Short Aadhaar</h2>
                <p className="text-text-secondary text-[13px]">PVC card &middot; 2 sides</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
