import { Container, Row, Col, Card, Button, Spinner, Alert } from "react-bootstrap";
import { useCart } from "../components/CartContext";
import { AuthContext } from "../components/AuthProvider";
import { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaLock } from 'react-icons/fa';

export default function Checkout() {
    const { cartItems, getCartTotal } = useCart();
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const shippingCost = 5;
    const total = getCartTotal() + shippingCost;

    useEffect(() => {
        if (!currentUser) navigate("/login");
        else if (cartItems.length === 0) navigate("/cart");
    }, [currentUser, cartItems, navigate]);

    const handleCheckout = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const API_URL = 'http://localhost:5000';

            // 1. Create Pending Order in DB
            const orderRes = await fetch(`${API_URL}/orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firebase_uid: currentUser.uid,
                    items: cartItems.map(item => ({
                        id: item.id,
                        quantity: item.quantity,
                        price: item.price
                    })),
                    total_amount: total,
                    shipping_address: { fullName: currentUser.email, addressLine1: "Checkout", city: "", state: "", zipCode: "", country: "Malaysia" } // Placeholder or prompting user
                })
            });

            if (!orderRes.ok) throw new Error("Failed to create order");
            const orderData = await orderRes.json();

            // 2. Create Stripe Session with Order ID
            const response = await fetch(`${API_URL}/create-checkout-session`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: cartItems,
                    orderId: orderData.id
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Payment failed");
            }

            // Redirect to Stripe Checkout
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No checkout URL received");
            }

        } catch (err) {
            console.error(err);
            setError(err.message);
            setIsLoading(false);
        }
    };

    if (!currentUser || cartItems.length === 0) return null;

    return (
        <Container className="py-5" style={{ minHeight: '80vh' }}>
            <h1 className="fw-bold mb-5 display-6">Checkout</h1>

            <Row>
                <Col md={7}>
                    <Card className="border-0 shadow-sm p-4 mb-4">
                        <h4 className="fw-bold mb-4">Secure Checkout</h4>
                        <p className="text-muted mb-4">
                            You will be redirected to simple, secure payment page powered by Stripe.
                        </p>

                        {error && <Alert variant="danger">{error}</Alert>}

                        <Button
                            variant="dark"
                            size="lg"
                            className="w-100 rounded-pill fw-bold shadow-lg"
                            onClick={handleCheckout}
                            disabled={isLoading}
                        >
                            {isLoading ? <Spinner animation="border" size="sm" className="me-2" /> : <FaLock className="me-2" />}
                            {isLoading ? "Redirecting..." : `Pay RM${total.toFixed(2)}`}
                        </Button>
                        <div className="text-center mt-3 small text-muted">
                            <FaLock className="me-1" /> 128-bit SSL Encrypted Payment
                        </div>
                    </Card>
                </Col>

                <Col md={5}>
                    <Card className="border-0 shadow-sm p-4 bg-light">
                        <h4 className="fw-bold mb-4">Order Summary</h4>
                        {cartItems.map(item => (
                            <div key={item.id} className="d-flex justify-content-between mb-2 small">
                                <span>{item.quantity}x {item.name}</span>
                                <span className="fw-bold">RM{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                        <hr />
                        <div className="d-flex justify-content-between mb-1">
                            <span>Subtotal</span>
                            <span>RM{getCartTotal().toFixed(2)}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                            <span>Shipping Fee</span>
                            <span className="fw-bold text-success">RM{shippingCost.toFixed(2)}</span>
                        </div>
                        <div className="d-flex justify-content-between fs-5 fw-bold text-dark border-top pt-2 mt-2">
                            <span>Total</span>
                            <span>RM{total.toFixed(2)}</span>
                        </div>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}
