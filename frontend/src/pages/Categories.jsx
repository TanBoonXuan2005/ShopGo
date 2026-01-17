import { Container, Row, Col, Card } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";

const categories = [
    { name: "Electronics", image: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&q=80&w=600" },
    { name: "Fashion", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=600" },
    { name: "Home & Living", image: "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&q=80&w=600" },
    { name: "Beauty", image: "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&q=80&w=600" },
    { name: "Books", image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&q=80&w=600" },
    { name: "Sports", image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=600" },
    { name: "Toys", image: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&q=80&w=600" },
    { name: "Automotive", image: "https://images.unsplash.com/photo-1550376026-33cbee34f79e?auto=format&fit=crop&q=80&w=600" },
    { name: "Health", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=600" },
    { name: "Art", image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=600" },
    { name: "Pets", image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600" },
    { name: "Office", image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=600" },
];

export default function Categories() {
    return (
        <Container className="py-5" style={{ minHeight: '80vh' }}>
            <h1 className="fw-bolder mb-2 text-center display-5">Browse Categories</h1>
            <p className="text-center text-muted mb-5 lead">Find exactly what you are looking for.</p>

            <Row xs={1} md={2} lg={3} className="g-4">
                {categories.map((cat, idx) => (
                    <Col key={idx}>
                        <Card className="h-100 border-0 shadow-sm overflow-hidden text-white category-card">
                            <Link to={`/c/${cat.name.toLowerCase()}`} className="text-white d-block h-100 w-100">
                                <div style={{ height: '240px', width: '100%', position: 'relative' }}>
                                    <Card.Img
                                        src={cat.image}
                                        alt={cat.name}
                                        className="h-100 w-100"
                                        style={{ objectFit: 'cover', filter: 'brightness(0.7)', position: 'absolute', top: 0, left: 0 }}
                                    />
                                    <Card.ImgOverlay className="d-flex flex-column justify-content-center align-items-center text-center p-0">
                                        <div className="p-3">
                                            <h2 className="fw-bold mb-0 text-shadow">{cat.name}</h2>
                                            <div className="mt-2 opacity-0 hover-opacity-100 transition-all d-flex align-items-center justify-content-center gap-2">
                                                <span className="fw-bold text-uppercase small">Shop Now</span>
                                                <FaArrowRight size={12} />
                                            </div>
                                        </div>
                                    </Card.ImgOverlay>
                                </div>
                            </Link>
                        </Card>
                    </Col>
                ))}
            </Row>
        </Container>
    );
}
