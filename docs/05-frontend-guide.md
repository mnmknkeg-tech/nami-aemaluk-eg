# 5) دليل الواجهة الأمامية الشامل (React Frontend)

## 5.0 الربط بالباك إند والمصادقة (Backend Connection & Auth)

### 5.0.1 التطبيقات الثلاثة والـ rewrite
الفرونت عبارة عن **ثلاثة تطبيقات Next.js** في `apps/`:
- `apps/marketplace-next` — المتجر
- `apps/dashboard-web` — لوحة التحكم
- `apps/business` — بوابة التجار

كل تطبيق يعمل rewrite لأي مسار `/api/:path*` إلى `BACKEND_URL` (الافتراضي `http://localhost:4000`) — انظر `apps/*/next.config.mjs`:
```javascript
// apps/*/next.config.mjs (مثال marketplace-next)
async rewrites() {
  const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000').trim();
  return [
    { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
  ];
}
```
تطبيق `dashboard-web` يقرأ `BACKEND_URL` أولاً ثم `NEXT_PUBLIC_BACKEND_URL` ثم الافتراضي. هذا يعني أن كود المتصفح ينادي `/api/...` نسبياً، والـ rewrite يوصّله للباك إند Go (Fiber) الذي يخدم الـ 29 موديول تحت `/api/v1`.

### 5.0.2 المصادقة في المتصفح
- `localStorage`: المفاتيح `ray_user` / `ray_token` / `token`
- كوكي `ray_session`
- الدخول التجريبي للتطوير عبر صفحة `/admin/gate` — **تظهر فقط خارج الإنتاج**
- الأدوار في الـ JWT بأحرف كبيرة حصراً: `CUSTOMER` / `MERCHANT` / `ADMIN` / `COURIER` / `CASHIER`

### 5.0.3 الباك إند الذي تتكلم معه هذه التطبيقات
- الباك إند الوحيد: **Go 1.25 + Fiber v2.52.5** في `gobackend/`
- المراقبة: `/monitoring/live` و`/monitoring/ready` و`/metrics` و`/api/v1/status`
- لا يوجد أي باك NestJS أو Prisma — حُذف بتاريخ 2026-08-24 وبقي فقط في `_archive/`

## 5.1 نقطة البداية والتهيئة (Entry Point & Bootstrap)

### 5.1.1 ملف `index.tsx`
**التهيئة الأساسية للتطبيق:**
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';
import ThemeProvider from './providers/ThemeProvider';
import AuthProvider from './providers/AuthProvider';
import './index.css';
import './i18n'; // Internationalization

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Get root element
const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');

// Create React root
const root = ReactDOM.createRoot(container);

