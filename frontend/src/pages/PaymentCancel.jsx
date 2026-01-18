import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Spinner, Container } from "react-bootstrap";

export default function PaymentCancel() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const orderId = searchParams.get("order_id");

    useEffect(() => {
        // Instead of deleting, we redirect back to checkout to "Resume" the order
        if (orderId) {
            navigate(`/checkout?existing_order_id=${orderId}&canceled=true`);
        } else {
            navigate("/checkout");
        }
    }, [orderId, navigate]);

    return (
        <Container className="d-flex flex-column align-items-center justify-content-center vh-100">
            <Spinner animation="border" className="mb-3" />
            <h3>Cancelling payment...</h3>
            <p className="text-muted">Returning you to checkout.</p>
        </Container>
    );
}
