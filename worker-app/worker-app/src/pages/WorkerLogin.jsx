import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, Bike } from 'lucide-react';
import { setWorkerToken } from '../utils/workerAuth';

function WorkerLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await axios.post('/api/worker/login', { password });
      setWorkerToken(response.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError('Incorrect password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <Bike className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-secondary mb-2">Miraggio Restaurant</h1>
          <p className="text-gray-600">Worker Portal - Enter password to access dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter worker password"
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-secondary text-white py-3 rounded-lg hover:bg-secondary/90 transition font-semibold disabled:opacity-50"
          >
            {submitting ? 'Checking...' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default WorkerLogin;