// Render application
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>
              <App />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#4ade80',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
              {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} />
              )}
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Service Worker Registration (PWA)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
```

### 5.1.2 Error Boundary Configuration
```typescript
// components/common/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Send to error reporting service (Sentry, etc.)
    if (process.env.NODE_ENV === 'production') {
      // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h1 className="text-xl font-semibold text-center text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 text-center mb-6">
              We're sorry, but something unexpected happened. Please try again.
            </p>
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-4 bg-gray-100 rounded text-sm">
                <summary className="cursor-pointer font-medium">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

## 5.2 نظام التوجيه (Routing System)

### 5.2.1 ملف `App.tsx` - الموجه المركزي
```typescript
import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Layouts
import PublicLayout from './components/layouts/PublicLayout';
import BusinessLayout from './components/layouts/BusinessLayout';
import AdminLayout from './components/layouts/AdminLayout';
import CourierLayout from './components/layouts/CourierLayout';

// Route Components
import ScrollToTop from './components/common/ScrollToTop';
import RouteSeoManager from './components/common/RouteSeoManager';
import RoleRedirector from './components/common/RoleRedirector';
import OfflineOrBackendDownRedirector from './components/common/OfflineOrBackendDownRedirector';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Lazy loaded pages
const HomePage = React.lazy(() => import('./components/pages/public/HomePage'));
const ShopsPage = React.lazy(() => import('./components/pages/public/ShopsPage'));
const ShopDetailPage = React.lazy(() => import('./components/pages/public/ShopDetailPage'));
const ProductsPage = React.lazy(() => import('./components/pages/public/ProductsPage'));
const OffersPage = React.lazy(() => import('./components/pages/public/OffersPage'));

const LoginPage = React.lazy(() => import('./components/pages/auth/LoginPage'));
const SignupPage = React.lazy(() => import('./components/pages/auth/SignupPage'));
const ForgotPasswordPage = React.lazy(() => import('./components/pages/auth/ForgotPasswordPage'));

const MerchantDashboard = React.lazy(() => import('./components/pages/business/merchant-dashboard/MerchantDashboardPage'));
const ProductsTab = React.lazy(() => import('./components/pages/business/merchant-dashboard/tabs/ProductsTab'));
const OrdersTab = React.lazy(() => import('./components/pages/business/merchant-dashboard/tabs/OrdersTab'));
const AnalyticsTab = React.lazy(() => import('./components/pages/business/merchant-dashboard/tabs/AnalyticsTab'));

const AdminDashboard = React.lazy(() => import('./components/pages/admin/AdminDashboard'));
const UsersManagement = React.lazy(() => import('./components/pages/admin/UsersManagement'));
const ShopsManagement = React.lazy(() => import('./components/pages/admin/ShopsManagement'));

const CourierDashboard = React.lazy(() => import('./components/pages/courier/CourierDashboard'));
const CourierOrders = React.lazy(() => import('./components/pages/courier/CourierOrders'));

const NotFoundPage = React.lazy(() => import('./components/pages/error/NotFoundPage'));

// Loading component for lazy loading
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

function App() {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <div className="App">
      <ScrollToTop />
      <RouteSeoManager />
      <RoleRedirector />
      <OfflineOrBackendDownRedirector />
      
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="shops" element={<ShopsPage />} />
            <Route path="shops/:slug" element={<ShopDetailPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="offers" element={<OffersPage />} />
            
            {/* Auth Routes */}
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* Business/Merchant Routes */}
          <Route 
            path="/merchant/*" 
            element={
              <ProtectedRoute>
                <BusinessLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<MerchantDashboard />} />
            <Route path="products" element={<ProductsTab />} />
            <Route path="orders" element={<OrdersTab />} />
            <Route path="analytics" element={<AnalyticsTab />} />
          </Route>

          {/* Admin Routes */}
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="shops" element={<ShopsManagement />} />
          </Route>

          {/* Courier Routes */}
          <Route 
            path="/courier/*" 
            element={
              <ProtectedRoute requiredRole="COURIER">
                <CourierLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<CourierDashboard />} />
            <Route path="orders" element={<CourierOrders />} />
          </Route>

          {/* Legacy Redirects */}
          <Route path="/shop/:slug" element={<Navigate to="/shops/:slug" replace />} />
          <Route path="/business/*" element={<Navigate to="/merchant/*" replace />} />

          {/* 404 Page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </div>
  );
}

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default App;
```

> ملاحظة: قيم `requiredRole` تُقارن مع الدور القادم من JWT الباك إند (Go/Fiber) وهي بأحرف كبيرة حصراً: `CUSTOMER` / `MERCHANT` / `ADMIN` / `COURIER` / `CASHIER`.

### 5.2.2 Route Guards and Redirectors
```typescript
// components/common/RoleRedirector.tsx
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const RoleRedirector = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      switch (user.role) {
        case 'MERCHANT':
          if (window.location.pathname === '/') {
            navigate('/merchant/dashboard', { replace: true });
          }
          break;
        case 'ADMIN':
          if (window.location.pathname === '/') {
            navigate('/admin/dashboard', { replace: true });
          }
          break;
        case 'COURIER':
          if (window.location.pathname === '/') {
            navigate('/courier/dashboard', { replace: true });
          }
          break;
        default:
          // Customer stays on public pages
          break;
      }
    }
  }, [isAuthenticated, user, navigate]);

  return null;
};

export default RoleRedirector;

// components/common/ScrollToTop.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;

// components/common/RouteSeoManager.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface RouteSEO {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
}

const routeSEOConfig: Record<string, RouteSEO> = {
  '/': {
    title: 'Ray - Egyptian Marketplace Platform',
    description: 'Discover amazing products and services from local Egyptian businesses',
    keywords: 'marketplace, egypt, shopping, local businesses',
  },
  '/shops': {
    title: 'Browse Shops - Ray',
    description: 'Explore shops and businesses on Ray marketplace',
    keywords: 'shops, businesses, egyptian marketplace',
  },
  '/merchant/dashboard': {
    title: 'Merchant Dashboard - Ray',
    description: 'Manage your shop and track your business performance',
    keywords: 'merchant, dashboard, business management',
  },
};

const RouteSeoManager = () => {
  const location = useLocation();

  useEffect(() => {
    const seo = routeSEOConfig[location.pathname] || routeSEOConfig['/'];
    
    // Update document title
    document.title = seo.title;
    
    // Update meta tags
    updateMetaTag('description', seo.description);
    updateMetaTag('keywords', seo.keywords);
    
    // Update Open Graph tags
    updateMetaProperty('og:title', seo.title);
    updateMetaProperty('og:description', seo.description);
    updateMetaProperty('og:image', seo.ogImage);
    
    // Update Twitter Card tags
    updateMetaName('twitter:title', seo.title);
    updateMetaName('twitter:description', seo.description);
  }, [location.pathname]);

  const updateMetaTag = (name: string, content?: string) => {
    let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = name;
      document.head.appendChild(tag);
    }
    if (content) {
      tag.content = content;
    }
  };

  const updateMetaProperty = (property: string, content?: string) => {
    let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('property', property);
      document.head.appendChild(tag);
    }
    if (content) {
      tag.content = content;
    }
  };

  const updateMetaName = (name: string, content?: string) => {
    let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = name;
      document.head.appendChild(tag);
    }
    if (content) {
      tag.content = content;
    }
  };

  return null;
};

export default RouteSeoManager;
```

## 5.3 الهيكل التنظيمي للمكونات (Component Architecture)

### 5.3.1 هيكل المجلدات (Folder Structure)
```
components/
├── pages/                    # Route-level components
│   ├── public/              # Public-facing pages
│   │   ├── HomePage.tsx
│   │   ├── ShopsPage.tsx
│   │   ├── ShopDetailPage.tsx
│   │   └── ProductsPage.tsx
│   ├── auth/                # Authentication pages
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   └── ForgotPasswordPage.tsx
│   ├── business/            # Merchant dashboard pages
│   │   └── merchant-dashboard/
│   │       ├── MerchantDashboardPage.tsx
│   │       └── tabs/
│   │           ├── ProductsTab.tsx
│   │           ├── OrdersTab.tsx
│   │           └── AnalyticsTab.tsx
│   ├── admin/               # Admin panel pages
│   │   ├── AdminDashboard.tsx
│   │   ├── UsersManagement.tsx
│   │   └── ShopsManagement.tsx
│   ├── courier/             # Courier app pages
│   │   ├── CourierDashboard.tsx
│   │   └── CourierOrders.tsx
│   └── error/               # Error pages
│       ├── NotFoundPage.tsx
│       └── ServerErrorPage.tsx
├── layouts/                 # Layout components
│   ├── PublicLayout.tsx
│   ├── BusinessLayout.tsx
│   ├── AdminLayout.tsx
│   └── CourierLayout.tsx
├── features/                # Feature-specific components
│   ├── auth/               # Authentication components
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   ├── PasswordResetForm.tsx
│   │   └── SocialLoginButtons.tsx
│   ├── shop/               # Shop components
│   │   ├── ShopCard.tsx
│   │   ├── ShopHeader.tsx
│   │   ├── ShopInfo.tsx
│   │   └── ShopAnalytics.tsx
│   ├── product/            # Product components
│   │   ├── ProductCard.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── ProductDetail.tsx
│   │   ├── ProductForm.tsx
│   │   └── ProductFilters.tsx
│   ├── order/              # Order components
│   │   ├── OrderCard.tsx
│   │   ├── OrderDetails.tsx
│   │   ├── OrderStatus.tsx
│   │   └── OrderForm.tsx
│   ├── cart/               # Shopping cart components
│   │   ├── CartItem.tsx
│   │   ├── CartSummary.tsx
│   │   └── CartDrawer.tsx
│   ├── payment/            # Payment components
│   │   ├── PaymentForm.tsx
│   │   ├── PaymentMethod.tsx
│   │   └── PaymentStatus.tsx
│   └── notification/       # Notification components
│       ├── NotificationCenter.tsx
│       ├── NotificationItem.tsx
│       └── NotificationBadge.tsx
├── ui/                     # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── Dropdown.tsx
│   ├── LoadingSpinner.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── Tabs.tsx
│   ├── Pagination.tsx
│   ├── SearchBar.tsx
│   └── index.ts
├── common/                 # Common utilities
│   ├── ErrorBoundary.tsx
│   ├── ScrollToTop.tsx
│   ├── RouteSeoManager.tsx
│   ├── RoleRedirector.tsx
│   └── OfflineOrBackendDownRedirector.tsx
└── providers/              # Context providers
    ├── AuthProvider.tsx
    ├── ThemeProvider.tsx
    └── NotificationProvider.tsx
```

### 5.3.2 Atomic Design Pattern
```typescript
// Atoms - Basic building blocks
// components/ui/Button.tsx
import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
    
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
      outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500',
      ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <LoadingSpinner size="sm" className="mr-2" />}
        {icon && !loading && <span className="mr-2">{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;

// Molecules - Combination of atoms
// components/product/ProductCard.tsx
import React from 'react';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    image: string;
    rating?: number;
    reviews?: number;
    shopName: string;
    inStock: boolean;
  };
  onAddToCart?: (productId: string) => void;
  onToggleFavorite?: (productId: string) => void;
  isFavorite?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onToggleFavorite,
  isFavorite = false,
}) => {
  const discount = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-300">
      <div className="relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-48 object-cover rounded-t-lg"
          loading="lazy"
        />
        
        {discount > 0 && (
          <Badge variant="danger" className="absolute top-2 left-2">
            -{discount}%
          </Badge>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onToggleFavorite?.(product.id)}
        >
          <Heart className={cn('w-4 h-4', isFavorite && 'fill-red-500 text-red-500')} />
        </Button>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
          {product.name}
        </h3>
        
        <p className="text-sm text-gray-600 mb-2">{product.shopName}</p>
        
        <div className="flex items-center mb-3">
          <div className="flex items-center">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="ml-1 text-sm text-gray-600">
              {product.rating || 'No rating'}
            </span>
          </div>
          {product.reviews && (
            <span className="ml-2 text-sm text-gray-500">
              ({product.reviews} reviews)
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-lg font-bold text-gray-900">
              ${product.price}
            </span>
            {product.originalPrice && (
              <span className="ml-2 text-sm text-gray-500 line-through">
                ${product.originalPrice}
              </span>
            )}
          </div>
          
          <Badge variant={product.inStock ? 'success' : 'danger'}>
            {product.inStock ? 'In Stock' : 'Out of Stock'}
          </Badge>
        </div>
        
        <Button
          className="w-full"
          disabled={!product.inStock}
          onClick={() => onAddToCart?.(product.id)}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </Card>
  );
};

export default ProductCard;

// Organisms - Complex components combining molecules
// components/shop/ShopGrid.tsx
import React, { useState } from 'react';
import ProductCard from '../product/ProductCard';
import Pagination from '../ui/Pagination';
import SearchBar from '../ui/SearchBar';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ShopGridProps {
  products: any[];
  loading?: boolean;
  onAddToCart?: (productId: string) => void;
  onToggleFavorite?: (productId: string) => void;
}

const ShopGrid: React.FC<ShopGridProps> = ({
  products,
  loading,
  onAddToCart,
  onToggleFavorite,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const filteredProducts = products
    .filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const productsPerPage = 12;
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <SearchBar
          placeholder="Search products..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="flex-1 max-w-md"
        />
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="name">Sort by Name</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="rating">Highest Rated</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default ShopGrid;
```

## 5.4 إدارة الحالة (State Management)

### 5.4.1 Redux Store Configuration
```typescript
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// Slices
import authSlice from './slices/authSlice';
import cartSlice from './slices/cartSlice';
import uiSlice from './slices/uiSlice';
import favoritesSlice from './slices/favoritesSlice';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'cart', 'favorites'], // Only persist these slices
  blacklist: ['ui'], // Don't persist UI state
};

const rootReducer = combineReducers({
  auth: authSlice,
  cart: cartSlice,
  ui: uiSlice,
  favorites: favoritesSlice,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// store/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api/auth';

interface User {
  id: string;
  email: string;
  fullName: string;
  // يطابق الدور القادم من JWT الباك إند (Go/Fiber) — أحرف كبيرة حصراً
  role: 'CUSTOMER' | 'MERCHANT' | 'ADMIN' | 'COURIER' | 'CASHIER';
  avatar?: string;
  phone?: string;
}

// ملاحظة: التخزين الفعلي في المتصفح يتم عبر مفاتيح localStorage:
// ray_user / ray_token / token + كوكي ray_session (انظر القسم 5.0.2)

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const signupUser = createAsyncThunk(
  'auth/signup',
  async (userData: any, { rejectWithValue }) => {
    try {
      const response = await authAPI.signup(userData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Signup failed');
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const response = await authAPI.refreshToken(state.auth.refreshToken);
      return response.data;
    } catch (error: any) {
      return rejectWithValue('Token refresh failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Signup
    builder
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Refresh Token
    builder
      .addCase(refToken.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(refToken.rejected, (state) => {
        // Force logout on refresh token failure
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      });
  },
});

export const { logout, clearError, updateUser } = authSlice.actions;
export default authSlice.reducer;
```

### 5.4.2 React Query for Server State
```typescript
// hooks/api/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsAPI } from '../../services/api/products';
import { toast } from 'react-hot-toast';

export const useProducts = (params: any = {}) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productsAPI.getProducts(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => productsAPI.getProduct(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsAPI.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create product');
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      productsAPI.updateProduct(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      toast.success('Product updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update product');
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsAPI.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    },
  });
};
```

## 5.5 نظام التصميم والثيمات (Design System & Theming)

### 5.5.1 Theme Provider
```typescript
// providers/ThemeProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme;
    return saved || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = window.document.documentElement;
    
    const updateTheme = () => {
      let newResolvedTheme: 'light' | 'dark';
      
      if (theme === 'system') {
        newResolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
          ? 'dark' 
          : 'light';
      } else {
        newResolvedTheme = theme;
      }
      
      root.classList.remove('light', 'dark');
      root.classList.add(newResolvedTheme);
      setResolvedTheme(newResolvedTheme);
    };

    updateTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    }
  }, [theme]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

### 5.5.2 Tailwind CSS Configuration
```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-gentle': 'bounceGentle 0.6s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    // Custom plugin for line clamping
    function({ addUtilities }) {
      const newUtilities = {
        '.line-clamp-1': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '1',
        },
        '.line-clamp-2': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '2',
        },
        '.line-clamp-3': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '3',
        },
      };
      addUtilities(newUtilities);
    },
  ],
};
```

## 5.6 تحسين الأداء (Performance Optimization)

### 5.6.1 Code Splitting and Lazy Loading
```typescript
// Dynamic imports with loading states
const LazyComponent = React.lazy(() => 
  import('./components/SomeComponent').then(module => ({
    default: module.SomeComponent
  }))
);

