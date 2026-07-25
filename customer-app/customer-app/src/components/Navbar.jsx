import { Link } from 'react-router-dom';
import { Bike, Utensils, Search } from 'lucide-react';

function Navbar() {
  return (
    <nav className="bg-secondary text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Bike className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Miraggio Restaurant</h1>
              <p className="text-xs text-gray-300">Fast Food Restaurant</p>
            </div>
          </Link>
          <div className="flex space-x-4">
            <Link 
              to="/" 
              className="flex items-center space-x-1 px-3 py-2 rounded-md hover:bg-white/10 transition"
            >
              <Utensils className="w-4 h-4" />
              <span>Order</span>
            </Link>
            <Link 
              to="/track-order" 
              className="flex items-center space-x-1 px-3 py-2 rounded-md hover:bg-white/10 transition"
            >
              <Search className="w-4 h-4" />
              <span>Track Order</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
