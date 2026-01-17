import { Container, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";

export default function Footer() {
    return (
        <footer className="bg-black text-white pt-5 pb-4 mt-auto">
            <Container>
                <Row className="g-4">
                    <Col md={3}>
                        <h5 className="fw-bold mb-3">ShopGo</h5>
                        <p className="text-white-50 small">
                            Your premium destination for fashion, electronics, and lifestyle products.
                            Quality meets usage.
                        </p>
                        <div className="d-flex gap-3 mt-3">
                            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-white"><i className="bi bi-twitter"></i></a>
                            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="text-white"><i className="bi bi-facebook"></i></a>
                            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-white"><i className="bi bi-instagram"></i></a>
                        </div>
                    </Col>
                    <Col md={3}>
                        <h5 className="fw-bold mb-3">Shop Online</h5>
                        <ul className="list-unstyled">
                            <li className="mb-2"><Link to="/c/fashion" className="text-white-50 text-decoration-none hover-white">Fashion</Link></li>
                            <li className="mb-2"><Link to="/c/electronics" className="text-white-50 text-decoration-none hover-white">Electronics</Link></li>
                            <li className="mb-2"><Link to="/c/home" className="text-white-50 text-decoration-none hover-white">Home Goods</Link></li>
                        </ul>
                    </Col>
                    <Col md={3}>
                        <h5 className="fw-bold mb-3">Support</h5>
                        <ul className="list-unstyled">
                            <li className="mb-2"><Link to="/faq" className="text-white-50 text-decoration-none hover-white">FAQ</Link></li>
                            <li className="mb-2"><Link to="/contact" className="text-white-50 text-decoration-none hover-white">Contact Us</Link></li>
                            <li className="mb-2"><Link to="/terms" className="text-white-50 text-decoration-none hover-white">Terms & Conditions</Link></li>
                        </ul>
                    </Col>
                    <Col md={3}>
                        <h5 className="fw-bold mb-3">Stay Updated</h5>
                        <p className="text-white-50 small mb-3">Subscribe to our newsletter for exclusive deals.</p>
                        <form onSubmit={(e) => { e.preventDefault(); alert("Thanks for subscribing!"); }}>
                            <div className="input-group mb-3">
                                <input type="email" required className="form-control bg-dark text-white border-secondary" placeholder="Email Address" aria-label="Email Address" />
                                <button className="btn btn-primary" type="submit">Join</button>
                            </div>
                        </form>
                    </Col>
                </Row>
                <hr className="my-4 border-secondary" />
                <div className="text-center">
                    <p className="mb-0 text-white-50 small">&copy; {new Date().getFullYear()} ShopGo. All Rights Reserved.</p>
                </div>
            </Container>
        </footer>
    );
}
