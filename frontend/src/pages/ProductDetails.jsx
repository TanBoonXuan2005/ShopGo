import { Container, Row, Col, Card, Button, Spinner, Alert, Badge, Toast, ToastContainer } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import { FaShoppingCart, FaStar, FaShieldAlt, FaShippingFast } from "react-icons/fa";
import { useCart } from "../components/CartContext";
import { AuthContext } from "../components/AuthProvider";
import { Form } from "react-bootstrap";

export default function ProductDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);

    const { currentUser } = useContext(AuthContext);

    const [quantity, setQuantity] = useState(1);
    const [showToast, setShowToast] = useState(false);

    // Review States
    const [reviews, setReviews] = useState([]);
    const [userRating, setUserRating] = useState(5);
    const [userComment, setUserComment] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            setLoading(true);
            try {
                const API_URL = 'http://localhost:5000';

                const response = await fetch(`${API_URL}/products/${id}`);

                if (response.ok) {
                    const data = await response.json();

                    setProduct(data);

                    // Save to Recently Viewed (LocalStorage) - excluding current view
                    const recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
                    const newRecent = [parseInt(id), ...recent.filter(pid => pid !== parseInt(id))].slice(0, 8);
                    localStorage.setItem('recentlyViewed', JSON.stringify(newRecent));

                    // Fetch Reviews
                    const reviewsRes = await fetch(`${API_URL}/products/${id}/reviews`);
                    if (reviewsRes.ok) {
                        setReviews(await reviewsRes.json());
                    }

                    // Fetch related (random 4 for now)
                    const allRes = await fetch(`${API_URL}/products`);
                    if (allRes.ok) {
                        const allData = await allRes.json();
                        // Filter out current product
                        const other = allData.filter(p => p.id !== parseInt(id) && p.id !== data.id).slice(0, 4);
                        setRelatedProducts(other);
                    }

                } else {
                    throw new Error("Failed to load product");
                }

            } catch (err) {
                console.error(err);
                setError("Could not load product. Please try again later.");
            } finally {
                setLoading(false);
            }
        }
        fetchProduct();
    }, [id]);

    const handleAddToCart = () => {
        addToCart(product, quantity);
        setShowToast(true);
        // alert(`Added ${quantity} item(s) to Cart!`); 
    }

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!currentUser) {
            navigate("/login");
            return;
        }

        setSubmittingReview(true);
        try {
            const API_URL = 'http://localhost:5000';
            const response = await fetch(`${API_URL}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firebase_uid: currentUser.uid,
                    product_id: product.id,
                    rating: userRating,
                    comment: userComment
                })
            });

            if (response.ok) {
                const newReview = await response.json();
                // Optimistically update UI
                setReviews([newReview, ...reviews]);
                setUserComment("");
                alert("Review submitted!");
            } else {
                alert("Failed to submit review.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmittingReview(false);
        }
    };

    if (loading) return <Container className="py-5 text-center" style={{ minHeight: "80vh" }}><Spinner animation="border" /></Container>;
    if (error) return <Container className="py-5" style={{ minHeight: "80vh" }}><Alert variant="danger">{error}</Alert></Container>;
    if (!product) return <Container className="py-5" style={{ minHeight: "80vh" }}><Alert variant="warning">Product not found.</Alert></Container>;

    return (
        <Container className="py-5 position-relative" style={{ minHeight: "80vh" }}>
            {/* SUCCESS TOAST */}
            <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1050 }}>
                <Toast onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide bg="success">
                    <Toast.Header>
                        <strong className="me-auto text-success">Added to Cart</strong>
                        <small>Just now</small>
                    </Toast.Header>
                    <Toast.Body className="text-white">
                        {quantity} x {product.name} added to your cart.
                    </Toast.Body>
                </Toast>
            </ToastContainer>


            <Row className="mb-5">
                {/* LEFT: IMAGE */}
                <Col md={6} className="mb-4 mb-md-0">
                    <Card className="border-0 shadow-sm overflow-hidden">
                        <Card.Img
                            variant="top"
                            src={product.image_url}
                            style={{ height: "450px", objectFit: "cover" }}
                            className="bg-light"
                        />
                    </Card>
                </Col>

                {/* RIGHT: DETAILS */}
                <Col md={6}>
                    <div className="ps-lg-4">
                        <div className="d-flex justify-content-between align-items-start">
                            <Badge bg="dark" className="mb-2 text-uppercase tracking-wider px-3 py-2">New Arrival</Badge>
                            <div className="d-flex align-items-center text-warning small">
                                {[...Array(5)].map((_, i) => (
                                    <FaStar key={i} className={i < Math.round(product.average_rating || 0) ? "text-warning" : "text-muted"} style={{ opacity: i < Math.round(product.average_rating || 0) ? 1 : 0.3 }} />
                                ))}
                                <span className="text-muted ms-2 text-decoration-underline link-offset-2 link-underline-opacity-25" style={{ cursor: 'pointer' }}>({product.review_count || 0} reviews)</span>
                            </div>
                        </div>

                        <h1 className="fw-bolder mb-2 display-5">{product.name}</h1>


                        <h2 className="display-6 fw-bold text-dark mb-4">RM{product.price}</h2>
                        <p className="lead text-muted mb-4" style={{ fontSize: "1.1rem", lineHeight: "1.8" }}>
                            {product.description || "No description available for this product. However, it is one of our best sellers."}
                        </p>

                        <div className="d-flex align-items-center gap-2 mb-4">
                            <Button
                                variant="outline-dark"
                                className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                                style={{ width: '40px', height: '40px' }}
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            >
                                -
                            </Button>
                            <span className="fs-5 fw-bold px-3 text-center" style={{ minWidth: '60px' }}>{quantity}</span>
                            <Button
                                variant="outline-dark"
                                className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                                style={{ width: '40px', height: '40px' }}
                                onClick={() => setQuantity(quantity + 1)}
                            >
                                +
                            </Button>
                        </div>

                        <div className="d-grid gap-2 mb-4">
                            <Button variant="dark" size="lg" className="rounded-pill py-3 fw-bold" onClick={handleAddToCart}>
                                <FaShoppingCart className="me-2" /> Add to Shopping Bag
                            </Button>
                        </div>

                        {/* Features */}
                        <div className="d-flex justify-content-between border-top pt-4">
                            <div className="text-center px-2">
                                <FaShieldAlt className="text-secondary mb-2" size={20} />
                                <p className="small text-muted mb-0 fw-bold">Secure Checkout</p>
                            </div>
                            <div className="text-center px-2 border-start">
                                <FaShippingFast className="text-secondary mb-2" size={20} />
                                <p className="small text-muted mb-0 fw-bold">Fast Shipping</p>
                            </div>
                            <div className="text-center px-2 border-start">
                                <FaStar className="text-secondary mb-2" size={20} />
                                <p className="small text-muted mb-0 fw-bold">Quality Guarantee</p>
                            </div>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* REVIEWS SECTION */}
            <div className="mb-5 border-top pt-5">
                <h3 className="fw-bold mb-4">Customer Reviews</h3>
                <Row>
                    <Col md={5} className="mb-4">
                        <Card className="border-0 shadow-sm bg-light p-4">
                            <h5 className="fw-bold mb-3">Write a Review</h5>
                            {currentUser ? (
                                <Form onSubmit={handleSubmitReview}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-bold">Rating</Form.Label>
                                        <div className="mb-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <FaStar
                                                    key={star}
                                                    size={24}
                                                    className={`me-1 ${star <= userRating ? "text-warning" : "text-secondary"}`}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => setUserRating(star)}
                                                />
                                            ))}
                                        </div>
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-bold">Your Review</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            placeholder="What did you like or dislike?"
                                            value={userComment}
                                            onChange={(e) => setUserComment(e.target.value)}
                                            required
                                        />
                                    </Form.Group>
                                    <Button variant="dark" type="submit" disabled={submittingReview} className="w-100 fw-bold">
                                        {submittingReview ? <Spinner size="sm" /> : "Submit Review"}
                                    </Button>
                                </Form>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-muted">Please login to write a review.</p>
                                    <Button variant="outline-dark" onClick={() => navigate("/login")}>Login</Button>
                                </div>
                            )}
                        </Card>
                    </Col>
                    <Col md={7}>
                        {reviews.length > 0 ? (
                            <div className="d-flex flex-column gap-3">
                                {reviews.map(review => (
                                    <Card key={review.id} className="border-0 shadow-sm">
                                        <Card.Body>
                                            <div className="d-flex justify-content-between mb-2">
                                                <div>
                                                    <strong className="d-block">{review.user_email?.split('@')[0] || "User"}</strong>
                                                    <div className="d-flex text-warning small">
                                                        {[...Array(5)].map((_, i) => (
                                                            <FaStar key={i} className={i < review.rating ? "text-warning" : "text-muted"} style={{ opacity: i < review.rating ? 1 : 0.3 }} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <small className="text-muted">{new Date(review.created_at).toLocaleDateString()}</small>
                                            </div>
                                            <p className="mb-0 text-muted small">{review.comment}</p>
                                        </Card.Body>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-5 bg-light rounded">
                                <p className="mb-0 text-muted">No reviews yet. Be the first to review!</p>
                            </div>
                        )}
                    </Col>
                </Row>
            </div>

            {/* RELATED PRODUCTS */}
            {relatedProducts.length > 0 && (
                <div className="mt-5 pt-5 border-top">
                    <h3 className="fw-bold mb-4">You May Also Like</h3>
                    <Row xs={1} md={2} lg={4} className="g-4">
                        {relatedProducts.map(rel => (
                            <Col key={rel.id}>
                                <Card className="h-100 border-0 shadow-sm product-card" onClick={() => {
                                    window.scrollTo(0, 0);
                                    navigate(`/products/${rel.id}`);
                                }}>
                                    <div className="position-relative overflow-hidden">
                                        <Card.Img
                                            variant="top"
                                            src={rel.image_url}
                                            style={{ height: '250px', objectFit: 'cover' }}
                                            className="product-img-zoom"
                                        />
                                    </div>
                                    <Card.Body>
                                        <Card.Title className="fw-bold text-truncate h6">{rel.name}</Card.Title>
                                        <h6 className="fw-bold text-success">RM{rel.price}</h6>
                                        <Button variant="outline-dark" size="sm" className="w-100 mt-2 rounded-pill">View Details</Button>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </div>
            )}
        </Container>
    )

}