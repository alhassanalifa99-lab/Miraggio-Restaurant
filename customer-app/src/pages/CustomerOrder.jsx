import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCart, Plus, Minus, Bike, MapPin, AlertCircle, Truck, Store } from 'lucide-react';

function CustomerOrder() {
  const [menu, setMenu] = useState([]);
  const [branch, setBranch] = useState(null);
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState('pickup'); // 'pickup' | 'delivery'
  const [deliveryZoneId, setDeliveryZoneId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [menuRes, branchesRes, zonesRes] = await Promise.all([
        axios.get('/api/menu'),
        axios.get('/api/branches'),
        axios.get('/api/delivery-zones')
      ]);
      setMenu(menuRes.data);
      setBranch(branchesRes.data[0] || null);
      setDeliveryZones(zonesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(i => i.id === item.id);
      if (existingItem) {
        return prevCart.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prevCart, { ...item, quantity: 1, note: '' }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(i => i.id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(i =>
          i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      return prevCart.filter(i => i.id !== itemId);
    });
  };

  const updateItemNote = (itemId, note) => {
    setCart(prevCart => prevCart.map(i => (i.id === itemId ? { ...i, note } : i)));
  };

  const getSelectedZone = () => deliveryZones.find(z => z.id === parseInt(deliveryZoneId));

  const getItemsTotal = () => cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  const getDeliveryFee = () => {
    if (deliveryType !== 'delivery') return 0;
    const zone = getSelectedZone();
    return zone ? zone.fee : 0;
  };

  const getGrandTotal = () => getItemsTotal() + getDeliveryFee();

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Please add items to your cart');
      return;
    }
    if (!customerName.trim()) {
      alert('Please enter your name');
      return;
    }
    if (deliveryType === 'delivery' && !deliveryZoneId) {
      alert('Please select a delivery area');
      return;
    }
    if (!branch || !branch.is_open) {
      alert('Sorry, we are currently closed. Please check back later.');
      return;
    }

    setCheckoutError('');
    setSubmitting(true);
    try {
      const orderData = {
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_type: deliveryType,
        delivery_zone_id: deliveryType === 'delivery' ? parseInt(deliveryZoneId) : undefined,
        items: cart.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          note: item.note
        }))
      };

      // Payment happens before the order is created — this only starts a
      // Paystack transaction and redirects there. The order itself gets
      // created after payment succeeds (see PaymentCallback.jsx).
      // Payment happens before the order is created — this only starts a
      // Paystack transaction and redirects there. The order itself gets
      // created after payment succeeds (see PaymentCallback.jsx).
      const response = await axios.post('/api/checkout/initiate', orderData);
      window.location.href = response.data.authorization_url;
    } catch (error) {
      console.error('Error starting checkout:', error);
      const backendMessage = error.response?.data?.error || '';

      if (backendMessage === 'Restaurant is currently closed') {
        setCheckoutError('Sorry, we are currently closed. Please check back later.');
      } else if (backendMessage.toLowerCase().includes('paystack is not configured')) {
        // Internal config detail — don't show this raw message to customers
        setCheckoutError('Online payment is temporarily unavailable. Please contact the restaurant directly to place your order, or try again later.');
      } else {
        setCheckoutError(backendMessage || 'Something went wrong starting checkout. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const groupedMenu = menu.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Quick Order Tracking */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Track your order (e.g., 001)"
            className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => navigate('/track-order')}
            className="bg-secondary text-white px-4 py-2 rounded-md hover:bg-secondary/90 transition"
          >
            Track
          </button>
        </div>
      </div>

      {/* Location + open/closed status */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bike className="w-6 h-6 text-secondary" />
          <div>
            <p className="font-semibold flex items-center">
              <MapPin className="w-4 h-4 mr-1 text-primary" />
              {branch?.location || 'Asawasi Dogo moro park'}
            </p>
          </div>
        </div>
        {branch && !branch.is_open && (
          <div className="flex items-center space-x-1 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">Currently Closed</span>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Menu Section */}
        <div className="lg:col-span-2 space-y-8">
          {Object.entries(groupedMenu).map(([category, items]) => (
            <div key={category} className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 text-secondary">{category}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {items.map(item => (
                  <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <span className="text-primary font-bold">GHS {item.price.toFixed(2)}</span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                    <button
                      onClick={() => addToCart(item)}
                      className="w-full bg-secondary text-white py-2 rounded-md hover:bg-secondary/90 transition flex items-center justify-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2 text-primary" />
              Your Order
            </h2>

            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Your cart is empty</p>
            ) : (
              <>
                <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">GHS {item.price.toFixed(2)} each</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 transition flex items-center justify-center"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="w-8 h-8 rounded-full bg-primary text-white hover:bg-primary/90 transition flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder='Special instructions (e.g. "no onion", "Coke not Fanta")'
                        value={item.note}
                        onChange={(e) => updateItemNote(item.id, e.target.value)}
                        maxLength={200}
                        className="w-full text-sm px-2 py-1.5 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  ))}
                </div>

                {/* Pickup vs Delivery */}
                <div className="border-t pt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">How do you want your order?</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryType('pickup')}
                        className={`py-2 rounded-md border flex items-center justify-center space-x-2 transition ${
                          deliveryType === 'pickup' ? 'bg-secondary text-white border-secondary' : 'border-gray-300 text-gray-700'
                        }`}
                      >
                        <Store className="w-4 h-4" />
                        <span>Pickup</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryType('delivery')}
                        className={`py-2 rounded-md border flex items-center justify-center space-x-2 transition ${
                          deliveryType === 'delivery' ? 'bg-secondary text-white border-secondary' : 'border-gray-300 text-gray-700'
                        }`}
                      >
                        <Truck className="w-4 h-4" />
                        <span>Delivery</span>
                      </button>
                    </div>
                  </div>

                  {deliveryType === 'delivery' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Area</label>
                      <select
                        value={deliveryZoneId}
                        onChange={(e) => setDeliveryZoneId(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select your area...</option>
                        {deliveryZones.map(zone => (
                          <option key={zone.id} value={zone.id}>
                            {zone.name} — GHS {zone.fee.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 space-y-2 mt-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Items</span>
                    <span>GHS {getItemsTotal().toFixed(2)}</span>
                  </div>
                  {deliveryType === 'delivery' && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Delivery Fee</span>
                      <span>GHS {getDeliveryFee().toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">GHS {getGrandTotal().toFixed(2)}</span>
                  </div>

                  <div className="space-y-2 pt-2">
                    <input
                      type="text"
                      placeholder="Your Name *"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number (Optional)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {checkoutError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-md">
                      {checkoutError}
                    </div>
                  )}

                  <button
                    onClick={handleSubmitOrder}
                    disabled={submitting}
                    className="w-full bg-primary text-white py-3 rounded-md hover:bg-primary/90 transition font-semibold disabled:opacity-50"
                  >
                    {submitting ? 'Redirecting to payment...' : `Pay GHS ${getGrandTotal().toFixed(2)} & Place Order`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerOrder;
