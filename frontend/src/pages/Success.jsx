import { useEffect, useState } from "react";
import { useCart } from "../components/CartContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Container, Card, Button, Spinner } from "react-bootstrap";
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";

export default function Success() {
    const { clearCart } = useCart();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get("order_id");

    const [status, setStatus] = useState("processing"); // processing, success, error

    useEffect(() => {
        const confirmOrder = async () => {
            if (!orderId) {
                // Determine if this is legacy flow or direct access
                setStatus("success");
                clearCart();
                return;
            }

            try {
                // Call backend to update order status to 'paid'
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'paid' })
                });

                if (response.ok) {
                    setStatus("success");
                    if (orderId) {
                        // Clear pending order storage on success
                        sessionStorage.removeItem('pending_order_id');
                        sessionStorage.removeItem('pending_order_total');
                        clearCart();
                    }
                } else if (response.status === 404) {
                    setStatus("not_found");
                } else {
                    console.error("Failed to update order status");
                    setStatus("error");
                }
            } catch (err) {
                console.error("Error confirming order:", err);
                setStatus("error");
            }
        };

        confirmOrder();
    }, [orderId]);

    return (
        <Container className="py-5 text-center" style={{ minHeight: '80vh' }}>
            <Card className="border-0 shadow-sm p-5 mx-auto" style={{ maxWidth: '500px' }}>
                {status === "processing" ? (
                    <>
                        <Spinner animation="border" variant="primary" className="mb-4" />
                        <h4 className="fw-bold">Processing Payment...</h4>
                        <p className="text-muted">Please wait while we confirm your order.</p>
                    </>
                ) : status === "success" ? (
                    <>
                        <div className="mb-4 text-success">
                            <FaCheckCircle size={80} />
                        </div>
                        <h2 className="fw-bold mb-3">Payment Successful!</h2>
                        <p className="text-muted mb-4">
                            Thank you for your purchase. Your order has been placed successfully.
                        </p>
                        <div className="d-grid gap-2">
                            <Button variant="dark" onClick={() => navigate("/orders")}>
                                View My Orders
                            </Button>
                            <Button variant="outline-secondary" onClick={() => navigate("/")}>
                                Continue Shopping
                            </Button>
                        </div>
                    </>
                ) : status === "not_found" ? (
                    <>
                        <div className="mb-4 text-danger">
                            <FaExclamationCircle size={80} />
                        </div>
                        <h2 className="fw-bold mb-3">Order Not Found</h2>
                        <p className="text-muted mb-4">
                            We received your payment, but the order record seems to be missing from our database.
                            Please contact support with Order ID: <strong>{orderId}</strong>.
                        </p>
                        <div className="d-grid gap-2">
                            <Button variant="dark" onClick={() => navigate("/")}>
                                Return Home
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mb-4 text-warning">
                            <FaExclamationCircle size={80} />
                        </div>
                        <h2 className="fw-bold mb-3">Order Status Pending</h2>
                        <p className="text-muted mb-4">
                            We received your payment but couldn't automatically confirm the order status.
                            Please check your "My Purchases" page.
                        </p>
                        <div className="d-grid gap-2">
                            <Button variant="dark" onClick={() => navigate("/orders")}>
                                View My Orders
                            </Button>
                        </div>
                    </>
                )}
            </Card>
        </Container>
    );
}
