import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Clock, ChefHat, Package, Bike, MapPin, RefreshCw, Hash, ToggleLeft, ToggleRight, LogOut, BellRing } from 'lucide-react';
import { authHeader, clearWorkerToken } from '../utils/workerAuth';

// How often to poll for new orders (ms)
const POLL_INTERVAL = 15000;

function WorkerDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [branch, setBranch] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState(false);

  // Tracks every order id we've already seen, so we only alert on genuinely new ones
  const knownOrderIds = useRef(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    fetchBranch();
    checkForNewOrders(); // establish baseline + first paint

    const interval = setInterval(checkForNewOrders, POLL_INTERVAL);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus]);

  const fetchBranch = async () => {
    try {
      const response = await axios.get('/api/branches');
      setBranch(response.data[0] || null);
    } catch (error) {
      console.error('Error fetching branch:', error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/orders', {
        params: { status: selectedStatus },
        headers: authHeader()
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  // Polls ALL orders (not just the currently filtered status) so a new order
  // triggers an alert even if the dashboard is currently viewing "Completed", etc.
  const checkForNewOrders = async () => {
    try {
      const response = await axios.get('/api/orders', { headers: authHeader() });
      const allOrders = response.data;

      if (isFirstLoad.current) {
        // Baseline: remember every order that already exists, alert on nothing yet
        allOrders.forEach(o => knownOrderIds.current.add(o.id));
        isFirstLoad.current = false;
        return;
      }

      const trulyNewOrders = allOrders.filter(o => !knownOrderIds.current.has(o.id));
      allOrders.forEach(o => knownOrderIds.current.add(o.id));

      if (trulyNewOrders.length > 0) {
        triggerNewOrderAlert();
        // Refresh the visible list too, in case the new order matches the current filter
        fetchOrders();
      }
    } catch (error) {
      console.error('Error polling for new orders:', error);
    }
  };

  const triggerNewOrderAlert = () => {
    playAlertSound();
    setNewOrderAlert(true);
    setTimeout(() => setNewOrderAlert(false), 6000);
  };

  // Simple two-tone beep using the Web Audio API — no audio file needed.
  const playAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const playTone = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = ctx.currentTime;
      playTone(880, now, 0.25);
      playTone(1175, now + 0.3, 0.25);
    } catch (error) {
      console.error('Unable to play alert sound:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.patch(`/api/orders/${orderId}/status`, { status: newStatus }, { headers: authHeader() });
      await fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order status');
    }
  };

  const toggleBranchStatus = async () => {
    if (!branch) return;
    try {
      await axios.patch(`/api/branches/${branch.id}/status`, { is_open: !branch.is_open }, { headers: authHeader() });
      await fetchBranch();
    } catch (error) {
      console.error('Error updating branch status:', error);
      alert('Failed to update branch status');
    }
  };

  const handleLogout = () => {
    clearWorkerToken();
    navigate('/worker-login');
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

  const getStatusIcon = (status) => {
    const icons = {
      pending: Clock,
      confirmed: CheckCircle,
      preparing: ChefHat,
      ready: Package,
      completed: CheckCircle
    };
    const Icon = icons[status] || Clock;
    return <Icon className="w-4 h-4" />;
  };

  const formatOrderNumber = (num) => {
    return String(num).padStart(3, '0');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* New order alert banner */}
      {newOrderAlert && (
        <div className="mb-6 bg-primary text-white rounded-lg shadow-lg p-4 flex items-center space-x-3 animate-pulse">
          <BellRing className="w-6 h-6" />
          <span className="font-semibold">New order received!</span>
        </div>
      )}

      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">Worker Dashboard</h1>
          <p className="text-gray-600 flex items-center">
            <MapPin className="w-4 h-4 mr-1" />
            {branch?.location || 'Asawasi Dogo moro park'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition flex items-center space-x-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Order Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Restaurant Status</label>
            <button
              onClick={toggleBranchStatus}
              className={`w-full py-2 px-4 rounded-md transition flex items-center justify-center space-x-2 ${
                branch?.is_open
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-red-100 text-red-800 hover:bg-red-200'
              }`}
            >
              {branch?.is_open ? (
                <>
                  <ToggleRight className="w-4 h-4" />
                  <span>Open</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4" />
                  <span>Closed</span>
                </>
              )}
            </button>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full bg-secondary text-white py-2 px-4 rounded-md hover:bg-secondary/90 transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Bike className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Orders Found</h3>
          <p className="text-gray-500">There are no orders with the selected status</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-wrap justify-between items-start mb-4">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold">Order #{formatOrderNumber(order.order_number || order.id)}</h3>
                    {order.queue_number && (
                      <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-bold flex items-center space-x-1">
                        <Hash className="w-4 h-4" />
                        <span>Queue #{order.queue_number}</span>
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="capitalize">{order.status}</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-gray-600 text-sm">
                    <span>{new Date(order.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">GHS {order.total_amount.toFixed(2)}</p>
                </div>
              </div>

              <div className="border-t pt-4 mb-4">
                <h4 className="font-semibold mb-2">Customer Details</h4>
                <p><span className="font-medium">Name:</span> {order.customer_name}</p>
                {order.customer_phone && <p><span className="font-medium">Phone:</span> {order.customer_phone}</p>}
                <p className="mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-medium ${
                    order.delivery_type === 'delivery' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {order.delivery_type === 'delivery'
                      ? `Delivery — ${order.delivery_zone_name} (GHS ${(order.delivery_fee || 0).toFixed(2)})`
                      : 'Pickup'}
                  </span>
                </p>
              </div>

              <div className="border-t pt-4 mb-4">
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

              {/* Action Buttons */}
              <div className="border-t pt-4 flex flex-wrap gap-2">
                {order.status === 'pending' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'confirmed')}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition flex items-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirm Order</span>
                  </button>
                )}
                {order.status === 'confirmed' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition flex items-center space-x-2"
                  >
                    <ChefHat className="w-4 h-4" />
                    <span>Start Preparing</span>
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'ready')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition flex items-center space-x-2"
                  >
                    <Package className="w-4 h-4" />
                    <span>Mark as Ready</span>
                  </button>
                )}
                {order.status === 'ready' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'completed')}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition flex items-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Complete Order</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default WorkerDashboard;
