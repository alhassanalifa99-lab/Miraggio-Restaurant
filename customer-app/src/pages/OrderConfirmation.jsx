import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Bike, MapPin, Clock, ArrowLeft, Home, Hash, ShieldCheck } from 'lucide-react';

function OrderConfirmation() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await axios.get(`/api/orders/${orderId}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-purple-100 text-purple-800',
      ready: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatOrderNumber = (num) => {
    return String(num).padStart(3, '0');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-gray-600 mb-4">Order not found</p>
        <Link to="/" className="text-primary hover:underline">Return to ordering</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-secondary mb-2">Order Placed Successfully!</h1>
          <p className="text-gray-600">Thank you for ordering from Miraggio Restaurant</p>
        </div>

        {/* Order Details */}
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Order #{formatOrderNumber(order.order_number || order.id)}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>

            {order.payment_status === 'paid' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <span className="text-green-800 font-medium text-sm">Payment confirmed</span>
              </div>
            )}

            {order.queue_number && (
              <div className="bg-primary text-white rounded-lg p-4 mb-4 flex items-center justify-center space-x-2">
                <Hash className="w-6 h-6" />
                <span className="text-2xl font-bold">Queue #{order.queue_number}</span>
              </div>
            )}

            <div className="space-y-3 text-gray-600">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-primary" />
                <span>Placed on {new Date(order.created_at).toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-primary" />
                <span>{order.branch_name} - {order.location}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-medium ${
                  order.delivery_type === 'delivery' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-700'
                }`}>
                  {order.delivery_type === 'delivery'
                    ? `Delivery to ${order.delivery_zone_name}`
                    : 'Pickup at restaurant'}
                </span>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Order Items</h3>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <span className="bg-secondary text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                        {item.quantity}
                      </span>
                      <span>{item.item_name}</span>
                    </div>
                    <span className="font-medium">GHS {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  {item.note && (
                    <p className="ml-9 text-sm text-orange-700 italic">Note: {item.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="border-t pt-6 space-y-2">
            {order.delivery_type === 'delivery' && (
              <>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Items</span>
                  <span>GHS {(order.items_total ?? (order.total_amount - (order.delivery_fee || 0))).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Delivery Fee</span>
                  <span>GHS {(order.delivery_fee || 0).toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total Paid</span>
              <span className="text-primary">GHS {order.total_amount.toFixed(2)}</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-primary/10 rounded-lg p-6">
            <h3 className="font-semibold mb-2 flex items-center">
              <Bike className="w-5 h-5 mr-2 text-primary" />
              What's Next?
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li>• Your order has been received and is being processed</li>
              <li>• You can track your order status at the restaurant</li>
              {order.queue_number ? (
                <li>• Please show your <strong>Queue #{order.queue_number}</strong> when picking up</li>
              ) : (
                <li>• Please show your order number <strong>#{formatOrderNumber(order.order_number || order.id)}</strong> when picking up</li>
              )}
              <li>• Estimated preparation time: 15-20 minutes</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link
              to="/"
              className="flex-1 bg-secondary text-white py-3 rounded-md hover:bg-secondary/90 transition flex items-center justify-center space-x-2"
            >
              <Home className="w-5 h-5" />
              <span>Place Another Order</span>
            </Link>
            <button
              onClick={() => navigate(-1)}
              className="flex-1 border border-secondary text-secondary py-3 rounded-md hover:bg-secondary/10 transition flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Go Back</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderConfirmation;
