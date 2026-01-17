import { Container, Navbar, Nav, Button, InputGroup, Form, Badge, Dropdown, Image } from "react-bootstrap";
import { Link, useNavigate, Outlet } from "react-router-dom";
import { FaShoppingCart, FaSearch, FaUser, FaClipboardList } from 'react-icons/fa';
import { useContext, useState } from "react";
import { AuthContext } from "./AuthProvider";
import { useCart } from "./CartContext"; // Use custom hook
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import Footer from "./Footer";
import Chatbot from "./Chatbot";

export default function Header() {
    const navigate = useNavigate();
    const { currentUser } = useContext(AuthContext);
    const { getCartCount } = useCart(); // Use custom hook
    const userProfileImage = currentUser?.photoURL;

    const [showModal, setShowModal] = useState(false);

    // Logic for Search
    const [searchTerm, setSearchTerm] = useState("");

    const handleSearch = (e) => {
        e.preventDefault();
        // Navigate to Home with search query
        navigate(`/?search=${encodeURIComponent(searchTerm)}`);
    }

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (err) {
            console.error("Error: ", err);
        }
    }

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
                                    placeholder="Search for products..."
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

                                    <Dropdown.Menu className="shadow-lg border-0 rounded-3 mt-2 p-2" style={{ minWidth: '200px' }}>
                                        <div className="px-3 py-2 border-bottom mb-2">
                                            <p className="mb-0 fw-bold text-truncate">{currentUser.displayName || "User"}</p>
                                            <p className="mb-0 small text-muted text-truncate">{currentUser.email}</p>
                                        </div>
                                        {/* My Purchase removed from here */}
                                        <Dropdown.Item as={Link} to="/profile" className="rounded-2 py-2">Profile & Settings</Dropdown.Item>

                                        {/* Seller Logic */}
                                        {currentUser.role === 'seller' ? (
                                            <Dropdown.Item as={Link} to="/seller-centre" className="rounded-2 py-2 fw-bold text-success">Seller Centre</Dropdown.Item>
                                        ) : (
                                            <Dropdown.Item as={Link} to="/seller-register" className="rounded-2 py-2 fw-bold text-primary">Become a Seller</Dropdown.Item>
                                        )}

                                        <Dropdown.Divider />
                                        <Dropdown.Item onClick={handleLogout} className="text-danger rounded-2 py-2 fw-bold">Logout</Dropdown.Item>
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
        </>
    );
}