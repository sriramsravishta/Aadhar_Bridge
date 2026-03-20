import { useState } from 'react';
import { FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const [employeeId, setEmployeeId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(employeeId.trim());

    if (!success) {
      setError('Please enter a valid Employee ID');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-start justify-center pt-12 px-5">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10 animate-fade-up">
          <div className="w-14 h-14 bg-frame rounded-card flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-surface" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">Aadhaar Bridge</h1>
          <p className="text-text-secondary text-sm mt-1 tracking-wide">Hospital Registration</p>
        </div>

        <div className="paper-card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="employeeId" className="block text-[11px] font-medium text-text-secondary uppercase tracking-wider mb-2">
                Employee ID
              </label>
              <input
                type="text"
                id="employeeId"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary text-[15px] transition-all duration-200 ease-ink focus:border-frame focus:ring-1 focus:ring-frame/30"
                placeholder="e.g. EMP-1234 or staff UUID"
                autoComplete="off"
                required
              />
            </div>

            {error && (
              <div className="text-error text-sm text-center animate-fade-up">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || !employeeId.trim()}
              className="w-full bg-frame text-white py-3 rounded-lg font-medium text-[15px] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-ink active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-16 h-[2px] bg-white/30 rounded-full overflow-hidden">
                    <span className="block h-full bg-white animate-ink-fill" />
                  </span>
                  <span>Starting...</span>
                </span>
              ) : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
