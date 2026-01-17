import { Container, Row, Col, Card, Button, Form, Accordion, Image } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaCommentDots, FaBriefcase, FaUsers, FaHome, FaRobot } from "react-icons/fa";

export default function StaticPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const path = location.pathname;

    let content;

    // --- 1. ABOUT US ---
    if (path === '/about') {
        content = (
            <>
                <div className="text-center mb-5">
                    <h1 className="fw-bold display-4 mb-3">About Us</h1>
                    <p className="lead text-muted mx-auto" style={{ maxWidth: '700px' }}>
                        We are a passionate team dedicated to bringing you the best products at unbeatable prices.
                        Our mission is to make quality accessible to everyone.
                    </p>
                </div>

                <Row className="align-items-center mb-5">
                    <Col md={6}>
                        <Image src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop" fluid rounded className="shadow-lg mb-4 mb-md-0" />
                    </Col>
                    <Col md={6} className="ps-md-5">
                        <h2 className="fw-bold mb-3">Our Story</h2>
                        <p className="text-muted mb-4">
                            Founded in 2023, we started with a simple idea: shopping should be easy, fun, and affordable.
                            From our humble beginnings in a small garage, we have grown into a global marketplace serving thousands of happy customers.
                        </p>
                        <h2 className="fw-bold mb-3">Our Mission</h2>
                        <p className="text-muted">
                            To empower sellers and delight buyers with a seamless e-commerce experience. We believe in transparency, quality, and community.
                        </p>
                    </Col>
                </Row>

                <div className="bg-light p-5 rounded-4 text-center mt-5">
                    <h2 className="fw-bold mb-4">Meet the Team</h2>
                    <Row xs={1} md={3} className="g-4">
                        {[
                            { name: "Alex Johnson", role: "CEO & Founder", img: "https://randomuser.me/api/portraits/men/32.jpg" },
                            { name: "Sarah Williams", role: "Head of Design", img: "https://randomuser.me/api/portraits/women/44.jpg" },
                            { name: "Michael Chen", role: "CTO", img: "https://randomuser.me/api/portraits/men/86.jpg" }
                        ].map((member, idx) => (
                            <Col key={idx}>
                                <div className="bg-white p-4 rounded shadow-sm h-100 border-0 hover-scale hover-shadow">
                                    <Image src={member.img} roundedCircle className="mb-3" width={100} height={100} />
                                    <h5 className="fw-bold mb-1">{member.name}</h5>
                                    <p className="text-muted small mb-0">{member.role}</p>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </div>
            </>
        );
    }
    // --- 2. CONTACT US ---
    else if (path === '/contact') {
        content = (
            <>
                <div className="text-center mb-5">
                    <h1 className="fw-bold display-4 mb-3 gradient-text">Contact Us</h1>
                    <p className="lead text-muted">We'd love to hear from you! Reach out to us with any questions.</p>
                </div>

                <Row className="justify-content-center">
                    <Col md={5} className="mb-4 mb-md-0">
                        <Card className="border-0 shadow-lg h-100 bg-dark text-white p-4 hover-scale">
                            <Card.Body>
                                <h3 className="fw-bold mb-4">Get in Touch</h3>
                                <div className="d-flex align-items-center mb-4">
                                    <FaEnvelope size={24} className="me-3 opacity-75" />
                                    <div>
                                        <h6 className="mb-0 fw-bold">Email</h6>
                                        <p className="mb-0 small opacity-75">boonxuan05@gmail.com</p>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center mb-4">
                                    <FaPhone size={24} className="me-3 opacity-75" />
                                    <div>
                                        <h6 className="mb-0 fw-bold">Phone</h6>
                                        <p className="mb-0 small opacity-75">+601-131851468</p>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center mb-4">
                                    <FaMapMarkerAlt size={24} className="me-3 opacity-75" />
                                    <div>
                                        <h6 className="mb-0 fw-bold">Office</h6>
                                        <p className="mb-0 small opacity-75">123 Tech Avenue, Kuala Lumpur, Malaysia</p>
                                    </div>
                                </div>

                                <hr className="border-light opacity-25 my-4" />

                                <div className="d-grid gap-3">
                                    <Button
                                        variant="light"
                                        className="fw-bold d-flex align-items-center justify-content-center gap-2 hover-scale"
                                        onClick={() => window.dispatchEvent(new Event('openChatbot'))}
                                    >
                                        <FaRobot size={20} /> Chat with AI Support
                                    </Button>
                                    <Button
                                        as="a"
                                        href="sms:+60123456789"
                                        variant="outline-light"
                                        className="fw-bold d-flex align-items-center justify-content-center gap-2 hover-scale"
                                    >
                                        <FaCommentDots size={20} /> Text Us (SMS)
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={7}>
                        <Card className="border-0 shadow-sm p-4 hover-shadow">
                            <Card.Body>
                                <h3 className="fw-bold mb-4">Send us a Message</h3>
                                <Form>
                                    <Row className="mb-3">
                                        <Col md={6}>
                                            <Form.Group className="mb-3 mb-md-0">
                                                <Form.Label>Name</Form.Label>
                                                <Form.Control type="text" placeholder="Your Name" className="bg-light border-0" />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label>Email</Form.Label>
                                                <Form.Control type="email" placeholder="Your Email" className="bg-light border-0" />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Subject</Form.Label>
                                        <Form.Control type="text" placeholder="Topic" className="bg-light border-0" />
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Message</Form.Label>
                                        <Form.Control as="textarea" rows={5} placeholder="How can we help you?" className="bg-light border-0" />
                                    </Form.Group>
                                    <Button variant="dark" type="submit" className="w-100 fw-bold py-2 hover-scale">
                                        Send Message
                                    </Button>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </>
        );
    }
    // --- 3. FAQ ---
    else if (path === '/faq') {
        content = (
            <>
                <div className="text-center mb-5">
                    <h1 className="fw-bold display-4 mb-3 gradient-text">Frequency Asked Questions</h1>
                    <p className="lead text-muted">Find answers to common questions about our services.</p>
                </div>

                <div className="mx-auto" style={{ maxWidth: '800px' }}>
                    <Accordion defaultActiveKey="0" flush className="shadow-sm rounded border-0">
                        <Accordion.Item eventKey="0">
                            <Accordion.Header>How long does shipping take?</Accordion.Header>
                            <Accordion.Body>
                                Standard shipping usually takes 3-5 business days. Express options are available at checkout.
                            </Accordion.Body>
                        </Accordion.Item>
                        <Accordion.Item eventKey="1">
                            <Accordion.Header>What is your return policy?</Accordion.Header>
                            <Accordion.Body>
                                We accept returns within 30 days of purchase. Items must be unused and in original packaging.
                            </Accordion.Body>
                        </Accordion.Item>
                        <Accordion.Item eventKey="2">
                            <Accordion.Header>Do you ship internationally?</Accordion.Header>
                            <Accordion.Body>
                                Yes! We currently ship to over 50 countries worldwide. Shipping rates vary by location.
                            </Accordion.Body>
                        </Accordion.Item>
                        <Accordion.Item eventKey="3">
                            <Accordion.Header>How can I track my order?</Accordion.Header>
                            <Accordion.Body>
                                Once your order ships, you will receive a tracking number via email. You can also view order status in your profile.
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                </div>
            </>
        );
    }
    // --- 4. CAREERS ---
    else if (path === '/careers') {
        content = (
            <>
                <div className="text-center mb-5">
                    <h1 className="fw-bold display-4 mb-3">Join Our Team</h1>
                    <p className="lead text-muted">Help us build the future of e-commerce.</p>
                </div>

                <Row className="justify-content-center">
                    <Col lg={8}>
                        {[
                            { title: "Senior Frontend Engineer", type: "Full-time", location: "Remote", dept: "Engineering" },
                            { title: "Product Designer", type: "Full-time", location: "Kuala Lumpur", dept: "Design" },
                            { title: "Customer Support Specialist", type: "Full-time", location: "Remote", dept: "Support" },
                            { title: "Marketing Manager", type: "Full-time", location: "Kuala Lumpur", dept: "Marketing" }
                        ].map((job, idx) => (
                            <Card key={idx} className="mb-3 border-0 shadow-sm hover-shadow transition-all">
                                <Card.Body className="d-flex align-items-center justify-content-between p-4">
                                    <div>
                                        <h5 className="fw-bold mb-1">{job.title}</h5>
                                        <div className="text-muted small">
                                            <span className="me-3"><FaBriefcase className="me-1" /> {job.type}</span>
                                            <span className="me-3"><FaMapMarkerAlt className="me-1" /> {job.location}</span>
                                            <span><FaUsers className="me-1" /> {job.dept}</span>
                                        </div>
                                    </div>
                                    <Button variant="outline-dark" className="rounded-pill">Apply Now</Button>
                                </Card.Body>
                            </Card>
                        ))}
                    </Col>
                </Row>
            </>
        );
    }
    // --- 5. TERMS / DEFAULT ---
    else {
        content = (
            <>
                <div className="text-center mb-5">
                    <h1 className="fw-bold display-4 mb-3">Terms of Service</h1>
                    <p className="lead text-muted">Last Updated: January 16, 2026</p>
                </div>

                <div className="mx-auto bg-white p-5 rounded shadow-sm text-start" style={{ maxWidth: '800px' }}>
                    <h4 className="fw-bold">1. Introduction</h4>
                    <p className="text-muted mb-4">Welcome to Capstone Store. By accessing our website, you agree to be bound by these terms.</p>

                    <h4 className="fw-bold">2. Use of Site</h4>
                    <p className="text-muted mb-4">You may not use our products for any illegal or unauthorized purpose.</p>

                    <h4 className="fw-bold">3. Products and Services</h4>
                    <p className="text-muted mb-4">We reserve the right to modify or discontinue any product at any time.</p>

                    <h4 className="fw-bold">4. User Account</h4>
                    <p className="text-muted mb-0">You are responsible for maintaining the confidentiality of your account password.</p>
                </div>
            </>
        );
    }

    return (
        <Container className="py-5" style={{ minHeight: '80vh' }}>
            {content}
            <div className="text-center mt-5 pt-4">
                <Button
                    variant="outline-dark"
                    className="rounded-pill px-4 py-2 hover-scale fw-bold d-inline-flex align-items-center gap-2"
                    onClick={() => navigate('/')}
                >
                    <FaHome /> Return to Home
                </Button>
            </div>
        </Container>
    );
}
