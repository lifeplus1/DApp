import React, { useState } from 'react'
import { WalletConnect, Modal } from './ui/WalletConnect'

export const UIShowcase: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<string>()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleConnect = () => {
    setIsConnected(true)
    setAddress('0x742d35Cc6635C0532925a3b8D74B2aBce4ba5bDc')
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    setAddress(undefined)
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🎨 UI Components Showcase
        </h1>
        <p className="text-gray-600">
          Tailwind CSS v3 + Headless UI working perfectly!
        </p>
      </div>

      {/* Status */}
      <div className="flex justify-center space-x-2">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          ✅ Tailwind CSS Active
        </span>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          🎯 Headless UI Ready
        </span>
      </div>

      {/* Wallet Connect Demo */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Headless UI Wallet Component</h2>
        <div className="flex justify-center">
          <WalletConnect
            isConnected={isConnected}
            address={address}
            balance="0.156"
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Tailwind CSS Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Primary
          </button>
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Secondary
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Success
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Open Modal
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            💰
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Value</h3>
          <p className="text-2xl font-bold text-blue-600">$1,234,567</p>
          <p className="text-sm text-gray-500 mt-1">24h change: +5.2%</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            📈
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Best APY</h3>
          <p className="text-2xl font-bold text-green-600">8.00%</p>
          <p className="text-sm text-gray-500 mt-1">UniswapV3 Strategy</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            🎯
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Strategies</h3>
          <p className="text-2xl font-bold text-purple-600">5</p>
          <p className="text-sm text-gray-500 mt-1">All active & optimized</p>
        </div>
      </div>

      {/* Modal Demo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="🎉 Headless UI Modal"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            This modal is built with Headless UI and styled with Tailwind CSS. 
            It includes proper focus management, transitions, and accessibility features.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
