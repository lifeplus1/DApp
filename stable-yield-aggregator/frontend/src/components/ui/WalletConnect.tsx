import React from 'react'
import { Fragment } from 'react'
import { Menu, Transition, Dialog } from '@headlessui/react'
import { 
  ChevronDownIcon, 
  WalletIcon, 
  CogIcon, 
  ArrowRightOnRectangleIcon 
} from '@heroicons/react/24/outline'
import { cn } from '../lib/utils'

interface WalletConnectProps {
  isConnected: boolean
  address?: string | undefined
  balance?: string
  onConnect: () => void
  onDisconnect: () => void
}

export const WalletConnect: React.FC<WalletConnectProps> = ({
  isConnected,
  address,
  balance,
  onConnect,
  onDisconnect,
}) => {
  if (!isConnected) {
    return (
      <button
        onClick={onConnect}
        className={cn(
          "btn-primary px-4 py-2 rounded-lg",
          "flex items-center space-x-2",
          "transition-all duration-200",
          "hover:scale-105 active:scale-95"
        )}
      >
        <WalletIcon className="h-5 w-5" />
        <span>Connect Wallet</span>
      </button>
    )
  }

  return (
    <Menu as="div" className="relative">
      <Menu.Button
        className={cn(
          "btn-secondary px-4 py-2 rounded-lg",
          "flex items-center space-x-2 min-w-[200px]",
          "hover:bg-gray-50 transition-colors"
        )}
      >
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
            <div className="text-xs text-gray-500">
              {balance} ETH
            </div>
          </div>
        </div>
        <ChevronDownIcon className="h-4 w-4 text-gray-400" />
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <Menu.Item>
            {({ active }) => (
              <button
                className={cn(
                  "flex items-center w-full px-4 py-2 text-sm text-gray-700",
                  active && "bg-gray-50"
                )}
              >
                <CogIcon className="h-4 w-4 mr-3" />
                Settings
              </button>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={onDisconnect}
                className={cn(
                  "flex items-center w-full px-4 py-2 text-sm text-red-600",
                  active && "bg-red-50"
                )}
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                Disconnect
              </button>
            )}
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}

// Modal Component using Headless UI
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  {title}
                </Dialog.Title>
                <div className="mt-4">{children}</div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
