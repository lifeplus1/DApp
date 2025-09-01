import React, { useState, useEffect } from 'react';
import { EnterprisePortfolioDashboard } from './EnterprisePortfolioDashboard';
import { ProfessionalTradingPanel } from './ProfessionalTradingPanel';
import { InstitutionalAnalytics } from './InstitutionalAnalytics';
import { AdvancedMonitoringDashboard } from './AdvancedMonitoringDashboard';
import { 
  Menu, 
  X, 
  Home, 
  BarChart3, 
  Settings, 
  Activity,
  Bell,
  User,
  HelpCircle,
  LogOut,
  Moon,
  Sun
} from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
}

// Comprehensive Production UI/UX Component
export const ProductionDeFiInterface: React.FC = () => {
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Portfolio',
      icon: Home,
      component: EnterprisePortfolioDashboard
    },
    {
      id: 'trading',
      label: 'Trading',
      icon: BarChart3,
      component: ProfessionalTradingPanel
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: Activity,
      component: InstitutionalAnalytics
    },
    {
      id: 'monitoring',
      label: 'Monitoring',
      icon: Settings,
      component: AdvancedMonitoringDashboard
    }
  ];

  // Responsive detection
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Dark mode toggle
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Get current component
  const getCurrentComponent = () => {
    const currentItem = navigationItems.find(item => item.id === activeView);
    return currentItem?.component || EnterprisePortfolioDashboard;
  };

  const CurrentComponent = getCurrentComponent();

  return (
    <div className={`min-h-screen bg-gray-50 transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      {/* Mobile Header */}
      {isMobile && (
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between lg:hidden">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              DeFi Portfolio
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <button className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Bell className="w-5 h-5" />
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>
      )}

      <div className="flex h-screen">
        {/* Sidebar */}
        <div className={`
          ${isMobile 
            ? `fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : 'w-64 flex-shrink-0'
          }
          bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
        `}>
          {/* Desktop Header */}
          {!isMobile && (
            <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                DeFi Pro
              </h1>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Navigation */}
          <nav className={`${isMobile ? 'mt-4' : 'mt-0'} px-4 pb-4`}>
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      if (isMobile) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-left transition-all duration-200 ${
                      activeView === item.id
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* User Profile Section */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-2">
                <button className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-left text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200">
                  <User className="w-5 h-5" />
                  <span className="font-medium">Profile</span>
                </button>
                <button className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-left text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200">
                  <HelpCircle className="w-5 h-5" />
                  <span className="font-medium">Help</span>
                </button>
                <button className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-left text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200">
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>

              {/* Portfolio Summary */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Portfolio Value</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">$2.55M</p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">+2.4% today</p>
                </div>
              </div>
            </div>
          </nav>
        </div>

        {/* Mobile Overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Desktop Header */}
          {!isMobile && (
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {navigationItems.find(item => item.id === activeView)?.label || 'Dashboard'}
                </h2>
                
                {/* Breadcrumb */}
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>DeFi Portfolio</span>
                  <span>/</span>
                  <span>{navigationItems.find(item => item.id === activeView)?.label}</span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Real-time indicator */}
                <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Live</span>
                </div>

                {/* Notifications */}
                <button className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 relative">
                  <Bell className="w-5 h-5" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                </button>

                {/* User Avatar */}
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  U
                </div>
              </div>
            </header>
          )}

          {/* Content Area */}
          <main className="flex-1 overflow-auto">
            <div className={`${isMobile ? 'p-4' : 'p-6'} h-full`}>
              <CurrentComponent />
            </div>
          </main>

          {/* Mobile Bottom Navigation */}
          {isMobile && (
            <nav className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
              <div className="flex items-center justify-around">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveView(item.id)}
                      className={`flex flex-col items-center space-y-1 py-2 px-3 rounded-lg transition-all duration-200 ${
                        activeView === item.id
                          ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductionDeFiInterface;