// Usage with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <LazyComponent />
</Suspense>

// Route-based code splitting
const AdminDashboard = React.lazy(() => 
  import('./components/pages/admin/AdminDashboard')
);

// Preloading critical components
const preloadComponent = (componentImport: () => Promise<any>) => {
  componentImport();
};

// Preload components on hover or route prediction
const handleMouseEnter = () => {
  preloadComponent(() => import('./components/pages/admin/AdminDashboard'));
};
```

### 5.6.2 Image Optimization
```typescript
// components/ui/OptimizedImage.tsx
import React, { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  placeholder?: 'blur' | 'empty';
}

const OptimimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  placeholder = 'blur',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const generateSrcSet = (baseSrc: string) => {
    const sizes = [400, 800, 1200, 1600];
    return sizes
      .map(size => `${baseSrc}?w=${size}&q=80 ${size}w`)
      .join(', ');
  };

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {placeholder === 'blur' && !isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      
      {isInView && (
        <img
          src={src}
          srcSet={generateSrcSet(src)}
          sizes="(max-width: 400px) 400px, (max-width: 800px) 800px, (max-width: 1200px) 1200px, 1600px"
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          onLoad={handleLoad}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
```

### 5.6.3 Virtual Scrolling for Large Lists
```typescript
// components/ui/VirtualList.tsx
import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

function VirtualList<T>({ 
  items, 
  itemHeight, 
  height, 
  renderItem,
  className = ''
}: VirtualListProps<T>) {
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    return (
      <div style={style}>
        {renderItem(items[index], index)}
      </div>
    );
  }, [items, renderItem]);

  const memoizedItems = useMemo(() => items, [items]);

  return (
    <List
      height={height}
      itemCount={memoizedItems.length}
      itemSize={itemHeight}
      className={className}
    >
      {Row}
    </List>
  );
}

export default VirtualList;
```

## 5.7 أفضل الممارسات (Best Practices)

### 5.7.1 Component Design Patterns
```typescript
// 1. Use TypeScript interfaces for props
interface ButtonProps {
  variant: 'primary' | 'secondary';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

// 2. Use forwardRef for composable components
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, disabled, onClick, children }, ref) => {
    return (
      <button
        ref={ref}
        className={`btn btn-${variant} btn-${size}`}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </button>
    );
  }
);

