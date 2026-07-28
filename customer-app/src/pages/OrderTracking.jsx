import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Clock, CheckCircle, ChefHat, Package, Bike, MapPin, AlertCircle, ArrowLeft } from 'lucide-react';

function OrderTracking() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchNumber, setSearchNumber] = useState(orderNumber || '');
  const navigate = useNavigate();

  useEffect(() => {
    if (orderNumber) {
      fetchOrder(orderNumber);
    } else {
      setLoading(false);
    }
  }, [orderNumber]);

  const fetchOrder = async (orderNum) => {
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const response = await axios.get(`/api/orders/track/${orderNum}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      if (error.response?.status === 404) {
        setError('Order not found. Please check your order number.');
      } else {
        setError('Failed to fetch order. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchNumber.trim()) {
      navigate(`/track-order/${searchNumber.trim()}`);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
      preparing: 'bg-purple-100 text-purple-800 border-purple-300',
      ready: 'bg-green-100 text-green-800 border-green-300',
      completed: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: Clock,
      confirmed: CheckCircle,
      preparing: ChefHat,
      ready: Package,
      completed: CheckCircle
    };
    const Icon = icons[status] || Clock;
    return <Icon className="w-6 h-6" />;
  };

  const getStatusSteps = () => {
    const steps = [
      { key: 'pending', label: 'Pending' },
      { key: 'confirmed', label: 'Confirmed' },
      { key: 'preparing', label: 'Preparing' },
      { key: 'ready', label: 'Ready' },
      { key: 'completed', label: 'Completed' }
    ];

    const currentIndex = steps.findIndex(step => step.key === order?.status);
    
    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      current: index === currentIndex
    }));
  };

  const formatOrderNumber = (num) => {
    return String(num).padStart(3, '0');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/')}
        className="mb-6 flex items-center space-x-2 text-secondary hover:underline"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Ordering</span>
      </button>

      {/* Search Box */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <Search className="w-5 h-5 mr-2 text-primary" />
          Track Your Order
        </h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchNumber}
            onChange={(e) => setSearchNumber(e.target.value)}
            placeholder="Enter your order number (e.g., 001)"
            className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            className="bg-secondary text-white px-6 py-3 rounded-lg hover:bg-secondary/90 transition font-semibold"
          >
            Track
          </button>
        </form>
      </div>

      {/* Order Status */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6 flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Order Not Found</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {order && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-secondary">Order #{formatOrderNumber(order.order_number)}</h2>
              <p className="text-gray-600">{order.branch_name} - {order.location}</p>
            </div>
            <div className={`px-4 py-2 rounded-full border-2 flex items-center space-x-2 ${getStatusColor(order.status)}`}>
              {getStatusIcon(order.status)}
              <span className="font-semibold capitalize">{order.status}</span>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              {getStatusSteps().map((step, index) => (
                <div key={step.key} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                      step.completed
                        ? 'bg-secondary text-white'
                        : step.current
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {getStatusIcon(step.key)}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      step.current ? 'text-primary font-bold' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                  {index < getStatusSteps().length - 1 && (
                    <div
                      className={`absolute top-5 left-1/2 w-full h-1 -z-10 ${
                        step.completed ? 'bg-secondary' : 'bg-gray-200'
                      }`}
                      style={{ width: '100%', marginTop: '-20px' }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Order Details */}
          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center space-x-3 text-gray-600">
              <Clock className="w-5 h-5 text-primary" />
              <span>Placed on {new Date(order.created_at).toLocaleString()}</span>
            </div>

            {order.queue_number && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-center justify-center space-x-2">
                <Bike className="w-6 h-6 text-primary" />
                <span className="text-xl font-bold text-primary">Queue #{order.queue_number}</span>
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-2">Order Items</h4>
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <span className="bg-secondary text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                          {item.quantity}
                        </span>
                        <span className="font-medium">{item.item_name}</span>
                      </div>
                      <span className="text-gray-600">GHS {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    {item.note && (
                      <p className="mt-1 ml-9 text-sm text-orange-700 italic">Note: {item.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {order.delivery_type === 'delivery' && (
              <div className="flex justify-between items-center text-gray-600 text-sm">
                <span>Delivery Fee ({order.delivery_zone_name})</span>
                <span>GHS {(order.delivery_fee || 0).toFixed(2)}</span>
              </div>
            )}

            <div className="border-t pt-4 flex justify-between items-center text-xl font-bold">
              <span>Total Amount</span>
              <span className="text-primary">GHS {order.total_amount.toFixed(2)}</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-secondary" />
              {order.delivery_type === 'delivery' ? 'Delivery Details' : 'Pickup Instructions'}
            </h4>
            <ul className="space-y-1 text-gray-700 text-sm">
              {order.delivery_type === 'delivery' ? (
                <li>• Your order will be delivered to: {order.delivery_zone_name}</li>
              ) : (
                <li>• Visit {order.branch_name} branch at {order.location}</li>
              )}
              {order.queue_number ? (
                <li>• Show your Queue #{order.queue_number} when picking up</li>
              ) : (
                <li>• Show your order number #{order.order_number} when picking up</li>
              )}
              <li>• Estimated preparation time: 15-20 minutes</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderTracking;
