import { Container, Row, Col, Card, Button, Spinner, Alert, Carousel, Offcanvas, Form, InputGroup, Toast, ToastContainer } from "react-bootstrap";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { FaStar, FaShoppingCart } from "react-icons/fa";
import { useCart } from "../components/CartContext";

export default function Home() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { addToCart } = useCart();

    const [recentProducts, setRecentProducts] = useState([]);

    // Filter States
    const [priceFilters, setPriceFilters] = useState([]); // Array of {min, max}
    const [minRating, setMinRating] = useState(0); // number

    // Quick Add States
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quickAddQuantity, setQuickAddQuantity] = useState(1);
    const [showToast, setShowToast] = useState(false);
    const [sortOption, setSortOption] = useState('relevance');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const API_URL = 'https://c4772cc6-1f1b-44f4-8b39-7a97086b8204-00-260uyq3aib74z.pike.replit.dev';
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
                            .filter(p => p !== undefined);
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

        // 1.5 Category Filter (Simulated)
        if (category) {
            const catLower = category.toLowerCase();
            const textToCheck = (product.name + " " + product.description).toLowerCase();

            // Simple keyword matching since we don't have real category data
            if (!textToCheck.includes(catLower)) {
                // Fallback keywords
                if (catLower === 'electronics' && !textToCheck.includes('camera') && !textToCheck.includes('tech') && !textToCheck.includes('phone')) return false;
                if (catLower === 'fashion' && !textToCheck.includes('shirt') && !textToCheck.includes('dress') && !textToCheck.includes('wear')) return false;
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

    return (
        <div className="bg-white py-4 position-relative">
            {/* SUCCESS TOAST */}
            <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1050 }}>
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
            <Container fluid className="px-5">
                <Row>
                    {/* LEFT SIDEBAR - Fixed width for better layout control? Col-2 is roughly sidebar size in fluid */}
                    <Col md={3} lg={2} className="d-none d-md-block">
                        <Sidebar onFilterChange={handleFilterChange} />
                    </Col>

                    {/* MAIN CONTENT */}
                    <Col md={9} lg={10}>
                        {/* 1. HERO CAROUSEL SECTION (Only on Home, no search/category) */}
                        {!searchQuery && !category && (
                            <Carousel className="mb-5 shadow-sm rounded overflow-hidden" controls={false} indicators={true} interval={5000} pause="hover">
                                {/* SLIDE 1: Mid-Season Sale */}
                                <Carousel.Item>
                                    <div
                                        className="w-100 d-flex align-items-center justify-content-center text-white text-center"
                                        style={{
                                            height: '400px',
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                        }}
                                    >
                                        <div className="px-4">
                                            <h2 className="display-4 fw-bold animated fadeInDown">MID-SEASON SALE</h2>
                                            <p className="lead animated fadeInUp delay-1s">Up to 50% Off Selected Items.</p>
                                            <Link to="/sales">
                                                <Button variant="light" size="lg" className="rounded-pill px-5 fw-bold mt-3 shadow-sm hover-scale">
                                                    Shop Now
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </Carousel.Item>

                                {/* SLIDE 2: Lifestyle Image */}
                                <Carousel.Item>
                                    <div
                                        className="w-100 d-flex align-items-center justify-content-center text-white text-center position-relative"
                                        style={{
                                            height: '400px',
                                            backgroundImage: "url('https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop')",
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center center'
                                        }}
                                    >
                                        <div className="position-absolute top-0 start-0 w-100 h-100 bg-black bg-opacity-50"></div>
                                        <div className="position-relative z-2 px-4">
                                            <h2 className="display-4 fw-bold">New Arrivals</h2>
                                            <p className="lead">Discover the latest trends in fashion and tech.</p>
                                            <Link to="/categories">
                                                <Button variant="outline-light" size="lg" className="rounded-pill px-5 fw-bold mt-3 hover-scale">
                                                    View Collection
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </Carousel.Item>

                                {/* SLIDE 3: Brand Promo */}
                                <Carousel.Item>
                                    <div
                                        className="w-100 d-flex align-items-center justify-content-center text-white text-center"
                                        style={{
                                            height: '400px',
                                            background: 'linear-gradient(to right, #434343 0%, black 100%)'
                                        }}
                                    >
                                        <div className="px-4">
                                            <h2 className="display-4 fw-bold">Member Exclusive</h2>
                                            <p className="lead">Free shipping on all orders over RM50.</p>
                                            <Link to="/login">
                                                <Button variant="warning" size="lg" className="rounded-pill px-5 fw-bold mt-3 text-dark">
                                                    Join Today
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </Carousel.Item>
                            </Carousel>
                        )}


                        {/* 2. RECENTLY VIEWED (If any, and no search/category) */}
                        {!searchQuery && !category && recentProducts.length > 0 && (
                            <div className="mb-5">
                                <Row xs={1} md={2} lg={4} xl={5} className="g-3">
                                    {recentProducts.map((product) => (
                                        <Col key={'recent-' + product.id}>
                                            <Card className="h-100 border-0 shadow-sm product-card" onClick={() => navigate(`/products/${product.id}`)}>
                                                <div className="position-relative overflow-hidden">
                                                    <div className="position-absolute top-0 start-0 m-2 badge bg-secondary small bg-opacity-75">
                                                        Recent
                                                    </div>
                                                    <Card.Img
                                                        variant="top"
                                                        src={product.image_url}
                                                        style={{ height: '180px', objectFit: 'cover' }}
                                                        className="product-img-zoom"
                                                    />
                                                </div>
                                                <Card.Body className="p-3">
                                                    <Card.Title className="fw-bold text-truncate small">{product.name}</Card.Title>
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <h6 className="mb-0 fw-bold text-dark">RM{product.price}</h6>
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                                <hr className="my-5" />
                            </div>
                        )}


                        {/* 3. PRODUCT GRID */}
                        <div className="mb-5">
                            <div className="d-flex justify-content-between align-items-end mb-4">
                                {searchQuery ? (
                                    <div className="d-flex align-items-center gap-2">
                                        <h4 className="fw-bold mb-0">Results for "{searchQuery}"</h4>
                                        <Button variant="link" size="sm" className="text-decoration-none text-muted" onClick={() => navigate("/")}>(Clear)</Button>
                                    </div>
                                ) : category ? (
                                    <h4 className="fw-bold mb-0">Explore {category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                                ) : (
                                    <div className="d-flex align-items-center w-100 justify-content-between">
                                        <h4 className="fw-bold mb-0">All Products</h4>
                                        <div className="d-flex gap-2">
                                            {minRating > 0 && <span className="badge bg-warning text-dark align-self-center">Rating: {minRating}+ <span role="button" onClick={() => setMinRating(0)} className="ms-1">&times;</span></span>}
                                            <Form.Select
                                                size="sm"
                                                style={{ width: 'auto', cursor: 'pointer' }}
                                                className="border-0 bg-transparent fw-bold text-muted"
                                                onChange={(e) => {
                                                    const sortVal = e.target.value;
                                                    // State update logic is handled by setting sortOption
                                                    setSortOption(sortVal);
                                                }}
                                            >
                                                <option value="relevance">Sort by: Relevancy</option>
                                                <option value="price-asc">Price: Low to High</option>
                                                <option value="price-desc">Price: High to Low</option>
                                            </Form.Select>
                                        </div>
                                    </div>
                                )}
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
                                    <h4 className="text-muted">No products found matching your filters.</h4>
                                    <Button variant="outline-dark" onClick={() => navigate("/")}>Clear All Filters</Button>
                                </div>
                            )}
                            <Row xs={1} md={2} lg={4} xl={5} className="g-4">
                                {filteredProducts.map((product) => (
                                    <Col key={product.id}>
                                        <Card className="h-100 border-0 shadow-sm product-card" onClick={() => navigate(`/products/${product.id}`)}>
                                            <div className="position-relative overflow-hidden">
                                                <Card.Img
                                                    variant="top"
                                                    src={product.image_url}
                                                    style={{ height: '220px', objectFit: 'cover' }}
                                                    className="product-img-zoom"
                                                />
                                            </div>

                                            <Card.Body>
                                                <Card.Title className="fw-bold text-truncate">{product.name}</Card.Title>
                                                <Card.Text className="text-muted small text-truncate">
                                                    {product.description || "No description available."}
                                                </Card.Text>

                                                {/* Real Rating Display */}
                                                <div className="d-flex align-items-center mb-2">
                                                    {[...Array(5)].map((_, i) => (
                                                        <FaStar
                                                            key={i}
                                                            size={14}
                                                            className={i < Math.round(product.average_rating || 0) ? "text-warning" : "text-muted"}
                                                            style={{ opacity: i < Math.round(product.average_rating || 0) ? 1 : 0.3 }}
                                                        />
                                                    ))}
                                                    <span className="ms-1 small text-muted">({product.review_count || 0})</span>
                                                </div>

                                                <div className="d-flex justify-content-between align-items-center mt-auto">
                                                    <h5 className="mb-0 fw-bold text-dark">RM{product.price}</h5>
                                                    <Button variant="outline-dark" size="sm" className="rounded-circle px-2" onClick={(e) => handleQuickAddClick(e, product)}>
                                                        +
                                                    </Button>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </div>
                    </Col>
                </Row>
            </Container>

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