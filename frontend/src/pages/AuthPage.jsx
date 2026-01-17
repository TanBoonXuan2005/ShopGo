import { Container, Row, Col, Card, Form, Button, Alert, Image, Modal } from "react-bootstrap";
import { 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    sendEmailVerification,
    sendPasswordResetEmail, 
    signOut,
} from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [role, setRole] = useState("buyer");

    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [modalError, setModalError] = useState("");
    const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
    const [emailForPasswordReset, setEmailForPasswordReset] = useState("");

    const provider = new GoogleAuthProvider();

    const handleAuth = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (!isLogin && password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            if (isLogin) {
                const userCredential =  await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                if (!user.emailVerified) {
                    await signOut(auth);
                    setError("Please verify your email before logging in.");
                    return
                }

                navigate("/");
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                await sendEmailVerification(user);
                console.log('Firebase Account Created:', user.email);

                const API_URL = 'https://c4772cc6-1f1b-44f4-8b39-7a97086b8204-00-260uyq3aib74z.pike.replit.dev';
                const response = await fetch(`${API_URL}/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        firebase_uid: user.uid,
                        email: user.email,
                        role: role,
                    }),
                });

                if (response.ok) {
                    await signOut(auth);
                    setIsLogin(true);
                    setEmail("");
                    setPassword("");
                    setConfirmPassword("");
                    setMessage("Account created! Please check your email to verify your account.");
                } else {
                    console.error("Failed to save user to SQL Database.");
                    setError("Failed to save user to SQL Database.");
                }
            }
        } catch (err) {
            console.error(err);
            if (err.code === "auth/invalid-credential") {
                setError("Incorrect email or password.");
            } else {
                setError(err.message);
            }
        }
    }

    const handleGoogleLogin = async(e) => {
        e.preventDefault();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const API_URL = 'https://c4772cc6-1f1b-44f4-8b39-7a97086b8204-00-260uyq3aib74z.pike.replit.dev';
            await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firebase_uid: user.uid,
                    email: user.email,
                    role: "buyer",
                }),
            });

            navigate("/");
        } catch (err) {
            console.error("Error: ",err);
            setError("Failed to login with Google.");
        }
    }

    const handleForgotPassword = async() => {
        if (!emailForPasswordReset) {
            setModalError("Please enter your email.");
            return;
        }

        try {
            await sendPasswordResetEmail(auth, emailForPasswordReset);
            setShowForgotPasswordModal(false);
            setEmailForPasswordReset("");
            setModalError("");
            setMessage("Password reset link sent to your email! Please check your inbox to reset your password.");
        } catch (err) {
            console.error(err);
            if (err.code === "auth/user-not-found") {
                setModalError("No account found with this email address.");
            } else if (err.code === "auth/invalid-email") {
                setModalError("Please enter a valid email address.");
            } else {
                setModalError("Failed to send email. " + err.message);
            }
        }
    }

    return(
        <Container fluid className="d-flex justify-content-center align-items-center bg-light" style={{ minHeight: "100vh" }}>
            <Card className="shadow-lg border-0 overflow-hidden" style={{ maxWidth: '900px', width: '100%', borderRadius: "20px" }}>
                <Row className="g-0">
                    
                    {/* LEFT SIDE: CREATIVE IMAGE (Hidden on mobile) */}
                    <Col md={6} className="d-none d-md-block position-relative">
                        <Image 
                            src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop" 
                            alt="Shopping Mood"
                            className="h-100 w-100 object-fit-cover"
                            style={{ position: 'absolute' }}
                        />
                        <div className="position-absolute top-0 start-0 w-100 h-100" 
                             style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))" }}>
                        </div>
                        <div className="position-absolute bottom-0 start-0 p-5 text-white">
                            <h2 className="fw-bold display-6">ShopGo.</h2>
                            <p className="lead fs-6 opacity-75">Discover the best trends in fashion and tech, all in one place.</p>
                        </div>
                    </Col>

                    {/* RIGHT SIDE: AUTH FORM */}
                    <Col md={6} className="p-5 bg-white">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                            <h3 className="fw-bold text-dark mb-0">{isLogin ? 'Sign In' : 'Get Started'}</h3>
                            <span className="text-muted small d-flex align-items-center">
                                {isLogin ? "New user?" : "Have an account?"} 
                                <button 
                                    className="btn btn-link text-decoration-none fw-bold p-0 ms-1 text-dark"
                                    onClick={() => { setIsLogin(!isLogin); setError(""); }}
                                >
                                    {isLogin ? "Register" : "Login"}
                                </button>
                            </span>
                        </div>

                        {error && <Alert variant="danger">{error}</Alert>}
                        {message && <Alert variant="success">{message}</Alert>}

                        <Form onSubmit={handleAuth}>
                            {/* GOOGLE BUTTON (Visual Only for now) */}
                            <Button 
                                onClick={handleGoogleLogin} 
                                variant="outline-dark" 
                                className="w-100 mb-3 d-flex align-items-center justify-content-center py-2" 
                                style={{borderRadius: "10px"}}
                                type="button"
                            >
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{width: "20px"}} className="me-2"/>
                                Continue with Google
                            </Button>

                            <div className="d-flex align-items-center my-3">
                                <hr className="flex-grow-1" />
                                <span className="mx-3 text-muted small text-uppercase">Or</span>
                                <hr className="flex-grow-1" />
                            </div>

                            <Form.Group className="mb-3">
                                <Form.Label className="small text-uppercase fw-bold text-muted" style={{fontSize: "0.75rem"}}>Email</Form.Label>
                                <Form.Control 
                                    type="email" 
                                    placeholder="name@gmail.com" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required 
                                    className="py-2 bg-light border-0"
                                    style={{borderRadius: "8px"}}
                                />
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label className="small text-uppercase fw-bold text-muted" style={{fontSize: "0.75rem"}}>Password</Form.Label>
                                <Form.Control 
                                    type="password" 
                                    placeholder="••••••••" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required 
                                    className="py-2 bg-light border-0"
                                    style={{borderRadius: "8px"}}
                                />
                            </Form.Group>

                            {isLogin && (
                                <div className="text-end mb-3">
                                    <button 
                                        type="button" 
                                        className="btn btn-link text-decoration-none text-muted small p-0 border-0 bg-transparent"
                                        onClick={() => setShowForgotPasswordModal(true)}
                                        style={{fontSize: "0.75rem"}}
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            )}

                            {!isLogin && (
                                <Form.Group className="mb-4">
                                    <Form.Label className="small text-uppercase fw-bold text-muted" style={{fontSize: "0.75rem"}}>Confirm Password</Form.Label>
                                    <Form.Control 
                                        type="password" 
                                        placeholder="••••••••" 
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required 
                                        className="py-2 bg-light border-0"
                                        style={{borderRadius: "8px"}}
                                    />
                                </Form.Group>
                            )}

                            {/* ROLE SELECTOR - Improved UI */}
                            {!isLogin && (
                                <div className="mb-4">
                                   <p className="small fw-bold text-muted mb-2 text-uppercase" style={{fontSize: "0.75rem"}}>I want to be a:</p>
                                   <div className="d-flex gap-2">
                                     <div 
                                        className={`flex-fill border rounded p-2 text-center cursor-pointer ${role === 'buyer' ? 'bg-dark text-white' : 'bg-light text-muted'}`}
                                        onClick={() => setRole('buyer')}
                                        style={{cursor: 'pointer', transition: '0.2s', borderRadius: "8px"}}
                                     >
                                         <i className="bi bi-bag-fill d-block mb-1"></i>
                                         <small className="fw-bold">Buyer</small>
                                     </div>
                                     <div 
                                        className={`flex-fill border rounded p-2 text-center cursor-pointer ${role === 'seller' ? 'bg-dark text-white' : 'bg-light text-muted'}`}
                                        onClick={() => setRole('seller')}
                                        style={{cursor: 'pointer', transition: '0.2s', borderRadius: "8px"}}
                                     >
                                         <i className="bi bi-shop d-block mb-1"></i>
                                         <small className="fw-bold">Seller</small>
                                     </div>
                                   </div>
                                </div>
                            )}

                            <Button variant="dark" type="submit" className="w-100 py-3 fw-bold" style={{ borderRadius: "10px" }}>
                                {isLogin ? 'Sign In' : 'Create Account'}
                            </Button>
                        </Form>
                    </Col>
                </Row>
            </Card>
            <Modal
                show={showForgotPasswordModal}
                onHide={() => {setShowForgotPasswordModal(false), setModalError("")}}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold">Reset Password</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="text-muted small mb-3">
                        Enter your email address below. We will send the reset password link to your email address.
                    </p>
                    
                    {/* Error Alert specifically for the Modal */}
                    {modalError && (
                        <Alert variant="danger" className="py-2 small border-0 bg-danger-subtle text-danger fw-semibold">
                            {modalError}
                        </Alert>
                    )}

                    <Form.Group>
                        <Form.Label className="small fw-bold text-uppercase text-muted">Email Address</Form.Label>
                        <Form.Control 
                            type="email" 
                            placeholder="name@gmail.com" 
                            value={emailForPasswordReset}
                            onChange={(e) => { setEmailForPasswordReset(e.target.value); setModalError(""); }}
                            autoFocus
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="light" onClick={() => setShowForgotPasswordModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="dark" onClick={handleForgotPassword}>
                        Send Reset Link
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    )

}