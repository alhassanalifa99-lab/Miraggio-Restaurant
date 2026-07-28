import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import CustomerOrder from './pages/CustomerOrder';
import OrderConfirmation from './pages/OrderConfirmation';
import OrderTracking from './pages/OrderTracking';
import PaymentCallback from './pages/PaymentCallback';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<CustomerOrder />} />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
          <Route path="/track-order" element={<OrderTracking />} />
          <Route path="/track-order/:orderNumber" element={<OrderTracking />} />
          <Route path="/payment-callback" element={<PaymentCallback />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
