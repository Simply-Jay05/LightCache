import { Link } from "react-router-dom";
import featured from "../../assets/featured.webp";

const FeaturedCollection = () => {
  return (
    <section className="py-20 px-4 lg:px-0">
      <div className="container mx-auto">
        <div
          className="flex flex-col-reverse lg:flex-row items-stretch overflow-hidden"
          style={{
            backgroundColor: "var(--ink)",
            borderRadius: "4px",
          }}
        >
          {/* Left — text */}
          <div className="lg:w-1/2 p-10 lg:p-16 flex flex-col justify-center">
            <p className="section-label mb-4">Featured Collection</p>
            <h2
              className="font-serif font-normal mb-5"
              style={{
                color: "var(--parchment)",
                fontFamily: "var(--ff-serif)",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                lineHeight: 1.15,
              }}
            >
              Clothing that fits your day, every day.
            </h2>
            <p
              style={{
                color: "var(--muted)",
                fontSize: "0.9rem",
                lineHeight: 1.8,
                maxWidth: "38ch",
                marginBottom: "2.5rem",
              }}
            >
              Simple cuts, quality fabrics and timeless styles. Built for people
              who value comfort without sacrificing how they look.
            </p>
            <Link
              to="/collections/all"
              className="btn-primary inline-block"
              style={{ textDecoration: "none", alignSelf: "flex-start" }}
            >
              Shop Now
            </Link>
          </div>

          {/* Right — image */}
          <div className="lg:w-1/2">
            <img
              src={featured}
              alt="Featured Collection"
              className="w-full h-full object-cover"
              style={{ minHeight: "380px" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCollection;
