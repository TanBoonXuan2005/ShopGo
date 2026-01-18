import { Container, Row, Col, Form, Button, Card, Alert, Image, InputGroup, Spinner, Modal } from 'react-bootstrap';
import { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../components/AuthProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { storage } from '../firebase'; // Import storage
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FaCheckCircle } from 'react-icons/fa';

const CATEGORIES = [
    "Electronics",
    "Computers & Laptops",
    "Fashion",
    "Home & Living",
    "Beauty",
    "Sports",
    "Toys",
    "Automotive",
    "Others"
];

export default function AddProduct() {
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const { id } = useParams(); // Get Product ID for Edit Mode
    const fileInputRef = useRef(null);
    const isEditMode = !!id;

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [category, setCategory] = useState("Others");
    const [stock, setStock] = useState(1);
    const [imageFile, setImageFile] = useState(null); // Store the actual file
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditMode); // Loading state for fetching data
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Fetch Product Data if Edit Mode
    useEffect(() => {
        if (isEditMode) {
            const fetchProduct = async () => {
                try {
                    const API_URL = 'http://localhost:5000';
                    const res = await fetch(`${API_URL}/products/${id}`);
                    if (res.ok) {
                        const data = await res.json();
                        setName(data.name);
                        setDescription(data.description || "");
                        setPrice(data.price);
                        setStock(data.stock || 1);
                        setCategory(data.category || "Others");
                        setPreview(data.image_url);
                        // Ensure owner check? Maybe not strictly necessary if backend protects it or we trust UI
                    } else {
                        setError("Product not found.");
                    }
                } catch (err) {
                    console.error("Error fetching product:", err);
                    setError("Failed to load product details.");
                } finally {
                    setInitialLoading(false);
                }
            };
            fetchProduct();
        }
    }, [isEditMode, id]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
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
            setError("Please fill in (Name, Price).");
            setLoading(false);
            return;
        }

        // For Add Mode: Image is required. For Edit Mode: Optional (keep existing).
        if (!isEditMode && !imageFile) {
            setError("Please upload an image.");
            setLoading(false);
            return;
        }

        try {
            // 1. Upload Image to Firebase Storage (only if new file selected)
            let imageUrl = preview; // Default to existing preview (URL)

            if (imageFile) {
                const imageRef = ref(storage, `products/${currentUser.dbId}/${Date.now()}_${imageFile.name}`);
                const snapshot = await uploadBytes(imageRef, imageFile);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            // 2. Send Data to Backend
            const API_URL = 'http://localhost:5000';
            let response;

            const payload = {
                name,
                description,
                price: parseFloat(price),
                image_url: imageUrl,
                category,
                stock: parseInt(stock)
            };

            if (isEditMode) {
                // PUT Request
                response = await fetch(`${API_URL}/products/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                // POST Request
                response = await fetch(`${API_URL}/products`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...payload,
                        seller_id: currentUser.dbId
                    }),
                });
            }

            if (response.ok) {
                if (isEditMode) {
                    setShowSuccessModal(true);
                } else {
                    navigate(`/store/${currentUser.dbId}`);
                }
            } else {
                const data = await response.json();
                throw new Error(data.error || "Failed to save product.");
            }

        } catch (err) {
            console.error(err);
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowSuccessModal(false);
        navigate(`/store/${currentUser.dbId}`);
    };

    if (initialLoading) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
                <Spinner animation="border" />
            </Container>
        );
    }

    return (
        <Container className="py-5" style={{ minHeight: "100vh" }}>
            <Row className="justify-content-center">
                <Col md={8} lg={6}>
                    <Card className="border-0 shadow-lg rounded-4 overflow-hidden">
                        <Card.Body className="p-0">
                            <Row className="g-0">
                                <Col xs={12} className="bg-primary text-white p-4 text-center">
                                    <h3 className="fw-bold mb-0">{isEditMode ? "Edit Product" : "Add New Product"}</h3>
                                    <p className="mb-0 opacity-75">{isEditMode ? "Update your product details" : "Showcase your item to the world!"}</p>
                                </Col>
                                <Col xs={12} className="p-4 p-md-5 bg-white">
                                    {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}

                                    <Form onSubmit={handleSubmit}>

                                        {/* Image Upload Section */}
                                        <div className="mb-4 text-center">
                                            <div
                                                className="position-relative d-inline-block rounded-circle border-2 border-primary border-dashed d-flex justify-content-center align-items-center mx-auto bg-light"
                                                style={{ width: '150px', height: '150px', cursor: 'pointer', overflow: 'hidden' }}
                                                onClick={handleUploadClick}
                                            >
                                                {preview ? (
                                                    <Image src={preview} alt="Preview" fluid className="w-100 h-100 object-fit-cover" />
                                                ) : (
                                                    <div className="text-secondary">
                                                        <i className="bi bi-camera fs-1"></i>
                                                        <div className="small mt-1">Upload Photo</div>
                                                    </div>
                                                )}
                                                <div className="position-absolute bottom-0 w-100 bg-dark bg-opacity-50 text-white small py-1">
                                                    Change
                                                </div>
                                            </div>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleImageChange}
                                                accept="image/*"
                                                className="d-none"
                                            />
                                            <div className="form-text mt-2">Click to upload product image *</div>
                                        </div>

                                        <Row>
                                            <Col md={12}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="fw-bold text-secondary text-uppercase small">Product Name *</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="e.g. Vintage Camera"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        className="py-2 bg-light border-0"
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>

                                        <Row>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="fw-bold text-secondary text-uppercase small">Price (RM) *</Form.Label>
                                                    <InputGroup>
                                                        <InputGroup.Text className="bg-light border-0 fw-bold">RM</InputGroup.Text>
                                                        <Form.Control
                                                            type="number"
                                                            placeholder="0.00"
                                                            value={price}
                                                            onChange={(e) => setPrice(e.target.value)}
                                                            className="py-2 bg-light border-0"
                                                        />
                                                    </InputGroup>
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="fw-bold text-secondary text-uppercase small">Stock *</Form.Label>
                                                    <Form.Control
                                                        type="number"
                                                        value={stock}
                                                        onChange={(e) => setStock(e.target.value)}
                                                        className="py-2 bg-light border-0"
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>

                                        <Form.Group className="mb-3">
                                            <Form.Label className="fw-bold text-secondary text-uppercase small">Category</Form.Label>
                                            <Form.Select
                                                value={category}
                                                onChange={(e) => setCategory(e.target.value)}
                                                className="py-2 bg-light border-0"
                                            >
                                                {CATEGORIES.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>

                                        <Form.Group className="mb-4">
                                            <Form.Label className="fw-bold text-secondary text-uppercase small">Description</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={4}
                                                placeholder="Tell us more about your product..."
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                className="py-2 bg-light border-0"
                                            />
                                        </Form.Group>

                                        <div className="d-grid">
                                            <Button variant="primary" size="lg" type="submit" disabled={loading} className="fw-bold shadow-sm">
                                                {loading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : (isEditMode ? "Update Product" : "Create Product")}
                                            </Button>
                                            <Button variant="link" className="text-secondary mt-2 text-decoration-none" onClick={() => navigate(-1)}>
                                                Cancel
                                            </Button>
                                        </div>
                                    </Form>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Success Modal */}
            <Modal show={showSuccessModal} onHide={handleCloseModal} centered>
                <Modal.Body className="text-center py-5">
                    <div className="mb-3 text-success">
                        <FaCheckCircle size={60} />
                    </div>
                    <h4 className="fw-bold">Update Successful!</h4>
                    <p className="text-muted">Your product details have been updated.</p>
                    <Button variant="dark" onClick={handleCloseModal} className="px-5 mt-3">
                        OK
                    </Button>
                </Modal.Body>
            </Modal>
        </Container>
    );
}