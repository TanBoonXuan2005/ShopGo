import { Container, Row, Col, Card, Button, Spinner, Alert, Badge, Toast, ToastContainer, Modal } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import { FaShoppingCart, FaStar, FaShieldAlt, FaShippingFast, FaStore } from "react-icons/fa";
import { useCart } from "../components/CartContext";
import { AuthContext } from "../components/AuthProvider";
import { Form } from "react-bootstrap";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

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

    // Modal State
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [modalMessage, setModalMessage] = useState("");

    useEffect(() => {
        const fetchProduct = async () => {
            setLoading(true);
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
                        // Filter by category and exclude current product
                        const other = allData
                            .filter(p => p.id !== parseInt(id) && p.id !== data.id && p.category === data.category)
                            .sort(() => 0.5 - Math.random()) // Randomize
                            .slice(0, 4);

                        // Fallback if no related products found
                        if (other.length === 0) {
                            const random = allData.filter(p => p.id !== parseInt(id) && p.id !== data.id).sort(() => 0.5 - Math.random()).slice(0, 4);
                            setRelatedProducts(random);
                        } else {
                            setRelatedProducts(other);
                        }
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
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
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
                setModalMessage("Review submitted successfully!");
                setShowSuccessModal(true);
            } else {
                setModalMessage("Failed to submit review.");
                setShowErrorModal(true);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleChat = async () => {
        if (!currentUser) {
            navigate("/login");
            return;
        }

        if (!product.seller_firebase_uid) {
            // Fallback: If backend hasn't updated yet or old seller
            setModalMessage("This seller is not available for chat.");
            setShowErrorModal(true);
            return;
        }

        const participants = [currentUser.uid, product.seller_firebase_uid].sort();
        const chatId = participants.join("_");

        try {
            const chatRef = doc(db, "chats", chatId);

            // Create or update the chat safely. 
            // setDoc with merge: true passes 'create' rule if new, 'update' rule if exists.
            await setDoc(chatRef, {
                participants: participants,
                updatedAt: serverTimestamp(),
                // Only set lastMessage if it doesn't exist (to avoid overwriting valid history)
                // Actually, for just opening the chat, we don't need to overwrite lastMessage if it exists.
                // But Firestore setDoc merge doesn't have "set if missing" for fields easily without knowing.
                // However, our chat creation only really cares about participants existing.
                // Better approach: Just ensure the doc exists with participants.
            }, { merge: true });

            // Note: If we want to strictly init lastMessage only on creation, 
            // we might need a separate check or just accept that 'Chat Now' might not reset lastMessage (good).

            navigate(`/chat/${chatId}`);
        } catch (err) {
            console.error("Chat Error:", err);
            setModalMessage("Could not start chat.");
            setShowErrorModal(true);
        }
    };

    if (loading) return <Container className="py-5 text-center" style={{ minHeight: "80vh" }}><Spinner animation="border" /></Container>;
    if (error) return <Container className="py-5" style={{ minHeight: "80vh" }}><Alert variant="danger">{error}</Alert></Container>;
    if (!product) return <Container className="py-5" style={{ minHeight: "80vh" }}><Alert variant="warning">Product not found.</Alert></Container>;

    return (
        <Container className="py-3 py-md-5 position-relative product-details-container" style={{ minHeight: "80vh" }}>
            {/* SUCCESS TOAST - Fixed position to be visible even when scrolled */}
            <ToastContainer position="top-end" className="p-3 position-fixed" style={{ zIndex: 9999, top: '80px', right: '10px' }}>
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
                            className="bg-light product-detail-image w-100"
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

                        <h1 className="fw-bolder mb-2 fs-2 fs-md-1">{product.name}</h1>

                        <div className="mb-4">
                            {product.discount_percentage > 0 ? (
                                <div>
                                    <div className="d-flex align-items-center mb-1">
                                        <h2 className="display-6 fw-bold text-danger mb-0 me-3">
                                            RM{(parseFloat(product.price) * (1 - product.discount_percentage / 100)).toFixed(2)}
                                        </h2>
                                        <Badge bg="danger" className="fs-5 px-3 py-2">-{product.discount_percentage}% OFF</Badge>
                                    </div>
                                    <h4 className="text-muted text-decoration-line-through fw-normal">
                                        RM{parseFloat(product.price).toFixed(2)}
                                    </h4>
                                </div>
                            ) : (
                                <h2 className="display-6 fw-bold text-danger mb-4">RM{product.price}</h2>
                            )}
                        </div>
                        <p className="lead text-muted mb-4" style={{ fontSize: "1.1rem", lineHeight: "1.8" }}>
                            {product.description || "No description available for this product. However, it is one of our best sellers."}
                        </p>

                        {/* DESKTOP CONTROLS (Hidden on Mobile) */}
                        <div className="d-none d-md-block">
                            <div className="d-flex align-items-center gap-2 mb-4">
                                <Button
                                    variant="outline-dark"
                                    className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                                    style={{ width: '40px', height: '40px' }}
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    disabled={product.stock <= 0}
                                >
                                    -
                                </Button>
                                <span className="fs-5 fw-bold px-3 text-center" style={{ minWidth: '60px' }}>{quantity}</span>
                                <Button
                                    variant="outline-dark"
                                    className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                                    style={{ width: '40px', height: '40px' }}
                                    onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                                    disabled={product.stock <= 0 || quantity >= product.stock}
                                >
                                    +
                                </Button>
                                <span className="text-muted ms-2 small">
                                    {product.stock > 0 ? `${product.stock} stocks available` : <span className="text-danger fw-bold">Out of Stock</span>}
                                </span>
                            </div>

                            <div className="d-grid gap-2 mb-4">
                                {currentUser && product.seller_id && Number(currentUser.dbId) === Number(product.seller_id) ? (
                                    <Button variant="secondary" size="lg" className="rounded-pill py-3 fw-bold" disabled>
                                        <FaStore className="me-2" /> You own this product
                                    </Button>
                                ) : (
                                    <Button variant="dark" size="lg" className="rounded-pill py-3 fw-bold" onClick={handleAddToCart} disabled={product.stock <= 0}>
                                        {product.stock > 0 ? <><FaShoppingCart className="me-2" /> Add to Cart</> : "Out of Stock"}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* MOBILE STICKY BOTTOM BAR */}
                        <div className="sticky-bottom-bar d-md-none border-top">
                            <div className="d-flex gap-3 align-items-center">
                                <Form.Select
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                                    style={{ width: '80px' }}
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                                </Form.Select>

                                {currentUser && product.seller_id && Number(currentUser.dbId) === Number(product.seller_id) ? (
                                    <Button variant="secondary" className="w-100 rounded-pill fw-bold" disabled>
                                        Your Product
                                    </Button>
                                ) : (
                                    <Button variant="dark" className="w-100 rounded-pill fw-bold" onClick={handleAddToCart}>
                                        Add to Cart - RM{((parseFloat(product.price) * (1 - (product.discount_percentage || 0) / 100)) * quantity).toFixed(2)}
                                    </Button>
                                )}
                            </div>
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



            {/* SELLER SECTION */}
            {
                product.seller_email && (
                    <div className="mb-5 border-top pt-5">
                        <Card className="border-0 shadow-sm bg-light">
                            <Card.Body className="p-4 d-flex align-items-center justify-content-between flex-wrap gap-4">
                                <div className="d-flex align-items-center">
                                    <div className="bg-white rounded-circle shadow-sm d-flex align-items-center justify-content-center me-4 overflow-hidden" style={{ width: '80px', height: '80px' }}>
                                        {product.store_image_url ? (
                                            <img src={product.store_image_url} alt="Store" className="w-100 h-100 object-fit-cover" />
                                        ) : (
                                            <FaStore className="text-warning" size={32} />
                                        )}
                                    </div>
                                    <div>
                                        <h5 className="fw-bold mb-1">{product.store_name || product.seller_email}</h5>
                                        <div className="text-muted small mb-2">Verified Seller • Active 5 minutes ago</div>
                                        <div className="d-flex gap-2">
                                            <Button variant="outline-dark" size="sm" onClick={() => navigate(`/store/${product.seller_id}`)}>
                                                <FaStore className="me-2" /> View Shop
                                            </Button>
                                            <Button variant="dark" size="sm" onClick={handleChat}>
                                                Chat Now
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <div className="d-flex gap-4 text-center border-start ps-4 d-none d-md-flex">
                                    <div>
                                        <h5 className="fw-bold mb-0">{product.seller_rating ? parseFloat(product.seller_rating).toFixed(1) : "0.0"}</h5>
                                        <small className="text-muted">Rating</small>
                                    </div>
                                    <div>
                                        <h5 className="fw-bold mb-0">98%</h5>
                                        <small className="text-muted">Response</small>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </div>
                )
            }

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
            {
                relatedProducts.length > 0 && (
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
                )
            }
            {/* Success Modal */}
            <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
                <Modal.Body className="text-center py-4">
                    <div className="mb-2 text-success">
                        <i className="bi bi-check-circle-fill d-block" style={{ fontSize: '2rem' }}></i>
                    </div>
                    <h5 className="fw-bold">Success</h5>
                    <p className="text-muted mb-3">{modalMessage}</p>
                    <Button variant="dark" size="sm" onClick={() => setShowSuccessModal(false)}>Close</Button>
                </Modal.Body>
            </Modal>

            {/* Error Modal */}
            <Modal show={showErrorModal} onHide={() => setShowErrorModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold text-danger">Error</Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-0">
                    <p className="text-muted">{modalMessage}</p>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="secondary" size="sm" onClick={() => setShowErrorModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>
        </Container >
    )

}