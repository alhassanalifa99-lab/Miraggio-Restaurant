import { Bike, ShieldCheck } from 'lucide-react';

function Navbar() {
  return (
    <nav className="bg-secondary text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <Bike className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Miraggio Restaurant</h1>
              <p className="text-xs text-gray-300">Staff Portal</p>
            </div>
          </div>
          <div className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-300">
            <ShieldCheck className="w-4 h-4" />
            <span>Staff Only</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
