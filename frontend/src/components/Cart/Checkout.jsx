import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PayPalButton from "./PayPalButton";
import { useDispatch, useSelector } from "react-redux";
import { createCheckout } from "../../redux/slices/checkoutSlice";
import axios from "axios";

const Checkout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { cart, loading, error } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [checkoutId, setCheckoutId] = useState(null);
  const [shippingAddress, setShippingAddress] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
    phone: "",
  });

  useEffect(() => {
    if (!loading && (!cart || !cart.products || cart.products.length === 0)) {
      navigate("/");
    }
  }, [cart, loading, navigate]);

  const handleCreateCheckout = async (e) => {
    e.preventDefault();
    setIsProcessing(true); // Start loading spinner

    if (cart && cart.products.length > 0) {
      const res = await dispatch(
        createCheckout({
          checkoutItems: cart.products,
          shippingAddress,
          paymentMethod: "Paypal",
          totalPrice: cart.totalPrice,
        }),
      );

      if (res.payload && res.payload._id) {
        setCheckoutId(res.payload._id);
      }
    }
    setIsProcessing(false); // Stop loading spinner
  };

  const handlePaymentSuccess = async (details) => {
    try {
      setPaymentError(null);
      setIsProcessing(true);
      await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/checkout/${checkoutId}/pay`,
        { paymentStatus: "paid", paymentDetails: details },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("userToken")}`,
          },
        },
      );
      await handleFinalizeCheckout(checkoutId);
    } catch (error) {
      setPaymentError("Payment processing failed. Please try again.");
      setIsProcessing(false);
    }
  };

  const handleFinalizeCheckout = async (id) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/checkout/${id}/finalize`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("userToken")}`,
          },
        },
      );
      navigate("/order-confirmation");
    } catch (error) {
      setPaymentError("Failed to finalize order. Please contact support.");
      setIsProcessing(false);
    }
  };

  if (loading)
    return <div className="max-w-7xl mx-auto py-10 px-6">Loading Cart...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto py-10 px-6">
      <div className="bg-white rounded-lg p-6">
        <h2 className="text-2xl uppercase mb-6">Checkout</h2>
        <form onSubmit={handleCreateCheckout}>
          <h3 className="text-lg mb-4">Contact Details</h3>
          <input
            type="email"
            value={user?.email || ""}
            className="w-full p-2 border rounded mb-4 bg-gray-50"
            disabled
          />

          <h3 className="text-lg mb-4">Delivery</h3>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="First Name"
              value={shippingAddress.firstName}
              onChange={(e) =>
                setShippingAddress({
                  ...shippingAddress,
                  firstName: e.target.value,
                })
              }
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              value={shippingAddress.lastName}
              onChange={(e) =>
                setShippingAddress({
                  ...shippingAddress,
                  lastName: e.target.value,
                })
              }
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <input
            type="text"
            placeholder="Address"
            value={shippingAddress.address}
            onChange={(e) =>
              setShippingAddress({
                ...shippingAddress,
                address: e.target.value,
              })
            }
            className="w-full p-2 border rounded mb-4"
            required
          />
          <div className="mb-4 grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="City"
              value={shippingAddress.city}
              onChange={(e) =>
                setShippingAddress({ ...shippingAddress, city: e.target.value })
              }
              className="w-full p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Postal Code"
              value={shippingAddress.postalCode}
              onChange={(e) =>
                setShippingAddress({
                  ...shippingAddress,
                  postalCode: e.target.value,
                })
              }
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <input
            type="text"
            placeholder="Country"
            value={shippingAddress.country}
            onChange={(e) =>
              setShippingAddress({
                ...shippingAddress,
                country: e.target.value,
              })
            }
            className="w-full p-2 border rounded mb-4"
            required
          />
          <input
            type="tel"
            placeholder="Phone"
            value={shippingAddress.phone}
            onChange={(e) =>
              setShippingAddress({ ...shippingAddress, phone: e.target.value })
            }
            className="w-full p-2 border rounded mb-4"
            required
          />

          <div className="mt-6">
            {!checkoutId ? (
              <button
                type="submit"
                disabled={isProcessing}
                className={`w-full py-3 rounded text-white ${isProcessing ? "bg-gray-400" : "bg-black"}`}
              >
                {isProcessing ? "Processing..." : "Continue to Payment"}
              </button>
            ) : (
              <div>
                <h3 className="text-lg mb-4">Pay with PayPal</h3>
                {paymentError && (
                  <p className="text-red-500 text-sm mb-3">{paymentError}</p>
                )}
                <PayPalButton
                  amount={cart.totalPrice}
                  onSuccess={handlePaymentSuccess}
                  onError={() =>
                    setPaymentError("Payment failed. Please try again.")
                  }
                />
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Right Section: Order Summary */}
      <div className="bg-gray-50 p-6 rounded-lg self-start">
        <h3 className="text-lg mb-4">Order Summary</h3>
        <div className="border-t py-4">
          {cart.products?.map((product, index) => (
            <div
              key={index}
              className="flex items-start justify-between py-2 border-b"
            >
              <div className="flex items-start">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-16 h-20 object-cover mr-4 rounded"
                />
                <div>
                  <h4 className="text-sm font-medium">{product.name}</h4>
                  <p className="text-xs text-gray-500">
                    Size: {product.size} | Color: {product.color}
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold">
                ${product.price?.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${cart.totalPrice?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total</span>
            <span>${cart.totalPrice?.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
