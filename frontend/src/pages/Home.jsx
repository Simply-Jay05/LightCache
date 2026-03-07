import { useEffect, useState } from "react";
import Hero from "../components/Layout/Hero";
import FeaturedCollection from "../components/Products/FeaturedCollection";
import FeaturesSection from "../components/Products/FeaturesSection";
import GenderCollectionSection from "../components/Products/GenderCollectionSection";
import NewArrival from "../components/Products/NewArrival";
import ProductDetails from "../components/Products/ProductDetails";
import ProductGrid from "../components/Products/ProductGrid";
import { useDispatch, useSelector } from "react-redux";
import { fetchProductByFilters } from "../redux/slices/productsSlice";
import axios from "axios";

const Home = () => {
  const dispatch = useDispatch();
  // Redux state for the "Women's Bottom Wear" section
  const {
    products,
    loading: productsLoading,
    error: productsError,
  } = useSelector((state) => state.products);

  // Local state for the "Best Seller" section
  const [bestSellerProduct, setBestSellerProduct] = useState(null);
  const [bestSellerLoading, setBestSellerLoading] = useState(true);
  const [bestSellerError, setBestSellerError] = useState(null);

  useEffect(() => {
    // Fetch products for a specific collection
    dispatch(
      fetchProductByFilters({
        gender: "Women",
        category: "Bottom Wear",
        limit: 8,
      }),
    );
    //  Fetch best seller product
    const fetchBestSeller = async () => {
      try {
        setBestSellerLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/products/best-seller`,
        );
        setBestSellerProduct(response.data);
      } catch (err) {
        setBestSellerError("Failed to load best seller");
      } finally {
        setBestSellerLoading(false);
      }
    };
    fetchBestSeller();
  }, [dispatch]);

  return (
    <div>
      <Hero />
      <GenderCollectionSection />
      <NewArrival />

      {/* Best Seller */}
      <h2 className="text-3xl text-center font-black mb-4">Best Seller</h2>
      {bestSellerLoading && (
        <div className="container mx-auto h-96 bg-gray-200 animate-pulse rounded-lg" />
      )}
      {bestSellerError && (
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">{bestSellerError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
          >
            Try Again
          </button>
        </div>
      )}
      {!bestSellerLoading && !bestSellerError && bestSellerProduct && (
        <ProductDetails productId={bestSellerProduct._id} />
      )}

      <div className="container mx-auto py-12">
        <h2 className="text-3xl text-center font-bold mb-4">
          Women's Bottom Wear
        </h2>
        <ProductGrid
          products={products}
          loading={productsLoading}
          error={productsError}
        />
      </div>

      <FeaturedCollection />
      <FeaturesSection />
    </div>
  );
};

export default Home;