// 3. Use compound components for complex UI
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`card ${className || ''}`}>{children}</div>
);

Card.Header = ({ children }: { children: React.ReactNode }) => (
  <div className="card-header">{children}</div>
);

Card.Body = ({ children }: { children: React.ReactNode }) => (
  <div className="card-body">{children}</div>
);

Card.Footer = ({ children }: { children: React.ReactNode }) => (
  <div className="card-footer">{children}</div>
);

// Usage
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>
```

### 5.7.2 Performance Best Practices
```typescript
// 1. Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }: { data: any[] }) => {
  const processedData = useMemo(() => {
    return data.map(item => expensiveCalculation(item));
  }, [data]);

  return <div>{/* render processed data */}</div>;
});

// 2. Use useCallback for event handlers
const ParentComponent = () => {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    setCount(c => c + 1);
  }, []);

  return <ChildComponent onClick={handleClick} />;
};

// 3. Use useMemo for expensive calculations
const Component = ({ items }: { items: any[] }) => {
  const expensiveValue = useMemo(() => {
    return items.reduce((sum, item) => sum + item.value, 0);
  }, [items]);

  return <div>Total: {expensiveValue}</div>;
};

// 4. Use proper dependency arrays
useEffect(() => {
  // effect logic
}, [dependency1, dependency2]); // Only re-run when dependencies change
```

### 5.7.3 Accessibility Best Practices
```typescript
// 1. Use semantic HTML elements
const AccessibleButton = ({ children, onClick, ...props }) => (
  <button onClick={onClick} {...props}>
    {children}
  </button>
);

