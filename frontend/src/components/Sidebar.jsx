import { ListGroup, Card, Form } from "react-bootstrap";
import { FaTshirt, FaMobileAlt, FaLaptop, FaBook, FaStar, FaArrowRight } from 'react-icons/fa';
import { Link } from "react-router-dom";
import { useState } from "react";

export default function Sidebar({ onFilterChange }) {
    const [hoverRating, setHoverRating] = useState(0);
    const [selectedRating, setSelectedRating] = useState(0);

    const categories = [
        { name: "Fashion", icon: <FaTshirt className="me-2" />, link: "/c/fashion" },
        { name: "Electronics", icon: <FaMobileAlt className="me-2" />, link: "/c/electronics" },
        { name: "Laptops", icon: <FaLaptop className="me-2" />, link: "/c/laptops" },
        { name: "Books", icon: <FaBook className="me-2" />, link: "/c/books" },
        { name: "See more", icon: <FaArrowRight className="me-2" />, link: "/categories" },
    ];

    const handlePriceChange = (e, min, max) => {
        if (onFilterChange) {
            onFilterChange('price', { min, max, checked: e.target.checked });
        }
    };

    const handleRatingClick = (rating) => {
        // Toggle off if clicking the same rating
        const newRating = selectedRating === rating ? 0 : rating;
        setSelectedRating(newRating);
        if (onFilterChange) {
            onFilterChange('rating', newRating);
        }
    }

    return (
        <div className="sticky-top" style={{ top: '100px', zIndex: 1 }}>
            {/* Categories */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Header className="bg-white border-bottom-0 pt-4 pb-0">
                    <h5 className="fw-bold text-uppercase small text-muted tracking-wide">Browse Categories</h5>
                </Card.Header>
                <Card.Body>
                    <ListGroup variant="flush">
                        {categories.map((cat, index) => (
                            <ListGroup.Item
                                key={index}
                                action
                                as={Link}
                                to={cat.link}
                                className="border-0 py-2 px-0 text-dark fw-bold d-flex align-items-center sidebar-link"
                            >
                                <span className="text-secondary">{cat.icon}</span>
                                {cat.name}
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                </Card.Body>
            </Card>

            {/* Filters */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Header className="bg-white border-bottom-0 pt-4 pb-0">
                    <h5 className="fw-bold text-uppercase small text-muted tracking-wide">Filters</h5>
                </Card.Header>
                <Card.Body>
                    {/* Price Range */}
                    <div className="mb-4">
                        <h6 className="fw-bold mb-2">Price Range</h6>
                        <Form>
                            <Form.Check
                                type="checkbox"
                                id="price-1"
                                label="Under RM50"
                                onChange={(e) => handlePriceChange(e, 0, 50)}
                            />
                            <Form.Check
                                type="checkbox"
                                id="price-2"
                                label="RM50 - RM100"
                                onChange={(e) => handlePriceChange(e, 50, 100)}
                            />
                            <Form.Check
                                type="checkbox"
                                id="price-3"
                                label="RM100 - RM200"
                                onChange={(e) => handlePriceChange(e, 100, 200)}
                            />
                            <Form.Check
                                type="checkbox"
                                id="price-4"
                                label="RM200 & Above"
                                onChange={(e) => handlePriceChange(e, 200, Infinity)}
                            />
                        </Form>
                    </div>

                    {/* Rating */}
                    <div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="fw-bold mb-0">Minimum Rating</h6>
                            {selectedRating > 0 && <span className="badge bg-warning text-dark">{selectedRating} & Up</span>}
                        </div>

                        <div className="d-flex mb-2" onMouseLeave={() => setHoverRating(0)}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <FaStar
                                    key={star}
                                    size={24}
                                    className={`me-1 ${star <= (hoverRating || selectedRating) ? "text-warning" : "text-muted"}`}
                                    style={{
                                        cursor: 'pointer',
                                        opacity: star <= (hoverRating || selectedRating) ? 1 : 0.3,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onClick={() => handleRatingClick(star)}
                                />
                            ))}
                        </div>
                        <p className="small text-muted">Click to filter by rating</p>
                    </div>

                </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm mt-4 bg-light">
                <Card.Body className="text-center p-4">
                    <h6 className="fw-bold">Need Help?</h6>
                    <p className="small text-muted mb-3">We are here 24/7 to assist you.</p>
                    <Link to="/contact" className="btn btn-outline-dark btn-sm rounded-pill w-100">Contact Support</Link>
                </Card.Body>
            </Card>
        </div>
    );
}
