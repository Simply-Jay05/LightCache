import { Link } from "react-router-dom";
import heroImg from "../../assets/hero.webp";

const Hero = () => {
  return (
    <section className="relative">
      <img
        src={heroImg}
        alt="Hero"
        className="w-full h-[450px] md:h-[600px] lg:h-[650px] object-cover"
      />
      <div className="absolute inset-0 bg-black/5 flex items-center justify-center">
        <div className="text-center text-white p-6">
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter  mb-4">
            Boost Your <br /> Confidence
          </h1>
          <p className="text-sm tracking-tighter md:text-lg mb-6">
            With the best minimal clothing for everyday life. Look good without
            trying too hard.
          </p>
          <Link
            to="/collections/all"
            className="bg-white text-gray-950 px-6 py-2 rounded-sm text-lg"
          >
            Shop Now
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Hero;