// 2. Add ARIA labels and descriptions
const SearchInput = ({ value, onChange }) => (
  <div>
    <label htmlFor="search">Search products</label>
    <input
      id="search"
      type="text"
      value={value}
      onChange={onChange}
      aria-describedby="search-help"
    />
    <div id="search-help">
      Enter keywords to search for products
    </div>
  </div>
);

// 3. Handle keyboard navigation
const Modal = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {children}
    </div>
  );
};
```

## 5.8 الاختبار والجودة (Testing & Quality)

### 5.8.1 Component Testing with React Testing Library
```typescript
// components/__tests__/Button.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../ui/Button';

describe('Button Component', () => {
  test('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  test('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('applies correct variant classes', () => {
    render(<Button variant="secondary">Secondary Button</Button>);
    const button = screen.getByText('Secondary Button');
    expect(button).toHaveClass('bg-gray-600');
  });

  test('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByText('Disabled Button');
    expect(button).toBeDisabled();
  });
});
```

### 5.8.2 Integration Testing
```typescript
// components/__tests__/ProductCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ProductCard from '../product/ProductCard';
import cartSlice from '../../store/slices/cartSlice';

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      cart: cartSlice,
    },
    preloadedState: initialState,
  });
};

const mockProduct = {
  id: '1',
  name: 'Test Product',
  price: 99.99,
  image: 'test-image.jpg',
  shopName: 'Test Shop',
  inStock: true,
};

