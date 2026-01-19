import { Container, Button, Card, Row, Col, Spinner } from "react-bootstrap";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { FaStore, FaChartLine, FaBoxOpen } from "react-icons/fa";

export default function SellerRegistration() {
    const { currentUser, refreshUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [storeName, setStoreName] = useState("");

    // If already a seller, redirect
    useEffect(() => {
        if (currentUser && currentUser.role === 'seller') {
            navigate('/add');
        }
    }, [currentUser, navigate]);

    const handleRegister = async () => {
        if (!currentUser) {
            navigate('/login');
            return;
        }

        if (!storeName.trim()) {
            alert("Please enter a store name.");
            return;
        }

        setLoading(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const response = await fetch(`${API_URL}/users/${currentUser.uid}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'seller', store_name: storeName })
            });

            if (response.ok) {
                await refreshUser(); // Update context
                alert("Congratulations! You are now a Seller.");
                navigate('/add');
            } else {
                throw new Error("Registration failed");
            }
        } catch (err) {
            console.error(err);
            alert("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="py-5" style={{ minHeight: '80vh' }}>
            <div className="text-center mb-5">
                <h1 className="display-4 fw-bold">Become a ShopGo Seller</h1>
                <p className="lead text-muted">Start your business journey with us today.</p>
            </div>

            <Row className="justify-content-center">
                <Col lg={8}>
                    <Card className="border-0 shadow-lg rounded-4 overflow-hidden">
                        <div className="bg-dark text-white p-5 text-center">
                            <FaStore size={50} className="mb-3" />
                            <h2>Open Your Online Store</h2>
                            <p className="opacity-75">Join thousands of sellers and reach millions of customers.</p>
                        </div>
                        <Card.Body className="p-5">
                            <Row className="g-4 mb-5 text-center">
                                <Col md={4}>
                                    <div className="p-3 bg-light rounded-3 h-100">
                                        <FaBoxOpen size={30} className="text-primary mb-3" />
                                        <h5 className="fw-bold">List Unlimited Items</h5>
                                        <p className="small text-muted mb-0">Showcase your products to a global audience.</p>
                                    </div>
                                </Col>
                                <Col md={4}>
                                    <div className="p-3 bg-light rounded-3 h-100">
                                        <FaChartLine size={30} className="text-success mb-3" />
                                        <h5 className="fw-bold">Grow Your Business</h5>
                                        <p className="small text-muted mb-0">Access tools and insights to boost your sales.</p>
                                    </div>
                                </Col>
                                <Col md={4}>
                                    <div className="p-3 bg-light rounded-3 h-100">
                                        <FaStore size={30} className="text-warning mb-3" />
                                        <h5 className="fw-bold">Build Your Brand</h5>
                                        <p className="small text-muted mb-0">Create a unique identity for your store.</p>
                                    </div>
                                </Col>
                            </Row>



                            <div className="col-md-8 mx-auto">
                                <div className="mb-4 text-start">
                                    <label className="form-label fw-bold">Store Name</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-lg"
                                        placeholder="Enter your shop name (e.g. My Awesome Store)"
                                        value={storeName}
                                        onChange={(e) => setStoreName(e.target.value)}
                                    />
                                    <div className="form-text">This will be displayed to customers on your shop profile.</div>
                                </div>

                                <div className="d-grid gap-2">
                                    <Button
                                        variant="dark"
                                        size="lg"
                                        className="py-3 fw-bold rounded-pill"
                                        onClick={handleRegister}
                                        disabled={loading || !storeName.trim()}
                                    >
                                        {loading ? <Spinner animation="border" size="sm" /> : "Register Now - It's Free"}
                                    </Button>
                                    <p className="text-center small text-muted mt-2">
                                        By registering, you agree to our Seller Terms & Conditions.
                                    </p>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container >
    );
}
