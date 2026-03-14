import { Container, Row, Col, Form, Button, InputGroup, Spinner, Modal } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function Footer() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [modalMessage, setModalMessage] = useState("");

    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            // 1. Save to Firebase (Keep existing logic)
            await addDoc(collection(db, "subscribers"), {
                email: email,
                subscribed_at: serverTimestamp()
            });

            // 2. Send Email via Backend
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            await fetch(`${API_URL}/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            setSubscribed(true);
            setEmail("");
        } catch (error) {
            console.error("Error subscribing:", error);
            setModalMessage("Something went wrong. Please try again.");
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <footer className="bg-black text-white pt-5 pb-4 mt-auto">
            <Container>
                <Row className="g-4">
                    <Col md={3} className="text-center text-md-start">
                        <h5 className="fw-bold mb-3">ShopGo</h5>
                        <p className="text-white-50 small">
                            Your premium destination for fashion, electronics, and lifestyle products.
                            Quality meets usage.
                        </p>
                        <div className="d-flex gap-3 mt-3 justify-content-center justify-content-md-start">
                            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-white"><i className="bi bi-twitter"></i></a>
                            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="text-white"><i className="bi bi-facebook"></i></a>
                            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-white"><i className="bi bi-instagram"></i></a>
                        </div>
                    </Col>
                    <Col md={3} className="text-center text-md-start">
                        <h5 className="fw-bold mb-3">Shop Online</h5>
                        <ul className="list-unstyled">
                            <li className="mb-2"><Link to="/c/fashion" className="text-white-50 text-decoration-none hover-white">Fashion</Link></li>
                            <li className="mb-2"><Link to="/c/electronics" className="text-white-50 text-decoration-none hover-white">Electronics</Link></li>
                            <li className="mb-2"><Link to="/c/home" className="text-white-50 text-decoration-none hover-white">Home Goods</Link></li>
                        </ul>
                    </Col>
                    <Col md={3} className="text-center text-md-start">
                        <h5 className="fw-bold mb-3">Support</h5>
                        <ul className="list-unstyled">
                            <li className="mb-2"><Link to="/faq" className="text-white-50 text-decoration-none hover-white">FAQ</Link></li>
                            <li className="mb-2"><Link to="/contact" className="text-white-50 text-decoration-none hover-white">Contact Us</Link></li>
                            <li className="mb-2"><Link to="/terms" className="text-white-50 text-decoration-none hover-white">Terms & Conditions</Link></li>
                        </ul>
                    </Col>
                    <Col md={3} className="text-center text-md-start">
                        <h5 className="fw-bold mb-3">Stay Updated</h5>
                        <p className="text-white-50 small mb-3">Subscribe to our newsletter for exclusive deals.</p>

                        {subscribed ? (
                            <div className="alert alert-success py-2 small" role="alert">
                                Thanks for subscribing!
                            </div>
                        ) : (
                            <Form onSubmit={handleSubscribe}>
                                <InputGroup className="mb-3">
                                    <Form.Control
                                        type="email"
                                        required
                                        placeholder="Email Address"
                                        className="bg-dark text-white border-secondary"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                    <Button variant="primary" type="submit" disabled={loading}>
                                        {loading ? <Spinner size="sm" animation="border" /> : "Join"}
                                    </Button>
                                </InputGroup>
                            </Form>
                        )}
                    </Col>
                </Row>
                <hr className="my-4 border-secondary" />
                <div className="text-center">
                    <p className="mb-0 text-white-50 small">&copy; {new Date().getFullYear()} ShopGo. All Rights Reserved.</p>
                </div>
            </Container>

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
        </footer>
    );
}