describe('ProductCard Integration', () => {
  test('adds product to cart when add to cart button is clicked', () => {
    const store = createTestStore();
    
    render(
      <Provider store={store}>
        <ProductCard product={mockProduct} />
      </Provider>
    );

    const addToCartButton = screen.getByText('Add to Cart');
    fireEvent.click(addToCartButton);

    const state = store.getState();
    expect(state.cart.items).toHaveLength(1);
    expect(state.cart.items[0].productId).toBe(mockProduct.id);
  });
});
```

## 5.9 النشر والبناء (Build & Deployment)

### 5.9.1 Next.js Configuration (الواقع الحالي)
التطبيقات الثلاثة (`apps/marketplace-next` و`apps/dashboard-web` و`apps/business`) تطبيقات **Next.js** — لا يوجد أي إعداد Vite. كل تطبيق يعرّف rewrite في `apps/*/next.config.mjs`:
```javascript
// apps/marketplace-next/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  productionBrowserSourceMaps: false,
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async rewrites() {
    const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000').trim();
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
    ];
  },
};

export default nextConfig;
```
تطبيق `dashboard-web` يقرأ `process.env.BACKEND_URL` أولاً ثم `NEXT_PUBLIC_BACKEND_URL` ثم الافتراضي `http://localhost:4000`، ويضيف security headers (`X-Frame-Options` و`Referrer-Policy` وفي الإنتاج `X-Content-Type-Options` و`Strict-Transport-Security`). تطبيق `business` يضيف `X-Frame-Options` و`Referrer-Policy` و`X-Content-Type-Options`.

### 5.9.2 Environment Configuration (الواقع الحالي)
إعدادات الفرونت تتم عبر متغيرات بيئة Next.js — لا توجد بادئة `VITE_`:
```javascript
// المتغيرات الفعلية المستخدمة في apps/*/next.config.mjs
// BACKEND_URL (يقرأه dashboard-web أولاً) أو NEXT_PUBLIC_BACKEND_URL
// الافتراضي في الحالتين: http://localhost:4000

// مثال:
// BACKEND_URL=http://localhost:4000
// NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```
- كود المتصفح ينادي مسارات `/api/...` **نسبية**، والـ rewrite في `next.config.mjs` يحوّلها إلى عنوان الباك إند Go.
- بيانات الجلسة في المتصفح: `localStorage` (`ray_user` / `ray_token` / `token`) + كوكي `ray_session` (انظر القسم 5.0.2).
- صفحة الدخول التجريبي `/admin/gate` للتطوير فقط وتظهر خارج الإنتاج.

هذا الدليل الشامل يغطي جميع جوانب تطوير الواجهة الأمامية لمشروع Ray، مع التركيز على أفضل الممارسات والأداء والجودة.
