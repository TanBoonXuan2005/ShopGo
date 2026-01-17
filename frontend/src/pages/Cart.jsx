import { Container, Row, Col, Card, Button, Form, Image } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { useCart } from "../components/CartContext";
import { FaTrash, FaArrowLeft, FaLock } from "react-icons/fa";

export default function Cart() {
    const { cartItems, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart();
    const navigate = useNavigate();

    const shippingCost = 5;
    const total = getCartTotal() + shippingCost;

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
                                <span className="fw-bold">RM{getCartTotal().toFixed(2)}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-4">
                                <span className="text-muted">Shipping</span>
                                <span className="fw-bold">{shippingCost === 0 ? "Free" : `RM${shippingCost.toFixed(2)}`}</span>
                            </div>

                            <hr />

                            <div className="d-flex justify-content-between mb-4">
                                <span className="fs-5 fw-bold">Total</span>
                                <span className="fs-4 fw-bolder">RM{total.toFixed(2)}</span>
                            </div>

                            <Button
                                variant="dark"
                                size="lg"
                                className="w-100 rounded-pill py-3 fw-bold mb-3 shadow-sm hover-scale"
                                onClick={() => navigate("/checkout")}
                            >
                                Proceed to Checkout
                            </Button>

                            <div className="d-flex align-items-center justify-content-center text-muted small">
                                <FaLock size={12} className="me-2" /> Secure Checkout
                            </div>

                            {/* Promo Code Input (Optional Visual) */}
                            <div className="mt-4 pt-4 border-top">
                                <p className="small fw-bold text-muted text-uppercase mb-2">Promo Code</p>
                                <div className="d-flex gap-2">
                                    <Form.Control type="text" placeholder="Enter code" className="rounded-pill bg-white border-0 shadow-sm" />
                                    <Button variant="outline-dark" className="rounded-pill px-3 fw-bold">Apply</Button>
                                </div>
                            </div>

                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}