import { Container, Row, Col, Card, Form, Button, Spinner, Alert, Modal } from "react-bootstrap";
import { useCart } from "../components/CartContext";
import { AuthContext } from "../components/AuthProvider";
import { useContext, useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom"; // Added useLocation
import { FaLock, FaMoneyBillWave, FaUniversity, FaWallet, FaCreditCard, FaTicketAlt } from 'react-icons/fa';

export default function Checkout() {
    const { cartItems, getCartTotal, clearCart } = useCart();
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation(); 

    // Get Voucher Data from Cart
    const { selectedVoucher, discountAmount: paramDiscount } = location.state || {};
    const voucherDiscount = paramDiscount || 0;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('stripe'); 
    const [walletBalance, setWalletBalance] = useState(0);
    const [createdOrderId, setCreatedOrderId] = useState(null);

    // Local state for items to display
    const [checkoutItems, setCheckoutItems] = useState([]);
    const [checkoutTotal, setCheckoutTotal] = useState(0);

    // Calculate Final Total including Shipping and Discount
    const shippingCost = 5;
    const finalTotal = Math.max(0, checkoutTotal + shippingCost - voucherDiscount); 

    // Resume Order Logic
    const [searchParams] = useSearchParams();
    const existingOrderId = searchParams.get("existing_order_id");
    const isCanceled = searchParams.get("canceled");

    const [showResumeModal, setShowResumeModal] = useState(false);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        if (!currentUser) {
            navigate("/login");
            return;
        }

        // Initialize from Cart initially
        if (cartItems.length > 0) {
            setCheckoutItems(cartItems);
            setCheckoutTotal(getCartTotal());
        }

        const resolveOrder = async () => {
            let orderIdToResume = existingOrderId || sessionStorage.getItem('pending_order_id');
            const persistedTotal = sessionStorage.getItem('pending_order_total');
            if (orderIdToResume) {

                if (cartItems.length === 0) {
                    console.log("Cart is empty. Fetching Pending Order Details...", orderIdToResume);
                    try {
                        const res = await fetch(`${API_URL}/orders/details/${orderIdToResume}`);
                        if (res.ok) {
                            const order = await res.json();
                            setCreatedOrderId(order.id);
                            setCheckoutItems(order.items.map(i => ({ ...i, id: i.product_id || i.id, quantity: i.quantity, price: parseFloat(i.price) })));
                            setCheckoutTotal(parseFloat(order.total_amount) - shippingCost + voucherDiscount);
                            setCheckoutTotal(parseFloat(order.total_amount) - 5);

                            // Re-save to session just in case
                            sessionStorage.setItem('pending_order_id', order.id);
                            sessionStorage.setItem('pending_order_total', order.total_amount);
                            return;
                        }
                    } catch (err) {
                        console.error("Failed to fetch pending order:", err);
                    }
                } else {
                    if (voucherDiscount > 0) {
                        setCreatedOrderId(null); // Force new order
                        sessionStorage.removeItem('pending_order_id');
                    } else {
                        const currentTotal = getCartTotal() + 5;
                        if (persistedTotal && Math.abs(parseFloat(persistedTotal) - currentTotal) < 0.1) {
                            setCreatedOrderId(parseInt(orderIdToResume));
                            console.log("Resuming Pending Order (Matches Cart):", orderIdToResume);
                        } else {
                            // Cart changed. Ignore pending order.
                            sessionStorage.removeItem('pending_order_id');
                            sessionStorage.removeItem('pending_order_total');
                        }
                    }
                }
            }

            // If after all checks, we have no items, redirect to cart
            if (cartItems.length === 0 && !orderIdToResume) {
                navigate("/cart");
            }
        };

        resolveOrder();

        // Fetch Wallet Balance
        fetch(`${API_URL}/wallet/${currentUser.uid}`)
            .then(res => res.json())
            .then(data => setWalletBalance(data.balance || 0))
            .catch(err => console.error("Error fetching balance:", err));

    }, [currentUser, existingOrderId, cartItems]);

    useEffect(() => {
        if (existingOrderId && isCanceled === 'true') {
            console.log("Triggering Resume Modal");
            setShowResumeModal(true);
        }
    }, [existingOrderId, isCanceled]);




    const handleCheckout = async () => {
        setIsLoading(true);
        setError(null);
        try {
            let orderId = createdOrderId;

            // SAFETY CHECK: Try to recover from sessionStorage if state is lost
            if (!orderId) {
                const persistedId = sessionStorage.getItem('pending_order_id');
                const persistedTotal = sessionStorage.getItem('pending_order_total');
                if (persistedId && persistedTotal === total.toString()) {
                    orderId = persistedId;
                    setCreatedOrderId(persistedId);
                    console.log(`Recovered Order ID from session: ${orderId}`);
                }
            }

            // 1. Create Pending Order (Only if not already created)
            if (!orderId) {
                const orderRes = await fetch(`${API_URL}/orders`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        firebase_uid: currentUser.uid,
                        items: checkoutItems.map(item => ({
                            id: item.id,
                            quantity: item.quantity,
                            price: item.price
                        })),
                        total_amount: finalTotal,
                        shipping_address: { fullName: currentUser.email, addressLine1: "Checkout", city: "", state: "", zipCode: "", country: "Malaysia" },
                        payment_method: paymentMethod
                    })
                });

                if (!orderRes.ok) throw new Error("Failed to create order");
                const orderData = await orderRes.json();
                orderId = orderData.id;
                setCreatedOrderId(orderId); // Save for retry

                // Persist to sessionStorage
                sessionStorage.setItem('pending_order_id', orderId);
                sessionStorage.setItem('pending_order_total', finalTotal.toString());

                // Clear Cart immediately as order is created
                clearCart();

            } else {
                console.log(`Reusing Order ID: ${orderId}`);
            }

            // 2. Process Payment based on Method
            if (paymentMethod === 'stripe' || paymentMethod === 'fpx') {
                // STRIPE / FPX FLOW
                const paymentType = paymentMethod === 'fpx' ? ['fpx'] : ['card'];

                const response = await fetch(`${API_URL}/create-checkout-session`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        items: checkoutItems, // Use local items
                        orderId: orderId,
                        paymentMethodType: paymentType,
                        discountAmount: voucherDiscount || Math.max(0, (checkoutItems.reduce((acc, item) => acc + (item.price * item.quantity), 0) + shippingCost) - finalTotal)
                    }),
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Payment failed");

                if (data.url) {
                    window.location.href = data.url;
                } else {
                    throw new Error("No checkout URL received");
                }
            } else if (paymentMethod === 'wallet') {
                // WALLET FLOW
                const payRes = await fetch(`${API_URL}/orders/pay-wallet`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: orderId,
                        userId: currentUser.uid
                    })
                });

                const payData = await payRes.json();
                if (!payRes.ok) throw new Error(payData.error || "Wallet payment failed");

                navigate(`/success?order_id=${orderId}`);
            } else if (paymentMethod === 'cod') {
                // CASH ON DELIVERY (Immediate Success)
                navigate(`/success?order_id=${orderId}`);
            }

        } catch (err) {
            console.error(err);
            setError(err.message);
            setIsLoading(false);
        }
    };

    if (!currentUser) return null;

    // Use finalTotal for display
    return (
        <Container className="py-3 py-md-5" style={{ minHeight: '80vh' }}>
            {/* RESUME PAYMENT MODAL */}
            <Modal show={showResumeModal} onHide={() => setShowResumeModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold">Payment Pending</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Your payment for <strong>Order #{existingOrderId}</strong> was not completed.</p>
                    <p className="text-muted small">You can try again with a different payment method below, or cancel it from your orders page.</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="dark" onClick={() => setShowResumeModal(false)}>
                        Okay, Let's Pay
                    </Button>
                </Modal.Footer>
            </Modal>

            <h1 className="fw-bold mb-4 mb-md-5 display-6">Checkout</h1>

            <Row className="g-4">
                <Col md={7}>
                    <Card className="border-0 shadow-sm p-4 mb-4">
                        <h4 className="fw-bold mb-4">Payment Method</h4>

                        {error && <Alert variant="danger">{error}</Alert>}

                        {/* Payment Selection */}
                        <div className="mb-4 d-flex flex-column gap-3">
                            {/* Option 1: Stripe (Card) */}
                            <div
                                className={`d-flex align-items-center p-3 rounded-4 border cursor-pointer transition-all ${paymentMethod === 'stripe' ? 'border-dark bg-light shadow-sm' : ''}`}
                                onClick={() => setPaymentMethod('stripe')}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="me-3"><FaCreditCard size={24} /></div>
                                <div>
                                    <h6 className="fw-bold mb-0">Credit / Debit Card</h6>
                                    <small className="text-muted">Secure payment via Stripe</small>
                                </div>
                                {paymentMethod === 'stripe' && <FaLock className="ms-auto text-dark" />}
                            </div>

                            {/* Option 2: Online Banking (FPX) */}
                            <div
                                className={`d-flex align-items-center p-3 rounded-4 border cursor-pointer transition-all ${paymentMethod === 'fpx' ? 'border-primary bg-primary bg-opacity-10 shadow-sm' : ''}`}
                                onClick={() => setPaymentMethod('fpx')}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="me-3 text-primary"><FaUniversity size={24} /></div>
                                <div>
                                    <h6 className="fw-bold mb-0">Online Banking (FPX)</h6>
                                    <small className="text-muted">Maybank2u, CIMB Clicks, etc.</small>
                                </div>
                                {paymentMethod === 'fpx' && <FaLock className="ms-auto text-primary" />}
                            </div>

                            {/* Option 3: Wallet */}
                            <div
                                className={`d-flex align-items-center p-3 rounded-4 border cursor-pointer transition-all ${paymentMethod === 'wallet' ? 'border-success bg-success bg-opacity-10 shadow-sm' : ''}`}
                                onClick={() => setPaymentMethod('wallet')}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="me-3 text-success"><FaWallet size={24} /></div>
                                <div className="flex-grow-1">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <h6 className="fw-bold mb-0">My Wallet</h6>
                                        <span className={`badge ${walletBalance >= finalTotal ? 'bg-success' : 'bg-danger'}`}>Balance: RM{walletBalance.toFixed(2)}</span>
                                    </div>
                                    <small className="text-muted">Instant payment. No fees.</small>
                                </div>
                                {paymentMethod === 'wallet' && <FaLock className="ms-auto text-success" />}
                            </div>

                            {/* Option 4: COD */}
                            <div
                                className={`d-flex align-items-center p-3 rounded-4 border cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-warning bg-warning bg-opacity-10 shadow-sm' : ''}`}
                                onClick={() => setPaymentMethod('cod')}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="me-3 text-warning"><FaMoneyBillWave size={24} /></div>
                                <div>
                                    <h6 className="fw-bold mb-0">Cash on Delivery</h6>
                                    <small className="text-muted">Pay when you receive.</small>
                                </div>
                                {paymentMethod === 'cod' && <FaLock className="ms-auto text-warning" />}
                            </div>


                            {/* Wallet Insufficient Balance Warning */}
                            {paymentMethod === 'wallet' && walletBalance < finalTotal && (
                                <Alert variant="warning" className="mt-2 py-2 small fw-bold">
                                    Insufficient wallet balance. Please top up or use another method.
                                </Alert>
                            )}
                        </div>

                        <Button
                            variant="dark"
                            size="lg"
                            className="w-100 rounded-pill fw-bold shadow-lg"
                            onClick={handleCheckout}
                            disabled={isLoading || (paymentMethod === 'wallet' && walletBalance < finalTotal)}
                        >
                            {isLoading ? <Spinner animation="border" size="sm" className="me-2" /> : <FaLock className="me-2" />}
                            {isLoading ? "Processing Order..." :
                                paymentMethod === 'cod' ? `Place Order (RM${finalTotal.toFixed(2)})` : `Pay RM${finalTotal.toFixed(2)}`
                            }
                        </Button>
                        <div className="text-center mt-3 small text-muted">
                            <FaLock size={12} className="me-1" /> Secure Encrypted Payment
                        </div>
                    </Card>
                </Col>

                {/* ORDER SUMMARY (RIGHT SIDE) */}
                <Col md={5}>
                    <Card className="border-0 shadow-sm bg-light p-4 sticky-top" style={{ top: '100px' }}>
                        <h5 className="fw-bold mb-4">Order Summary</h5>

                        {/* Items List (Collapsed if many) */}
                        <div className="mb-4" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {checkoutItems.map((item, i) => (
                                <div key={i} className="d-flex align-items-center mb-3">
                                    <div className="bg-white rounded p-1 border me-3" style={{ width: '60px', height: '60px' }}>
                                        <img src={item.image_url} alt="" className="w-100 h-100 object-fit-cover rounded" />
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="d-flex justify-content-between">
                                            <span className="fw-bold text-dark small">{item.name}</span>
                                            <span className="fw-bold small">RM{(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                        <div className="text-muted small">Qty: {item.quantity}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <hr />
                        <div className="d-flex justify-content-between mb-1">
                            <span>Subtotal</span>
                            <span>RM{(finalTotal - shippingCost).toFixed(2)}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                            <span>Shipping Fee</span>
                            <span className="fw-bold text-success">RM{shippingCost.toFixed(2)}</span>
                        </div>
                        <div className="d-flex justify-content-between fs-5 fw-bold text-dark border-top pt-2 mt-2">
                            <span>Total</span>
                            <span>RM{finalTotal.toFixed(2)}</span>
                        </div>
                    </Card>
                </Col>
            </Row>
        </Container >
    );
}
