import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const FilterSlidebar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    category: "",
    gender: "",
    color: "",
    size: [],
    material: [],
    brand: [],
    minPrice: 0,
    maxPrice: 100,
  });
  const [priceRange, setPriceRange] = useState([0, 100]);

  const categories = ["Top Wear", "Bottom Wear"];
  const colors = [
    "Red",
    "Blue",
    "Black",
    "Green",
    "Yellow",
    "Gray",
    "White",
    "Pink",
    "Beige",
    "Navy",
    "Brown",
  ];
  const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
  const materials = [
    "Cotton",
    "Wool",
    "Denim",
    "Polyester",
    "Silk",
    "Linen",
    "Viscose",
    "Fleece",
  ];
  const brands = [
    "Urban Threads",
    "Modern Fit",
    "Street Style",
    "Beach Breeze",
    "Fashionista",
    "ChicStyle",
  ];
  const genders = ["Men", "Women"];

  useEffect(() => {
    const params = Object.fromEntries([...searchParams]);
    setFilters({
      category: params.category || "",
      gender: params.gender || "",
      color: params.color || "",
      size: params.size ? params.size.split(",") : [],
      material: params.material ? params.material.split(",") : [],
      brand: params.brand ? params.brand.split(",") : [],
      minPrice: params.minPrice || 0,
      maxPrice: params.maxPrice || 100,
    });
    setPriceRange([0, params.maxPrice || 100]);
  }, [searchParams]);

  const handleFilterChange = (e) => {
    const { name, value, checked, type } = e.target;
    let newFilters = { ...filters };
    if (type === "checkbox") {
      newFilters[name] = checked
        ? [...(newFilters[name] || []), value]
        : newFilters[name].filter((item) => item !== value);
    } else {
      newFilters[name] = value;
    }
    setFilters(newFilters);
    updateURLParams(newFilters);
  };

  const updateURLParams = (newFilters) => {
    const params = new URLSearchParams();
    Object.keys(newFilters).forEach((key) => {
      if (Array.isArray(newFilters[key]) && newFilters[key].length > 0) {
        params.append(key, newFilters[key].join(","));
      } else if (newFilters[key]) {
        params.append(key, newFilters[key]);
      }
    });
    setSearchParams(params);
    navigate(`?${params.toString()}`);
  };

  const handlePriceChange = (e) => {
    const newPrice = e.target.value;
    setPriceRange([0, newPrice]);
    updateURLParams({ ...filters, minPrice: 0, maxPrice: newPrice });
  };

  // ── Style helpers ───────────────────────────────────────────────
  const labelStyle = {
    display: "block",
    fontSize: "0.65rem",
    fontWeight: 500,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "var(--gold)",
    marginBottom: "0.75rem",
    fontFamily: "var(--ff-sans)",
  };

  const radioCheckStyle = {
    accentColor: "var(--gold)",
    width: "14px",
    height: "14px",
    cursor: "pointer",
    flexShrink: 0,
  };

  const optionLabelStyle = {
    fontSize: "0.82rem",
    color: "var(--ink)",
    cursor: "pointer",
    fontFamily: "var(--ff-sans)",
  };

  const sectionStyle = {
    marginBottom: "1.75rem",
    paddingBottom: "1.75rem",
    borderBottom: "1px solid rgba(15,17,23,0.07)",
  };

  return (
    <div
      style={{
        padding: "1.5rem",
        background: "var(--parchment)",
        borderRight: "1px solid rgba(15,17,23,0.07)",
        minHeight: "100%",
      }}
    >
      <h3
        style={{
          fontFamily: "var(--ff-serif)",
          fontSize: "1.1rem",
          fontWeight: 400,
          color: "var(--ink)",
          marginBottom: "1.75rem",
          letterSpacing: "0.01em",
        }}
      >
        Filters
      </h3>

      {/* Category */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Category</label>
        {categories.map((category) => (
          <div key={category} className="flex items-center gap-2 mb-2">
            <input
              type="radio"
              name="category"
              value={category}
              onChange={handleFilterChange}
              checked={filters.category === category}
              style={radioCheckStyle}
            />
            <span style={optionLabelStyle}>{category}</span>
          </div>
        ))}
      </div>

      {/* Gender */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Gender</label>
        {genders.map((gender) => (
          <div key={gender} className="flex items-center gap-2 mb-2">
            <input
              type="radio"
              name="gender"
              value={gender}
              onChange={handleFilterChange}
              checked={filters.gender === gender}
              style={radioCheckStyle}
            />
            <span style={optionLabelStyle}>{gender}</span>
          </div>
        ))}
      </div>

      {/* Color */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Color</label>
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => (
            <button
              key={color}
              name="color"
              value={color}
              onClick={handleFilterChange}
              title={color}
              style={{
                width: "1.75rem",
                height: "1.75rem",
                borderRadius: "50%",
                backgroundColor: color.toLowerCase(),
                border:
                  filters.color === color
                    ? "2px solid var(--gold)"
                    : "2px solid rgba(15,17,23,0.12)",
                cursor: "pointer",
                transition: "border-color 0.2s, transform 0.15s",
                outline:
                  filters.color === color ? "1px solid var(--gold)" : "none",
                outlineOffset: "2px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            />
          ))}
        </div>
      </div>

      {/* Size */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Size</label>
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => {
            const active = filters.size.includes(size);
            return (
              <label
                key={size}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "2.5rem",
                  height: "2.5rem",
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  fontFamily: "var(--ff-sans)",
                  border: `1px solid ${active ? "var(--ink)" : "rgba(15,17,23,0.15)"}`,
                  borderRadius: "2px",
                  background: active ? "var(--ink)" : "transparent",
                  color: active ? "var(--parchment)" : "var(--ink)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <input
                  type="checkbox"
                  name="size"
                  value={size}
                  onChange={handleFilterChange}
                  checked={active}
                  style={{ display: "none" }}
                />
                {size}
              </label>
            );
          })}
        </div>
      </div>

      {/* Material */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Material</label>
        {materials.map((material) => (
          <div key={material} className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              name="material"
              value={material}
              onChange={handleFilterChange}
              checked={filters.material.includes(material)}
              style={radioCheckStyle}
            />
            <span style={optionLabelStyle}>{material}</span>
          </div>
        ))}
      </div>

      {/* Brand */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Brand</label>
        {brands.map((brand) => (
          <div key={brand} className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              name="brand"
              value={brand}
              onChange={handleFilterChange}
              checked={filters.brand.includes(brand)}
              style={radioCheckStyle}
            />
            <span style={optionLabelStyle}>{brand}</span>
          </div>
        ))}
      </div>

      {/* Price range */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={labelStyle}>Price Range</label>
        <input
          type="range"
          name="priceRange"
          min={0}
          max={100}
          value={priceRange[1]}
          onChange={handlePriceChange}
          style={{
            width: "100%",
            height: "3px",
            accentColor: "var(--gold)",
            cursor: "pointer",
            marginBottom: "0.75rem",
          }}
        />
        <div className="flex justify-between">
          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>$0</span>
          <span
            style={{
              fontSize: "0.78rem",
              color: "var(--gold)",
              fontWeight: 500,
            }}
          >
            ${priceRange[1]}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FilterSlidebar;
