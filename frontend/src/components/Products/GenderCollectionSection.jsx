import { Link } from "react-router-dom";
import mensColectionSection from "../../assets/mens-collection.webp";
import womensColectionSection from "../../assets/womens-collection.webp";
const GenderCollectionSection = () => {
  return (
    <section className="py-16 px-4 lg:px-0">
      <div className="container mx-auto flex flex-col md:flex-row gap-8">
        {/* Women Collection */}
        <div className="relative flex-1">
          <img
            src={womensColectionSection}
            alt="Women's Collection"
            className="w-full h-[700px] object-cover"
          />
          <div className="absolute bottom-0 left-0 bg-white/90 p-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Women's Collection
            </h2>
            <Link
              to="/collections/all?gender=women"
              className="text-gray-900 underline"
            >
              Shop Now
            </Link>
          </div>
        </div>
        {/* Men Collection */}
        <div className="relative flex-1">
          <img
            src={mensColectionSection}
            alt="Men's Collection"
            className="w-full h-[700px] object-cover"
          />
          <div className="absolute bottom-0 left-0 bg-white/90 p-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Men's Collection
            </h2>
            <Link
              to="/collections/all?gender=Men"
              className="text-gray-900 underline"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GenderCollectionSection;
