import { Container, Card, Button, Spinner, Nav, Badge, Image, Alert, Modal, Row, Col, Form } from "react-bootstrap";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../components/AuthProvider";
import { useCart } from "../components/CartContext";
import { useNavigate } from "react-router-dom";
import { FaBoxOpen, FaShippingFast, FaCheckCircle, FaStar, FaEye, FaMapMarkerAlt, FaFileInvoiceDollar } from 'react-icons/fa';

export default function Orders() {
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const { addToCart, clearCart } = useCart();

    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // Shopee-like Order Tabs
    const [orderStatusTab, setOrderStatusTab] = useState('to_ship');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Redirect if not logged in
    useEffect(() => {
        if (!currentUser) {
            navigate("/login");
        }
    }, [currentUser, navigate]);

    const fetchOrders = async () => {
        if (!currentUser) return;
        setLoadingOrders(true);
        try {
            const API_URL = 'http://localhost:5000';
            const res = await fetch(`${API_URL}/orders/${currentUser.uid}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
            }
        } catch (err) {
            console.error("Failed to fetch orders", err);
        } finally {
            setLoadingOrders(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [currentUser]);


    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            const API_URL = 'http://localhost:5000';
            const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                fetchOrders(); // Refresh list
                setShowModal(false); // Close modal if open
            }
        } catch (err) {
            console.error("Error updating status:", err);
        }
    };

    const handleRating = async (orderId) => {
        try {
            const API_URL = 'http://localhost:5000';
            const res = await fetch(`${API_URL}/orders/${orderId}/rate`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: 5 })
            });
            if (res.ok) {
                fetchOrders(); // Refresh list
                setShowModal(false); // Close modal if open
            }
        } catch (err) {
            console.error("Error rating order:", err);
        }
    };

    const handleShowDetails = (order) => {
        setSelectedOrder(order);
        setShowModal(true);
    };

    // Cancel Modal State
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [orderToCancel, setOrderToCancel] = useState(null);

    const openCancelModal = (orderId) => {
        setOrderToCancel(orderId);
        setShowCancelModal(true);
    };

    const confirmCancelOrder = async () => {
        if (!orderToCancel) return;
        try {
            const API_URL = 'http://localhost:5000';
            const res = await fetch(`${API_URL}/orders/${orderToCancel}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                // customized toast or just refresh for now
                fetchOrders();
                setShowCancelModal(false);
                setOrderToCancel(null);
            } else {
                const data = await res.json();
                console.error(data.error || "Failed to cancel order");
                alert(data.error || "Failed to cancel order"); // Fallback or use a toast if available
            }
        } catch (err) {
            console.error("Error cancelling order:", err);
        }
    };

    const openReviewModal = (order) => {
        setItemsToReview(order.items || []);
        setShowReviewModal(true);
    };
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [itemsToReview, setItemsToReview] = useState([]);
    const [reviewData, setReviewData] = useState({}); // { itemId: { rating: 5, comment: "" } }
    const [loadingReviews, setLoadingReviews] = useState({}); // { itemId: true/false }



    const handleSubmitItemReview = async (productId) => {
        const data = reviewData[productId];
        if (!data || !data.comment) return alert("Please write a comment.");

        setLoadingReviews(prev => ({ ...prev, [productId]: true }));
        try {
            const API_URL = 'http://localhost:5000';
            const res = await fetch(`${API_URL}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firebase_uid: currentUser.uid,
                    product_id: productId,
                    rating: data.rating || 5,
                    comment: data.comment
                })
            });

            if (res.ok) {
                alert("Review submitted!");
                // Optionally remove this item from the list or clear the form
                setReviewData(prev => ({ ...prev, [productId]: { rating: 5, comment: "" } }));
            } else {
                alert("Failed to submit review.");
            }
        } catch (err) {
            console.error("Review Error:", err);
            alert("Error submitting review.");
        } finally {
            setLoadingReviews(prev => ({ ...prev, [productId]: false }));
        }
    };

    // Filter Logic
    const getFilteredOrders = () => {
        switch (orderStatusTab) {
            case 'to_pay': return orders.filter(o => o.status === 'pending');
            case 'to_ship': return orders.filter(o => o.status === 'paid');
            case 'to_receive': return orders.filter(o => o.status === 'shipped');
            case 'completed': return orders.filter(o => o.status === 'completed' || o.status === 'received');
            default: return orders;
        }
    };

    // --- PAYMENT LOGIC ---
    const handlePayment = (order) => {
        if (!order || !order.items) return;

        // 1. Clear current cart to avoid conflict
        clearCart();

        // 2. Navigate to Checkout with ID to resume order
        // Note: We do NOT re-add items to cart. We rely on Checkout.jsx fetching
        // the existing order details from the backend to preserve the correct Total Amount (including discounts).
        navigate(`/checkout?existing_order_id=${order.id}`);
    };

    if (!currentUser) return null;
    return (
        <Container className="py-5" style={{ minHeight: '80vh' }}>
            <h2 className="fw-bold mb-4">My Purchases</h2>

            <Card className="border-0 shadow-sm overflow-hidden" style={{ minHeight: '500px' }}>
                <div className="border-bottom bg-white sticky-top z-1">
                    <Nav variant="underline" className="justify-content-between px-3 pt-3" activeKey={orderStatusTab} onSelect={(k) => setOrderStatusTab(k)}>
                        <Nav.Item>
                            <Nav.Link eventKey="to_pay" className="text-dark">To Pay</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="to_ship" className="text-dark">To Ship</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="to_receive" className="text-dark">To Receive</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="completed" className="text-dark">Completed</Nav.Link>
                        </Nav.Item>
                    </Nav>
                </div>

                <div className="p-4 bg-light h-100 flex-grow-1">
                    {loadingOrders ? (
                        <div className="text-center py-5"><Spinner animation="border" /></div>
                    ) : getFilteredOrders().length === 0 ? (
                        <div className="text-center py-5 mt-4">
                            <FaBoxOpen size={50} className="text-secondary mb-3 opacity-50" />
                            <h5 className="text-muted">No orders in this status</h5>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {getFilteredOrders().map(order => (
                                <Card key={order.id} className="border-0 shadow-sm">
                                    <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="fw-bold text-dark">ShopGo Mall</span>
                                            <span className="text-muted small">| Order ID: {order.id}</span>
                                        </div>
                                        <Badge bg={
                                            order.status === 'pending' ? 'warning' :
                                                order.status === 'paid' ? 'success' :
                                                    order.status === 'shipped' ? 'info' :
                                                        order.status === 'received' ? 'success' : 'warning'
                                        } text="white" className="px-3 py-2">
                                            {
                                                order.status === 'shipped' ? 'SHIPPING' :
                                                    order.status === 'received' ? 'ARRIVED' :
                                                        order.status === 'completed' ? 'COMPLETED' :
                                                            order.status.toUpperCase().replace('_', ' ')
                                            }
                                        </Badge>
                                    </Card.Header>
                                    <Card.Body>
                                        <div className="d-flex gap-3 overflow-auto pb-2 mb-3" onClick={() => handleShowDetails(order)} style={{ cursor: 'pointer' }}>
                                            {order.items && order.items.map((item, i) => (
                                                <div key={i} className="d-flex align-items-center gap-3 border rounded p-2 pe-4" style={{ minWidth: '200px' }}>
                                                    <Image
                                                        src={item.image_url}
                                                        className="rounded"
                                                        style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                                                    />
                                                    <div>
                                                        <div className="fw-bold text-truncate" style={{ maxWidth: '120px' }}>{item.name}</div>
                                                        <div className="small text-muted">x{item.quantity}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="d-flex justify-content-between align-items-end border-top pt-3">
                                            <div className="w-100">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <div className="small text-muted">{order.items?.length} items</div>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="small text-muted">Order Total:</span>
                                                        <h4 className="fw-bold text-danger mb-0">RM{order.total_amount}</h4>
                                                    </div>
                                                </div>

                                                {/* ACTION BUTTONS */}
                                                <div className="d-flex gap-2 justify-content-end mt-3">
                                                    <Button variant="outline-secondary" size="sm" onClick={() => handleShowDetails(order)}>
                                                        <FaEye className="me-2" /> View Details
                                                    </Button>

                                                    {order.status === 'pending' && (
                                                        <>
                                                            <Button variant="outline-danger" size="sm" onClick={() => openCancelModal(order.id)}>
                                                                Cancel
                                                            </Button>
                                                            <Button variant="dark" size="sm" onClick={() => handlePayment(order)}>
                                                                <FaFileInvoiceDollar className="me-2" /> Pay Now
                                                            </Button>
                                                        </>
                                                    )}

                                                    {order.status === 'paid' && (
                                                        <Button variant="outline-dark" size="sm" onClick={() => updateOrderStatus(order.id, 'shipped')}>
                                                            <FaShippingFast className="me-2" /> Simulate Ship
                                                        </Button>
                                                    )}
                                                    {order.status === 'received' && (
                                                        <Button variant="warning" size="sm" className="text-white" onClick={() => { setShowModal(false); openReviewModal(order); }}>
                                                            <FaStar className="me-2 text-white" /> Rate Product
                                                        </Button>
                                                    )}
                                                    {order.status === 'shipped' && (
                                                        <Button variant="success" size="sm" onClick={() => updateOrderStatus(order.id, 'received')}>
                                                            <FaCheckCircle className="me-2 text-white" /> Order Received
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            {/* ORDER DETAILS MODAL */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
                {selectedOrder && (
                    <>
                        <Modal.Header closeButton className="border-0 pb-0">
                            <Modal.Title className="fw-bold">
                                <FaFileInvoiceDollar className="me-2 text-primary" />
                                Order Details
                            </Modal.Title>
                        </Modal.Header>
                        <Modal.Body className="pt-0">
                            <div className="text-muted small mb-4">
                                Order ID: <span className="text-dark fw-bold">#{selectedOrder.id.toString().padStart(6, '0')}</span>
                                <span className="mx-2">|</span>
                                Placed on: {new Date(selectedOrder.created_at).toLocaleString()}
                            </div>

                            {/* STEPS/STATUS BAR (Simplified) */}
                            <Alert variant="info" className="d-flex align-items-center gap-3">
                                <FaShippingFast size={24} />
                                <div>
                                    <h6 className="fw-bold mb-0">Status: {selectedOrder.status.toUpperCase().replace('_', ' ')}</h6>
                                    <small>
                                        {selectedOrder.status === 'paid' ? 'Seller is preparing your parcel.' :
                                            selectedOrder.status === 'shipped' ? 'Parcel is on the way.' :
                                                selectedOrder.status === 'received' ? 'Package has been delivered.' : 'Order completed.'}
                                    </small>
                                </div>
                            </Alert>

                            <Row className="mb-4">
                                <Col md={6}>
                                    <h6 className="fw-bold border-bottom pb-2 mb-3"><FaMapMarkerAlt className="me-2 text-danger" />Delivery Address</h6>
                                    {selectedOrder.shipping_address ? (
                                        <div className="small text-muted">
                                            <div className="fw-bold text-dark">{selectedOrder.shipping_address.fullName}</div>
                                            <div>{selectedOrder.shipping_address.phone}</div>
                                            <div className="mt-1">
                                                {selectedOrder.shipping_address.addressLine1},<br />
                                                {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} {selectedOrder.shipping_address.zipCode},<br />
                                                {selectedOrder.shipping_address.country}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-muted small">No address provided</p>
                                    )}
                                </Col>
                                <Col md={6}>
                                    <h6 className="fw-bold border-bottom pb-2 mb-3">Payment Info</h6>
                                    <div className="d-flex justify-content-between small mb-1">
                                        <span className="text-muted">Payment Method</span>
                                        <span className="fw-bold">Credit/Debit Card</span>
                                    </div>
                                    <div className="d-flex justify-content-between small mb-1">
                                        <span className="text-muted">Shipping Fee</span>
                                        <span className="fw-bold">
                                            RM{(selectedOrder.total_amount - (selectedOrder.items?.reduce((acc, item) => acc + ((item.price || item.price_at_purchase) * item.quantity), 0) || 0)).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                                        <span className="fw-bold">Order Total</span>
                                        <span className="fw-bold fs-5 text-danger">RM{selectedOrder.total_amount}</span>
                                    </div>
                                </Col>
                            </Row>

                            <h6 className="fw-bold border-bottom pb-2 mb-3">Product Details</h6>
                            <div className="d-flex flex-column gap-3">
                                {selectedOrder.items && selectedOrder.items.map((item, i) => (
                                    <div key={i} className="d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center gap-3">
                                            <Image
                                                src={item.image_url}
                                                className="rounded border"
                                                style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                            />
                                            <div>
                                                <div className="fw-bold small">{item.name}</div>
                                                <div className="text-muted small">x{item.quantity}</div>
                                            </div>
                                        </div>
                                        <div className="fw-bold small">RM{((item.price || item.price_at_purchase) * item.quantity).toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>

                        </Modal.Body>
                        <Modal.Footer className="border-0">
                            <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                            {selectedOrder.status === 'pending' && (
                                <Button variant="dark" onClick={() => handlePayment(selectedOrder)}>
                                    Pay Now
                                </Button>
                            )}
                        </Modal.Footer>
                    </>
                )}
            </Modal>

            {/* REVIEW MODAL */}
            <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold">Rate Your Items</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    {itemsToReview.map((item, index) => (
                        <div key={index} className="mb-4 text-start border-bottom pb-4">
                            <div className="d-flex align-items-center gap-3 mb-3">
                                <Image src={item.image_url} rounded style={{ width: '60px', height: '60px', objectFit: 'cover' }} />
                                <div>
                                    <h6 className="fw-bold mb-0">{item.name}</h6>
                                    <small className="text-muted">How was this product?</small>
                                </div>
                            </div>

                            <Form onSubmit={(e) => { e.preventDefault(); handleSubmitItemReview(item.product_id || item.id); }}>
                                <div className="mb-3">
                                    <div className="d-flex gap-2">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <FaStar
                                                key={star}
                                                size={24}
                                                className={star <= (reviewData[item.product_id || item.id]?.rating || 5) ? "text-warning" : "text-secondary"}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setReviewData(prev => ({ ...prev, [item.product_id || item.id]: { ...prev[item.product_id || item.id], rating: star } }))}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <Form.Group className="mb-3">
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        placeholder="Write your review here..."
                                        value={reviewData[item.product_id || item.id]?.comment || ""}
                                        onChange={(e) => setReviewData(prev => ({ ...prev, [item.product_id || item.id]: { ...prev[item.product_id || item.id], comment: e.target.value } }))}
                                        required
                                    />
                                </Form.Group>
                                <Button
                                    type="submit"
                                    variant="dark"
                                    size="sm"
                                    disabled={loadingReviews[item.product_id || item.id]}
                                >
                                    {loadingReviews[item.product_id || item.id] ? "Submitting..." : "Submit Review"}
                                </Button>
                            </Form>
                        </div>
                    ))}
                </Modal.Body>
            </Modal>
            {/* CANCEL CONFIRMATION MODAL */}
            <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)} centered size="sm">
                <Modal.Body className="text-center py-4">
                    <div className="bg-danger bg-opacity-10 text-danger rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                        <FaCheckCircle size={30} className="text-danger" style={{ transform: 'rotate(45deg)' }} />
                        {/* Reusing check circle but rotated to look like X or just use simpler icon logic if available, keeping dependencies simple */}
                    </div>
                    <h5 className="fw-bold mb-2">Cancel Order?</h5>
                    <p className="text-muted small mb-4">Are you sure you want to cancel this order? This action cannot be undone.</p>
                    <div className="d-flex gap-2 justify-content-center">
                        <Button variant="light" onClick={() => setShowCancelModal(false)} className="px-4">No, Keep It</Button>
                        <Button variant="danger" onClick={confirmCancelOrder} className="px-4 fw-bold">Yes, Cancel</Button>
                    </div>
                </Modal.Body>
            </Modal>
        </Container>
    );



}
