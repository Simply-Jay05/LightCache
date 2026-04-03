import {
  FaBoxOpen,
  FaClipboardList,
  FaSignOutAlt,
  FaStore,
  FaUser,
  FaChartBar,
} from "react-icons/fa";
import { useDispatch } from "react-redux";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { logout } from "../../redux/slices/authSlice";
import { clearCart } from "../../redux/slices/cartSlice";

const navLinkClass = ({ isActive }) =>
  isActive
    ? "bg-gray-700 text-white py-3 px-4 rounded flex items-center space-x-2"
    : "text-gray-300 hover:bg-gray-700 hover:text-white py-3 px-4 rounded flex items-center space-x-2";

const AdminSidebar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearCart());
    navigate("/");
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link to="/admin" className="text-2xl font-medium">
          LightCache
        </Link>
      </div>
      <h2 className="text-xl font-medium mb-6 text-center">Admin Dashboard</h2>

      <nav className="flex flex-col space-y-2">
        <NavLink to="/admin/users" className={navLinkClass}>
          <FaUser />
          <span>Users</span>
        </NavLink>
        <NavLink to="/admin/products" className={navLinkClass}>
          <FaBoxOpen />
          <span>Products</span>
        </NavLink>
        <NavLink to="/admin/orders" className={navLinkClass}>
          <FaClipboardList />
          <span>Orders</span>
        </NavLink>
        <NavLink to="/admin/cache" className={navLinkClass}>
          <FaChartBar />
          <span>Cache</span>
        </NavLink>
        <NavLink to="/" className={navLinkClass}>
          <FaStore />
          <span>Shop</span>
        </NavLink>
      </nav>

      <div className="mt-6">
        <button
          onClick={handleLogout}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded flex items-center justify-center space-x-2"
        >
          <FaSignOutAlt />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
