import { Container, Row, Col, Card, Button, Form, Alert, Image, Spinner } from "react-bootstrap";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { auth, storage } from "../firebase";
import { signOut, updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FaUserCircle, FaSignOutAlt, FaCamera } from 'react-icons/fa';

export default function Profile() {
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const [image, setImage] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [previewUrl, setPreviewUrl] = useState(null);

    // Redirect if not logged in
    useEffect(() => {
        if (!currentUser) {
            navigate("/login");
        }
    }, [currentUser, navigate]);

    if (!currentUser) return null;

    const handleImageChange = (e) => {
        if (e.target.files[0]) {
            setImage(e.target.files[0]);
            // Create a local preview
            setPreviewUrl(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleUpload = async () => {
        if (!image) {
            setError("Please select an image first.");
            return;
        }

        setUploading(true);
        setError("");
        setMessage("");

        try {
            // Create a reference to 'profile_images/uid'
            const storageRef = ref(storage, `profile_images/${currentUser.uid}`);

            // Upload the file
            await uploadBytes(storageRef, image);

            // Get the download URL
            const photoURL = await getDownloadURL(storageRef);

            // Update the user's profile
            await updateProfile(currentUser, { photoURL });

            setMessage("Profile picture updated successfully!");
            setImage(null);

            // Reload window to reflect changes in Header (simple fix for now)
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (err) {
            console.error("Upload Error: ", err);
            setError("Failed to upload image. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (err) {
            console.error("Error: ", err);
        }
    }

    return (
        <Container className="py-5">
            <Row className="justify-content-center">

                {/* LEFT COLUMN: User Card & Navigation */}
                <Col md={4} lg={3} className="mb-4">
                    <Card className="border-0 shadow-sm text-center p-4 h-100">
                        <div className="position-relative d-inline-block mx-auto mb-3">
                            {currentUser.photoURL || previewUrl ? (
                                <Image
                                    src={previewUrl || currentUser.photoURL}
                                    roundedCircle
                                    className="object-fit-cover border"
                                    style={{ width: '120px', height: '120px' }}
                                />
                            ) : (
                                <FaUserCircle size={120} className="text-secondary" />
                            )}
                            <label
                                htmlFor="file-upload"
                                className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle p-2 shadow-sm"
                                style={{ cursor: 'pointer', transform: 'translate(10%, 10%)' }}
                            >
                                <FaCamera size={16} />
                            </label>
                            <input
                                id="file-upload"
                                type="file"
                                accept="image/*"
                                className="d-none"
                                onChange={handleImageChange}
                            />
                        </div>

                        <h4 className="fw-bold mb-1">{currentUser.displayName || "Valued Customer"}</h4>
                        <p className="text-muted small mb-4">{currentUser.email}</p>


                        {image && (
                            <div className="mb-3">
                                <Button
                                    variant="dark"
                                    size="sm"
                                    className="w-100 rounded-pill"
                                    onClick={handleUpload}
                                    disabled={uploading}
                                >
                                    {uploading ? (
                                        <>
                                            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Saving...
                                        </>
                                    ) : (
                                        "Save New Picture"
                                    )}
                                </Button>
                            </div>
                        )}

                        <hr />

                        <div className="d-grid gap-2 text-start">
                            <Button variant="outline-danger" className="text-start d-flex align-items-center gap-2 mt-3" onClick={handleLogout}>
                                <FaSignOutAlt /> Logout
                            </Button>
                        </div>
                    </Card>
                </Col>

                {/* RIGHT COLUMN: Profile Details */}
                <Col md={8} lg={9}>
                    <Card className="border-0 shadow-sm p-4 h-100">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h3 className="fw-bold mb-0">Profile Settings</h3>
                        </div>

                        {error && <Alert variant="danger">{error}</Alert>}
                        {message && <Alert variant="success">{message}</Alert>}

                        <Form>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small text-muted fw-bold text-uppercase">Email Address</Form.Label>
                                        <Form.Control type="email" value={currentUser.email} disabled className="bg-light" />
                                        <Form.Text className="text-muted">
                                            Email cannot be changed managed via Google/Firebase.
                                        </Form.Text>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small text-muted fw-bold text-uppercase">User ID</Form.Label>
                                        <Form.Control type="text" value={currentUser.uid} disabled className="bg-light" />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small text-muted fw-bold text-uppercase">Account Created</Form.Label>
                                        <Form.Control type="text" value={currentUser.metadata.creationTime} disabled className="bg-light" />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small text-muted fw-bold text-uppercase">Last Login</Form.Label>
                                        <Form.Control type="text" value={currentUser.metadata.lastSignInTime} disabled className="bg-light" />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Form>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}