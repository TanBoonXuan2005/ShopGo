import { Container, Row, Col, Card, Button, Spinner, Alert, Badge, Form, InputGroup, Modal, ListGroup } from "react-bootstrap";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { FaStore, FaStar, FaSearch, FaCamera } from "react-icons/fa";
import { AuthContext } from "../components/AuthProvider";
import Sidebar from "../components/Sidebar";
import { storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from "chart.js";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

export default function StorePage() {
    const { sellerId } = useParams();
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams(); // Get URL params
    const q = searchParams.get('q') || ""; // Get 'q' param

    const [products, setProducts] = useState([]);
    const [seller, setSeller] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState(q); // Iniitialize with URL param

    // Use loose equality (==) to handle potential string/number mismatches from URL/Auth
    const isOwner = currentUser && seller && (currentUser.dbId == seller.id);

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

    // Edit Product State
    const [showProductEditModal, setShowProductEditModal] = useState(false);
    const [productToEdit, setProductToEdit] = useState(null);

    // Analytics State
    const [analyticsData, setAnalyticsData] = useState(null);
    const [timeRange, setTimeRange] = useState('daily');

    // Chart Configuration
    // Chart Configuration
    const chartOptions = {
        responsive: true,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        stacked: false,
        plugins: {
            title: {
                display: true,
                text: `Revenue & Orders Trends (${timeRange === 'daily' ? 'Last 24 Hours (Hourly)' :
                    timeRange === 'weekly' ? 'Last 7 Days (Daily)' : 'Last Month (Weekly)'
                    })`,
            },
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: { display: true, text: 'Revenue (RM)' }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                grid: {
                    drawOnChartArea: false,
                },
                title: { display: true, text: 'Orders Created' }
            },
        },
    };

    const chartData = {
        labels: analyticsData?.daily_stats?.map(d => d.date) || [],
        datasets: [
            {
                label: 'Revenue (RM)',
                data: analyticsData?.daily_stats?.map(d => d.revenue) || [],
                borderColor: 'rgb(53, 162, 235)',
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
                yAxisID: 'y',
                tension: 0.3
            },
            {
                label: 'Orders',
                data: analyticsData?.daily_stats?.map(d => d.orders) || [],
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                yAxisID: 'y1',
                tension: 0.3
            },
        ],
    };

    const openEditProductModal = (product) => {
        setProductToEdit(product);
        setShowProductEditModal(true);
    };

    const handleProductUpdate = (updatedProduct) => {
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    };

    // Open Delete Modal
    const handleDeleteProduct = (productId) => {
        setProductToDelete(productId);
        setShowDeleteModal(true);
    };

    // Confirm Delete API Call
    const confirmDelete = async () => {
        if (!productToDelete) return;

        try {
            const API_URL = 'http://localhost:5000';
            const response = await fetch(`${API_URL}/products/${productToDelete}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setProducts(prev => prev.filter(p => p.id !== productToDelete));
                setShowDeleteModal(false);
                setProductToDelete(null);
                // Optional: Show a success toast instead of alert, but alert is fine for success message for now if not requested otherwise
                // Using existing SuccessModal or a simple alert is okay, but user dislikes alerts for confirmation.
                // Let's use a non-intrusive way or just close.
            } else {
                throw new Error("Failed to delete product.");
            }
        } catch (err) {
            console.error(err);
            alert("Error deleting product."); // Error alert is usually acceptable, or set error state
        }
    };

    // Sync local state when URL param changes
    useEffect(() => {
        setSearchTerm(q);
        if (q && activeTab !== 'products') {
            setActiveTab('products');
        }
    }, [q]);

    // Filter States
    const [priceFilters, setPriceFilters] = useState([]);
    const [minRating, setMinRating] = useState(0);

    // Use loose equality (==) to handle potential string/number mismatches from URL/Auth
    const [showEditModal, setShowEditModal] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState("basic"); // basic, profile, banner
    const [newStoreName, setNewStoreName] = useState("");
    const [newStoreImage, setNewStoreImage] = useState(null); // File object
    const [newStoreBanner, setNewStoreBanner] = useState(null); // File object
    const [newStoreBackground, setNewStoreBackground] = useState(null); // File object
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('home');
    const [sidebarKey, setSidebarKey] = useState(0); // Key to force Sidebar re-render/reset

    // Fetch Analytics Logic (Only if Owner)
    useEffect(() => {
        if (isOwner && currentUser?.uid && activeTab === 'dashboard') {
            const fetchAnalytics = async () => {
                try {
                    const API_URL = 'http://localhost:5000';
                    const res = await fetch(`${API_URL}/seller/analytics/${currentUser.uid}?period=${timeRange}`);
                    if (res.ok) {
                        const data = await res.json();
                        setAnalyticsData(data);
                    }
                } catch (err) {
                    console.error("Failed to load analytics", err);
                }
            };
            fetchAnalytics();
        }
    }, [isOwner, currentUser, activeTab, timeRange]);

    const handleEditProduct = (product) => {
        navigate(`/edit-product/${product.id}`);
    };

    // Derive unique categories from products
    const storeCategories = [...new Set(products.map(p => p.category).filter(Boolean))];

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const API_URL = 'http://localhost:5000';

                // Fetch Seller Profile
                const sellerRes = await fetch(`${API_URL}/sellers/${sellerId}`);
                if (sellerRes.ok) {
                    const sellerData = await sellerRes.json();
                    setSeller(sellerData);
                }

                // Fetch Products
                const res = await fetch(`${API_URL}/products?seller_id=${sellerId}`);
                if (!res.ok) throw new Error("Failed to load store products");
                const data = await res.json();
                setProducts(data);
            } catch (err) {
                console.error(err);
                setError("Could not load store data.");
            } finally {
                setLoading(false);
            }
        };

        if (sellerId) {
            fetchData();
        }
    }, [sellerId]);

    const handleFilterChange = (type, value) => {
        if (type === 'price') {
            setPriceFilters(prev => {
                if (value.checked) {
                    return [...prev, { min: value.min, max: value.max }];
                } else {
                    return prev.filter(range => range.min !== value.min || range.max !== value.max);
                }
            });
        } else if (type === 'rating') {
            setMinRating(value);
        }
    };

    const filteredProducts = products.filter(p => {
        // 1. Search Term
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());

        // 2. Price Filter
        let matchesPrice = true;
        if (priceFilters.length > 0) {
            matchesPrice = priceFilters.some(range => {
                const price = parseFloat(p.price);
                return price >= range.min && price < range.max; // Using < max to handle ranges properly (e.g. 0-50, 50-100)
            });
            // Handle infinity separately if needed, but 200-Infinity works with < Infinity logic if Infinity is handled, 
            // but typical logic is often inclusive. Let's adjust slightly for "200 & Above" usually meaning >= 200.
            // Adjust loop:
            matchesPrice = priceFilters.some(range => {
                const price = parseFloat(p.price);
                if (range.max === Infinity) return price >= range.min;
                return price >= range.min && price <= range.max;
            });
        }

        // 3. Rating Filter
        let matchesRating = true;
        if (minRating > 0) {
            matchesRating = (parseFloat(p.average_rating) || 0) >= minRating;
        }

        return matchesSearch && matchesPrice && matchesRating;
    });

    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handleUpdateStore = async (e) => {
        e.preventDefault();
        if (uploading) return;
        setUploading(true);
        setError(null); // Clear previous errors

        try {
            let imageUrl = seller?.store_image_url;
            let bannerUrl = seller?.store_banner_url;
            let backgroundUrl = seller?.store_background_url;

            // 1. Upload Profile Image if selected
            if (newStoreImage) {
                const imageRef = ref(storage, `store_images/profile_${Date.now()}_${newStoreImage.name}`);
                const snapshot = await uploadBytes(imageRef, newStoreImage);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            // 2. Upload Banner Image (Hero)
            if (newStoreBanner) {
                // User mentioned banner is store_banner, but just in case, sticking to a clear name
                const bannerRef = ref(storage, `store_banners/${Date.now()}_${newStoreBanner.name}`);
                const snapshot = await uploadBytes(bannerRef, newStoreBanner);
                bannerUrl = await getDownloadURL(snapshot.ref);
            }

            // 3. Upload Header Background
            if (newStoreBackground) {
                const bgRef = ref(storage, `store_background_images/${Date.now()}_${newStoreBackground.name}`);
                const snapshot = await uploadBytes(bgRef, newStoreBackground);
                backgroundUrl = await getDownloadURL(snapshot.ref);
            }

            // 4. Update Backend
            const API_URL = 'http://localhost:5000';
            const res = await fetch(`${API_URL}/users/${sellerId}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    store_name: newStoreName,
                    store_image_url: imageUrl,
                    store_banner_url: bannerUrl,
                    store_background_url: backgroundUrl
                })
            });

            if (res.ok) {
                const updated = await res.json();
                setSeller({
                    ...seller,
                    store_name: updated.store_name,
                    store_image_url: updated.store_image_url,
                    store_banner_url: updated.store_banner_url,
                    store_background_url: updated.store_background_url
                });
                setShowEditModal(false);
                // Reset file inputs
                setNewStoreImage(null);
                setNewStoreBanner(null);
                setNewStoreBackground(null);
                if (currentUser.refreshUser) currentUser.refreshUser();

                // Show Success Modal instead of alert
                setShowSuccessModal(true);
            } else {
                setError("Failed to update store profile.");
            }
        } catch (err) {
            console.error(err);
            setError("Error updating store. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <Container className="py-5 text-center"><Spinner animation="border" /></Container>;
    if (error) return <Container className="py-5"><Alert variant="danger">{error}</Alert></Container>;

    return (
        <div style={{ backgroundColor: '#f5f5f5' }} className="pb-5">
            {/* 1. SELLER HEADER (Black Bar / Custom Background) */}
            <div
                className="text-white shadow-sm position-relative"
                style={{
                    background: seller?.store_background_url
                        ? `url(${seller.store_background_url}) center/cover no-repeat`
                        : '#212529' // Default dark
                }}
            >
                {/* Overlay if image exists */}
                {seller?.store_background_url && (
                    <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-50"></div>
                )}

                <Container className="py-3 position-relative z-1">
                    <Row className="align-items-center">
                        {/* Seller Info */}
                        <Col md={5} className="d-flex align-items-center">
                            <div className="bg-white rounded-circle d-flex align-items-center justify-content-center me-4 border border-4 border-secondary position-relative overflow-hidden" style={{ width: '80px', height: '80px' }}>
                                {seller?.store_image_url ? (
                                    <img src={seller.store_image_url} alt="Store Logo" className="w-100 h-100 object-fit-cover" />
                                ) : (
                                    <FaStore className="text-dark" size={36} />
                                )}
                                {seller?.id === 2 && <Badge bg="danger" className="position-absolute top-0 start-100 translate-middle">Mall</Badge>}
                            </div>
                            <div>
                                <h2 className="fw-bold mb-1">{seller?.store_name || seller?.email}</h2>
                                <div className="d-flex text-white-50 small mt-2">
                                    <span className="me-3"><FaStar className="text-warning me-1" /> {seller?.average_rating ? parseFloat(seller.average_rating).toFixed(1) : "0"} Rating</span>
                                    <span className="me-3">|</span>
                                    <span>{products.length} Products</span>
                                </div>
                            </div>
                        </Col>

                        {/* Spacer or additional info could go here, currently empty for cleaner look or could center title */}
                        <Col md={4}></Col>

                        {/* Action Buttons (Owner Only) */}
                        <Col md={3} className="text-end">
                            {isOwner && (
                                <div className="d-flex justify-content-end gap-2">
                                    <Button variant="outline-light" size="sm" onClick={() => navigate("/add-product")}>
                                        + Product
                                    </Button>
                                    <Button variant="light" size="sm" onClick={() => { setNewStoreName(seller.store_name || ""); setShowEditModal(true); }}>
                                        Edit
                                    </Button>
                                </div>
                            )}
                        </Col>
                    </Row>
                </Container>
            </div>

            {/* 2. NAVIGATION TABS */}
            <div className="bg-white shadow-sm sticky-top" style={{ top: '70px', zIndex: 900 }}>
                <Container>
                    <div className="d-flex">
                        <Button
                            variant="white"
                            className={`rounded-0 py-3 px-4 fw-bold border-bottom border-3 ${activeTab === 'home' ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
                            onClick={() => setActiveTab('home')}
                        >
                            Home
                        </Button>
                        <Button
                            variant="white"
                            className={`rounded-0 py-3 px-4 fw-bold border-bottom border-3 ${activeTab === 'products' ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
                            onClick={() => setActiveTab('products')}
                        >
                            All Products
                        </Button>
                        {isOwner && (
                            <Button
                                variant="white"
                                className={`rounded-0 py-3 px-4 fw-bold border-bottom border-3 ${activeTab === 'dashboard' ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
                                onClick={() => setActiveTab('dashboard')}
                            >
                                Dashboard
                            </Button>
                        )}
                    </div>
                </Container>
            </div>

            <Container className="py-4">
                {/* TAB CONTENT */}
                {activeTab === 'dashboard' && isOwner && (
                    <Container>
                        <h3 className="fw-bold mb-4">Seller Dashboard</h3>
                        <Row className="g-4 mb-5">
                            <Col md={4}>
                                <Card className="border-0 shadow-sm h-100 bg-primary text-white">
                                    <Card.Body className="d-flex flex-column justify-content-center align-items-center py-5">
                                        <h1 className="display-4 fw-bold mb-0">RM{analyticsData?.revenue?.toFixed(2) || "0.00"}</h1>
                                        <p className="lead mb-0 opacity-75">Total Revenue</p>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={4}>
                                <Card className="border-0 shadow-sm h-100 bg-success text-white">
                                    <Card.Body className="d-flex flex-column justify-content-center align-items-center py-5">
                                        <h1 className="display-4 fw-bold mb-0">{analyticsData?.items_sold || 0}</h1>
                                        <p className="lead mb-0 opacity-75">Items Sold</p>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={4}>
                                <Card className="border-0 shadow-sm h-100 bg-dark text-white">
                                    <Card.Body className="d-flex flex-column justify-content-center align-items-center py-5">
                                        <h1 className="display-4 fw-bold mb-0">{analyticsData?.orders_count || 0}</h1>
                                        <p className="lead mb-0 opacity-75">Total Orders</p>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        {/* Time Series Chart */}
                        {analyticsData?.daily_stats && (
                            <Card className="border-0 shadow-sm mb-4">
                                <Card.Body className="p-4">
                                    <div className="d-flex justify-content-between align-items-center mb-4">
                                        <h4 className="fw-bold mb-0">Sales Trends</h4>
                                        <div style={{ width: '200px' }}>
                                            <Form.Select
                                                value={timeRange}
                                                onChange={(e) => setTimeRange(e.target.value)}
                                                size="sm"
                                            >
                                                <option value="daily">Daily (Hourly)</option>
                                                <option value="weekly">Weekly (Daily)</option>
                                                <option value="monthly">Monthly (Weekly)</option>
                                            </Form.Select>
                                        </div>
                                    </div>
                                    <div style={{ minHeight: '300px' }}>
                                        <Line options={chartOptions} data={chartData} />
                                    </div>
                                </Card.Body>
                            </Card>
                        )}

                        {/* Top Products Chart (Visualization) */}
                        {analyticsData?.top_products && analyticsData.top_products.length > 0 && (
                            <Card className="border-0 shadow-sm mb-5">
                                <Card.Body className="p-4">
                                    <h4 className="fw-bold mb-4">Top Selling Products</h4>
                                    {analyticsData.top_products.map((prod, idx) => (
                                        <div key={idx} className="mb-4">
                                            <div className="d-flex justify-content-between mb-1">
                                                <span className="fw-bold text-dark">{prod.name}</span>
                                                <span className="text-muted small">{prod.items_sold} sold (RM{prod.revenue.toFixed(2)})</span>
                                            </div>
                                            <div className="progress" style={{ height: '10px' }}>
                                                <div
                                                    className={`progress-bar ${idx === 0 ? 'bg-danger' : idx === 1 ? 'bg-warning' : 'bg-info'}`}
                                                    role="progressbar"
                                                    style={{ width: `${(prod.items_sold / Math.max(...analyticsData.top_products.map(p => p.items_sold))) * 100}%` }}
                                                    aria-valuenow={prod.items_sold}
                                                    aria-valuemin="0"
                                                    aria-valuemax="100"
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </Card.Body>
                            </Card>
                        )}

                        {/* Additional insights could go here */}
                        <Alert variant="info">
                            <i className="bi bi-info-circle me-2"></i>
                            Analytics are updated in real-time based on paid orders.
                        </Alert>
                    </Container>
                )}

                {activeTab === 'home' && (
                    <>
                        {/* HERO BANNER */}
                        <Card className="border-0 shadow-sm rounded-0 mb-4 overflow-hidden">
                            <div style={{
                                height: '300px',
                                background: seller?.store_banner_url ? `url(${seller.store_banner_url}) center/cover no-repeat` : 'linear-gradient(to right, #ee0979, #ff6a00)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                position: 'relative'
                            }}>
                                {seller?.store_banner_url && <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-25"></div>}
                                <div className="text-center position-relative z-1">
                                    <h1 className="display-4 fw-bold text-shadow">WELCOME TO {seller?.store_name?.toUpperCase() || "STORE"}</h1>
                                    <p className="lead fw-bold text-shadow">Best Deals & Quality Products</p>
                                </div>
                            </div>
                        </Card>

                        {/* FEATURED / LATEST (First 4 products) */}
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h4 className="fw-bold mb-0">Recommended for You</h4>
                            <Button variant="link" className="text-decoration-none" onClick={() => setActiveTab('products')}>See All {'>'}</Button>
                        </div>
                        <Row xs={1} md={2} lg={4} className="g-3">
                            {products.slice(0, 4).map(product => (
                                <Col key={product.id}>
                                    <ProductCard product={product} navigate={navigate} />
                                </Col>
                            ))}
                        </Row>
                    </>
                )}

                {activeTab === 'products' && (
                    <Row>
                        {/* SIDEBAR FILTERS */}
                        <Col md={3} className="d-none d-md-block">
                            {/* Pass isStorePage={true} and storeCategories */}
                            <Sidebar
                                key={sidebarKey} // Force reset when key changes
                                onFilterChange={handleFilterChange}
                                isStorePage={true}
                                storeCategories={storeCategories}
                            />
                        </Col>

                        {/* PRODUCT GRID */}
                        <Col md={9}>
                            <Row xs={1} md={2} lg={3} className="g-3">
                                {filteredProducts.length > 0 ? (
                                    filteredProducts.map(product => (
                                        <Col key={product.id}>
                                            <ProductCard
                                                product={product}
                                                navigate={navigate}
                                                isOwner={isOwner}
                                                onDelete={handleDeleteProduct}
                                                onEdit={handleEditProduct}
                                            />
                                        </Col>
                                    ))
                                ) : (
                                    <Col xs={12} className="text-center py-5">
                                        <h5 className="text-muted">No products found matching your criteria.</h5>
                                        <Button variant="link" onClick={() => {
                                            setSearchTerm("");
                                            setPriceFilters([]);
                                            setMinRating(0);
                                            setSidebarKey(prev => prev + 1); // Reset Sidebar inputs
                                        }}>
                                            Clear Filters
                                        </Button>
                                    </Col>
                                )}
                            </Row>
                        </Col>
                    </Row>
                )}
            </Container>

            {/* Success Modal */}
            <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
                <Modal.Body className="text-center py-5">
                    <div className="mb-3 text-success">
                        <FaStore size={50} />
                    </div>
                    <h4 className="fw-bold">Success!</h4>
                    <p className="text-muted">Your changes have been successfully saved.</p>
                    <Button variant="dark" onClick={() => setShowSuccessModal(false)} className="px-4 mt-2">
                        Awesome
                    </Button>
                </Modal.Body>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold text-danger">Delete Product?</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="text-muted">
                        Are you sure you want to delete this product? This action cannot be undone.
                    </p>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="light" onClick={() => setShowDeleteModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={confirmDelete}>
                        Delete
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Edit Modal */}
            <Modal show={showEditModal} onHide={() => { setShowEditModal(false); setError(null); }} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Edit Store Profile</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleUpdateStore}>
                    {/* Show error alert inside modal if exists */}
                    {error && (
                        <div className="px-4 pt-3">
                            <Alert variant="danger" onClose={() => setError(null)} dismissible>
                                {error}
                            </Alert>
                        </div>
                    )}
                    <Modal.Body className="p-0">
                        <Row className="g-0">
                            {/* Left Sidebar */}
                            <Col md={4} className="bg-light border-end">
                                <ListGroup variant="flush" className="rounded-0 h-100">
                                    <ListGroup.Item
                                        action
                                        type="button"
                                        active={activeModalTab === 'basic'}
                                        onClick={() => setActiveModalTab('basic')}
                                        className="border-0 border-bottom py-3"
                                    >
                                        Basic Info
                                    </ListGroup.Item>
                                    <ListGroup.Item
                                        action
                                        type="button"
                                        active={activeModalTab === 'profile'}
                                        onClick={() => setActiveModalTab('profile')}
                                        className="border-0 border-bottom py-3"
                                    >
                                        Profile Picture
                                    </ListGroup.Item>
                                    <ListGroup.Item
                                        action
                                        type="button"
                                        active={activeModalTab === 'background'}
                                        onClick={() => setActiveModalTab('background')}
                                        className="border-0 border-bottom py-3"
                                    >
                                        Header Background
                                    </ListGroup.Item>
                                    <ListGroup.Item
                                        action
                                        type="button"
                                        active={activeModalTab === 'banner'}
                                        onClick={() => setActiveModalTab('banner')}
                                        className="border-0 py-3"
                                    >
                                        Store Banner (Hero)
                                    </ListGroup.Item>
                                    <ListGroup.Item
                                        action
                                        type="button"
                                        active={activeModalTab === 'preview'}
                                        onClick={() => setActiveModalTab('preview')}
                                        className="border-0 py-3 fw-bold text-dark" // Highlight it slightly
                                    >
                                        Live Preview
                                    </ListGroup.Item>
                                </ListGroup>
                            </Col>

                            {/* Right Content */}
                            <Col md={8}>
                                <div className="p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                    {/* Tab 1: Basic Info */}
                                    {activeModalTab === 'basic' && (
                                        <Form.Group>
                                            <Form.Label className="fw-bold">Store Name</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={newStoreName}
                                                onChange={(e) => setNewStoreName(e.target.value)}
                                                placeholder="Enter store name"
                                                required
                                            />
                                            <Form.Text className="text-muted">
                                                This is the name that will be displayed on your store homepage.
                                            </Form.Text>
                                        </Form.Group>
                                    )}

                                    {/* Tab 2: Profile Picture */}
                                    {activeModalTab === 'profile' && (
                                        <Form.Group>
                                            <Form.Label className="fw-bold mb-3">Store Logo</Form.Label>
                                            <div className="d-flex flex-column align-items-center">
                                                <div className="border rounded-circle d-flex align-items-center justify-content-center overflow-hidden mb-3" style={{ width: '120px', height: '120px', background: '#f8f9fa' }}>
                                                    {newStoreImage ? (
                                                        <img src={URL.createObjectURL(newStoreImage)} alt="Preview" className="w-100 h-100 object-fit-cover" />
                                                    ) : seller?.store_image_url ? (
                                                        <img src={seller.store_image_url} alt="Current" className="w-100 h-100 object-fit-cover" />
                                                    ) : (
                                                        <FaCamera className="text-muted" size={40} />
                                                    )}
                                                </div>
                                                <Form.Control
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => setNewStoreImage(e.target.files[0])}
                                                    className="w-100"
                                                />
                                                <Form.Text className="text-muted text-center mt-2">
                                                    Recommended size: 500x500 pixels.
                                                </Form.Text>
                                            </div>
                                        </Form.Group>
                                    )}

                                    {/* Tab 3: Header Background */}
                                    {activeModalTab === 'background' && (
                                        <Form.Group>
                                            <Form.Label className="fw-bold mb-3">Header Background</Form.Label>
                                            <div className="border rounded d-flex align-items-center justify-content-center overflow-hidden mb-3" style={{ height: '100px', background: '#212529' }}>
                                                {newStoreBackground ? (
                                                    <img src={URL.createObjectURL(newStoreBackground)} alt="Header Preview" className="w-100 h-100 object-fit-cover" />
                                                ) : seller?.store_background_url ? (
                                                    <img src={seller.store_background_url} alt="Current Header" className="w-100 h-100 object-fit-cover" />
                                                ) : (
                                                    <div className="text-center text-white-50">
                                                        <FaCamera size={24} className="mb-2" />
                                                        <div>Default Black</div>
                                                    </div>
                                                )}
                                            </div>
                                            <Form.Control
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setNewStoreBackground(e.target.files[0])}
                                            />
                                            <Form.Text className="text-muted mt-2">
                                                This image will replace the black background behind your store name.
                                            </Form.Text>
                                        </Form.Group>
                                    )}

                                    {/* Tab 4: Banner */}
                                    {activeModalTab === 'banner' && (
                                        <Form.Group>
                                            <Form.Label className="fw-bold mb-3">Store Banner (Hero Section)</Form.Label>
                                            <div className="border rounded d-flex align-items-center justify-content-center overflow-hidden mb-3" style={{ height: '150px', background: '#f8f9fa' }}>
                                                {newStoreBanner ? (
                                                    <img src={URL.createObjectURL(newStoreBanner)} alt="Banner Preview" className="w-100 h-100 object-fit-cover" />
                                                ) : seller?.store_banner_url ? (
                                                    <img src={seller.store_banner_url} alt="Current Banner" className="w-100 h-100 object-fit-cover" />
                                                ) : (
                                                    <div className="text-center text-muted">
                                                        <FaCamera size={32} className="mb-2" />
                                                        <div>No Banner Set</div>
                                                    </div>
                                                )}
                                            </div>
                                            <Form.Control
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setNewStoreBanner(e.target.files[0])}
                                            />
                                            <Form.Text className="text-muted mt-2">
                                                This image will appear at the top of your store page. Recommended size: 1200x300 pixels.
                                            </Form.Text>
                                        </Form.Group>
                                    )}

                                    {/* Tab 4: Live Preview */}
                                    {activeModalTab === 'preview' && (
                                        <div>
                                            <h6 className="fw-bold mb-3 text-muted text-uppercase small">Store Homepage Preview</h6>

                                            {/* Preview: Header */}
                                            <div
                                                className="text-white p-3 rounded-top shadow-sm mb-3 position-relative overflow-hidden"
                                                style={{
                                                    background: newStoreBackground ? `url(${URL.createObjectURL(newStoreBackground)}) center/cover no-repeat` :
                                                        seller?.store_background_url ? `url(${seller.store_background_url}) center/cover no-repeat` :
                                                            '#212529'
                                                }}
                                            >
                                                {/* Overlay */}
                                                {(newStoreBackground || seller?.store_background_url) && (
                                                    <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-50"></div>
                                                )}

                                                <div className="d-flex align-items-center position-relative z-1">
                                                    <div className="bg-white rounded-circle d-flex align-items-center justify-content-center me-3 border border-2 border-secondary overflow-hidden" style={{ width: '50px', height: '50px' }}>
                                                        {newStoreImage ? (
                                                            <img src={URL.createObjectURL(newStoreImage)} alt="Preview" className="w-100 h-100 object-fit-cover" />
                                                        ) : seller?.store_image_url ? (
                                                            <img src={seller.store_image_url} alt="Current" className="w-100 h-100 object-fit-cover" />
                                                        ) : (
                                                            <FaStore className="text-dark" size={24} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h5 className="fw-bold mb-0 text-white" style={{ fontSize: '1rem' }}>{newStoreName || seller?.store_name}</h5>
                                                        <small className="text-white-50" style={{ fontSize: '0.75rem' }}>4.5 Rating | {products.length} Products</small>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Preview: Banner */}
                                            <div className="rounded shadow-sm overflow-hidden position-relative d-flex align-items-center justify-content-center text-white"
                                                style={{
                                                    height: '180px',
                                                    background: newStoreBanner ? `url(${URL.createObjectURL(newStoreBanner)}) center/cover no-repeat` :
                                                        seller?.store_banner_url ? `url(${seller.store_banner_url}) center/cover no-repeat` :
                                                            'linear-gradient(to right, #ee0979, #ff6a00)'
                                                }}
                                            >
                                                {(newStoreBanner || seller?.store_banner_url) && <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-25"></div>}
                                                <div className="text-center position-relative z-1">
                                                    <h3 className="fw-bold text-shadow mb-0">{(newStoreName || seller?.store_name)?.toUpperCase()}</h3>
                                                    <small className="fw-bold text-shadow">Best Deals & Quality Products</small>
                                                </div>
                                            </div>

                                            <Alert variant="info" className="mt-3 py-2 small">
                                                <FaStar className="me-2" />
                                                This is how your store will look to visitors.
                                            </Alert>
                                        </div>
                                    )}
                                </div>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={uploading}>Cancel</Button>
                        <Button variant="dark" type="submit" disabled={uploading}>
                            {uploading ? <Spinner size="sm" animation="border" /> : "Save Changes"}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
}

// Reusable Product Card Component
function ProductCard({ product, navigate, isOwner, onDelete, onEdit }) {
    return (
        <Card className="h-100 border-0 shadow-sm product-card position-relative">
            <div className="position-relative overflow-hidden" onClick={() => navigate(`/products/${product.id}`)} style={{ cursor: 'pointer' }}>
                <Card.Img
                    variant="top"
                    src={product.image_url}
                    style={{ height: '200px', objectFit: 'cover' }}
                    className="product-img-zoom"
                />
                {product.average_rating > 4.5 && (
                    <Badge bg="warning" text="dark" className="position-absolute top-0 end-0 m-2 shadow-sm">
                        Top Rated
                    </Badge>
                )}
            </div>

            <Card.Body className="p-2 d-flex flex-column justify-content-between">
                <div>
                    <Card.Title className="fw-bold text-truncate small mb-1" onClick={() => navigate(`/products/${product.id}`)} style={{ cursor: 'pointer' }}>{product.name}</Card.Title>
                    <div className="text-danger fw-bold">RM{product.price}</div>
                </div>

                <div className="d-flex align-items-center justify-content-between mt-2">
                    <div className="d-flex align-items-center small text-muted">
                        <FaStar className="text-warning me-1" size={12} />
                        {product.average_rating > 0 ? parseFloat(product.average_rating).toFixed(1) : "0"}
                        <span className="ms-1">({product.review_count || 0})</span>
                    </div>
                    {isOwner && (
                        <div className="d-flex gap-1">
                            <Button variant="outline-dark" size="sm" className="p-1 px-2" onClick={(e) => { e.stopPropagation(); onEdit(product); }}>
                                <i className="bi bi-pencil"></i>
                            </Button>
                            <Button variant="outline-danger" size="sm" className="p-1 px-2" onClick={(e) => { e.stopPropagation(); onDelete(product.id); }}>
                                <i className="bi bi-trash"></i>
                            </Button>
                        </div>
                    )}
                </div>
            </Card.Body>
        </Card>
    );
}
