import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import WorkerDashboard from './pages/WorkerDashboard';
import WorkerLogin from './pages/WorkerLogin';
import { isWorkerAuthenticated } from './utils/workerAuth';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  return isWorkerAuthenticated() ? children : <Navigate to="/" />;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<WorkerLogin />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <WorkerDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
