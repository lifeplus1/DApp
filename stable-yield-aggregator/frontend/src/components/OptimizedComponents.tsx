import React, { memo, useCallback, useMemo, useState } from 'react';

/**
 * @title Loading Skeleton Components
 * @notice Optimized loading states for Phase 5.2 performance improvements
 */

// Generic skeleton component
export const Skeleton: React.FC<{ 
  width?: string; 
  height?: string; 
  className?: string; 
  rounded?: boolean;
}> = memo(({ width = 'w-full', height = 'h-4', className = '', rounded = false }) => (
  <div 
    className={`
      ${width} ${height} ${className}
      bg-[linear-gradient(90deg,#f0f0f0_25%,#e0e0e0_50%,#f0f0f0_75%)]
      animate-loading
      bg-[size:200%_100%]
      bg-[position:200%_0]
      ${rounded ? 'rounded-full' : 'rounded-md'}
    `}
  >
  </div>
));
Skeleton.displayName = 'Skeleton';

// Card skeleton
export const CardSkeleton: React.FC<{ showAvatar?: boolean }> = memo(({ showAvatar = false }) => (
  <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
    {showAvatar && (
      <div className="flex items-center space-x-3">
        <Skeleton width="w-12" height="h-12" rounded />
        <div className="space-y-2 flex-1">
          <Skeleton width="w-1/3" height="h-4" />
          <Skeleton width="w-1/2" height="h-3" />
        </div>
      </div>
    )}
    <div className="space-y-3">
      <Skeleton width="w-3/4" height="h-6" />
      <Skeleton width="w-full" height="h-4" />
      <Skeleton width="w-5/6" height="h-4" />
    </div>
    <div className="flex justify-between items-center">
      <Skeleton width="w-20" height="h-8" />
      <Skeleton width="w-24" height="h-8" />
    </div>
  </div>
));
CardSkeleton.displayName = 'CardSkeleton';

// Table skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = memo(({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="bg-white rounded-lg shadow overflow-hidden">
    <div className="p-4 border-b">
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width="w-24" height="h-4" />
        ))}
      </div>
    </div>
    <div className="divide-y">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-4 flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              width={colIndex === 0 ? "w-32" : "w-20"} 
              height="h-4" 
            />
          ))}
        </div>
      ))}
    </div>
  </div>
));
TableSkeleton.displayName = 'TableSkeleton';

/**
 * @title Loading States Component
 * @notice Comprehensive loading states for different UI scenarios
 */

interface LoadingStateProps {
  type: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  overlay?: boolean;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = memo(({
  type,
  size = 'md',
  message,
  overlay = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };

  const LoadingComponent = useMemo(() => {
    switch (type) {
      case 'spinner':
        return (
          <div className={`${sizeClasses[size]} border-2 border-blue-600 border-t-transparent rounded-full animate-spin`} />
        );
      
      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`${size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3'} bg-blue-600 rounded-full animate-[bounce_1s_infinite_${i*100}ms]`}
              />
            ))}
          </div>
        );
      
      case 'pulse':
        return (
          <div className={`${sizeClasses[size]} bg-blue-600 rounded-full animate-pulse`} />
        );
      
      case 'skeleton':
        return <CardSkeleton />;
      
      default:
        return null;
    }
  }, [type, size, sizeClasses]);

  const content = (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {LoadingComponent}
      {message && (
        <p className="text-gray-600 text-sm font-medium animate-pulse">
          {message}
        </p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
});
LoadingState.displayName = 'LoadingState';

/**
 * @title Optimized Button Component
 * @notice Performance-optimized button with proper memoization
 */

interface OptimizedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const OptimizedButton: React.FC<OptimizedButtonProps> = memo(({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button'
}) => {
  const baseClasses = useMemo(() => 
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
    []
  );

  const variantClasses = useMemo(() => ({
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-green-300'
  }), []);

  const sizeClasses = useMemo(() => ({
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }), []);

  const handleClick = useCallback(() => {
    if (!disabled && !loading && onClick) {
      onClick();
    }
  }, [disabled, loading, onClick]);

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        ${className}
      `}
    >
      {loading && (
        <LoadingState 
          type="spinner" 
          size="sm" 
          className="mr-2"
        />
      )}
      {children}
    </button>
  );
});
OptimizedButton.displayName = 'OptimizedButton';

/**
 * @title Performance Monitor Hook
 * @notice Hook to monitor component performance
 */

export const usePerformanceMonitor = (componentName: string) => {
  const [renderCount, setRenderCount] = useState(0);
  const [renderTimes, setRenderTimes] = useState<number[]>([]);

  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setRenderCount(prev => prev + 1);
      setRenderTimes(prev => [...prev.slice(-9), renderTime]); // Keep last 10
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} render #${renderCount + 1}: ${renderTime.toFixed(2)}ms`);
      }
    };
  });

  const averageRenderTime = useMemo(() => 
    renderTimes.length > 0 
      ? renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length
      : 0
  , [renderTimes]);

  return {
    renderCount,
    renderTimes,
    averageRenderTime
  };
};

export default {
  Skeleton,
  CardSkeleton,
  TableSkeleton,
  LoadingState,
  OptimizedButton,
  usePerformanceMonitor
};
