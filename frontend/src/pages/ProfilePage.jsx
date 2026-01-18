import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Nav, Modal } from "react-bootstrap";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { auth, storage } from "../firebase";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, signOut } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FaUser, FaLock, FaSave, FaUserCircle, FaCamera, FaSignOutAlt } from "react-icons/fa";

export default function ProfilePage() {
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();

    // -- STATE MANAGEMENT --
    const [activeTab, setActiveTab] = useState("profile");

    // Photo State
    const [photo, setPhoto] = useState(currentUser?.photoURL);
    const [newImage, setNewImage] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Profile Form State
    const [username, setUsername] = useState("");
    const [profileMessage, setProfileMessage] = useState({ type: "", text: "" });

    // Password Form State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loadingPassword, setLoadingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" });

    // -- EFFECTS --

    // 1. Force Refresh User Data on Mount
    useEffect(() => {
        if (currentUser) {
            // Initialize username from context or email
            setUsername(currentUser.username || currentUser.displayName || "");

            // Force Firebase to re-fetch latest data (Fix for stale photoURL)
            currentUser.reload().then(() => {
                setPhoto(auth.currentUser.photoURL);
            }).catch(console.error);
        } else {
            navigate("/login");
        }
    }, [currentUser, navigate]);


    // -- HANDLERS --

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setUploading(true);
        setProfileMessage({ type: "", text: "" });

        try {
            let profileImageUrl = photo; // Default to existing

            // 1. Upload Image if selected
            if (newImage) {
                const imageRef = ref(storage, `profile_images/${currentUser.uid}`);
                const snapshot = await uploadBytes(imageRef, newImage);
                profileImageUrl = await getDownloadURL(snapshot.ref);
            }

            // 2. Update Backend (SQL)
            // Note: Ensure your backend has a PUT route for /users/:id/profile
            // If not, you might only need to update Firebase profile here
            const API_URL = 'http://localhost:5000';

            // Optional: Send to backend if you are storing username/photo there
            // await fetch(`${API_URL}/users/${currentUser.uid}`, { ... }) 

            // 3. Update Firebase Profile
            // This updates the displayName and photoURL in Firebase Auth
            // (Note: To update 'username' specifically, you usually need a custom backend or Firestore)
            // For now, we assume 'username' maps to 'displayName' in Firebase
            // import { updateProfile } from "firebase/auth"; 
            // await updateProfile(currentUser, { displayName: username, photoURL: profileImageUrl });

            setPhoto(profileImageUrl);
            setProfileMessage({ type: "success", text: "Profile updated successfully!" });
            setNewImage(null);

        } catch (err) {
            console.error(err);
            setProfileMessage({ type: "danger", text: "Failed to update profile." });
        } finally {
            setUploading(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setLoadingPassword(true);
        setPasswordMessage({ type: "", text: "" });

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: "danger", text: "New passwords do not match." });
            setLoadingPassword(false);
            return;
        }

        try {
            // 1. Re-authenticate user (Security Requirement)
            // MUST use auth.currentUser (Firebase Object) not currentUser (Context Object)
            if (!auth.currentUser) throw new Error("User session expired. Please login again.");

            const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);

            // 2. Update Password
            await updatePassword(auth.currentUser, newPassword);

            setPasswordMessage({ type: "success", text: "Password changed successfully!" });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
                setPasswordMessage({ type: "danger", text: "Incorrect current password. Please try again." });
            } else if (err.code === 'auth/too-many-requests') {
                setPasswordMessage({ type: "danger", text: "Too many failed attempts. Please try again later." });
            } else {
                setPasswordMessage({ type: "danger", text: "Failed to update password: " + err.message });
            }
        } finally {
            setLoadingPassword(false);
        }
    };

    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const confirmLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
            setShowLogoutModal(false);
        } catch (err) {
            console.error("Error: ", err);
        }
    }

    const handleLogoutClick = () => {
        setShowLogoutModal(true);
    };

    if (!currentUser) return <Container className="py-5 text-center"><Spinner animation="border" /></Container>;

    return (
        <Container className="py-5" style={{ maxWidth: "1000px", minHeight: "80vh" }}>
            <div className="mb-5">
                <h2 className="fw-bolder display-6 mb-2">Account Settings</h2>
                <p className="text-muted">Manage your profile securely.</p>
            </div>

            <Row className="g-4">
                {/* LEFT COLUMN: SIDEBAR */}
                <Col lg={4} className="mb-4">
                    <Card className="border-0 shadow-lg rounded-4 text-center p-4 h-100 overflow-hidden bg-white">
                        {/* Profile Image Display */}
                        <div className="mb-3 mx-auto position-relative bg-light rounded-circle d-flex align-items-center justify-content-center overflow-hidden shadow-sm border border-2 border-light" style={{ width: '130px', height: '130px' }}>
                            {photo || auth.currentUser?.photoURL ? (
                                <img
                                    src={photo || auth.currentUser?.photoURL}
                                    alt="Profile"
                                    className="w-100 h-100 object-fit-cover"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <FaUserCircle size={64} className="text-secondary opacity-50" />
                            )}
                        </div>

                        <h4 className="fw-bold text-dark mb-1">{currentUser.displayName || currentUser.email.split('@')[0]}</h4>
                        <p className="text-secondary small mb-3">{currentUser.email}</p>
                        <span className="badge bg-black bg-opacity-10 text-dark border border-dark border-opacity-10 rounded-pill px-3 py-2 mb-4">
                            {currentUser.role ? currentUser.role.toUpperCase() : "MEMBER"}
                        </span>

                        <hr className="opacity-10 my-4" />

                        <Nav variant="pills" className="flex-column text-start gap-2" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                            <Nav.Link
                                eventKey="profile"
                                className={`rounded-3 py-3 px-4 d-flex align-items-center transition-all ${activeTab === 'profile' ? 'bg-dark text-white shadow' : 'text-secondary hover-bg-light'}`}
                            >
                                <FaUser className="me-3" /> <span className="fw-semibold">Profile Information</span>
                            </Nav.Link>
                            <Nav.Link
                                eventKey="security"
                                className={`rounded-3 py-3 px-4 d-flex align-items-center transition-all ${activeTab === 'security' ? 'bg-dark text-white shadow' : 'text-secondary hover-bg-light'}`}
                            >
                                <FaLock className="me-3" /> <span className="fw-semibold">Security & Password</span>
                            </Nav.Link>
                        </Nav>

                        <div className="mt-auto pt-5 d-grid">
                            <Button variant="outline-danger" size="lg" onClick={handleLogoutClick} className="rounded-pill border-0 bg-danger bg-opacity-10 text-danger fw-bold hover-bg-danger hover-text-white transition-all d-flex align-items-center justify-content-center gap-2">
                                <FaSignOutAlt /> Sign Out
                            </Button>
                        </div>
                    </Card>
                </Col>

                {/* RIGHT COLUMN: CONTENT */}
                <Col lg={8}>
                    <Card className="border-0 shadow-lg rounded-4 p-4 p-md-5 h-100 bg-white position-relative">

                        {/* --- TAB: PROFILE INFORMATION --- */}
                        {activeTab === 'profile' && (
                            <div className="animate-fade-in">
                                <h4 className="fw-bolder mb-4">Edit Profile</h4>
                                {profileMessage.text && <Alert variant={profileMessage.type} className="rounded-3 border-0 shadow-sm mb-4">{profileMessage.text}</Alert>}

                                <Form onSubmit={handleUpdateProfile}>

                                    {/* Image Upload Input */}
                                    <div className="d-flex flex-column align-items-center mb-5">
                                        <div
                                            className="position-relative rounded-circle overflow-hidden shadow d-flex align-items-center justify-content-center bg-white border border-light mb-3 cursor-pointer group-hover-overlay"
                                            style={{ width: '140px', height: '140px', cursor: 'pointer' }}
                                            onClick={() => document.getElementById('profileImageInput').click()}
                                            title="Click to change photo"
                                        >
                                            {/* Preview Logic */}
                                            {newImage ? (
                                                <img src={URL.createObjectURL(newImage)} alt="Preview" className="w-100 h-100 object-fit-cover" />
                                            ) : photo || auth.currentUser?.photoURL ? (
                                                <img src={photo || auth.currentUser?.photoURL} alt="Profile" className="w-100 h-100 object-fit-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                                <FaUserCircle size={80} className="text-secondary opacity-50" />
                                            )}

                                            {/* Camera Overlay */}
                                            <div className="position-absolute inset-0 bg-dark bg-opacity-50 text-white d-flex align-items-center justify-content-center opacity-0 hover-opacity-100 transition-all w-100 h-100">
                                                <FaCamera size={24} />
                                            </div>
                                        </div>

                                        <Form.Control
                                            type="file"
                                            id="profileImageInput"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                if (e.target.files[0]) setNewImage(e.target.files[0]);
                                            }}
                                        />
                                        <Button variant="link" className="text-decoration-none text-muted small fw-bold" onClick={() => document.getElementById('profileImageInput').click()}>
                                            Change Profile Picture
                                        </Button>
                                    </div>

                                    <Form.Group className="mb-4">
                                        <Form.Label className="small fw-bold text-secondary spacing-1">EMAIL ADDRESS</Form.Label>
                                        <Form.Control type="email" value={currentUser.email} disabled className="bg-light border-0 py-3 rounded-3 text-dark fw-medium" />
                                        <Form.Text className="text-muted small ps-1">Email cannot be changed.</Form.Text>
                                    </Form.Group>

                                    <Form.Group className="mb-5">
                                        <Form.Label className="small fw-bold text-secondary spacing-1">DISPLAY NAME</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="How should we call you?"
                                            className="bg-light border-0 py-3 rounded-3 fw-medium shadow-none focus-ring"
                                        />
                                    </Form.Group>

                                    <div className="d-flex justify-content-end">
                                        <Button variant="dark" type="submit" disabled={uploading} className="px-5 py-3 rounded-pill fw-bold shadow-sm hover-scale transition-all">
                                            {uploading ? <Spinner size="sm" /> : <><FaSave className="me-2" /> Save Changes</>}
                                        </Button>
                                    </div>
                                </Form>
                            </div>
                        )}

                        {/* --- TAB: SECURITY --- */}
                        {activeTab === 'security' && (
                            <div className="animate-fade-in">
                                <h4 className="fw-bolder mb-4">Security Settings</h4>
                                <p className="text-muted mb-4">Ensure your account is secure by using a strong password.</p>

                                {passwordMessage.text && <Alert variant={passwordMessage.type} className="rounded-3 border-0 shadow-sm mb-4">{passwordMessage.text}</Alert>}

                                <Form onSubmit={handleUpdatePassword}>
                                    <Form.Group className="mb-4">
                                        <Form.Label className="small fw-bold text-secondary spacing-1">CURRENT PASSWORD</Form.Label>
                                        <Form.Control
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            required
                                            className="bg-light border-0 py-3 rounded-3 shadow-none focus-ring"
                                            placeholder="••••••••"
                                        />
                                    </Form.Group>

                                    <Row>
                                        <Col md={6}>
                                            <Form.Group className="mb-4">
                                                <Form.Label className="small fw-bold text-secondary spacing-1">NEW PASSWORD</Form.Label>
                                                <Form.Control
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    required
                                                    minLength={6}
                                                    className="bg-light border-0 py-3 rounded-3 shadow-none focus-ring"
                                                    placeholder="At least 6 characters"
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-4">
                                                <Form.Label className="small fw-bold text-secondary spacing-1">CONFIRM NEW PASSWORD</Form.Label>
                                                <Form.Control
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    required
                                                    minLength={6}
                                                    className="bg-light border-0 py-3 rounded-3 shadow-none focus-ring"
                                                    placeholder="Repeat new password"
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    <div className="d-flex justify-content-end mt-4">
                                        <Button variant="dark" type="submit" disabled={loadingPassword} className="px-5 py-3 rounded-pill fw-bold shadow-sm hover-scale transition-all">
                                            {loadingPassword ? <Spinner size="sm" /> : "Update Password"}
                                        </Button>
                                    </div>
                                </Form>
                            </div>
                        )}

                    </Card>
                </Col>
            </Row>

            {/* LOGOUT CONFIRMATION MODAL */}
            <Modal show={showLogoutModal} onHide={() => setShowLogoutModal(false)} centered size="sm">
                <Modal.Body className="text-center p-4">
                    <div className="mb-3 text-danger">
                        <FaSignOutAlt size={40} />
                    </div>
                    <h5 className="fw-bold mb-3">Sign Out?</h5>
                    <p className="text-muted small mb-4">Are you sure you want to log out of your account?</p>
                    <div className="d-flex gap-2 justify-content-center">
                        <Button variant="light" onClick={() => setShowLogoutModal(false)} className="rounded-pill px-4">
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={confirmLogout} className="rounded-pill px-4">
                            Log Out
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>

            {/* Styles for this page only */}
            <style jsx>{`
                .hover-bg-light:hover { background-color: #f8f9fa; color: #000 !important; }
                .hover-scale:hover { transform: scale(1.02); }
                .transition-all { transition: all 0.2s ease-in-out; }
                .focus-ring:focus { box-shadow: 0 0 0 4px rgba(0,0,0,0.05); background-color: #fff; }
                .cursor-pointer { cursor: pointer; }
                .hover-opacity-100:hover { opacity: 1 !important; }
            `}</style>
        </Container>
    );
}