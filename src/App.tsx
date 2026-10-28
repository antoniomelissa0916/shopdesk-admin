import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import NewProductPage from './pages/NewProductPage';
import EditProductPage from './pages/EditProductPage';
import ProductDetailPage from './pages/ProductDetailPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import DiscountsPage from './pages/DiscountsPage';
import NewDiscountPage from './pages/NewDiscountPage';
import NotFoundPage from './pages/NotFoundPage';
import { DiscountsProvider } from './store/DiscountsContext';
import { OrdersProvider } from './store/OrdersContext';
import { ProductsProvider } from './store/ProductsContext';

export default function App() {
  return (
    <DiscountsProvider>
      <ProductsProvider>
        <OrdersProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/new" element={<NewProductPage />} />
              <Route path="products/:productId" element={<ProductDetailPage />} />
              <Route path="products/:productId/edit" element={<EditProductPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:orderId" element={<OrderDetailPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/:customerId" element={<CustomerDetailPage />} />
              <Route path="discounts" element={<DiscountsPage />} />
              <Route path="discounts/new" element={<NewDiscountPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </OrdersProvider>
      </ProductsProvider>
    </DiscountsProvider>
  );
}
