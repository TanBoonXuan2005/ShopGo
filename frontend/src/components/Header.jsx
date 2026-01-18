import { Container, Navbar, Nav, Button, InputGroup, Form, Badge, Dropdown, Image, Modal } from "react-bootstrap";
import { Link, useNavigate, Outlet, useLocation } from "react-router-dom";
import { FaShoppingCart, FaSearch, FaUser, FaClipboardList, FaWallet, FaUserCog, FaStore, FaSignOutAlt, FaBoxOpen, FaBell } from 'react-icons/fa';
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "./AuthProvider";
import { useCart } from "./CartContext"; // Use custom hook
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import Footer from "./Footer";
import Chatbot from "./Chatbot";

export default function Header() {
    const location = useLocation(); // Use location hook
    const { currentUser } = useContext(AuthContext);
    const { getCartCount } = useCart(); // Use custom hook
    const userProfileImage = currentUser?.photoURL;

    const [showModal, setShowModal] = useState(false);

    // Logic for Search
    const [searchTerm, setSearchTerm] = useState("");

    const handleSearch = (e) => {
        e.preventDefault();

        // If we are on a store page, search within that store
        if (location.pathname.startsWith('/store/')) {
            // Preserve the current path (store page) and append query param
            // We can use navigate to refresh/update the query param on same page
            navigate(`${location.pathname}?q=${encodeURIComponent(searchTerm)}`);
        } else {
            // Default global search
            navigate(`/?search=${encodeURIComponent(searchTerm)}`);
        }
    }

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

    // --- NOTIFICATIONS LOGIC ---
    const [notifications, setNotifications] = useState([]);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        if (currentUser) {
            fetchNotifications();
            // Optional: Poll every 30s
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [currentUser]);

    const fetchNotifications = async () => {
        try {
            const API_URL = 'http://localhost:5000';
            const res = await fetch(`${API_URL}/notifications/${currentUser.uid}`);
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    const markAsRead = async (id) => {
        try {
            const API_URL = 'http://localhost:5000';
            await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PUT' });
            // Update local state
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (err) {
            console.error("Failed to mark notification as read", err);
        }
    };

    const markAllAsRead = async () => {
        if (unreadCount === 0) return;
        try {
            const API_URL = 'http://localhost:5000';
            await fetch(`${API_URL}/notifications/read-all/${currentUser.uid}`, { method: 'PUT' });
            // Update local state immediately
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error("Failed to mark all as read", err);
        }
    };

    return (
        <>
            {/* Sticky Navbar with Backdrop Filter for Modern Glass Effect */}
            <Navbar expand="lg" sticky="top" className="bg-white bg-opacity-95 shadow-sm py-3" style={{ backdropFilter: 'blur(10px)' }}>
                <Container fluid className="px-5">
                    {/* BRAND LOGO */}
                    <Navbar.Brand as={Link} to="/" className="fw-bolder fs-3 text-dark tracking-tight me-5">
                        ShopGo.
                    </Navbar.Brand>

                    <Navbar.Toggle aria-controls="navbarScroll" />

                    <Navbar.Collapse id="navbarScroll">
                        {/* SEARCH BAR (Centered) */}
                        <Form className="d-flex mx-auto w-50" onSubmit={handleSearch}>
                            <InputGroup>
                                <InputGroup.Text className="bg-light border-end-0 text-muted ps-3 rounded-start-pill">
                                    <FaSearch />
                                </InputGroup.Text>
                                <Form.Control
                                    type="search"
                                    placeholder={location.pathname.startsWith('/store/') ? "Search in this shop..." : "Search for products..."}
                                    className="bg-light border-start-0 border-end-0 shadow-none"
                                    aria-label="Search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <Button variant="dark" type="submit" className="rounded-end-pill px-4 fw-bold">Search</Button>
                            </InputGroup>
                        </Form>

                        {/* RIGHT SIDE ICONS */}
                        <Nav className="ms-auto d-flex align-items-center gap-3 mt-3 mt-lg-0">

                            {/* SALES ICON (hidden on mobile if needed, or kept) */}
                            <Nav.Link as={Link} to="/sales" className="text-danger fw-bold d-flex align-items-center gap-1 hover-scale">
                                <span className="d-none d-lg-inline">🔥 Sale</span>
                            </Nav.Link>

                            {/* ORDERS ICON (New Placement) */}
                            {currentUser && (
                                <Nav.Link as={Link} to="/orders" className="text-dark d-flex align-items-center" title="My Purchases">
                                    <div className="p-2 rounded-circle bg-light hover-bg-gray transition-all">
                                        <FaClipboardList size={20} />
                                    </div>
                                </Nav.Link>
                            )}
                            {/* NOTIFICATIONS ICON */}
                            {currentUser && (
                                <Dropdown align="end" onToggle={(isOpen) => { if (isOpen) markAllAsRead(); }}>
                                    <Dropdown.Toggle as="div" className="position-relative text-dark d-flex align-items-center cursor-pointer after-none" id="dropdown-notifications">
                                        <div className="p-2 rounded-circle bg-light hover-bg-gray transition-all">
                                            <FaBell size={20} className={unreadCount > 0 ? "text-primary anim-swing" : ""} />
                                        </div>
                                        {unreadCount > 0 && (
                                            <Badge bg="danger" pill className="position-absolute translate-middle border border-light" style={{ top: '10px', left: '80%', fontSize: '0.6rem' }}>
                                                {unreadCount}
                                            </Badge>
                                        )}
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu className="shadow-lg border-0 rounded-4 mt-3 p-0 overflow-hidden" style={{ width: '320px', maxHeight: '400px', overflowY: 'auto' }}>
                                        <div className="px-3 py-3 bg-white border-bottom d-flex justify-content-between align-items-center sticky-top">
                                            <span className="fw-bold text-dark">Notifications</span>
                                            {unreadCount > 0 && <span className="badge bg-primary rounded-pill">{unreadCount} New</span>}
                                        </div>
                                        {notifications.length === 0 ? (
                                            <div className="p-5 text-center text-muted">
                                                <FaBell size={24} className="mb-2 opacity-50" />
                                                <p className="small mb-0">No notifications yet</p>
                                            </div>
                                        ) : (
                                            notifications.map(n => (
                                                <Dropdown.Item key={n.id} className={`p-3 border-bottom text-wrap ${!n.is_read ? 'bg-indigo-light' : ''}`} onClick={() => markAsRead(n.id)} style={{ whiteSpace: 'normal', backgroundColor: !n.is_read ? '#f0f4ff' : 'white' }}>
                                                    <div className="d-flex w-100 justify-content-between mb-1">
                                                        <strong className="small text-dark">{n.title}</strong>
                                                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>{new Date(n.created_at).toLocaleDateString()}</small>
                                                    </div>
                                                    <p className="mb-0 small text-secondary lh-sm">{n.message}</p>
                                                </Dropdown.Item>
                                            ))
                                        )}
                                    </Dropdown.Menu>
                                </Dropdown>
                            )}

                            {/* CART ICON */}
                            <Nav.Link as={Link} to="/cart" className="position-relative text-dark d-flex align-items-center">
                                <div className="p-2 rounded-circle bg-light hover-bg-gray transition-all">
                                    <FaShoppingCart size={20} />
                                </div>
                                {getCartCount() > 0 && (
                                    <Badge
                                        bg="danger"
                                        pill
                                        className="position-absolute translate-middle border border-light"
                                        style={{ top: '10px', left: '80%', fontSize: '0.7rem', padding: '0.35em 0.5em' }}
                                    >
                                        {getCartCount()}
                                    </Badge>
                                )}
                            </Nav.Link>

                            {/* AUTH / PROFILE */}
                            {currentUser ? (
                                <Dropdown align="end">
                                    <Dropdown.Toggle variant="transparent" className="border-0 p-0 text-dark d-flex align-items-center after-none" id="dropdown-profile">
                                        {userProfileImage ? (
                                            <Image
                                                src={userProfileImage}
                                                roundedCircle
                                                width={40}
                                                height={40}
                                                className="border border-2 border-white shadow-sm object-fit-cover"
                                            />
                                        ) : (
                                            <div className="p-2 rounded-circle bg-light border">
                                                <FaUser size={20} />
                                            </div>
                                        )}
                                    </Dropdown.Toggle>

                                    <Dropdown.Menu className="shadow-lg border-0 rounded-4 mt-3 p-0 overflow-hidden animate-slide-in" style={{ minWidth: '260px' }}>
                                        {/* User Header */}
                                        <div className="px-4 py-3 bg-light border-bottom">
                                            <p className="mb-0 fw-bold text-dark text-truncate" style={{ fontSize: '0.95rem' }}>{currentUser.displayName || "User"}</p>
                                            <p className="mb-0 small text-muted text-truncate">{currentUser.email}</p>
                                        </div>

                                        <div className="p-2">
                                            {/* Wallet - Highlighted */}
                                            <Dropdown.Item as={Link} to="/wallet" className="rounded-3 py-2 mb-1 d-flex align-items-center text-secondary">
                                                <div className="d-flex align-items-center justify-content-center bg-white rounded-circle me-3" style={{ width: '28px', height: '28px' }}>
                                                    <FaWallet size={14} className="text-dark"/>
                                                </div>
                                                My Wallet
                                            </Dropdown.Item>

                                            {/* My Purchase (Restored here for quick access) */}
                                            <Dropdown.Item as={Link} to="/orders" className="rounded-3 py-2 mb-1 d-flex align-items-center text-secondary">
                                                <div className="d-flex align-items-center justify-content-center bg-light rounded-circle me-3" style={{ width: '28px', height: '28px' }}>
                                                    <FaBoxOpen size={14} className="text-dark" />
                                                </div>
                                                My Orders
                                            </Dropdown.Item>

                                            {/* Profile */}
                                            <Dropdown.Item as={Link} to="/profile" className="rounded-3 py-2 mb-1 d-flex align-items-center text-secondary">
                                                <div className="d-flex align-items-center justify-content-center bg-light rounded-circle me-3" style={{ width: '28px', height: '28px' }}>
                                                    <FaUserCog size={14} className="text-dark" />
                                                </div>
                                                Profile & Settings
                                            </Dropdown.Item>

                                            {/* Seller Logic */}
                                            {currentUser.role === 'seller' && currentUser.dbId ? (
                                                <Dropdown.Item as={Link} to={`/store/${currentUser.dbId}`} className="rounded-3 py-2 mb-1 d-flex align-items-center text-secondary">
                                                    <div className="d-flex align-items-center justify-content-center bg-light bg-opacity-25 rounded-circle me-3" style={{ width: '28px', height: '28px' }}>
                                                        <FaStore size={14} className="text-dark" />
                                                    </div>
                                                    Seller Centre
                                                </Dropdown.Item>
                                            ) : (
                                                <Dropdown.Item as={Link} to="/seller-register" className="rounded-3 py-2 mb-1 d-flex align-items-center text-primary">
                                                    <div className="d-flex align-items-center justify-content-center bg-primary bg-opacity-10 rounded-circle me-3" style={{ width: '28px', height: '28px' }}>
                                                        <FaStore size={14} />
                                                    </div>
                                                    Become a Seller
                                                </Dropdown.Item>
                                            )}

                                            <Dropdown.Divider className="my-2 opacity-50" />

                                            <Dropdown.Item onClick={handleLogoutClick} className="rounded-3 py-2 d-flex align-items-center text-danger fw-bold">
                                                <div className="d-flex align-items-center justify-content-center bg-danger bg-opacity-10 rounded-circle me-3" style={{ width: '28px', height: '28px' }}>
                                                    <FaSignOutAlt size={14} />
                                                </div>
                                                Logout
                                            </Dropdown.Item>
                                        </div>
                                    </Dropdown.Menu>
                                </Dropdown>
                            ) : (
                                <div className="d-flex gap-2">
                                    <Link to="/login">
                                        <Button variant="outline-dark" className="rounded-pill px-4 fw-bold">Login</Button>
                                    </Link>
                                    <Link to="/login?mode=signup">
                                        <Button variant="dark" className="rounded-pill px-4 fw-bold shadow-sm">Sign Up</Button>
                                    </Link>
                                </div>
                            )}
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            {/* Render Child Pages (Home, Cart, Profile etc.) */}
            <div style={{ minHeight: '60vh' }}>
                <Outlet />
            </div>

            {/* Render Footer here to ensure it's on every page that uses Header as layout */}
            {/* Render Footer here to ensure it's on every page that uses Header as layout */}
            <Footer />
            <Chatbot />

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
        </>
    );
}