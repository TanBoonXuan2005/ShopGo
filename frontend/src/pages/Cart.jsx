import { Container, Row, Col, Card, Button, Form, Image, Modal, Badge } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { useCart } from "../components/CartContext";
import { AuthContext } from "../components/AuthProvider";
import { FaTrash, FaArrowLeft, FaLock, FaTicketAlt } from "react-icons/fa";
import VoucherCard from "../components/VoucherCard";

export default function Cart() {
    const { cartItems, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart();
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const [vouchers, setVouchers] = useState([]);
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [showVoucherModal, setShowVoucherModal] = useState(false);

    // Fetch Vouchers
    useEffect(() => {
        const fetchVouchers = async () => {
            const uid = currentUser ? currentUser.uid : "";
            try {
                const res = await fetch(`http://127.0.0.1:5000/vouchers?firebase_uid=${uid}`);
                if (res.ok) {
                    setVouchers(await res.json());
                }
            } catch (err) {
                console.error("Failed to load vouchers", err);
            }
        }
        fetchVouchers();
    }, [currentUser]);

    const handleClaimVoucher = async (voucherId) => {
        if (!currentUser) return navigate("/login");
        try {
            const res = await fetch(`http://127.0.0.1:5000/vouchers/claim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firebase_uid: currentUser.uid, voucher_id: voucherId })
            });
            if (res.ok) {
                // Refresh list to update 'is_claimed'
                const res2 = await fetch(`http://127.0.0.1:5000/vouchers?firebase_uid=${currentUser.uid}`);
                if (res2.ok) setVouchers(await res2.json());
            } else {
                alert("Could not claim voucher");
            }
        } catch (err) {
            console.error(err);
        }
    }

    const calculateDiscount = () => {
        if (!selectedVoucher) return 0;

        let discount = 0;
        const subtotal = getCartTotal();

        if (subtotal < parseFloat(selectedVoucher.min_spend)) return 0; // Min spend check

        if (selectedVoucher.discount_type === 'fixed') {
            discount = parseFloat(selectedVoucher.discount_value);
        } else {
            discount = subtotal * (parseFloat(selectedVoucher.discount_value) / 100);
            // Cap logic if needed, but schema didn't enforce capped amount explicitly yet other than maybe separate col? 
            // We'll trust the value for now or assume unlimited cap for percentage unless descriptions says so.
            // Wait, schema didn't have max_cap column. I'll assume standard % for now.
        }
        return Math.min(discount, subtotal); // Cannot exceed subtotal
    };

    const discountAmount = calculateDiscount();
    const shippingCost = 5;
    const subtotal = getCartTotal();
    const finalTotal = Math.max(0, subtotal + shippingCost - discountAmount);

    const handleCheckout = () => {
        // Pass selected voucher to checkout via state
        navigate("/checkout", { state: { selectedVoucher, discountAmount } });
    }

    if (cartItems.length === 0) {
        return (
            <Container className="py-5 text-center d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "70vh" }}>
                <div className="mb-4 text-muted bg-light p-4 rounded-circle">
                    <FaTrash size={40} className="opacity-50" />
                </div>
                <h1 className="fw-bolder mb-3">Your Bag is Empty</h1>
                <p className="text-muted mb-4 lead">Looks like you haven't added anything to your cart yet.</p>
                <Button variant="dark" size="lg" className="rounded-pill px-5 fw-bold" onClick={() => navigate("/")}>
                    Start Shopping
                </Button>
            </Container>
        );
    }

    return (
        <Container className="py-5">
            <h1 className="fw-bold mb-5 display-5">Cart</h1>

            <Row>
                {/* LEFT: CART ITEMS */}
                <Col lg={8}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="text-muted small fw-bold text-uppercase">Product</span>
                        <span className="text-muted small fw-bold text-uppercase">Total</span>
                    </div>
                    <hr className="mt-0 mb-4" />

                    {cartItems.map((item) => (
                        <div key={item.id} className="mb-4">
                            <Row className="align-items-center g-3">
                                <Col xs={4} md={3}>
                                    <div className="bg-light rounded overflow-hidden position-relative">
                                        <Image
                                            src={item.image_url}
                                            alt={item.name}
                                            fluid
                                            className="w-100 object-fit-cover"
                                            style={{ height: '120px' }}
                                        />
                                    </div>
                                </Col>
                                <Col xs={8} md={5}>
                                    <h5 className="fw-bold mb-1 text-dark text-decoration-none">
                                        <Link to={`/products/${item.id}`} className="text-dark text-decoration-none hover-underline">
                                            {item.name}
                                        </Link>
                                    </h5>
                                    <p className="text-muted small mb-2">{item.description ? item.description.substring(0, 50) + "..." : "No description"}</p>
                                    <p className="fw-bold mb-0">RM{item.price}</p>
                                </Col>
                                <Col xs={6} md={2}>
                                    <div className="d-flex align-items-center border rounded-pill px-2 py-1" style={{ width: 'fit-content' }}>
                                        <button
                                            className="btn btn-sm btn-link text-dark p-0 text-decoration-none fw-bold"
                                            style={{ width: '20px' }}
                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                        >-</button>
                                        <span className="mx-2 small fw-bold">{item.quantity}</span>
                                        <button
                                            className="btn btn-sm btn-link text-dark p-0 text-decoration-none fw-bold"
                                            style={{ width: '20px' }}
                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                        >+</button>
                                    </div>
                                </Col>
                                <Col xs={6} md={2} className="text-end">
                                    <h6 className="fw-bold mb-2">RM{(item.price * item.quantity).toFixed(2)}</h6>
                                    <Button
                                        variant="link"
                                        className="text-danger p-0 small text-decoration-none"
                                        onClick={() => removeFromCart(item.id)}
                                    >
                                        <FaTrash size={14} className="me-1" /> Remove
                                    </Button>
                                </Col>
                            </Row>
                            <hr className="my-4 text-muted opacity-25" />
                        </div>
                    ))}

                    <Button variant="link" className="text-dark fw-bold text-decoration-none px-0" onClick={() => navigate("/")}>
                        <FaArrowLeft className="me-2" /> Continue Shopping
                    </Button>
                </Col>


                {/* RIGHT: SUMMARY */}
                <Col lg={4} className="mt-5 mt-lg-0 pb-5">
                    <Card className="border-0 shadow-lg bg-light rounded-4 sticky-top" style={{ top: '100px' }}>
                        <Card.Body className="p-4">
                            <h4 className="fw-bold mb-4">Order Summary</h4>

                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">Subtotal ({cartItems.length} items)</span>
                                <span className="fw-bold">RM{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">Shipping</span>
                                <span className="fw-bold">{shippingCost === 0 ? "Free" : `RM${shippingCost.toFixed(2)}`}</span>
                            </div>

                            {/* Vouchers Section */}
                            <div className="d-flex justify-content-between align-items-center mb-3 p-2 bg-white rounded border">
                                <div className="d-flex align-items-center text-warning">
                                    <FaTicketAlt className="me-2" />
                                    <span className="small fw-bold text-dark">{selectedVoucher ? selectedVoucher.code : "Platform Voucher"}</span>
                                </div>
                                <Button variant="link" size="sm" className="text-primary text-decoration-none fw-bold" onClick={() => setShowVoucherModal(true)}>
                                    {selectedVoucher ? "Change" : "Select"}
                                </Button>
                            </div>

                            {selectedVoucher && (
                                <div className="d-flex justify-content-between mb-2 text-success">
                                    <span>Voucher Discount</span>
                                    <span>-RM{discountAmount.toFixed(2)}</span>
                                </div>
                            )}

                            <hr />

                            <div className="d-flex justify-content-between mb-4">
                                <span className="fs-5 fw-bold">Total</span>
                                <span className="fs-4 fw-bolder">RM{finalTotal.toFixed(2)}</span>
                            </div>

                            <Button
                                variant="dark"
                                size="lg"
                                className="w-100 rounded-pill py-3 fw-bold mb-3 shadow-sm hover-scale"
                                onClick={handleCheckout}
                            >
                                Proceed to Checkout
                            </Button>

                            <div className="d-flex align-items-center justify-content-center text-muted small">
                                <FaLock size={12} className="me-2" /> Secure Checkout
                            </div>

                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Voucher Modal */}
            <Modal show={showVoucherModal} onHide={() => setShowVoucherModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold">Select Voucher</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }} className="bg-light">
                    {vouchers.length === 0 ? (
                        <p className="text-center text-muted py-3">No vouchers available at the moment.</p>
                    ) : (
                        vouchers.map(v => (
                            <VoucherCard
                                key={v.id}
                                voucher={v}
                                isClaimed={v.is_claimed}
                                onClaim={v.is_claimed ? null : handleClaimVoucher}
                                onSelect={(v) => { setSelectedVoucher(v); setShowVoucherModal(false); }}
                                isSelected={selectedVoucher?.id === v.id}
                                disabled={v.is_claimed && subtotal < parseFloat(v.min_spend)}
                            />
                        ))
                    )}
                </Modal.Body>
            </Modal>
        </Container>
    );
}