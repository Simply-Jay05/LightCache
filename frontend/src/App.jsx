import { BrowserRouter, Route, Routes } from "react-router-dom";
import UserLayout from "./components/Layout/UserLayout";
import Home from "./pages/Home";
import { Toaster } from "sonner";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import CollectionPage from "./pages/CollectionPage";
import ProductDetails from "./components/Products/ProductDetails";
import Checkout from "./components/Cart/Checkout";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import OrderDetailsPage from "./pages/OrderDetailsPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import AdminLayout from "./components/Admin/AdminLayout";
import AdminHomePage from "./pages/AdminHomePage";
import UserManagement from "./components/Admin/UserManagement";
import ProductManagement from "./components/Admin/ProductManagement";
import EditProductPage from "./components/Admin/EditProductPage";
import OrderManagement from "./components/Admin/OrderManagement";

import { Provider } from "react-redux";
import { setAuthDispatch } from "./redux/slices/authSlice";
import store from "./redux/store";
import ProtectedRoute from "./components/Common/ProtectedRoute";
import CacheDashboard from "./components/Admin/CacheDashboard";
import WelcomeModal from "./components/Common/WelcomeModal";

// Wire the global 401 interceptor to Redux dispatch at app boot. This must happen before any axios request fires.
setAuthDispatch(store.dispatch);

const App = () => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <WelcomeModal />
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<UserLayout />}>
            {/* User Layout */}
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="profile" element={<Profile />} />
            <Route
              path="collections/:collection"
              element={<CollectionPage />}
            />
            <Route path="product/:id" element={<ProductDetails />} />
            <Route path="checkout" element={<Checkout />} />
            <Route
              path="order-confirmation"
              element={<OrderConfirmationPage />}
            />
            <Route path="order/:id" element={<OrderDetailsPage />} />
            <Route path="my-orders" element={<MyOrdersPage />} />
          </Route>
          <Route
            path="/admin"
            element={
              <ProtectedRoute role={"admin"}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            {/* Admin Layout */}
            <Route index element={<AdminHomePage />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="products" element={<ProductManagement />} />
            <Route path="products/:id/edit" element={<EditProductPage />} />
            <Route path="orders" element={<OrderManagement />} />
            <Route path="cache" element={<CacheDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Provider>
  );
};

export default App;
