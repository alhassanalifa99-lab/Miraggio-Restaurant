import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, XCircle, ArrowLeft } from 'lucide-react';

function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');

    if (!reference) {
      setError('Missing payment reference. If you completed a payment, please contact the restaurant with your payment details.');
      return;
    }

    verifyAndCreateOrder(reference);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyAndCreateOrder = async (reference) => {
    try {
      const response = await axios.get(`/api/checkout/verify/${reference}`);
      // Success — the order now exists, go straight to its confirmation page
      navigate(`/order-confirmation/${response.data.order_id}`, { replace: true });
    } catch (err) {
      console.error('Payment verification failed:', err);
      setError(
        err.response?.data?.error ||
        'We could not confirm your payment. If money was deducted, please contact the restaurant before trying again.'
      );
    }
  };

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Payment Not Confirmed</h2>
          <p className="text-red-700 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-2 bg-secondary text-white px-4 py-2 rounded-md hover:bg-secondary/90 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Ordering</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
      <h2 className="text-xl font-semibold text-secondary mb-2">Confirming your payment...</h2>
      <p className="text-gray-600">Please don't close this page.</p>
    </div>
  );
}

export default PaymentCallback;
