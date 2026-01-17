import { Container, Row, Col, Form, Button, Card, Alert, Image, InputGroup } from 'react-bootstrap';
import { useState, useContext, useRef } from 'react';
import { AuthContext } from '../components/AuthProvider';
import { useNavigate } from 'react-router-dom';

export default function AddProduct() {
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (!name || !price || !currentUser) {
            setError("Please fill in all required fields.");
            setLoading(false);
            return;
        }

        try {
            const imageUrl = preview || "https://placehold.co/600x400?text=No+Image";
            const API_URL = 'https://c4772cc6-1f1b-44f4-8b39-7a97086b8204-00-260uyq3aib74z.pike.replit.dev';

            const response = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    seller_id: currentUser.uid,
                    name: name,
                    description: description,
                    price: parseFloat(price),
                    image_url: imageUrl
                }),
            });

            if (response.ok) {
                alert("Product Posted Successfully!");
                navigate("/");
            } else {
                const data = await response.json();
                throw new Error(data.error || "Failed to save product.");
            }

        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="py-4" style={{ minHeight: "100vh" }}>
            <div className="mb-4">
                <Button
                    variant="link"
                    className="text-decoration-none text-dark p-0 d-flex align-items-center gap-2"
                    onClick={() => navigate("/")}
                    style={{ fontSize: '1.1rem', fontWeight: '600' }}
                >
                    <i className="bi bi-arrow-left fs-4"></i>
                </Button>
            </div>
            <Row className="justify-content-center">
                <Col lg={10}>
                    <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
                        <Row className="g-0">

                            {/* LEFT SIDE: IMAGE UPLOAD ZONE */}
                            <Col md={5} className="bg-light d-flex align-items-center justify-content-center p-4 position-relative">
                                <div
                                    className="w-100 h-100 border rounded-4 d-flex flex-column align-items-center justify-content-center text-center bg-white"
                                    style={{
                                        minHeight: '400px',
                                        borderStyle: 'dashed',
                                        borderColor: '#dee2e6',
                                        borderWidth: '2px',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    onClick={handleUploadClick}
                                >
                                    {preview ? (
                                        <>
                                            <Image
                                                src={preview}
                                                className="w-100 h-100 object-fit-cover position-absolute top-0 start-0"
                                            />
                                            <div className="position-absolute bottom-0 w-100 p-2" style={{ background: 'rgba(0,0,0,0.5)' }}>
                                                <small className="text-white fw-bold">Click to Change Image</small>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="p-4 text-muted">
                                            <div className="mb-3 bg-light rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                                                <i className="bi bi-camera fs-1"></i>
                                            </div>
                                            <h5 className="fw-bold text-dark">Upload Product Image</h5>
                                            <p className="small mb-0">Supports JPG, PNG (Max 5MB)</p>
                                        </div>
                                    )}

                                    {/* Hidden Input */}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageChange}
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                    />
                                </div>
                            </Col>

                            {/* RIGHT SIDE: FORM DETAILS */}
                            <Col md={7} className="p-5">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h2 className="fw-bold mb-0">Product Details</h2>
                                    <Button variant="close" onClick={() => navigate("/")} aria-label="Close"></Button>
                                </div>

                                {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

                                <Form onSubmit={handleSubmit}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-bold text-muted text-uppercase">Product Name</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="e.g. Nike Air Max 97"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            className="form-control-lg fs-6"
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-bold text-muted text-uppercase">Price</Form.Label>
                                        <InputGroup>
                                            <InputGroup.Text className="bg-white border-end-0">RM</InputGroup.Text>
                                            <Form.Control
                                                type="number"
                                                placeholder="0.00"
                                                value={price}
                                                onChange={(e) => setPrice(e.target.value)}
                                                required
                                                className="form-control-lg fs-6 border-start-0 ps-0"
                                            />
                                        </InputGroup>
                                    </Form.Group>

                                    <Form.Group className="mb-4">
                                        <Form.Label className="small fw-bold text-muted text-uppercase">Description</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={5}
                                            placeholder="Tell buyers about the condition, features, and why they'll love it..."
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="fs-6"
                                            style={{ resize: "none" }}
                                        />
                                    </Form.Group>

                                    <div className="d-flex gap-3 mt-5">
                                        <Button variant="light" className="flex-fill fw-bold py-3" onClick={() => navigate("/")}>
                                            Cancel
                                        </Button>
                                        <Button variant="dark" type="submit" disabled={loading} className="flex-fill fw-bold py-3">
                                            {loading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Publishing...
                                                </>
                                            ) : (
                                                "Post Item"
                                            )}
                                        </Button>
                                    </div>
                                </Form>
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}