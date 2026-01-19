import { Container, Row, Col, Spinner, Alert, Button } from "react-bootstrap";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../components/CartContext";
import ProductCard from "../components/ProductCard";

export default function Sales() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { addToCart } = useCart();

    const handleQuickAdd = (e, product) => {
        addToCart(product, 1);
        alert("Added to Cart!");
    };

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                // Determine API URL based on environment
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const response = await fetch(`${API_URL}/products`);
                if (response.ok) {
                    const data = await response.json();

                    // Filter only products that have a discount (Real or Daily Flash Sale from Backend)
                    const salesData = data.filter(p => p.discount_percentage > 0);

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
                <h1 className="display-4 fw-bold text-danger">⚡ Flash Sale ⚡</h1>
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

            <Row xs={1} md={2} lg={4} xl={5} className="g-4">
                {products.map((product) => (
                    <Col key={product.id}>
                        <ProductCard
                            product={product}
                            navigate={navigate}
                            onQuickAdd={handleQuickAdd}
                        />
                    </Col>
                ))}
            </Row>
        </Container>
    );
}
