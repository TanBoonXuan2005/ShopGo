import { Container, Navbar, Nav, Button, InputGroup, Form, Badge, Dropdown, Image, Modal } from "react-bootstrap";
import { Link, useNavigate, Outlet, useLocation } from "react-router-dom";
import { FaShoppingCart, FaSearch, FaUser, FaClipboardList, FaWallet, FaUserCog, FaStore, FaSignOutAlt, FaBoxOpen, FaBell, FaCommentDots } from 'react-icons/fa';
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "./AuthProvider";
import { useCart } from "./CartContext"; // Use custom hook
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import Footer from "./Footer";
import Chatbot from "./Chatbot";

export default function Header() {
    const location = useLocation(); // Use location hook
    const navigate = useNavigate();
    const { currentUser } = useContext(AuthContext);
    const { getCartCount } = useCart(); // Use custom hook
    const userProfileImage = currentUser?.photoURL;

    const [showModal, setShowModal] = useState(false);

    // Logic for Search
    const [searchTerm, setSearchTerm] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (searchTerm.length < 2) {
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/search-suggestions?q=${encodeURIComponent(searchTerm)}`);
                if (res.ok) {
                    const data = await res.json();
                    setSuggestions(data);
                    setShowSuggestions(data.length > 0);
                }
            } catch (err) {
                console.error("Search fetch error", err);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    const handleSearch = (e) => {
        e.preventDefault();
        setShowSuggestions(false);

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
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
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
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
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
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            await fetch(`${API_URL}/notifications/read-all/${currentUser.uid}`, { method: 'PUT' });
            // Update local state immediately
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error("Failed to mark all as read", err);
        }
    };

    return (
        <>
            <Navbar expand="lg" sticky="top" className="bg-white bg-opacity-95 shadow-sm py-2 py-lg-3" style={{ backdropFilter: 'blur(10px)' }}>
                <Container fluid className="px-3 px-lg-5 flex-wrap">
                    <div className="d-flex align-items-center justify-content-between w-100 d-lg-none">
                        {/* MOBILE BRAND */}
                        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center fw-bolder fs-3 text-dark tracking-tight">
                            <img src="/ShopGo-logo.jpg" alt="ShopGo" height="35" className="me-2" />
                            ShopGo
                        </Navbar.Brand>

                        {/* MOBILE ACTIONS (Cart + Toggle) */}
                        <div className="d-flex align-items-center gap-1">
                            {/* SALES (Hidden on Mobile, moved to Menu) */}
                            <Link to="/sales" className="text-danger p-2 fw-bold text-decoration-none d-none d-sm-block">
                                <span style={{ fontSize: '1.2rem' }}>🔥</span>
                            </Link>

                            {/* CHAT (Keep on mobile for quick access) */}
                            {currentUser && (
                                <Link to="/chat" className="text-dark p-2">
                                    <FaCommentDots size={22} />
                                </Link>
                            )}

                            {/* ORDERS (Hidden on Mobile, moved to Menu) */}
                            {currentUser && (
                                <Link to="/orders" className="text-dark p-2 d-none d-sm-block">
                                    <FaClipboardList size={22} />
                                </Link>
                            )}

                            {/* NOTIFICATIONS (Keep on mobile?) Maybe hide. Let's hide on XS. */}
                            {currentUser && (
                                <Dropdown align="end" onToggle={(isOpen) => { if (isOpen) markAllAsRead(); }} className="d-none d-sm-block">
                                    <Dropdown.Toggle as="div" className="position-relative text-dark p-2 cursor-pointer after-none">
                                        <FaBell size={22} className={unreadCount > 0 ? "text-primary anim-swing" : ""} />
                                        {unreadCount > 0 && (
                                            <Badge bg="danger" pill className="position-absolute translate-middle border border-light" style={{ top: '8px', left: '85%', fontSize: '0.65rem' }}>
                                                {unreadCount}
                                            </Badge>
                                        )}
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu className="shadow-lg border-0 rounded-4 mt-3 p-0 overflow-hidden" style={{ width: '300px', maxHeight: '400px', overflowY: 'auto', position: 'absolute', right: '-50px' }}>
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

                            <Link to="/cart" className="position-relative text-dark p-2">
                                <FaShoppingCart size={22} />
                                {getCartCount() > 0 && (
                                    <Badge bg="danger" pill className="position-absolute translate-middle border border-light" style={{ top: '8px', left: '85%', fontSize: '0.65rem' }}>
                                        {getCartCount()}
                                    </Badge>
                                )}
                            </Link>

                            {currentUser && (
                                <Link to="/profile" className="text-dark p-2">
                                    <FaUser size={20} />
                                </Link>
                            )}

                            <Navbar.Toggle aria-controls="navbarMobileScroll" className="border-0 p-1" />
                        </div>
                    </div>

                    {/* MOBILE SEARCH BAR (Visible below brand on mobile) */}
                    <div className="w-100 d-lg-none mt-2">
                        <Form className="d-flex position-relative" onSubmit={handleSearch}>
                            <InputGroup size="sm">
                                <InputGroup.Text className="bg-light border-end-0 ps-3 rounded-start-pill">
                                    <FaSearch className="text-muted" />
                                </InputGroup.Text>
                                <Form.Control
                                    type="search"
                                    placeholder="Search..."
                                    className="bg-light border-start-0 border-end-0 shadow-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <Button variant="dark" type="submit" className="rounded-end-pill px-3">Search</Button>
                            </InputGroup>
                        </Form>
                    </div>

                    {/* DESKTOP CONTENT (Hidden on Mobile via Collapse/Classes) */}
                    <div className="d-none d-lg-flex align-items-center w-100">
                        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center fw-bolder fs-3 text-dark tracking-tight me-5">
                            <img src="/ShopGo-logo.jpg" alt="ShopGo" height="40" className="me-2" />
                            ShopGo
                        </Navbar.Brand>

                        <Navbar.Collapse id="navbarScroll">
                            {/* DESKTOP SEARCH BAR */}
                            <Form className="d-flex mx-auto position-relative search-bar-container" onSubmit={handleSearch}>
                                <InputGroup>
                                    <InputGroup.Text className="bg-light border-end-0 text-muted ps-3 rounded-start-pill">
                                        <FaSearch />
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="search"
                                        placeholder={location.pathname.startsWith('/store/') ? "Search in this shop..." : "Search for products..."}
                                        className="bg-light border-start-0 border-end-0 shadow-none"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    />
                                    <Button variant="dark" type="submit" className="rounded-end-pill px-4 fw-bold">Search</Button>
                                </InputGroup>

                                {/* Suggestions Dropdown */}
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="position-absolute w-100 bg-white shadow-lg rounded-bottom start-0 overflow-hidden" style={{ top: '100%', zIndex: 1000, borderRadius: '0 0 15px 15px' }}>
                                        {suggestions.map(s => (
                                            <div
                                                key={s.id}
                                                className="px-4 py-2 border-bottom hover-bg-light cursor-pointer text-dark d-flex justify-content-between align-items-center"
                                                onClick={() => {
                                                    setSearchTerm(s.name);
                                                    setShowSuggestions(false);
                                                    navigate(`/?search=${encodeURIComponent(s.name)}`);
                                                }}
                                                style={{ transition: 'background-color 0.2s', cursor: 'pointer' }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                            >
                                                <span className="fw-medium">{s.name}</span>
                                                <Badge bg="light" text="dark" className="fw-normal">{s.category}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Form>

                            {/* RIGHT SIDE ICONS */}
                            <Nav className="ms-auto d-flex align-items-center gap-3">
                                {/* SALES ICON */}
                                <Nav.Link as={Link} to="/sales" className="text-danger fw-bold d-flex align-items-center gap-1 hover-scale">
                                    <span className="">🔥 Sale</span>
                                </Nav.Link>

                                {/* MESSAGES */}
                                {currentUser && (
                                    <Nav.Link as={Link} to="/chat" className="text-dark d-flex align-items-center">
                                        <div className="p-2 rounded-circle bg-light hover-bg-gray transition-all">
                                            <FaCommentDots size={20} />
                                        </div>
                                    </Nav.Link>
                                )}

                                {/* ORDERS */}
                                {currentUser && (
                                    <Nav.Link as={Link} to="/orders" className="text-dark d-flex align-items-center">
                                        <div className="p-2 rounded-circle bg-light hover-bg-gray transition-all">
                                            <FaClipboardList size={20} />
                                        </div>
                                    </Nav.Link>
                                )}
                                {/* NOTIFICATIONS */}
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

                                {/* CART (Desktop) */}
                                <Nav.Link as={Link} to="/cart" className="position-relative text-dark d-flex align-items-center">
                                    <div className="p-2 rounded-circle bg-light hover-bg-gray transition-all">
                                        <FaShoppingCart size={20} />
                                    </div>
                                    {getCartCount() > 0 && (
                                        <Badge bg="danger" pill className="position-absolute translate-middle border border-light" style={{ top: '10px', left: '80%', fontSize: '0.7rem' }}>
                                            {getCartCount()}
                                        </Badge>
                                    )}
                                </Nav.Link>

                                {/* AUTH / PROFILE */}
                                {currentUser ? (
                                    <Dropdown align="end">
                                        <Dropdown.Toggle variant="transparent" className="border-0 p-0 text-dark d-flex align-items-center after-none" id="dropdown-profile">
                                            {userProfileImage ? (
                                                <Image src={userProfileImage} roundedCircle width={40} height={40} className="border border-2 border-white shadow-sm object-fit-cover" />
                                            ) : (
                                                <div className="p-2 rounded-circle bg-light border">
                                                    <FaUser size={20} />
                                                </div>
                                            )}
                                        </Dropdown.Toggle>

                                        <Dropdown.Menu className="shadow-lg border-0 rounded-4 mt-3 p-0 overflow-hidden animate-slide-in" style={{ minWidth: '260px' }}>
                                            <div className="px-4 py-3 bg-light border-bottom">
                                                <p className="mb-0 fw-bold text-dark text-truncate" style={{ fontSize: '0.95rem' }}>{currentUser.displayName || "User"}</p>
                                                <p className="mb-0 small text-muted text-truncate">{currentUser.email}</p>
                                            </div>
                                            <div className="p-2">
                                                <Dropdown.Item as={Link} to="/wallet" className="rounded-3 py-2 mb-1 d-flex align-items-center text-secondary">
                                                    <div className="d-flex align-items-center justify-content-center bg-white rounded-circle me-3" style={{ width: '28px', height: '28px' }}>
                                                        <FaWallet size={14} className="text-dark" />
                                                    </div>
                                                    My Wallet
                                                </Dropdown.Item>
                                                <Dropdown.Item as={Link} to="/orders" className="rounded-3 py-2 mb-1 d-flex align-items-center text-secondary">
                                                    <div className="d-flex align-items-center justify-content-center bg-light rounded-circle me-3" style={{ width: '28px', height: '28px' }}>
                                                        <FaBoxOpen size={14} className="text-dark" />
                                                    </div>
                                                    My Orders
                                                </Dropdown.Item>
                                                <Dropdown.Item as={Link} to="/profile" className="rounded-3 py-2 mb-1 d-flex align-items-center text-secondary">
                                                    <div className="d-flex align-items-center justify-content-center bg-light rounded-circle me-3" style={{ width: '28px', height: '28px' }}>
                                                        <FaUserCog size={14} className="text-dark" />
                                                    </div>
                                                    Profile & Settings
                                                </Dropdown.Item>
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
                                    </div>
                                )}
                            </Nav>
                        </Navbar.Collapse>
                    </div>

                    {/* MOBILE MENU CONTENT (When Toggle is Clicked - Logic for Mobile Menu Items) */}
                    <div className="d-lg-none w-100">
                        <Navbar.Collapse id="navbarMobileScroll" className="mt-3 border-top pt-3">
                            <Nav className="d-flex flex-column gap-2">
                                {/* Added Mobile Links for hidden top-bar items */}
                                <Nav.Link as={Link} to="/sales" className="d-flex align-items-center gap-3 p-2 rounded hover-bg-light text-danger fw-bold border-bottom">
                                    <span>🔥</span> Sales & Promotions
                                </Nav.Link>

                                {currentUser && (
                                    <>
                                        <Nav.Link as={Link} to="/notifications" className="d-flex align-items-center gap-3 p-2 rounded hover-bg-light border-bottom d-sm-none">
                                            <div className="position-relative">
                                                <FaBell size={18} className={unreadCount > 0 ? "text-primary" : ""} />
                                                {unreadCount > 0 && <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle p-1" style={{ fontSize: '0.6rem' }}>{unreadCount}</Badge>}
                                            </div>
                                            <span className="fw-bold text-dark">Notifications</span>
                                        </Nav.Link>

                                        <Nav.Link as={Link} to="/orders" className="d-flex align-items-center gap-3 p-2 rounded hover-bg-light border-bottom d-sm-none">
                                            <FaClipboardList size={18} />
                                            <span className="fw-bold text-dark">My Orders</span>
                                        </Nav.Link>
                                    </>
                                )}


                                {/* Only show menu items that are not already accessible */}
                                {currentUser ? (
                                    <>
                                        <Nav.Link as={Link} to="/profile" className="d-flex align-items-center gap-3 p-2 rounded hover-bg-light">
                                            <Image src={userProfileImage || "https://placehold.co/50x50"} roundedCircle width={30} height={30} />
                                            <div className="d-flex flex-column">
                                                <span className="fw-bold text-dark">{currentUser.displayName}</span>
                                                <small className="text-muted">View Profile</small>
                                            </div>
                                        </Nav.Link>

                                        {currentUser.role === 'seller' ? (
                                            <Nav.Link as={Link} to={`/store/${currentUser.dbId}`} className="fw-medium text-dark ps-3 border-start">Seller Centre</Nav.Link>
                                        ) : (
                                            <Nav.Link as={Link} to="/seller-register" className="fw-medium text-primary ps-3 border-start">Become a Seller</Nav.Link>
                                        )}
                                        <Nav.Link onClick={handleLogoutClick} className="fw-medium text-danger ps-3 border-start">Log Out</Nav.Link>
                                    </>
                                ) : (
                                    <div className="d-grid gap-2">
                                        <Link to="/login" className="btn btn-outline-dark rounded-pill">Login</Link>
                                        <Link to="/login?mode=signup" className="btn btn-dark rounded-pill">Sign Up</Link>
                                    </div>
                                )}
                            </Nav>
                        </Navbar.Collapse>
                    </div>
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