import React, { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * @title Responsive Utilities
 * @notice Phase 5.2 responsive design utilities and hooks
 */

// Breakpoint definitions
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * @title useResponsive Hook
 * @notice Hook for responsive behavior based on screen size
 */
export const useResponsive = () => {
  const [screenSize, setScreenSize] = useState<{
    width: number;
    height: number;
    breakpoint: Breakpoint;
  }>(() => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      return {
        width,
        height: window.innerHeight,
        breakpoint: getBreakpoint(width)
      };
    }
    return { width: 1024, height: 768, breakpoint: 'lg' as Breakpoint };
  });

  const updateScreenSize = useCallback(() => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setScreenSize({
        width,
        height,
        breakpoint: getBreakpoint(width)
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateScreenSize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [updateScreenSize]);

  const isMobile = useMemo(() => screenSize.width < BREAKPOINTS.md, [screenSize.width]);
  const isTablet = useMemo(() => 
    screenSize.width >= BREAKPOINTS.md && screenSize.width < BREAKPOINTS.lg, 
    [screenSize.width]
  );
  const isDesktop = useMemo(() => screenSize.width >= BREAKPOINTS.lg, [screenSize.width]);

  return {
    ...screenSize,
    isMobile,
    isTablet,
    isDesktop,
    isSmall: screenSize.breakpoint === 'sm',
    isMedium: screenSize.breakpoint === 'md',
    isLarge: screenSize.breakpoint === 'lg',
    isExtraLarge: screenSize.breakpoint === 'xl',
    is2ExtraLarge: screenSize.breakpoint === '2xl'
  };
};

function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  return 'sm';
}

/**
 * @title ResponsiveContainer Component
 * @notice Container with responsive padding and max-width
 */

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = React.memo(({
  children,
  className = '',
  maxWidth = 'xl',
  padding = 'md'
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-7xl',
    '2xl': 'max-w-none',
    full: 'max-w-full'
  };

  const paddingClasses = {
    none: '',
    sm: 'px-4 py-2 sm:px-6 sm:py-3',
    md: 'px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8',
    lg: 'px-6 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-12'
  };

  return (
    <div className={`
      mx-auto w-full
      ${maxWidthClasses[maxWidth]}
      ${paddingClasses[padding]}
      ${className}
    `}>
      {children}
    </div>
  );
});
ResponsiveContainer.displayName = 'ResponsiveContainer';

/**
 * @title ResponsiveGrid Component
 * @notice Responsive grid with customizable columns
 */

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = React.memo(({
  children,
  columns = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 'md',
  className = ''
}) => {
  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8'
  };

  const gridCols: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6'
  };

  const responsiveClasses = [
    columns.sm && `${gridCols[columns.sm]}`,
    columns.md && `md:${gridCols[columns.md]}`,
    columns.lg && `lg:${gridCols[columns.lg]}`,
    columns.xl && `xl:${gridCols[columns.xl]}`
  ].filter(Boolean).join(' ');

  return (
    <div className={`
      grid ${responsiveClasses} ${gapClasses[gap]} ${className}
    `}>
      {children}
    </div>
  );
});
ResponsiveGrid.displayName = 'ResponsiveGrid';

/**
 * @title ResponsiveText Component
 * @notice Text with responsive sizing
 */

interface ResponsiveTextProps {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
  size?: {
    sm?: string;
    md?: string;
    lg?: string;
  };
  className?: string;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = React.memo(({
  children,
  as: Component = 'p',
  size = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' },
  className = ''
}) => {
  const responsiveClasses = [
    size.sm,
    size.md && `md:${size.md}`,
    size.lg && `lg:${size.lg}`
  ].filter(Boolean).join(' ');

  return (
    <Component className={`${responsiveClasses} ${className}`}>
      {children}
    </Component>
  );
});
ResponsiveText.displayName = 'ResponsiveText';

/**
 * @title MobileMenu Component
 * @notice Mobile-optimized navigation menu
 */

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const MobileMenu: React.FC<MobileMenuProps> = React.memo(({
  isOpen,
  onClose,
  children,
  className = ''
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 lg:hidden"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
      
      {/* Menu Panel */}
      <div className={`
        fixed inset-y-0 right-0 max-w-sm w-full bg-white shadow-xl
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        ${className}
      `}>
        <div className="flex flex-col h-full">
          {/* Close button */}
          <div className="flex justify-end p-4">
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Menu content */}
          <div className="flex-1 px-4 pb-4 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
});
MobileMenu.displayName = 'MobileMenu';

/**
 * @title useMediaQuery Hook
 * @notice Hook for CSS media queries
 */

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    
    const handleChange = () => setMatches(mediaQuery.matches);
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [query]);

  return matches;
};

/**
 * @title Responsive Image Component
 * @notice Optimized image with responsive sizing
 */

interface ResponsiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = React.memo(({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  objectFit = 'cover'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const objectFitClass = {
    contain: 'object-contain',
    cover: 'object-cover',
    fill: 'object-fill',
    none: 'object-none',
    'scale-down': 'object-scale-down'
  };

  if (hasError) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-400 text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={`
          w-full h-full transition-opacity duration-300
          ${objectFitClass[objectFit]}
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
        `}
      />
    </div>
  );
});
ResponsiveImage.displayName = 'ResponsiveImage';

export default {
  BREAKPOINTS,
  useResponsive,
  useMediaQuery,
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveText,
  ResponsiveImage,
  MobileMenu
};
