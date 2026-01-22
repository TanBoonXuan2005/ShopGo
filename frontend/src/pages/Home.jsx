import { Container, Row, Col, Button, Spinner, Alert, Carousel, Offcanvas, Form, InputGroup, Toast, ToastContainer } from "react-bootstrap";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ProductCard from "../components/ProductCard";
import { FaStar, FaTshirt, FaMobileAlt, FaCouch, FaPumpSoap, FaFootballBall, FaGamepad, FaFilter, FaLaptop } from "react-icons/fa";
import { useCart } from "../components/CartContext";

export default function Home() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { addToCart } = useCart();

    const [recentProducts, setRecentProducts] = useState([]);

    // Filter States
    const [priceFilters, setPriceFilters] = useState([]); 
    const [minRating, setMinRating] = useState(0); 

    // Quick Add States
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quickAddQuantity, setQuickAddQuantity] = useState(1);
    const [showToast, setShowToast] = useState(false);
    const [sortOption, setSortOption] = useState('relevance');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const response = await fetch(`${API_URL}/products`);
                if (response.ok) {
                    const data = await response.json();

                    // MOCK RATINGS: Removed. Now using real data from backend.
                    setProducts(data);

                    // Filter recently viewed from these products
                    const recentIds = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
                    if (recentIds.length > 0) {
                        const viewed = recentIds
                            .map(id => data.find(p => p.id === id))
                            .filter(p => p !== undefined)
                            .slice(0, 4);
                        setRecentProducts(viewed);
                    }

                } else {
                    throw new Error("Failed to load products");
                }
            } catch (err) {
                console.error(err);
                setError("Could not load products. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    // Handle Filter Changes from Sidebar
    const handleFilterChange = (type, value) => {
        if (type === 'price') {
            if (value.checked) {
                setPriceFilters(prev => [...prev, { min: value.min, max: value.max }]);
            } else {
                setPriceFilters(prev => prev.filter(f => f.min !== value.min || f.max !== value.max));
            }
        } else if (type === 'rating') {
            // Value is just the number now
            setMinRating(value);
        }
    };

    // Filter products based on search AND sidebar filters
    const [searchParams] = useSearchParams();
    const searchQuery = searchParams.get("search");
    const { category } = useParams();

    const filteredProducts = products.filter(product => {
        // 1. Search Query
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            const matchesSearch = product.name.toLowerCase().includes(lowerQuery) ||
                (product.description && product.description.toLowerCase().includes(lowerQuery));
            if (!matchesSearch) return false;
        }

        // 1.5 Category Filter
        if (category) {
            const catLower = category.toLowerCase();
            const prodCat = (product.category || "").toLowerCase();
            if (prodCat !== catLower && !prodCat.includes(catLower)) {
                return false;
            }
        }

        // 2. Price Filter (OR logic between checked ranges)
        if (priceFilters.length > 0) {
            const matchesPrice = priceFilters.some(range => product.price >= range.min && product.price < range.max);
            if (!matchesPrice) return false;
        }

        // 3. Rating Filter (Min Rating)
        if (minRating > 0) {
            if ((product.rating || 0) < minRating) return false;
        }

        return true;
    }).sort((a, b) => {
        if (sortOption === 'price-asc') return a.price - b.price;
        if (sortOption === 'price-desc') return b.price - a.price;
        return 0;
    });

    const handleQuickAddClick = (e, product) => {
        e.stopPropagation();
        setSelectedProduct(product);
        setQuickAddQuantity(1);
        setShowQuickAdd(true);
    };

    const handleConfirmQuickAdd = () => {
        if (selectedProduct) {
            addToCart(selectedProduct, quickAddQuantity);
            setShowQuickAdd(false);
            setShowToast(true);
        }
    };

    // Mobile Filter State
    const [showFilter, setShowFilter] = useState(false);

    // Enhanced Categories with Icons for Mobile
    const categoryIcons = [
        { name: 'All', icon: <FaStar size={20} />, link: '/' },
        { name: 'Fashion', icon: <FaTshirt size={20} />, link: '/c/fashion' },
        { name: 'Laptops', icon: <FaLaptop size={20} />, link: '/c/laptops' },
        { name: 'Devices', icon: <FaMobileAlt size={20} />, link: '/c/electronics' },
        { name: 'Home', icon: <FaCouch size={20} />, link: '/c/home' },
        { name: 'Beauty', icon: <FaPumpSoap size={20} />, link: '/c/beauty' },
        { name: 'Accessories', icon: <FaStar size={20} />, link: '/c/accessories' }, // Added Accessories
        { name: 'Sports', icon: <FaFootballBall size={20} />, link: '/c/sports' },
        { name: 'Toys', icon: <FaGamepad size={20} />, link: '/c/toys' },
    ];

    return (
        <div className="bg-white py-3 py-md-4 position-relative">
            {/* SUCCESS TOAST */}
            <ToastContainer position="top-end" className="p-3 position-fixed" style={{ zIndex: 9999, top: '80px', right: '10px' }}>
                <Toast onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide bg="success">
                    <Toast.Header>
                        <strong className="me-auto text-success">Added to Cart</strong>
                        <small>Just now</small>
                    </Toast.Header>
                    <Toast.Body className="text-white">
                        Added to your cart successfully!
                    </Toast.Body>
                </Toast>
            </ToastContainer>


            {/* FLUID CONTAINER FOR WIDER LAYOUT */}
            <Container fluid className="px-3 px-md-5">
                <Row>
                    {/* LEFT SIDEBAR - Desktop */}
                    <Col md={3} lg={2} className="d-none d-md-block">
                        <Sidebar onFilterChange={handleFilterChange} />
                    </Col>

                    {/* MAIN CONTENT */}
                    <Col md={9} lg={10}>
                        {/* 1. HERO CAROUSEL SECTION (Only on Home, no search/category) */}
                        {!searchQuery && !category && (
                            <Carousel className="mb-4 shadow-sm rounded overflow-hidden" controls={false} indicators={true} interval={5000} pause="hover">
                                {/* SLIDE 1: Mid-Season Sale */}
                                <Carousel.Item>
                                    <div
                                        className="w-100 d-flex align-items-center justify-content-center text-white text-center hero-carousel-item"
                                        style={{
                                            height: '400px',
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                        }}
                                    >
                                        <div className="px-4">
                                            <h2 className="display-4 fw-bold animated fadeInDown fs-1-mobile">MID-SEASON SALE</h2>
                                            <p className="lead animated fadeInUp delay-1s d-none d-sm-block">Up to 50% Off Selected Items.</p>
                                            <Link to="/sales">
                                                <Button variant="light" size="lg" className="rounded-pill px-4 px-md-5 fw-bold mt-3 shadow-sm hover-scale fs-6">
                                                    Shop Now
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </Carousel.Item>

                                {/* SLIDE 2: Lifestyle Image */}
                                <Carousel.Item>
                                    <div
                                        className="w-100 d-flex align-items-center justify-content-center text-white text-center position-relative hero-carousel-item"
                                        style={{
                                            height: '400px',
                                            backgroundImage: "url('https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop')",
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center center'
                                        }}
                                    >
                                        <div className="position-absolute top-0 start-0 w-100 h-100 bg-black bg-opacity-50"></div>
                                        <div className="position-relative z-2 px-4">
                                            <h2 className="display-4 fw-bold fs-1-mobile">New Arrivals</h2>
                                            <p className="lead d-none d-sm-block">Discover the latest trends in fashion and tech.</p>
                                            <Link to="/categories">
                                                <Button variant="outline-light" size="lg" className="rounded-pill px-4 px-md-5 fw-bold mt-3 hover-scale fs-6">
                                                    View Collection
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </Carousel.Item>

                                {/* SLIDE 3: Brand Promo */}
                                <Carousel.Item>
                                    <div
                                        className="w-100 d-flex align-items-center justify-content-center text-white text-center hero-carousel-item"
                                        style={{
                                            height: '400px',
                                            background: 'linear-gradient(to right, #434343 0%, black 100%)'
                                        }}
                                    >
                                        <div className="px-4">
                                            <h2 className="display-4 fw-bold fs-1-mobile">Member Exclusive</h2>
                                            <p className="lead d-none d-sm-block">Free shipping on all orders over RM50.</p>
                                            <Link to="/login">
                                                <Button variant="warning" size="lg" className="rounded-pill px-4 px-md-5 fw-bold mt-3 text-dark fs-6">
                                                    Join Today
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </Carousel.Item>
                            </Carousel>
                        )}


                        {/* MOBILE CATEGORY DROPDOWN (Minimised View) */}
                        <div className="d-md-none mb-4">
                            <Form.Select
                                className="form-select-lg fw-bold border-0 shadow-sm bg-light"
                                onChange={(e) => navigate(e.target.value)}
                                value={category ? `/c/${category.toLowerCase()}` : '/'}
                            >
                                {categoryIcons.map((cat, idx) => (
                                    <option key={idx} value={cat.link}>
                                        {cat.name}
                                    </option>
                                ))}
                            </Form.Select>
                        </div>


                        {/* 2. RECENTLY VIEWED (If any, and no search/category) */}
                        {!searchQuery && !category && recentProducts.length > 0 && (
                            <div>
                                <h4 className="fw-bold mb-3 h5">Recently Viewed</h4>
                                <Row xs={2} md={2} lg={4} xl={5} className="g-3">
                                    {recentProducts.map((product) => (
                                        <Col key={'recent-' + product.id}>
                                            <ProductCard
                                                product={product}
                                                navigate={navigate}
                                            />
                                        </Col>
                                    ))}
                                </Row>
                                <hr className="my-5" />
                            </div>
                        )}


                        {/* 3. PRODUCT GRID */}
                        <div className="mb-5">
                            <div className="d-flex justify-content-between align-items-end mb-4 flex-wrap gap-2">
                                <div className="d-flex align-items-center w-100 justify-content-between">
                                    {searchQuery ? (
                                        <div className="d-flex align-items-center gap-2">
                                            <h4 className="fw-bold mb-0 h5">"{searchQuery}"</h4>
                                            <Button variant="link" size="sm" className="text-decoration-none text-muted p-0" onClick={() => navigate("/")}>(Clear)</Button>
                                        </div>
                                    ) : category ? (
                                        <h4 className="fw-bold mb-0 h5">{category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                                    ) : (
                                        <h4 className="fw-bold mb-0 h5">All Products</h4>
                                    )}

                                    {/* Sort & Filter Controls (Mobile Optimized) */}
                                    <div className="d-flex gap-2 align-items-center">
                                        {/* Mobile Filter Button */}
                                        <Button variant="outline-dark" size="sm" className="d-md-none d-flex align-items-center gap-1 rounded-pill px-3" onClick={() => setShowFilter(true)}>
                                            <FaFilter size={12} /> Filter
                                        </Button>

                                        <Form.Select
                                            size="sm"
                                            style={{ width: 'auto', cursor: 'pointer', maxWidth: '140px' }}
                                            className="border-0 bg-transparent fw-bold text-muted text-end shadow-none pe-4"
                                            onChange={(e) => setSortOption(e.target.value)}
                                        >
                                            <option value="relevance">Sort: Relevant</option>
                                            <option value="price-asc">Price: Low to High</option>
                                            <option value="price-desc">Price: High to Low</option>
                                        </Form.Select>
                                    </div>
                                </div>
                                {minRating > 0 && <div className="w-100"><span className="badge bg-warning text-dark">Rating: {minRating}+ <span role="button" onClick={() => setMinRating(0)} className="ms-1">&times;</span></span></div>}
                            </div>

                            {loading && (
                                <div className="text-center py-5">
                                    <Spinner animation="border" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </Spinner>
                                </div>
                            )}
                            {error && <Alert variant="danger">{error}</Alert>}
                            {!loading && !error && filteredProducts.length === 0 && (
                                <div className="text-center py-5">
                                    {(searchQuery || category || priceFilters.length > 0 || minRating > 0) ? (
                                        <>
                                            <h4 className="text-muted h5">No products found.</h4>
                                            <Button variant="outline-dark" size="sm" onClick={() => {
                                                navigate("/");
                                                setPriceFilters([]);
                                                setMinRating(0);
                                            }}>Clear Filters</Button>
                                        </>
                                    ) : (
                                        <div className="d-flex flex-column align-items-center">
                                            <h4 className="text-muted mb-3 h5">No products available.</h4>
                                        </div>
                                    )}
                                </div>
                            )}
                            <Row xs={2} md={2} lg={4} xl={5} className="g-3 g-md-4">
                                {filteredProducts.map((product) => (
                                    <Col key={product.id}>
                                        <ProductCard
                                            product={product}
                                            navigate={navigate}
                                            onQuickAdd={handleQuickAddClick}
                                        />
                                    </Col>
                                ))}
                            </Row>
                        </div>
                    </Col>
                </Row>
            </Container>

            {/* MOBILE FILTER OFFCANVAS */}
            <Offcanvas show={showFilter} onHide={() => setShowFilter(false)} placement="start" className="d-md-none" style={{ width: '85%' }}>
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title className="fw-bold">Filters</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body className="pt-0">
                    <Sidebar onFilterChange={handleFilterChange} />
                    <div className="sticky-bottom bg-white pt-3 border-top">
                        <Button variant="dark" className="w-100 rounded-pill fw-bold" onClick={() => setShowFilter(false)}>Show Results</Button>
                    </div>
                </Offcanvas.Body>
            </Offcanvas>

            {/* QUICK ADD OFFCANVAS */}
            <Offcanvas show={showQuickAdd} onHide={() => setShowQuickAdd(false)} placement="bottom" className="rounded-top-4" style={{ height: 'auto', minHeight: '30vh' }}>
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title className="fw-bold">Quick Add to Bag</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    {selectedProduct && (
                        <div className="d-flex flex-column flex-md-row gap-4 align-items-md-center justify-content-center h-100">
                            <div style={{ maxWidth: '150px' }} className="d-none d-md-block">
                                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="img-fluid rounded" />
                            </div>

                            <div className="flex-grow-1">
                                <h3 className="fw-bold mb-1">{selectedProduct.name}</h3>
                                <h4 className="text-muted mb-3">RM{selectedProduct.price}</h4>
                                <p className="text-muted small d-none d-md-block">{selectedProduct.description}</p>
                            </div>

                            <div className="d-flex flex-column gap-3" style={{ minWidth: '200px' }}>
                                <InputGroup>
                                    <Button variant="outline-secondary" onClick={() => setQuickAddQuantity(Math.max(1, quickAddQuantity - 1))}>-</Button>
                                    <Form.Control className="text-center fw-bold" value={quickAddQuantity} readOnly />
                                    <Button variant="outline-secondary" onClick={() => setQuickAddQuantity(quickAddQuantity + 1)}>+</Button>
                                </InputGroup>

                                <Button variant="dark" size="lg" className="w-100 fw-bold" onClick={handleConfirmQuickAdd}>
                                    Add to Cart - RM{(selectedProduct.price * quickAddQuantity).toFixed(2)}
                                </Button>
                            </div>
                        </div>
                    )}
                </Offcanvas.Body>
            </Offcanvas>

        </div>
    );
}