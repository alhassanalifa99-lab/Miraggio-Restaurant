import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import CustomerOrder from './pages/CustomerOrder';
import WorkerDashboard from './pages/WorkerDashboard';
import WorkerLogin from './pages/WorkerLogin';
import OrderConfirmation from './pages/OrderConfirmation';
import OrderTracking from './pages/OrderTracking';
import { isWorkerAuthenticated } from './utils/workerAuth';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  return isWorkerAuthenticated() ? children : <Navigate to="/worker-login" />;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<CustomerOrder />} />
          <Route path="/worker-login" element={<WorkerLogin />} />
          <Route 
            path="/worker" 
            element={
              <ProtectedRoute>
                <WorkerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
          <Route path="/track-order" element={<OrderTracking />} />
          <Route path="/track-order/:orderNumber" element={<OrderTracking />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
