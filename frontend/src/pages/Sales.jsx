import { Container, Row, Col, Card, Button, Spinner, Alert } from "react-bootstrap";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaStar } from "react-icons/fa";
import { useCart } from "../components/CartContext";

export default function Sales() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { addToCart } = useCart();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const API_URL = 'https://c4772cc6-1f1b-44f4-8b39-7a97086b8204-00-260uyq3aib74z.pike.replit.dev';
                const response = await fetch(`${API_URL}/products`);
                if (response.ok) {
                    const data = await response.json();

                    // SIMULATE DISCOUNTS
                    // We'll take roughly 30% of items and mark them as "on sale"
                    // Since backend price is real, we pretend the "original" price was higher.
                    const salesData = data
                        .map(p => ({
                            ...p,
                            rating: Math.floor(Math.random() * 2) + 3.5,
                            isSale: Math.random() < 0.4, // 40% chance of being on sale
                        }))
                        .filter(p => p.isSale) // Only keep sale items
                        .map(p => ({
                            ...p,
                            // If current price is 80, simulated original might be 100
                            originalPrice: (parseFloat(p.price) * (1.1 + Math.random() * 0.4)).toFixed(2)
                        }));

                    setProducts(salesData);

                } else {
                    throw new Error("Failed to load products");
                }
            } catch (err) {
                console.error(err);
                setError("Could not load sales products. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    return (
        <Container className="py-5" style={{ minHeight: '80vh' }}>
            <div className="text-center mb-5">
                <h1 className="display-4 fw-bold text-danger">Flash Sale</h1>
                <p className="lead text-muted">Limited time offers. Grab them before they're gone!</p>
            </div>

            {loading && (
                <div className="text-center py-5">
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </Spinner>
                </div>
            )}
            {error && <Alert variant="danger">{error}</Alert>}

            {!loading && !error && products.length === 0 && (
                <div className="text-center py-5">
                    <h3>No items currently on sale. Check back soon!</h3>
                    <Link to="/">
                        <Button variant="outline-dark" className="mt-3">Return Home</Button>
                    </Link>
                </div>
            )}

            <Row xs={1} md={2} lg={4} className="g-4">
                {products.map((product) => (
                    <Col key={product.id}>
                        <Card className="h-100 border-0 shadow-sm product-card position-relative overflow-hidden" onClick={() => navigate(`/products/${product.id}`)}>
                            <div className="position-absolute top-0 end-0 m-2 badge bg-danger fs-6 shadow-sm z-2">
                                SALE
                            </div>
                            <div className="position-relative overflow-hidden">
                                <Card.Img
                                    variant="top"
                                    src={product.image_url}
                                    style={{ height: '220px', objectFit: 'cover' }}
                                    className="product-img-zoom"
                                />
                            </div>

                            <Card.Body className="d-flex flex-column">
                                <Card.Title className="fw-bold text-truncate">{product.name}</Card.Title>
                                <Card.Text className="text-muted small text-truncate">
                                    {product.description || "No description available."}
                                </Card.Text>

                                <div className="d-flex align-items-center mb-2">
                                    {[...Array(5)].map((_, i) => (
                                        <FaStar key={i} size={14} className={i < (product.rating || 4) ? "text-warning" : "text-muted"} style={{ opacity: i < (product.rating || 4) ? 1 : 0.3 }} />
                                    ))}
                                    <span className="ms-1 small text-muted">({Math.floor(Math.random() * 50) + 1})</span>
                                </div>

                                <div className="mt-auto">
                                    <div className="d-flex align-items-center gap-2 mb-3">
                                        <h5 className="mb-0 fw-bold text-danger">RM{product.price}</h5>
                                        <span className="text-muted text-decoration-line-through small">RM{product.originalPrice}</span>
                                    </div>
                                    <Button
                                        variant="dark"
                                        className="w-100 rounded-pill"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            addToCart(product, 1);
                                            alert("Added to Cart!");
                                        }}
                                    >
                                        Add to Cart
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        </Container>
    );
}
