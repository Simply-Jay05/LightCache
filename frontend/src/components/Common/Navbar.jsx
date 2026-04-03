import { Link } from "react-router-dom";
import {
  HiOutlineUser,
  HiOutlineShoppingBag,
  HiBars3BottomRight,
} from "react-icons/hi2";
import SearchBar from "./SearchBar";
import CartDrawer from "../Layout/CartDrawer";
import { useState } from "react";
import { IoMdClose } from "react-icons/io";
import { useSelector } from "react-redux";

const Navbar = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const { cart } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);

  const cartItemCount =
    cart?.products?.reduce((total, product) => total + product.quantity, 0) ||
    0;

  const toggleNavDrawer = () => setNavDrawerOpen(!navDrawerOpen);
  const toggleCartDrawer = () => setDrawerOpen(!drawerOpen);

  return (
    <>
      <nav
        style={{
          backgroundColor: "var(--ink)",
          borderBottom: "1px solid rgba(201,168,76,0.15)",
        }}
        className="container mx-auto flex items-center justify-between py-4 px-6"
      >
        {/* Left — Logo */}
        <div>
          <Link
            to="/"
            className="font-serif text-2xl font-normal tracking-wide"
            style={{ color: "var(--parchment)", fontFamily: "var(--ff-serif)" }}
          >
            Light<span style={{ color: "var(--gold)" }}>Cache</span>
          </Link>
        </div>

        {/* Center — Nav links */}
        <div className="hidden md:flex items-center space-x-8">
          {["Men", "Women", "Top Wear", "Bottom Wear"].map((label) => {
            const param =
              label === "Men" || label === "Women"
                ? `gender=${label}`
                : `category=${encodeURIComponent(label)}`;
            return (
              <Link
                key={label}
                to={`/collections/all?${param}`}
                className="nav-link"
                style={{ color: "rgba(245,240,232,0.75)" }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right — Icons */}
        <div className="flex items-center space-x-5">
          {user?.role === "admin" && (
            <Link
              to="/admin"
              style={{
                backgroundColor: "var(--gold)",
                color: "var(--ink)",
                fontSize: "0.65rem",
                letterSpacing: "0.12em",
                fontWeight: 600,
              }}
              className="px-3 py-1 rounded-sm uppercase"
            >
              Admin
            </Link>
          )}

          <Link
            to="/profile"
            style={{ color: "rgba(245,240,232,0.75)" }}
            className="hover:opacity-100 transition-opacity"
          >
            <HiOutlineUser className="h-5 w-5" />
          </Link>

          <button
            onClick={toggleCartDrawer}
            className="relative"
            style={{ color: "rgba(245,240,232,0.75)" }}
          >
            <HiOutlineShoppingBag className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium"
                style={{
                  backgroundColor: "var(--gold)",
                  color: "var(--ink)",
                  fontSize: "0.6rem",
                }}
              >
                {cartItemCount}
              </span>
            )}
          </button>

          <div
            className="overflow-hidden"
            style={{ color: "rgba(245,240,232,0.75)" }}
          >
            <SearchBar />
          </div>

          <button
            onClick={toggleNavDrawer}
            className="md:hidden"
            style={{ color: "rgba(245,240,232,0.75)" }}
          >
            <HiBars3BottomRight className="h-5 w-5" />
          </button>
        </div>
      </nav>

      <CartDrawer drawerOpen={drawerOpen} toggleCartDrawer={toggleCartDrawer} />

      {/* Mobile drawer overlay */}
      <div
        className={`nav-drawer-overlay ${navDrawerOpen ? "open" : ""}`}
        onClick={toggleNavDrawer}
      />

      {/* Mobile nav drawer */}
      <div
        style={{
          backgroundColor: "var(--ink)",
          borderRight: "1px solid rgba(201,168,76,0.15)",
        }}
        className={`fixed top-0 left-0 w-3/4 sm:w-1/2 md:w-1/3 h-full shadow-2xl transform transition-transform duration-300 z-50 ${
          navDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div
          className="flex justify-between items-center p-6"
          style={{ borderBottom: "1px solid rgba(201,168,76,0.15)" }}
        >
          <span
            className="font-serif text-xl"
            style={{ color: "var(--parchment)", fontFamily: "var(--ff-serif)" }}
          >
            Light<span style={{ color: "var(--gold)" }}>Cache+</span>
          </span>
          <button onClick={toggleNavDrawer} style={{ color: "var(--muted)" }}>
            <IoMdClose className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-6 space-y-6">
          {[
            { label: "Men", to: "/collections/all?gender=Men" },
            { label: "Women", to: "/collections/all?gender=Women" },
            { label: "Top Wear", to: "/collections/all?category=Top Wear" },
            {
              label: "Bottom Wear",
              to: "/collections/all?category=Bottom Wear",
            },
          ].map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              onClick={toggleNavDrawer}
              className="block nav-link"
              style={{ color: "rgba(245,240,232,0.65)", fontSize: "0.75rem" }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Navbar;
