import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PayPalButton from "./PayPalButton";
import { useDispatch, useSelector } from "react-redux";
import { createCheckout } from "../../redux/slices/checkoutSlice";
import axios from "axios";
import PayPalDemoModal from "../Common/PayPalDemoModal";

const Checkout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { cart, loading, error } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [checkoutId, setCheckoutId] = useState(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [shippingAddress, setShippingAddress] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
    phone: "",
  });

  const validateForm = () => {
    const errors = {};
    const phoneRe = /^\+?[\d\s\-().]{7,15}$/;
    const postalRe = /^[A-Za-z0-9\s\-]{3,10}$/;

    if (!shippingAddress.firstName.trim())
      errors.firstName = "First name is required.";
    if (!shippingAddress.lastName.trim())
      errors.lastName = "Last name is required.";
    if (!shippingAddress.address.trim())
      errors.address = "Address is required.";
    if (!shippingAddress.city.trim()) errors.city = "City is required.";
    if (!shippingAddress.country.trim())
      errors.country = "Country is required.";

    if (!shippingAddress.postalCode.trim()) {
      errors.postalCode = "Postal code is required.";
    } else if (!postalRe.test(shippingAddress.postalCode.trim())) {
      errors.postalCode = "Enter a valid postal code.";
    }

    if (!shippingAddress.phone.trim()) {
      errors.phone = "Phone number is required.";
    } else if (!phoneRe.test(shippingAddress.phone.trim())) {
      errors.phone =
        "Enter a valid phone number (7–15 digits, optional +/spaces/dashes).";
    }

    return errors;
  };

  useEffect(() => {
    if (!loading && (!cart || !cart.products || cart.products.length === 0)) {
      navigate("/");
    }
  }, [cart, loading, navigate]);

  const handleCreateCheckout = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      // Scroll to first error
      const firstKey = Object.keys(errors)[0];
      document
        .getElementById(`field-${firstKey}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setFormErrors({});
    setShowDemoModal(true);
  };

  const handleConfirmDemoModal = async () => {
    setShowDemoModal(false);
    setIsProcessing(true);
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
    setIsProcessing(false);
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
    <>
      {showDemoModal && (
        <PayPalDemoModal
          onConfirm={handleConfirmDemoModal}
          onCancel={() => setShowDemoModal(false)}
        />
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto py-10 px-6">
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl uppercase mb-6">Checkout</h2>
          <form onSubmit={handleCreateCheckout} noValidate>
            <h3 className="text-lg mb-4">Contact Details</h3>
            <input
              type="email"
              value={user?.email || ""}
              className="w-full p-2 border rounded mb-4 bg-gray-50"
              disabled
            />

            <h3 className="text-lg mb-4">Delivery</h3>

            {/* Helper to render a field with optional error */}
            {/* First Name + Last Name */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div id="field-firstName">
                <input
                  type="text"
                  placeholder="First Name"
                  value={shippingAddress.firstName}
                  onChange={(e) => {
                    setShippingAddress({
                      ...shippingAddress,
                      firstName: e.target.value,
                    });
                    if (formErrors.firstName)
                      setFormErrors((p) => ({ ...p, firstName: "" }));
                  }}
                  className={`w-full p-2 border rounded ${formErrors.firstName ? "border-red-400" : ""}`}
                />
                {formErrors.firstName && (
                  <p className="text-red-500 text-xs mt-1">
                    {formErrors.firstName}
                  </p>
                )}
              </div>
              <div id="field-lastName">
                <input
                  type="text"
                  placeholder="Last Name"
                  value={shippingAddress.lastName}
                  onChange={(e) => {
                    setShippingAddress({
                      ...shippingAddress,
                      lastName: e.target.value,
                    });
                    if (formErrors.lastName)
                      setFormErrors((p) => ({ ...p, lastName: "" }));
                  }}
                  className={`w-full p-2 border rounded ${formErrors.lastName ? "border-red-400" : ""}`}
                />
                {formErrors.lastName && (
                  <p className="text-red-500 text-xs mt-1">
                    {formErrors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div id="field-address" className="mb-4">
              <input
                type="text"
                placeholder="Address"
                value={shippingAddress.address}
                onChange={(e) => {
                  setShippingAddress({
                    ...shippingAddress,
                    address: e.target.value,
                  });
                  if (formErrors.address)
                    setFormErrors((p) => ({ ...p, address: "" }));
                }}
                className={`w-full p-2 border rounded ${formErrors.address ? "border-red-400" : ""}`}
              />
              {formErrors.address && (
                <p className="text-red-500 text-xs mt-1">
                  {formErrors.address}
                </p>
              )}
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4">
              <div id="field-city">
                <input
                  type="text"
                  placeholder="City"
                  value={shippingAddress.city}
                  onChange={(e) => {
                    setShippingAddress({
                      ...shippingAddress,
                      city: e.target.value,
                    });
                    if (formErrors.city)
                      setFormErrors((p) => ({ ...p, city: "" }));
                  }}
                  className={`w-full p-2 border rounded ${formErrors.city ? "border-red-400" : ""}`}
                />
                {formErrors.city && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.city}</p>
                )}
              </div>
              <div id="field-postalCode">
                <input
                  type="text"
                  placeholder="Postal Code"
                  value={shippingAddress.postalCode}
                  onChange={(e) => {
                    setShippingAddress({
                      ...shippingAddress,
                      postalCode: e.target.value,
                    });
                    if (formErrors.postalCode)
                      setFormErrors((p) => ({ ...p, postalCode: "" }));
                  }}
                  className={`w-full p-2 border rounded ${formErrors.postalCode ? "border-red-400" : ""}`}
                />
                {formErrors.postalCode && (
                  <p className="text-red-500 text-xs mt-1">
                    {formErrors.postalCode}
                  </p>
                )}
              </div>
            </div>

            <div id="field-country" className="mb-4">
              <input
                type="text"
                placeholder="Country"
                value={shippingAddress.country}
                onChange={(e) => {
                  setShippingAddress({
                    ...shippingAddress,
                    country: e.target.value,
                  });
                  if (formErrors.country)
                    setFormErrors((p) => ({ ...p, country: "" }));
                }}
                className={`w-full p-2 border rounded ${formErrors.country ? "border-red-400" : ""}`}
              />
              {formErrors.country && (
                <p className="text-red-500 text-xs mt-1">
                  {formErrors.country}
                </p>
              )}
            </div>

            <div id="field-phone" className="mb-4">
              <input
                type="tel"
                placeholder="Phone (e.g. +1 234 567 8900)"
                value={shippingAddress.phone}
                onChange={(e) => {
                  setShippingAddress({
                    ...shippingAddress,
                    phone: e.target.value,
                  });
                  if (formErrors.phone)
                    setFormErrors((p) => ({ ...p, phone: "" }));
                }}
                className={`w-full p-2 border rounded ${formErrors.phone ? "border-red-400" : ""}`}
              />
              {formErrors.phone && (
                <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>
              )}
            </div>

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
    </>
  );
};

export default Checkout;
